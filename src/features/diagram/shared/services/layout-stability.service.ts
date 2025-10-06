/**
 * LayoutStabilityService
 * 
 * Serviço para preservar estabilidade visual e "mental map"
 * Gerencia cache de posições e smoothing entre layouts
 */

import { Node } from './collision-resolver.service';

export interface PositionSnapshot {
  timestamp: number;
  positions: Map<string, { x: number; y: number }>;
  metadata?: {
    diagramHash: string;
    nodeCount: number;
    edgeCount: number;
  };
}

export interface StabilityMetrics {
  totalDisplacement: number;
  maxDisplacement: number;
  avgDisplacement: number;
  stabilityIndex: number; // 0-1, onde 1 é perfeitamente estável
  nodesChanged: number;
}

export interface SmoothingOptions {
  alpha: number; // 0-1, fator de blending (0 = apenas old, 1 = apenas new)
  maxDisplacement?: number; // Limitador de movimento máximo
  mode: 'interactive' | 'export' | 'auto';
}

export class LayoutStabilityService {
  private positionHistory: Map<string, PositionSnapshot[]> = new Map();
  private readonly MAX_HISTORY_SIZE = 10;
  private readonly STABILITY_THRESHOLD = 50; // pixels

  // Modos predefinidos de smoothing
  private readonly SMOOTHING_MODES: Record<string, SmoothingOptions> = {
    interactive: { alpha: 0.3, maxDisplacement: 100, mode: 'interactive' },
    export: { alpha: 0.9, maxDisplacement: undefined, mode: 'export' },
    auto: { alpha: 0.5, maxDisplacement: 150, mode: 'auto' }
  };

  /**
   * Salva snapshot das posições atuais
   */
  public savePositionSnapshot(
    diagramId: string,
    nodes: Node[],
    metadata?: { diagramHash: string; nodeCount: number; edgeCount: number }
  ): void {
    console.log(`💾 [Stability] Saving position snapshot for diagram: ${diagramId}`);

    const positions = new Map<string, { x: number; y: number }>();
    nodes.forEach(node => {
      positions.set(node.id, { x: node.x, y: node.y });
    });

    const snapshot: PositionSnapshot = {
      timestamp: Date.now(),
      positions,
      metadata
    };

    // Gerenciar histórico
    if (!this.positionHistory.has(diagramId)) {
      this.positionHistory.set(diagramId, []);
    }

    const history = this.positionHistory.get(diagramId)!;
    history.push(snapshot);

    // Limitar tamanho do histórico
    if (history.length > this.MAX_HISTORY_SIZE) {
      history.shift();
    }

    console.log(`📚 [Stability] History size for ${diagramId}: ${history.length} snapshots`);
  }

  /**
   * Aplica smoothing entre posições antigas e novas
   */
  public applySmoothTransition(
    diagramId: string,
    newNodes: Node[],
    options: SmoothingOptions | string = 'auto'
  ): StabilityMetrics {
    console.log(`🎨 [Stability] Applying smooth transition for diagram: ${diagramId}`);

    // Resolver opções
    const smoothingOptions = typeof options === 'string' 
      ? this.SMOOTHING_MODES[options] || this.SMOOTHING_MODES.auto
      : options;

    console.log(`⚙️ [Stability] Smoothing options:`, smoothingOptions);

    // Obter posições anteriores
    const previousPositions = this.getLatestPositions(diagramId);
    if (!previousPositions || previousPositions.size === 0) {
      console.log(`ℹ️ [Stability] No previous positions found, using new positions as-is`);
      return this.calculateStabilityMetrics(new Map(), newNodes);
    }

    // Aplicar blend
    const originalPositions = new Map<string, { x: number; y: number }>();
    let totalDisplacement = 0;
    let maxDisplacement = 0;
    let nodesChanged = 0;

    newNodes.forEach(node => {
      const previousPos = previousPositions.get(node.id);
      originalPositions.set(node.id, { x: node.x, y: node.y });

      if (previousPos) {
        // Calcular displacement
        const dx = node.x - previousPos.x;
        const dy = node.y - previousPos.y;
        const displacement = Math.sqrt(dx * dx + dy * dy);

        totalDisplacement += displacement;
        maxDisplacement = Math.max(maxDisplacement, displacement);

        if (displacement > this.STABILITY_THRESHOLD) {
          nodesChanged++;
        }

        // Aplicar smoothing
        const blendedX = previousPos.x + dx * smoothingOptions.alpha;
        const blendedY = previousPos.y + dy * smoothingOptions.alpha;

        // Aplicar limitador de movimento se especificado
        if (smoothingOptions.maxDisplacement) {
          const blendedDx = blendedX - previousPos.x;
          const blendedDy = blendedY - previousPos.y;
          const blendedDisplacement = Math.sqrt(blendedDx * blendedDx + blendedDy * blendedDy);

          if (blendedDisplacement > smoothingOptions.maxDisplacement) {
            const scale = smoothingOptions.maxDisplacement / blendedDisplacement;
            node.x = previousPos.x + blendedDx * scale;
            node.y = previousPos.y + blendedDy * scale;
          } else {
            node.x = blendedX;
            node.y = blendedY;
          }
        } else {
          node.x = blendedX;
          node.y = blendedY;
        }

        console.log(`📍 [Stability] Node "${node.id}": displacement ${displacement.toFixed(1)}px → blended to (${node.x.toFixed(1)}, ${node.y.toFixed(1)})`);
      }
    });

    // Calcular métricas
    const avgDisplacement = newNodes.length > 0 ? totalDisplacement / newNodes.length : 0;
    const stabilityIndex = Math.max(0, 1 - (avgDisplacement / 200)); // Normalizar para 0-1

    const metrics: StabilityMetrics = {
      totalDisplacement,
      maxDisplacement,
      avgDisplacement,
      stabilityIndex,
      nodesChanged
    };

    console.log(`📊 [Stability] Transition metrics:`, metrics);
    return metrics;
  }

  /**
   * Obtém as posições mais recentes de um diagrama
   */
  public getLatestPositions(diagramId: string): Map<string, { x: number; y: number }> | null {
    const history = this.positionHistory.get(diagramId);
    if (!history || history.length === 0) {
      return null;
    }

    return history[history.length - 1].positions;
  }

  /**
   * Verifica se posições mudaram significativamente
   */
  public hasSignificantChange(
    diagramId: string,
    currentNodes: Node[],
    threshold: number = this.STABILITY_THRESHOLD
  ): boolean {
    const previousPositions = this.getLatestPositions(diagramId);
    if (!previousPositions) {
      return true; // Primeira vez = mudança significativa
    }

    let significantChanges = 0;
    
    for (const node of currentNodes) {
      const previousPos = previousPositions.get(node.id);
      if (previousPos) {
        const displacement = Math.sqrt(
          (node.x - previousPos.x) ** 2 + (node.y - previousPos.y) ** 2
        );
        
        if (displacement > threshold) {
          significantChanges++;
        }
      } else {
        significantChanges++; // Node novo
      }
    }

    // Se mais de 30% dos nodes mudaram significativamente
    const changeRatio = significantChanges / currentNodes.length;
    return changeRatio > 0.3;
  }

  /**
   * Calcula métricas de estabilidade
   */
  public calculateStabilityMetrics(
    previousPositions: Map<string, { x: number; y: number }>,
    currentNodes: Node[]
  ): StabilityMetrics {
    let totalDisplacement = 0;
    let maxDisplacement = 0;
    let nodesChanged = 0;

    for (const node of currentNodes) {
      const previousPos = previousPositions.get(node.id);
      if (previousPos) {
        const displacement = Math.sqrt(
          (node.x - previousPos.x) ** 2 + (node.y - previousPos.y) ** 2
        );

        totalDisplacement += displacement;
        maxDisplacement = Math.max(maxDisplacement, displacement);

        if (displacement > this.STABILITY_THRESHOLD) {
          nodesChanged++;
        }
      } else {
        nodesChanged++; // Node novo conta como mudança
      }
    }

    const avgDisplacement = currentNodes.length > 0 ? totalDisplacement / currentNodes.length : 0;
    const stabilityIndex = Math.max(0, 1 - (avgDisplacement / 200));

    return {
      totalDisplacement,
      maxDisplacement,
      avgDisplacement,
      stabilityIndex,
      nodesChanged
    };
  }

  /**
   * Otimiza posições para minimizar movimento desde última posição
   */
  public optimizeForStability(
    diagramId: string,
    nodes: Node[],
    maxIterations: number = 5
  ): StabilityMetrics {
    console.log(`🎯 [Stability] Optimizing positions for stability (${maxIterations} iterations)`);

    const previousPositions = this.getLatestPositions(diagramId);
    if (!previousPositions) {
      return this.calculateStabilityMetrics(new Map(), nodes);
    }

    let bestPositions = nodes.map(node => ({ ...node }));
    let bestStability = this.calculateStabilityMetrics(previousPositions, nodes);

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      // Aplicar força de atração para posições anteriores
      nodes.forEach(node => {
        const previousPos = previousPositions.get(node.id);
        if (previousPos) {
          const force = 0.1; // Força de atração
          node.x += (previousPos.x - node.x) * force;
          node.y += (previousPos.y - node.y) * force;
        }
      });

      // Avaliar nova estabilidade
      const currentStability = this.calculateStabilityMetrics(previousPositions, nodes);
      
      if (currentStability.stabilityIndex > bestStability.stabilityIndex) {
        bestPositions = nodes.map(node => ({ ...node }));
        bestStability = currentStability;
      }

      console.log(`🔄 [Stability] Iteration ${iteration + 1}: stability index ${currentStability.stabilityIndex.toFixed(3)}`);
    }

    // Aplicar melhores posições
    nodes.forEach((node, index) => {
      node.x = bestPositions[index].x;
      node.y = bestPositions[index].y;
    });

    console.log(`✅ [Stability] Optimization completed: final stability index ${bestStability.stabilityIndex.toFixed(3)}`);
    return bestStability;
  }

  /**
   * Limpa histórico de posições
   */
  public clearHistory(diagramId?: string): void {
    if (diagramId) {
      this.positionHistory.delete(diagramId);
      console.log(`🗑️ [Stability] Cleared history for diagram: ${diagramId}`);
    } else {
      this.positionHistory.clear();
      console.log(`🗑️ [Stability] Cleared all position history`);
    }
  }

  /**
   * Obtém estatísticas do histórico
   */
  public getHistoryStats(): { totalDiagrams: number; totalSnapshots: number; oldestSnapshot?: number } {
    let totalSnapshots = 0;
    let oldestSnapshot: number | undefined;

    Array.from(this.positionHistory.values()).forEach(history => {
      totalSnapshots += history.length;
      
      if (history.length > 0) {
        const firstTimestamp = history[0].timestamp;
        if (!oldestSnapshot || firstTimestamp < oldestSnapshot) {
          oldestSnapshot = firstTimestamp;
        }
      }
    });

    return {
      totalDiagrams: this.positionHistory.size,
      totalSnapshots,
      oldestSnapshot
    };
  }

  /**
   * Cria hash do diagrama para detectar mudanças estruturais
   */
  public createDiagramHash(nodes: Node[], edges: Array<{source: string, target: string}>): string {
    // Criar hash baseado na estrutura (não posições)
    const nodeIds = nodes.map(n => n.id).sort().join(',');
    const edgeIds = edges.map(e => `${e.source}-${e.target}`).sort().join(',');
    
    // Hash simples para comparação
    const combined = `${nodeIds}|${edgeIds}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * Detecta se houve mudança estrutural (nodes/edges adicionados/removidos)
   */
  public detectStructuralChange(
    diagramId: string,
    currentHash: string
  ): boolean {
    const history = this.positionHistory.get(diagramId);
    if (!history || history.length === 0) {
      return true; // Primeira vez = mudança estrutural
    }

    const latestSnapshot = history[history.length - 1];
    const previousHash = latestSnapshot.metadata?.diagramHash;
    
    return previousHash !== currentHash;
  }
}

// Factory para criação do serviço
export function createLayoutStabilityService(): LayoutStabilityService {
  return new LayoutStabilityService();
}