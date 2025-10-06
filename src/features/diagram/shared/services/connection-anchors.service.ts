/**
 * Connection Anchors Service
 * Serviço para calcular pontos de ancoragem inteligentes em elementos ER
 * Evita sobreposições de conexões nos mesmos pontos
 */

export interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AnchorPoint {
  x: number;
  y: number;
  side: 'top' | 'right' | 'bottom' | 'left';
  occupied: boolean;
  connectionId?: string;
}

export interface ConnectionInfo {
  id: string;
  fromElementId: string;
  toElementId: string;
  fromPoint?: AnchorPoint;
  toPoint?: AnchorPoint;
}

export class ConnectionAnchorsService {
  private elementAnchors: Map<string, AnchorPoint[]> = new Map();
  private connections: Map<string, ConnectionInfo> = new Map();
  
  // Configurações dos pontos de ancoragem
  private anchorConfig = {
    pointsPerSide: 3,        // Quantos pontos por lado do elemento
    marginFromEdge: 0.15,    // Margem das bordas (15% da largura/altura)
    preferredSides: ['top', 'right', 'bottom', 'left'] as const
  };

  /**
   * Gera pontos de ancoragem para um elemento
   */
  public generateAnchorPoints(elementId: string, bounds: ElementBounds): AnchorPoint[] {
    const { x, y, width, height } = bounds;
    const points: AnchorPoint[] = [];
    const { pointsPerSide, marginFromEdge } = this.anchorConfig;

    // Calcular margens
    const marginX = width * marginFromEdge;
    const marginY = height * marginFromEdge;

    // Pontos no topo
    for (let i = 0; i < pointsPerSide; i++) {
      const xPos = x + marginX + (i * (width - 2 * marginX)) / (pointsPerSide - 1);
      points.push({
        x: Math.round(xPos),
        y: y,
        side: 'top',
        occupied: false
      });
    }

    // Pontos na direita
    for (let i = 0; i < pointsPerSide; i++) {
      const yPos = y + marginY + (i * (height - 2 * marginY)) / (pointsPerSide - 1);
      points.push({
        x: x + width,
        y: Math.round(yPos),
        side: 'right',
        occupied: false
      });
    }

    // Pontos embaixo
    for (let i = 0; i < pointsPerSide; i++) {
      const xPos = x + marginX + (i * (width - 2 * marginX)) / (pointsPerSide - 1);
      points.push({
        x: Math.round(xPos),
        y: y + height,
        side: 'bottom',
        occupied: false
      });
    }

    // Pontos na esquerda
    for (let i = 0; i < pointsPerSide; i++) {
      const yPos = y + marginY + (i * (height - 2 * marginY)) / (pointsPerSide - 1);
      points.push({
        x: x,
        y: Math.round(yPos),
        side: 'left',
        occupied: false
      });
    }

    this.elementAnchors.set(elementId, points);
    console.log(`🔗 [Anchors] Generated ${points.length} anchor points for "${elementId}"`);
    
    return points;
  }

  /**
   * Encontra o melhor par de pontos de ancoragem para uma conexão
   */
  public findOptimalAnchorPair(
    fromElementId: string,
    toElementId: string,
    fromBounds: ElementBounds,
    toBounds: ElementBounds
  ): { fromPoint: AnchorPoint; toPoint: AnchorPoint } {
    
    // Garantir que temos pontos de ancoragem para ambos os elementos
    if (!this.elementAnchors.has(fromElementId)) {
      this.generateAnchorPoints(fromElementId, fromBounds);
    }
    if (!this.elementAnchors.has(toElementId)) {
      this.generateAnchorPoints(toElementId, toBounds);
    }

    const fromPoints = this.elementAnchors.get(fromElementId)!;
    const toPoints = this.elementAnchors.get(toElementId)!;

    // Calcular direção geral entre elementos
    const direction = this.calculateDirection(fromBounds, toBounds);
    
    // Filtrar pontos preferenciais baseados na direção
    const fromCandidates = this.getPreferredPoints(fromPoints, direction.from);
    const toCandidates = this.getPreferredPoints(toPoints, direction.to);

    // Encontrar a melhor combinação (menor distância + pontos livres)
    let bestPair: { fromPoint: AnchorPoint; toPoint: AnchorPoint; score: number } | null = null;

    for (const fromPoint of fromCandidates) {
      for (const toPoint of toCandidates) {
        const distance = this.calculateDistance(fromPoint, toPoint);
        const occupancyPenalty = (fromPoint.occupied ? 100 : 0) + (toPoint.occupied ? 100 : 0);
        const score = distance + occupancyPenalty;

        if (!bestPair || score < bestPair.score) {
          bestPair = { fromPoint, toPoint, score };
        }
      }
    }

    if (!bestPair) {
      // Fallback: usar pontos centrais
      const fromCenter = this.getCenterPoint(fromPoints);
      const toCenter = this.getCenterPoint(toPoints);
      bestPair = { fromPoint: fromCenter, toPoint: toCenter, score: 0 };
    }

    console.log(`🎯 [Anchors] Optimal anchor pair for ${fromElementId}->${toElementId}: ${bestPair.fromPoint.side} to ${bestPair.toPoint.side}`);
    
    return { fromPoint: bestPair.fromPoint, toPoint: bestPair.toPoint };
  }

  /**
   * Registra uma conexão e marca pontos como ocupados
   */
  public registerConnection(connectionInfo: ConnectionInfo): void {
    this.connections.set(connectionInfo.id, connectionInfo);
    
    if (connectionInfo.fromPoint) {
      connectionInfo.fromPoint.occupied = true;
      connectionInfo.fromPoint.connectionId = connectionInfo.id;
    }
    
    if (connectionInfo.toPoint) {
      connectionInfo.toPoint.occupied = true;
      connectionInfo.toPoint.connectionId = connectionInfo.id;
    }

    console.log(`📌 [Anchors] Registered connection "${connectionInfo.id}"`);
  }

  /**
   * Remove uma conexão e libera pontos de ancoragem
   */
  public unregisterConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      if (connection.fromPoint) {
        connection.fromPoint.occupied = false;
        connection.fromPoint.connectionId = undefined;
      }
      if (connection.toPoint) {
        connection.toPoint.occupied = false;
        connection.toPoint.connectionId = undefined;
      }
      this.connections.delete(connectionId);
      console.log(`🗑️ [Anchors] Unregistered connection "${connectionId}"`);
    }
  }

  /**
   * Limpa todos os pontos de ancoragem
   */
  public clearAll(): void {
    this.elementAnchors.clear();
    this.connections.clear();
    console.log('🧹 [Anchors] Cleared all anchor points');
  }

  /**
   * Calcula direção preferencial entre dois elementos
   */
  private calculateDirection(fromBounds: ElementBounds, toBounds: ElementBounds): { from: string; to: string } {
    const fromCenterX = fromBounds.x + fromBounds.width / 2;
    const fromCenterY = fromBounds.y + fromBounds.height / 2;
    const toCenterX = toBounds.x + toBounds.width / 2;
    const toCenterY = toBounds.y + toBounds.height / 2;

    const deltaX = toCenterX - fromCenterX;
    const deltaY = toCenterY - fromCenterY;

    // Determinar lado preferencial baseado na maior diferença
    let fromSide: string, toSide: string;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Movimento predominantemente horizontal
      fromSide = deltaX > 0 ? 'right' : 'left';
      toSide = deltaX > 0 ? 'left' : 'right';
    } else {
      // Movimento predominantemente vertical
      fromSide = deltaY > 0 ? 'bottom' : 'top';
      toSide = deltaY > 0 ? 'top' : 'bottom';
    }

    return { from: fromSide, to: toSide };
  }

  /**
   * Filtra pontos preferenciais baseados no lado
   */
  private getPreferredPoints(points: AnchorPoint[], preferredSide: string): AnchorPoint[] {
    const preferred = points.filter(p => p.side === preferredSide);
    return preferred.length > 0 ? preferred : points;
  }

  /**
   * Calcula distância entre dois pontos
   */
  private calculateDistance(point1: AnchorPoint, point2: AnchorPoint): number {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Obtém ponto central como fallback
   */
  private getCenterPoint(points: AnchorPoint[]): AnchorPoint {
    const centerIndex = Math.floor(points.length / 2);
    return points[centerIndex] || points[0];
  }

  /**
   * Obtém estatísticas dos pontos de ancoragem
   */
  public getStats(): { totalElements: number; totalConnections: number; occupancyRate: number } {
    const totalPoints = Array.from(this.elementAnchors.values()).reduce((sum, points) => sum + points.length, 0);
    const occupiedPoints = Array.from(this.elementAnchors.values())
      .flat()
      .filter(p => p.occupied).length;

    return {
      totalElements: this.elementAnchors.size,
      totalConnections: this.connections.size,
      occupancyRate: totalPoints > 0 ? (occupiedPoints / totalPoints) * 100 : 0
    };
  }
}