/**
 * EdgeRouterService
 * 
 * Serviço para roteamento inteligente de edges usando A*
 * Evita cruzamentos com nodes e otimiza caminhos
 */

import { Node, Bounds } from './collision-resolver.service';
import { Point } from './element-placement-blocker.service';

export interface Edge {
  id: string;
  source: Node;
  target: Node;
  waypoints?: Point[];
  type?: 'straight' | 'orthogonal' | 'curved';
}

export interface GridCell {
  x: number;
  y: number;
  blocked: boolean;
  cost: number;
}

export interface PathfindingResult {
  path: Point[];
  cost: number;
  success: boolean;
}

export interface RoutingMetrics {
  totalEdges: number;
  reroutedEdges: number;
  avgPathLength: number;
  crossingReduction: number;
}

export class EdgeRouterService {
  private readonly GRID_CELL_SIZE = 20;
  private readonly CLEARANCE = 16;
  private readonly CROSSING_PENALTY = 50;
  
  private grid: GridCell[][] = [];
  private gridWidth: number = 0;
  private gridHeight: number = 0;
  private gridOffsetX: number = 0;
  private gridOffsetY: number = 0;

  /**
   * Roteia edges evitando obstáculos usando A*
   */
  public routeEdges(
    edges: Edge[],
    obstacles: Node[],
    canvasBounds: Bounds
  ): RoutingMetrics {
    console.log(`🛣️ [Edge Router] Starting edge routing for ${edges.length} edges`);
    
    // Preparar grid de pathfinding
    this.initializeGrid(canvasBounds, obstacles);
    
    let reroutedEdges = 0;
    let totalPathLength = 0;
    const originalCrossings = this.countEdgeCrossings(edges);

    // Processar cada edge
    edges.forEach((edge, index) => {
      const needsRerouting = this.edgeNeedsRerouting(edge, obstacles);
      
      if (needsRerouting) {
        console.log(`🔄 [Edge Router] Rerouting edge ${edge.id}`);
        const result = this.routeEdgeAStar(edge);
        
        if (result.success) {
          edge.waypoints = this.optimizeOrthogonalPath(this.simplifyPath(result.path));
          edge.type = 'orthogonal';
          reroutedEdges++;
          totalPathLength += result.cost;
        } else {
          console.warn(`⚠️ [Edge Router] Failed to reroute edge ${edge.id}, using fallback`);
          edge.waypoints = this.createFallbackRoute(edge);
          edge.type = 'orthogonal';
        }
      } else {
        // SEMPRE aplicar offset inteligente para evitar sobreposições visuais
        edge.waypoints = this.createConnectionWithSmartOffset(edge, index, edges);
        edge.type = 'straight';
        totalPathLength += this.calculateDistance(edge.source, edge.target);
        console.log(`📍 [Edge Router] Applied smart offset to edge ${edge.id}`);
      }
    });

    // Calcular métricas finais
    const finalCrossings = this.countEdgeCrossings(edges);
    const avgPathLength = totalPathLength / edges.length;

    const metrics: RoutingMetrics = {
      totalEdges: edges.length,
      reroutedEdges,
      avgPathLength,
      crossingReduction: originalCrossings - finalCrossings
    };

    console.log(`📊 [Edge Router] Routing completed:`, metrics);
    return metrics;
  }

  /**
   * Inicializa grid para pathfinding
   */
  private initializeGrid(canvasBounds: Bounds, obstacles: Node[]): void {
    // Calcular dimensões do grid
    this.gridOffsetX = canvasBounds.x - 100; // Margem extra
    this.gridOffsetY = canvasBounds.y - 100;
    this.gridWidth = Math.ceil((canvasBounds.width + 200) / this.GRID_CELL_SIZE);
    this.gridHeight = Math.ceil((canvasBounds.height + 200) / this.GRID_CELL_SIZE);

    console.log(`🗺️ [Edge Router] Initializing grid: ${this.gridWidth}x${this.gridHeight} cells`);

    // Criar grid limpo
    this.grid = [];
    for (let y = 0; y < this.gridHeight; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.gridWidth; x++) {
        this.grid[y][x] = {
          x,
          y,
          blocked: false,
          cost: 1
        };
      }
    }

    // Marcar obstáculos no grid
    this.markObstacles(obstacles);
  }

  /**
   * Marca obstáculos (nodes inflados) no grid
   */
  private markObstacles(obstacles: Node[]): void {
    obstacles.forEach(obstacle => {
      const inflatedBounds = this.getInflatedNodeBounds(obstacle);
      
      const startX = Math.max(0, Math.floor((inflatedBounds.x - this.gridOffsetX) / this.GRID_CELL_SIZE));
      const endX = Math.min(this.gridWidth - 1, Math.ceil((inflatedBounds.x + inflatedBounds.width - this.gridOffsetX) / this.GRID_CELL_SIZE));
      const startY = Math.max(0, Math.floor((inflatedBounds.y - this.gridOffsetY) / this.GRID_CELL_SIZE));
      const endY = Math.min(this.gridHeight - 1, Math.ceil((inflatedBounds.y + inflatedBounds.height - this.gridOffsetY) / this.GRID_CELL_SIZE));

      // Marcar células como bloqueadas
      for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
          this.grid[y][x].blocked = true;
        }
      }
    });
  }

  /**
   * Roteia uma edge usando algoritmo A*
   */
  private routeEdgeAStar(edge: Edge): PathfindingResult {
    const startPoint = this.worldToGrid(edge.source.x, edge.source.y);
    const endPoint = this.worldToGrid(edge.target.x, edge.target.y);

    // Estruturas para A*
    const openSet = new Set<string>();
    const closedSet = new Set<string>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();
    const cameFrom = new Map<string, Point>();

    const getKey = (p: Point) => `${p.x},${p.y}`;
    const startKey = getKey(startPoint);
    const endKey = getKey(endPoint);

    // Inicializar
    openSet.add(startKey);
    gScore.set(startKey, 0);
    fScore.set(startKey, this.heuristic(startPoint, endPoint));

    while (openSet.size > 0) {
      // Encontrar node com menor fScore
      let current: Point | null = null;
      let currentKey = '';
      let lowestF = Infinity;

      for (const key of Array.from(openSet)) {
        const f = fScore.get(key) || Infinity;
        if (f < lowestF) {
          lowestF = f;
          currentKey = key;
          const coords = key.split(',').map(Number);
          current = { x: coords[0], y: coords[1] };
        }
      }

      if (!current) break;

      // Chegou ao destino
      if (currentKey === endKey) {
        const path = this.reconstructPath(cameFrom, current);
        return {
          path: path.map(p => this.gridToWorld(p.x, p.y)),
          cost: gScore.get(currentKey) || 0,
          success: true
        };
      }

      openSet.delete(currentKey);
      closedSet.add(currentKey);

      // Explorar vizinhos (4-conectividade para rotas ortogonais)
      const neighbors = [
        { x: current!.x + 1, y: current!.y }, // Direita
        { x: current!.x - 1, y: current!.y }, // Esquerda
        { x: current!.x, y: current!.y + 1 }, // Baixo
        { x: current!.x, y: current!.y - 1 }  // Cima
      ];

      neighbors.forEach(neighbor => {
        const neighborKey = getKey(neighbor);

        // Verificar limites e obstáculos
        if (
          neighbor.x < 0 || neighbor.x >= this.gridWidth ||
          neighbor.y < 0 || neighbor.y >= this.gridHeight ||
          this.grid[neighbor.y][neighbor.x].blocked ||
          closedSet.has(neighborKey)
        ) {
          return;
        }

        const tentativeGScore = (gScore.get(currentKey) || 0) + this.getMovementCost(current!, neighbor);

        if (!openSet.has(neighborKey)) {
          openSet.add(neighborKey);
        } else if (tentativeGScore >= (gScore.get(neighborKey) || Infinity)) {
          return;
        }

        // Melhor caminho até aqui
        cameFrom.set(neighborKey, current!);
        gScore.set(neighborKey, tentativeGScore);
        fScore.set(neighborKey, tentativeGScore + this.heuristic(neighbor, endPoint));
      });
    }

    // Falha no pathfinding
    return {
      path: [],
      cost: 0,
      success: false
    };
  }

  /**
   * Heurística para A* (distância Manhattan)
   */
  private heuristic(a: Point, b: Point): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  /**
   * Custo de movimento entre células adjacentes
   */
  private getMovementCost(from: Point, to: Point): number {
    const baseCost = 1;
    const cell = this.grid[to.y][to.x];
    
    // Penalizar mudanças de direção para favorecer linhas retas
    const directionPenalty = 0.1;
    
    return baseCost + cell.cost + directionPenalty;
  }

  /**
   * Reconstrói o caminho a partir do mapa cameFrom
   */
  private reconstructPath(cameFrom: Map<string, Point>, current: Point): Point[] {
    const path = [current];
    const getKey = (p: Point) => `${p.x},${p.y}`;
    
    let currentKey = getKey(current);
    while (cameFrom.has(currentKey)) {
      current = cameFrom.get(currentKey)!;
      path.unshift(current);
      currentKey = getKey(current);
    }
    
    return path;
  }

  /**
   * Simplifica caminho removendo pontos redundantes
   */
  private simplifyPath(path: Point[]): Point[] {
    if (path.length <= 2) return path;

    const simplified = [path[0]];
    
    for (let i = 1; i < path.length - 1; i++) {
      const prev = path[i - 1];
      const current = path[i];
      const next = path[i + 1];
      
      // Manter ponto se mudança de direção
      const dx1 = current.x - prev.x;
      const dy1 = current.y - prev.y;
      const dx2 = next.x - current.x;
      const dy2 = next.y - current.y;
      
      if (dx1 !== dx2 || dy1 !== dy2) {
        simplified.push(current);
      }
    }
    
    simplified.push(path[path.length - 1]);
    return simplified;
  }

  /**
   * Verifica se edge precisa de roteamento
   */
  private edgeNeedsRerouting(edge: Edge, obstacles: Node[]): boolean {
    // Verificar interseção com obstáculos
    const intersectsObstacle = obstacles.some(obstacle => {
      if (obstacle.id === edge.source.id || obstacle.id === edge.target.id) {
        return false; // Pular source e target
      }
      
      return this.lineIntersectsNode(edge.source, edge.target, obstacle);
    });

    // Aplicar roteamento automático para layouts organizados (sempre rotear para melhor aparência)
    const isOrganizedLayout = this.isOrganizedLayoutPattern(obstacles);
    
    return intersectsObstacle || isOrganizedLayout;
  }

  /**
   * Detecta se é um layout organizado que se beneficia de roteamento
   */
  private isOrganizedLayoutPattern(obstacles: Node[]): boolean {
    if (obstacles.length < 3) return false;
    
    // Para layouts Hub-Ring-Chain bem organizados, NÃO aplicar roteamento complexo
    // As conexões diretas funcionam melhor
    const isHubRingPattern = this.detectHubRingPattern(obstacles);
    
    if (isHubRingPattern) {
      console.log('🎯 [Edge Router] Hub-Ring pattern detected - using direct connections');
      return false; // Usar conexões diretas simples
    }
    
    // Para outros padrões complexos, aplicar roteamento
    const positions = obstacles.map(node => ({ x: node.x, y: node.y }));
    const yPositions = positions.map(p => Math.round(p.y / 50) * 50);
    const uniqueYs = Array.from(new Set(yPositions));
    
    return uniqueYs.length >= 3; // Apenas para layouts muito complexos
  }

  /**
   * Detecta padrão Hub-Ring-Chain
   */
  private detectHubRingPattern(obstacles: Node[]): boolean {
    // Procurar por elemento central (hub)
    const centerX = obstacles.reduce((sum, node) => sum + node.x, 0) / obstacles.length;
    const centerY = obstacles.reduce((sum, node) => sum + node.y, 0) / obstacles.length;
    
    // Encontrar elemento mais próximo do centro
    let closestToCenter = obstacles[0];
    let minDistanceToCenter = Infinity;
    
    obstacles.forEach(node => {
      const distance = Math.sqrt(Math.pow(node.x - centerX, 2) + Math.pow(node.y - centerY, 2));
      if (distance < minDistanceToCenter) {
        minDistanceToCenter = distance;
        closestToCenter = node;
      }
    });
    
    // Se há um elemento claramente central com outros ao redor, é Hub-Ring
    const elementsAroundHub = obstacles.filter(node => {
      if (node === closestToCenter) return false;
      const distanceToHub = Math.sqrt(Math.pow(node.x - closestToCenter.x, 2) + Math.pow(node.y - closestToCenter.y, 2));
      return distanceToHub > 200; // Distância mínima para ser considerado "ao redor"
    });
    
    return elementsAroundHub.length >= 3; // Hub com pelo menos 3 elementos ao redor
  }

  /**
   * Otimiza caminho para ser mais ortogonal e organizado
   */
  private optimizeOrthogonalPath(path: Point[]): Point[] {
    if (path.length <= 2) return path;

    const optimized = [path[0]]; // Sempre manter o primeiro ponto
    
    for (let i = 1; i < path.length - 1; i++) {
      const prev = optimized[optimized.length - 1];
      const current = path[i];
      const next = path[i + 1];
      
      // Preferir movimentos ortogonais (horizontal ou vertical)
      const isHorizontalMove = Math.abs(current.x - prev.x) > Math.abs(current.y - prev.y);
      
      if (isHorizontalMove) {
        // Movimento principalmente horizontal - alinhar Y com o anterior
        optimized.push({ x: current.x, y: prev.y });
        if (current.y !== next.y) {
          // Adicionar ponto vertical se necessário
          optimized.push({ x: current.x, y: current.y });
        }
      } else {
        // Movimento principalmente vertical - alinhar X com o anterior  
        optimized.push({ x: prev.x, y: current.y });
        if (current.x !== next.x) {
          // Adicionar ponto horizontal se necessário
          optimized.push({ x: current.x, y: current.y });
        }
      }
    }
    
    optimized.push(path[path.length - 1]); // Sempre manter o último ponto
    
    return optimized;
  }

  /**
   * Verifica se linha intersecta node inflado
   */
  private lineIntersectsNode(start: Point, end: Point, node: Node): boolean {
    const bounds = this.getInflatedNodeBounds(node);
    return this.lineIntersectsRectangle(start, end, bounds);
  }

  /**
   * Verifica se linha intersecta retângulo
   */
  private lineIntersectsRectangle(start: Point, end: Point, rect: Bounds): boolean {
    // Verificar se pontos estão dentro do retângulo
    if (this.pointInRectangle(start, rect) || this.pointInRectangle(end, rect)) {
      return true;
    }

    // Verificar interseção com bordas do retângulo
    const corners = [
      { x: rect.x, y: rect.y },
      { x: rect.x + rect.width, y: rect.y },
      { x: rect.x + rect.width, y: rect.y + rect.height },
      { x: rect.x, y: rect.y + rect.height }
    ];

    for (let i = 0; i < corners.length; i++) {
      const corner1 = corners[i];
      const corner2 = corners[(i + 1) % corners.length];
      
      if (this.linesIntersect(start, end, corner1, corner2)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Verifica se ponto está dentro do retângulo
   */
  private pointInRectangle(point: Point, rect: Bounds): boolean {
    return (
      point.x >= rect.x &&
      point.x <= rect.x + rect.width &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.height
    );
  }

  /**
   * Verifica se duas linhas se intersectam
   */
  private linesIntersect(p1: Point, q1: Point, p2: Point, q2: Point): boolean {
    const orientation = (p: Point, q: Point, r: Point) => {
      const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
      if (val === 0) return 0; // Colinear
      return val > 0 ? 1 : 2; // Clockwise ou Counterclockwise
    };

    const o1 = orientation(p1, q1, p2);
    const o2 = orientation(p1, q1, q2);
    const o3 = orientation(p2, q2, p1);
    const o4 = orientation(p2, q2, q1);

    return o1 !== o2 && o3 !== o4;
  }

  /**
   * Conta cruzamentos entre edges
   */
  private countEdgeCrossings(edges: Edge[]): number {
    let crossings = 0;
    
    for (let i = 0; i < edges.length; i++) {
      for (let j = i + 1; j < edges.length; j++) {
        const edge1 = edges[i];
        const edge2 = edges[j];
        
        // Pular se compartilham nodes
        if (
          edge1.source.id === edge2.source.id ||
          edge1.source.id === edge2.target.id ||
          edge1.target.id === edge2.source.id ||
          edge1.target.id === edge2.target.id
        ) {
          continue;
        }
        
        const start1 = { x: edge1.source.x, y: edge1.source.y };
        const end1 = { x: edge1.target.x, y: edge1.target.y };
        const start2 = { x: edge2.source.x, y: edge2.source.y };
        const end2 = { x: edge2.target.x, y: edge2.target.y };
        
        if (this.linesIntersect(start1, end1, start2, end2)) {
          crossings++;
        }
      }
    }
    
    return crossings;
  }

  /**
   * Cria rota de fallback para edges que falharam no A*
   */
  private createFallbackRoute(edge: Edge): Point[] {
    return this.createSimpleOrthogonalRoute(edge.source, edge.target);
  }

  /**
   * Cria rota ortogonal simples (sem A*)
   */
  private createSimpleOrthogonalRoute(source: Point, target: Point): Point[] {
    const offsetDistance = 30; // Distância para evitar sobreposições
    
    // Calcular direção predominante
    const deltaX = target.x - source.x;
    const deltaY = target.y - source.y;
    const isHorizontalPrimary = Math.abs(deltaX) > Math.abs(deltaY);
    
    if (isHorizontalPrimary) {
      // Movimento predominantemente horizontal
      const midX = source.x + deltaX * 0.6;
      const offsetY = deltaY > 0 ? source.y + offsetDistance : source.y - offsetDistance;
      
      return [
        { x: source.x, y: source.y },
        { x: midX, y: source.y },
        { x: midX, y: offsetY },
        { x: midX, y: target.y },
        { x: target.x, y: target.y }
      ];
    } else {
      // Movimento predominantemente vertical
      const midY = source.y + deltaY * 0.6;
      const offsetX = deltaX > 0 ? source.x + offsetDistance : source.x - offsetDistance;
      
      return [
        { x: source.x, y: source.y },
        { x: source.x, y: midY },
        { x: offsetX, y: midY },
        { x: target.x, y: midY },
        { x: target.x, y: target.y }
      ];
    }
  }

  /**
   * Cria conexão com offset inteligente baseado na direção e outras conexões
   */
  private createConnectionWithSmartOffset(edge: Edge, index: number, allEdges: Edge[]): Point[] {
    const offsetAmount = 8; // Pixels de offset maior para visibilidade
    
    // Calcular direção da conexão
    const deltaX = edge.target.x - edge.source.x;
    const deltaY = edge.target.y - edge.source.y;
    const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    if (length === 0) {
      return [
        { x: edge.source.x, y: edge.source.y },
        { x: edge.target.x, y: edge.target.y }
      ];
    }
    
    // Vetor perpendicular normalizado para offset lateral
    const perpX = -deltaY / length; 
    const perpY = deltaX / length;
    
    // Offset baseado no índice (-2, -1, 0, 1, 2...)
    const offsetMultiplier = (index % 5) - 2; // -2, -1, 0, 1, 2
    
    // Aplicar offset perpendicular à direção da conexão
    const offsetX = perpX * offsetAmount * offsetMultiplier;
    const offsetY = perpY * offsetAmount * offsetMultiplier;
    
    return [
      { x: edge.source.x + offsetX, y: edge.source.y + offsetY },
      { x: edge.target.x + offsetX, y: edge.target.y + offsetY }
    ];
  }

  /**
   * Cria conexão simples com offset para evitar sobreposições (método antigo)
   */
  private createSimpleConnectionWithOffset(edge: Edge, index: number): Point[] {
    const offsetAmount = 5; // Pixels de offset
    const offsetDirection = (index % 4) - 1.5; // -1.5, -0.5, 0.5, 1.5
    
    const sourceX = edge.source.x + (offsetDirection * offsetAmount);
    const sourceY = edge.source.y + (offsetDirection * offsetAmount);
    const targetX = edge.target.x + (offsetDirection * offsetAmount);
    const targetY = edge.target.y + (offsetDirection * offsetAmount);
    
    return [
      { x: sourceX, y: sourceY },
      { x: targetX, y: targetY }
    ];
  }

  /**
   * Obtém bounds inflados de um node
   */
  private getInflatedNodeBounds(node: Node): Bounds {
    return {
      x: node.x - node.width / 2 - this.CLEARANCE,
      y: node.y - node.height / 2 - this.CLEARANCE,
      width: node.width + 2 * this.CLEARANCE,
      height: node.height + 2 * this.CLEARANCE
    };
  }

  /**
   * Converte coordenadas do mundo para grid
   */
  private worldToGrid(worldX: number, worldY: number): Point {
    return {
      x: Math.floor((worldX - this.gridOffsetX) / this.GRID_CELL_SIZE),
      y: Math.floor((worldY - this.gridOffsetY) / this.GRID_CELL_SIZE)
    };
  }

  /**
   * Converte coordenadas do grid para mundo
   */
  private gridToWorld(gridX: number, gridY: number): Point {
    return {
      x: gridX * this.GRID_CELL_SIZE + this.gridOffsetX + this.GRID_CELL_SIZE / 2,
      y: gridY * this.GRID_CELL_SIZE + this.gridOffsetY + this.GRID_CELL_SIZE / 2
    };
  }

  /**
   * Calcula distância euclidiana
   */
  private calculateDistance(p1: Point, p2: Point): number {
    return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
  }
}

// Factory para criação do serviço
export function createEdgeRouterService(): EdgeRouterService {
  return new EdgeRouterService();
}