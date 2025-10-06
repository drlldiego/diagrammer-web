/**
 * LayoutMetricsService
 * 
 * Serviço para coleta, análise e debugging de métricas de layout
 * Fornece observabilidade completa do pipeline de posicionamento
 */

import { Node } from './collision-resolver.service';
import { CollisionMetrics } from './collision-resolver.service';
import { RoutingMetrics } from './edge-router.service';
import { StabilityMetrics } from './layout-stability.service';

export interface LayoutMetrics {
  // Métricas temporais
  timeTotal: number;
  timeELK: number;
  timeCollisionResolver: number;
  timeEdgeRouter: number;
  timeStability: number;
  
  // Métricas de qualidade
  overlapArea: number;
  numCrossings: number;
  meanEdgeLength: number;
  maxNodeDisplacement: number;
  stabilityIndex: number;
  
  // Contadores
  totalNodes: number;
  totalEdges: number;
  nodesRepositioned: number;
  edgesRerouted: number;
  
  // Submétrigas especializadas
  collision: CollisionMetrics;
  routing: RoutingMetrics;
  stability: StabilityMetrics;
  
  // Metadata
  timestamp: number;
  diagramId: string;
  elkAlgorithm?: string;
  success: boolean;
}

export interface DebugSnapshot {
  phase: 'pre-elk' | 'post-elk' | 'post-collision' | 'post-routing' | 'final';
  timestamp: number;
  nodes: Array<{ id: string; x: number; y: number; width: number; height: number }>;
  metrics?: Partial<LayoutMetrics>;
  notes?: string;
}

export interface PerformanceReport {
  avgTimeTotal: number;
  avgStabilityIndex: number;
  avgOverlapArea: number;
  successRate: number;
  totalLayouts: number;
  trends: {
    performance: 'improving' | 'degrading' | 'stable';
    stability: 'improving' | 'degrading' | 'stable';
    quality: 'improving' | 'degrading' | 'stable';
  };
}

export class LayoutMetricsService {
  private metricsHistory: LayoutMetrics[] = [];
  private debugSnapshots: Map<string, DebugSnapshot[]> = new Map();
  private readonly MAX_HISTORY_SIZE = 100;
  private readonly MAX_SNAPSHOTS_PER_LAYOUT = 10;

  // Timer management
  private timers: Map<string, number> = new Map();

  /**
   * Inicia medição de tempo para uma fase
   */
  public startTimer(phase: string): void {
    this.timers.set(phase, performance.now());
  }

  /**
   * Para medição de tempo e retorna duração
   */
  public stopTimer(phase: string): number {
    const startTime = this.timers.get(phase);
    if (!startTime) {
      console.warn(`⚠️ [Metrics] Timer '${phase}' was not started`);
      return 0;
    }
    
    const duration = performance.now() - startTime;
    this.timers.delete(phase);
    return duration;
  }

  /**
   * Cria snapshot de debug para uma fase
   */
  public createDebugSnapshot(
    diagramId: string,
    phase: DebugSnapshot['phase'],
    nodes: Node[],
    notes?: string,
    metrics?: Partial<LayoutMetrics>
  ): void {
    const snapshot: DebugSnapshot = {
      phase,
      timestamp: performance.now(),
      nodes: nodes.map(node => ({
        id: node.id,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height
      })),
      metrics,
      notes
    };

    if (!this.debugSnapshots.has(diagramId)) {
      this.debugSnapshots.set(diagramId, []);
    }

    const snapshots = this.debugSnapshots.get(diagramId)!;
    snapshots.push(snapshot);

    // Limitar número de snapshots
    if (snapshots.length > this.MAX_SNAPSHOTS_PER_LAYOUT) {
      snapshots.shift();
    }

    console.log(`📸 [Metrics] Debug snapshot created: ${phase} for ${diagramId} (${snapshots.length} total)`);
  }

  /**
   * Registra métricas completas de um layout
   */
  public recordLayoutMetrics(metrics: LayoutMetrics): void {
    // Adicionar ao histórico
    this.metricsHistory.push(metrics);

    // Limitar tamanho do histórico
    if (this.metricsHistory.length > this.MAX_HISTORY_SIZE) {
      this.metricsHistory.shift();
    }

    // Log das métricas principais
    console.log(`📊 [Metrics] Layout completed for ${metrics.diagramId}:`);
    console.log(`  ⏱️  Total time: ${metrics.timeTotal.toFixed(1)}ms`);
    console.log(`  🏗️  ELK time: ${metrics.timeELK.toFixed(1)}ms`);
    console.log(`  🚧 Collision time: ${metrics.timeCollisionResolver.toFixed(1)}ms`);
    console.log(`  🛣️  Routing time: ${metrics.timeEdgeRouter.toFixed(1)}ms`);
    console.log(`  🎯 Stability index: ${metrics.stabilityIndex.toFixed(3)}`);
    console.log(`  📏 Overlap area: ${metrics.overlapArea.toFixed(1)}px²`);
    console.log(`  ✅ Success: ${metrics.success}`);

    // Detectar problemas
    this.detectAndReportIssues(metrics);
  }

  /**
   * Calcula métricas de qualidade de layout
   */
  public calculateQualityMetrics(
    nodes: Node[],
    edges: Array<{ source: Node; target: Node; waypoints?: Array<{ x: number; y: number }> }>
  ): {
    overlapArea: number;
    numCrossings: number;
    meanEdgeLength: number;
    nodeSpacing: { min: number; avg: number; max: number };
  } {
    // 1. Calcular área de sobreposição
    let overlapArea = 0;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];
        
        const boundsA = {
          x: nodeA.x - nodeA.width / 2,
          y: nodeA.y - nodeA.height / 2,
          width: nodeA.width,
          height: nodeA.height
        };
        
        const boundsB = {
          x: nodeB.x - nodeB.width / 2,
          y: nodeB.y - nodeB.height / 2,
          width: nodeB.width,
          height: nodeB.height
        };

        // Calcular interseção
        const left = Math.max(boundsA.x, boundsB.x);
        const right = Math.min(boundsA.x + boundsA.width, boundsB.x + boundsB.width);
        const top = Math.max(boundsA.y, boundsB.y);
        const bottom = Math.min(boundsA.y + boundsA.height, boundsB.y + boundsB.height);

        if (left < right && top < bottom) {
          overlapArea += (right - left) * (bottom - top);
        }
      }
    }

    // 2. Contar cruzamentos de edges
    let numCrossings = 0;
    for (let i = 0; i < edges.length; i++) {
      for (let j = i + 1; j < edges.length; j++) {
        const edge1 = edges[i];
        const edge2 = edges[j];
        
        // Verificar se edges se cruzam
        if (this.edgesIntersect(edge1, edge2)) {
          numCrossings++;
        }
      }
    }

    // 3. Calcular comprimento médio das edges
    let totalEdgeLength = 0;
    edges.forEach(edge => {
      if (edge.waypoints && edge.waypoints.length > 1) {
        // Calcular comprimento do path com waypoints
        for (let i = 0; i < edge.waypoints.length - 1; i++) {
          const p1 = edge.waypoints[i];
          const p2 = edge.waypoints[i + 1];
          totalEdgeLength += Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
        }
      } else {
        // Edge direta
        const dx = edge.target.x - edge.source.x;
        const dy = edge.target.y - edge.source.y;
        totalEdgeLength += Math.sqrt(dx * dx + dy * dy);
      }
    });
    const meanEdgeLength = edges.length > 0 ? totalEdgeLength / edges.length : 0;

    // 4. Calcular espaçamento entre nodes
    const distances: number[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        distances.push(Math.sqrt(dx * dx + dy * dy));
      }
    }

    const nodeSpacing = {
      min: distances.length > 0 ? Math.min(...distances) : 0,
      avg: distances.length > 0 ? distances.reduce((a, b) => a + b, 0) / distances.length : 0,
      max: distances.length > 0 ? Math.max(...distances) : 0
    };

    return {
      overlapArea,
      numCrossings,
      meanEdgeLength,
      nodeSpacing
    };
  }

  /**
   * Verifica se duas edges se cruzam
   */
  private edgesIntersect(
    edge1: { source: Node; target: Node; waypoints?: Array<{ x: number; y: number }> },
    edge2: { source: Node; target: Node; waypoints?: Array<{ x: number; y: number }> }
  ): boolean {
    // Simplificado: apenas verificar linha direta por enquanto
    const p1 = { x: edge1.source.x, y: edge1.source.y };
    const q1 = { x: edge1.target.x, y: edge1.target.y };
    const p2 = { x: edge2.source.x, y: edge2.source.y };
    const q2 = { x: edge2.target.x, y: edge2.target.y };

    // Pular se compartilham nodes
    if (
      edge1.source.id === edge2.source.id ||
      edge1.source.id === edge2.target.id ||
      edge1.target.id === edge2.source.id ||
      edge1.target.id === edge2.target.id
    ) {
      return false;
    }

    return this.linesIntersect(p1, q1, p2, q2);
  }

  /**
   * Verifica se duas linhas se intersectam
   */
  private linesIntersect(
    p1: { x: number; y: number },
    q1: { x: number; y: number },
    p2: { x: number; y: number },
    q2: { x: number; y: number }
  ): boolean {
    const orientation = (p: { x: number; y: number }, q: { x: number; y: number }, r: { x: number; y: number }) => {
      const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
      if (val === 0) return 0;
      return val > 0 ? 1 : 2;
    };

    const o1 = orientation(p1, q1, p2);
    const o2 = orientation(p1, q1, q2);
    const o3 = orientation(p2, q2, p1);
    const o4 = orientation(p2, q2, q1);

    return o1 !== o2 && o3 !== o4;
  }

  /**
   * Detecta e reporta problemas automaticamente
   */
  private detectAndReportIssues(metrics: LayoutMetrics): void {
    const issues: string[] = [];

    // Verificar sobreposições
    if (metrics.overlapArea > 0) {
      issues.push(`❌ Overlap detected: ${metrics.overlapArea.toFixed(1)}px² total area`);
    }

    // Verificar tempo excessivo
    if (metrics.timeTotal > 5000) {
      issues.push(`⏰ Slow layout: ${metrics.timeTotal.toFixed(1)}ms total time`);
    }

    // Verificar estabilidade baixa
    if (metrics.stabilityIndex < 0.5) {
      issues.push(`📈 Low stability: ${metrics.stabilityIndex.toFixed(3)} index`);
    }

    // Verificar muitos cruzamentos
    if (metrics.numCrossings > metrics.totalEdges * 0.5) {
      issues.push(`🔀 Many crossings: ${metrics.numCrossings} crossings for ${metrics.totalEdges} edges`);
    }

    // Verificar falha
    if (!metrics.success) {
      issues.push(`💥 Layout failed to complete successfully`);
    }

    if (issues.length > 0) {
      console.warn(`⚠️ [Metrics] Issues detected in layout ${metrics.diagramId}:`);
      issues.forEach(issue => console.warn(`  ${issue}`));
    } else {
      console.log(`✅ [Metrics] No issues detected in layout ${metrics.diagramId}`);
    }
  }

  /**
   * Gera relatório de performance
   */
  public generatePerformanceReport(): PerformanceReport {
    if (this.metricsHistory.length === 0) {
      return {
        avgTimeTotal: 0,
        avgStabilityIndex: 0,
        avgOverlapArea: 0,
        successRate: 0,
        totalLayouts: 0,
        trends: { performance: 'stable', stability: 'stable', quality: 'stable' }
      };
    }

    const recent = this.metricsHistory;
    const avgTimeTotal = recent.reduce((sum, m) => sum + m.timeTotal, 0) / recent.length;
    const avgStabilityIndex = recent.reduce((sum, m) => sum + m.stabilityIndex, 0) / recent.length;
    const avgOverlapArea = recent.reduce((sum, m) => sum + m.overlapArea, 0) / recent.length;
    const successRate = recent.filter(m => m.success).length / recent.length;

    // Calcular tendências (comparar primeira e segunda metade)
    const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
    const secondHalf = recent.slice(Math.floor(recent.length / 2));

    const trends = {
      performance: this.calculateTrend(
        firstHalf.reduce((sum, m) => sum + m.timeTotal, 0) / firstHalf.length,
        secondHalf.reduce((sum, m) => sum + m.timeTotal, 0) / secondHalf.length,
        'lower_is_better'
      ),
      stability: this.calculateTrend(
        firstHalf.reduce((sum, m) => sum + m.stabilityIndex, 0) / firstHalf.length,
        secondHalf.reduce((sum, m) => sum + m.stabilityIndex, 0) / secondHalf.length,
        'higher_is_better'
      ),
      quality: this.calculateTrend(
        firstHalf.reduce((sum, m) => sum + m.overlapArea, 0) / firstHalf.length,
        secondHalf.reduce((sum, m) => sum + m.overlapArea, 0) / secondHalf.length,
        'lower_is_better'
      )
    } as const;

    return {
      avgTimeTotal,
      avgStabilityIndex,
      avgOverlapArea,
      successRate,
      totalLayouts: recent.length,
      trends
    };
  }

  /**
   * Calcula tendência baseada em valores antigos vs novos
   */
  private calculateTrend(
    oldValue: number,
    newValue: number,
    direction: 'higher_is_better' | 'lower_is_better'
  ): 'improving' | 'degrading' | 'stable' {
    const threshold = 0.1; // 10% de mudança
    const change = (newValue - oldValue) / oldValue;

    if (Math.abs(change) < threshold) {
      return 'stable';
    }

    if (direction === 'higher_is_better') {
      return change > 0 ? 'improving' : 'degrading';
    } else {
      return change < 0 ? 'improving' : 'degrading';
    }
  }

  /**
   * Exporta snapshots de debug para análise
   */
  public exportDebugSnapshots(diagramId: string): DebugSnapshot[] | null {
    return this.debugSnapshots.get(diagramId) || null;
  }

  /**
   * Exporta métricas em formato JSON para análise externa
   */
  public exportMetrics(diagramId?: string): LayoutMetrics[] {
    if (diagramId) {
      return this.metricsHistory.filter(m => m.diagramId === diagramId);
    }
    return [...this.metricsHistory];
  }

  /**
   * Limpa dados de debug e métricas
   */
  public clearData(diagramId?: string): void {
    if (diagramId) {
      this.debugSnapshots.delete(diagramId);
      this.metricsHistory = this.metricsHistory.filter(m => m.diagramId !== diagramId);
      console.log(`🗑️ [Metrics] Cleared data for diagram: ${diagramId}`);
    } else {
      this.debugSnapshots.clear();
      this.metricsHistory = [];
      console.log(`🗑️ [Metrics] Cleared all metrics data`);
    }
  }

  /**
   * Obtém estatísticas básicas
   */
  public getStats(): {
    totalLayouts: number;
    avgPerformance: number;
    recentSuccessRate: number;
    debugDiagrams: number;
  } {
    const recent10 = this.metricsHistory.slice(-10);
    
    return {
      totalLayouts: this.metricsHistory.length,
      avgPerformance: recent10.length > 0 
        ? recent10.reduce((sum, m) => sum + m.timeTotal, 0) / recent10.length 
        : 0,
      recentSuccessRate: recent10.length > 0 
        ? recent10.filter(m => m.success).length / recent10.length 
        : 0,
      debugDiagrams: this.debugSnapshots.size
    };
  }
}

// Factory para criação do serviço
export function createLayoutMetricsService(): LayoutMetricsService {
  return new LayoutMetricsService();
}