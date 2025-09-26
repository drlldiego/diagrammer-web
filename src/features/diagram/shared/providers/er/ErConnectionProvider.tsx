/**
 * ErConnectionProvider - Provider customizado para pontos de ancoragem de elementos ER
 * Resolve o problema de conexões se ligarem a pontos retangulares em vez dos vértices losangulares
 */

interface Element {
  id: string;
  type: string;
  width: number;
  height: number;
  x: number;
  y: number;
  businessObject?: {
    erType?: string;
    [key: string]: any;
  };
}

interface Point {
  x: number;
  y: number;
}

interface Direction {
  x: number;
  y: number;
}

export default class ErConnectionProvider {
  static $inject = ['connectionDocking'];
  
  private _connectionDocking: any;
  private _originalGetDockingPoint: any;
  private _enableDiamondDocking: boolean = false; // Temporariamente desabilitado

  constructor(connectionDocking: any) {
    this._connectionDocking = connectionDocking;
    this._originalGetDockingPoint = connectionDocking.getDockingPoint.bind(connectionDocking);
    
    // Override conservador do método getDockingPoint 
    connectionDocking.getDockingPoint = (connection: any, shape: Element, dockStart: boolean): any => {
      try {
        // TEMPORÁRIO: Sempre usar implementação padrão até resolvermos o problema
        if (!this._enableDiamondDocking) {
          return this._originalGetDockingPoint(connection, shape, dockStart);
        }
        
        // Primeiro, obter o resultado original
        const originalResult = this._originalGetDockingPoint(connection, shape, dockStart);
        
        // Verificar se originalResult tem a estrutura esperada
        if (!originalResult || typeof originalResult.original === 'undefined') {
          console.warn('Resultado original não tem propriedade "original", usando padrão');
          return originalResult;
        }
        
        // Verificações de segurança
        if (!shape || !shape.type) {
          return originalResult;
        }
        
        // Detectar se é um elemento Relationship usando a mesma lógica do renderer
        const erType = shape?.businessObject && (
          shape.businessObject.erType || 
          shape.businessObject.$attrs?.['er:erType'] ||
          shape.businessObject.$attrs?.['ns0:erType']
        );
        
        const isParallelGatewayWithRelationshipType = (
          shape?.type === 'bpmn:ParallelGateway' && 
          erType === 'Relationship'
        );
        
        if (isParallelGatewayWithRelationshipType && shape.x !== undefined && shape.y !== undefined && shape.width && shape.height) {
          // Calcular ponto de ancoragem losangular
          const diamondPoint = this.getDiamondDockingPoint(connection, shape, dockStart);
          
          // Retornar preservando a estrutura original
          return {
            x: diamondPoint.x,
            y: diamondPoint.y,
            original: originalResult.original // Preservar original do BPMN.js
          };
        }
        
        // Para outros elementos, usar resultado original
        return originalResult;
        
      } catch (error) {
        console.warn('Erro no ErConnectionProvider, usando implementação padrão:', error);
        
        // Fallback direto para implementação padrão
        return this._originalGetDockingPoint(connection, shape, dockStart);
      }
    };
  }
  
  /**
   * Habilitar docking losangular (para testes futuros)
   */
  public enableDiamondDocking(): void {
    this._enableDiamondDocking = true;
    console.log('Docking losangular habilitado');
  }
  
  /**
   * Obter ponto de emergência seguro
   */
  private getEmergencyPoint(shape: Element): Point {
    if (shape && shape.x !== undefined && shape.y !== undefined && shape.width && shape.height) {
      return {
        x: shape.x + shape.width / 2,
        y: shape.y + shape.height / 2
      };
    }
    
    return { x: 0, y: 0 };
  }
  
  /**
   * Calcular ponto de ancoragem mais próximo nos vértices do losango
   */
  private getDiamondDockingPoint(connection: any, shape: Element, dockStart: boolean): Point {
    try {
      const shapeBounds = {
        x: shape.x || 0,
        y: shape.y || 0,
        width: shape.width || 100,
        height: shape.height || 80
      };
      
      const shapeCenter = {
        x: shapeBounds.x + shapeBounds.width / 2,
        y: shapeBounds.y + shapeBounds.height / 2
      };
      
      // Vértices do losango (coordenadas absolutas)
      const diamondVertices = [
        { x: shapeCenter.x, y: shapeBounds.y },                           // topo
        { x: shapeBounds.x + shapeBounds.width, y: shapeCenter.y },       // direita  
        { x: shapeCenter.x, y: shapeBounds.y + shapeBounds.height },      // baixo
        { x: shapeBounds.x, y: shapeCenter.y }                            // esquerda
      ];
      
      // Determinar ponto de referência (extremidade oposta da conexão)
      let referencePoint: Point = shapeCenter; // Default seguro
      
      try {
        if (connection?.waypoints && Array.isArray(connection.waypoints) && connection.waypoints.length >= 2) {
          if (dockStart) {
            // Para início da conexão, usar o último waypoint como referência
            const lastPoint = connection.waypoints[connection.waypoints.length - 1];
            if (lastPoint && typeof lastPoint.x === 'number' && typeof lastPoint.y === 'number') {
              referencePoint = lastPoint;
            }
          } else {
            // Para fim da conexão, usar o primeiro waypoint como referência  
            const firstPoint = connection.waypoints[0];
            if (firstPoint && typeof firstPoint.x === 'number' && typeof firstPoint.y === 'number') {
              referencePoint = firstPoint;
            }
          }
        } else {
          // Fallback: usar centro do elemento oposto
          const oppositeShape = dockStart ? connection?.target : connection?.source;
          if (oppositeShape && oppositeShape.x !== undefined && oppositeShape.y !== undefined && oppositeShape.width && oppositeShape.height) {
            referencePoint = {
              x: oppositeShape.x + oppositeShape.width / 2,
              y: oppositeShape.y + oppositeShape.height / 2
            };
          }
        }
      } catch (refError) {
        // Usar shapeCenter como fallback (já definido acima)
        console.warn('Erro ao determinar ponto de referência, usando centro:', refError);
      }
      
      // Encontrar o vértice mais próximo da direção de conexão
      let closestVertex = diamondVertices[0];
      let minDistance = this.calculateDistance(referencePoint, closestVertex);
      
      for (let i = 1; i < diamondVertices.length; i++) {
        const distance = this.calculateDistance(referencePoint, diamondVertices[i]);
        if (distance < minDistance) {
          minDistance = distance;
          closestVertex = diamondVertices[i];
        }
      }
      
      // Aplicar pequeno offset para evitar sobreposição visual
      const offsetDirection = this.normalizeVector({
        x: referencePoint.x - closestVertex.x,
        y: referencePoint.y - closestVertex.y
      });
      
      const offset = 2; // pixels
      
      return {
        x: closestVertex.x + (offsetDirection.x * offset),
        y: closestVertex.y + (offsetDirection.y * offset)
      };
      
    } catch (error) {
      console.warn('Erro no cálculo de ponto losangular, usando centro:', error);
      
      // Fallback final: retornar centro do elemento
      return {
        x: (shape.x || 0) + (shape.width || 100) / 2,
        y: (shape.y || 0) + (shape.height || 80) / 2
      };
    }
  }
  
  /**
   * Calcular distância euclidiana entre dois pontos
   */
  private calculateDistance(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  /**
   * Normalizar vetor para magnitude unitária
   */
  private normalizeVector(vector: Direction): Direction {
    const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
    
    if (magnitude === 0) {
      return { x: 0, y: 0 };
    }
    
    return {
      x: vector.x / magnitude,
      y: vector.y / magnitude
    };
  }
}