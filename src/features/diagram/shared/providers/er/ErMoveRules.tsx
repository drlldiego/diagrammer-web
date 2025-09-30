interface EventBus {
  on(event: string, callback: (event: any) => void): void;
  off(event: string, callback: (event: any) => void): void;
  fire(event: string, data?: any): void;
}

interface Element {
  id: string;
  type: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  parent?: Element;
  businessObject?: {
    erType?: string;
    isComposite?: boolean;
    isParentChild?: boolean;
    $attrs?: Record<string, any>;
    [key: string]: any;
  };
  source?: Element;
  target?: Element;
}

interface MoveEvent {
  element: Element;
  delta: { x: number; y: number };
}

interface ElementRegistry {
  getAll(): Element[];
  get(id: string): Element | null;
}

interface Modeling {
  moveElements(elements: Element[], delta: { x: number; y: number }, target?: any, hints?: any): void;
  updateProperties(element: Element, properties: any): void;
}

/**
 * ErMoveRules - Regras de movimento específicas para diagramas ER
 * Esta classe escuta eventos de movimento de elementos e ajusta as conexões
 * associadas para garantir que os waypoints sejam recalculados corretamente.
 */
export default class ErMoveRules {
  private eventBus: EventBus;
  private elementRegistry: ElementRegistry | null = null;
  private modeling: Modeling | null = null;

  constructor(eventBus: EventBus, elementRegistry: ElementRegistry, modeling: Modeling) {
    this.eventBus = eventBus;
    this.elementRegistry = elementRegistry;
    this.modeling = modeling;
    
    this.init();    
  }

  private init() {
    // A escuta pelo evento de movimento de elemento
    this.eventBus.on('element.moved', (event: MoveEvent) => {
      this.handleElementMoved(event);
    });

    // Também escuta pelo evento shape.move.end para operações de arrastar
    this.eventBus.on('shape.move.end', (event: any) => {
      if (event.shape) {
        //Forçar redraw imediato após drag
        this.forceConnectionRedraw(event.shape);        
        this.handleElementMoved({
          element: event.shape,
          delta: event.delta || { x: 0, y: 0 }
        });
      }
    });

    // Escuta pelo evento elements.moved para movimentos de múltiplos elementos
    this.eventBus.on('elements.moved', (event: any) => {
      if (event.elements && Array.isArray(event.elements)) {
        event.elements.forEach((element: any) => {
          this.handleElementMoved({
            element: element,
            delta: event.delta || { x: 0, y: 0 }
          });
        });
      }
    });

  }

  private handleElementMoved(event: MoveEvent) {     
    const movedElement = event.element;  
    // Forçar redraw de conexões após movimento
    this.forceConnectionRedraw(movedElement);
  }
  
  /**
   * Forçar recalculo de waypoints das conexões ligadas a um elemento
   */
  private forceConnectionRedraw(element: Element): void {
    if (!element || !this.elementRegistry || !this.modeling) return;
    
    setTimeout(() => {
      try {
        // Encontrar todas as conexões ligadas ao elemento
        const allElements = this.elementRegistry!.getAll();
        const connections = allElements.filter((el: any) => 
          el.type === 'bpmn:SequenceFlow' && 
          (el.source?.id === element.id || el.target?.id === element.id)
        );
        
        // Para cada conexão, recalcular waypoints manualmente
        connections.forEach((connection: any) => {
          // Verificações de segurança adicionais
          if (!connection || !connection.waypoints || !Array.isArray(connection.waypoints) || 
              connection.waypoints.length < 2 || !connection.source || !connection.target) {
            return;
          }      
          
          try {
            const newWaypoints = this.calculateCorrectWaypoints(connection, element);
            if (newWaypoints && newWaypoints.length >= 2) {
              // Verificar se os waypoints realmente mudaram para evitar updates desnecessários
              const hasChanged = this.waypointsHaveChanged(connection.waypoints, newWaypoints);
              
              if (hasChanged) {
                // Aplicar waypoints diretamente na conexão
                connection.waypoints = newWaypoints;
                
                // Notificar o sistema sobre a mudança com delay adicional
                setTimeout(() => {
                  if (this.eventBus && connection.id) {
                    this.eventBus.fire('element.changed', { element: connection });
                  }
                }, 10);
              }
            }
          } catch (connError) {
            // Se falhar, não fazer nada para evitar conflitos
            console.warn('Erro ao recalcular waypoints:', connError);
          }
        });
        
      } catch (error) {
        // Ignorar erros silenciosamente
      }
    }, 100); // Delay maior para evitar conflitos com outros sistemas
  }
  
  /**
   * Verificar se waypoints mudaram significativamente
   */
  private waypointsHaveChanged(oldWaypoints: any[], newWaypoints: any[]): boolean {
    if (oldWaypoints.length !== newWaypoints.length) {
      return true;
    }
    
    const threshold = 2; // pixels de tolerância
    
    for (let i = 0; i < oldWaypoints.length; i++) {
      const oldWp = oldWaypoints[i];
      const newWp = newWaypoints[i];
      
      if (!oldWp || !newWp) continue;
      
      const deltaX = Math.abs((oldWp.x || 0) - (newWp.x || 0));
      const deltaY = Math.abs((oldWp.y || 0) - (newWp.y || 0));
      
      if (deltaX > threshold || deltaY > threshold) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Calcular waypoints otimizados para uma conexão
   */
  private calculateCorrectWaypoints(connection: any, movedElement: Element): any[] | null {
    try {
      if (!connection.source || !connection.target) {
        return null;
      }
      
      // Sempre recalcular o caminho completo para otimização
      return this.calculateOptimalPath(connection.source, connection.target);
      
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Calcular caminho otimizado entre dois elementos
   */
  private calculateOptimalPath(sourceElement: Element, targetElement: Element): any[] {
    // Calcular pontos de conexão otimizados
    const startPoint = this.calculateBorderPoint(sourceElement, targetElement);
    const endPoint = this.calculateBorderPoint(targetElement, sourceElement);
    
    if (!startPoint || !endPoint) {
      return [];
    }
    
    // Determinar se elementos estão alinhados ou se precisamos de waypoints intermediários
    const needsIntermediatePoints = this.needsIntermediateWaypoints(sourceElement, targetElement, startPoint, endPoint);
    
    if (!needsIntermediatePoints) {
      // Conexão direta
      return [startPoint, endPoint];
    }
    
    // Calcular waypoints intermediários otimizados
    const intermediatePoints = this.calculateIntermediateWaypoints(sourceElement, targetElement, startPoint, endPoint);
    
    return [startPoint, ...intermediatePoints, endPoint];
  }
  
  /**
   * Verificar se são necessários waypoints intermediários
   */
  private needsIntermediateWaypoints(source: Element, target: Element, startPoint: any, endPoint: any): boolean {
    // Verificar se há sobreposição entre elementos que impediria conexão direta
    const sourceRect = {
      x: source.x!,
      y: source.y!,
      width: source.width!,
      height: source.height!
    };
    
    const targetRect = {
      x: target.x!,
      y: target.y!,
      width: target.width!,
      height: target.height!
    };
    
    // Se a linha direta entre os pontos atravessa algum dos elementos, precisamos de waypoints
    return this.lineIntersectsRectangle(startPoint, endPoint, sourceRect) || 
           this.lineIntersectsRectangle(startPoint, endPoint, targetRect);
  }
  
  /**
   * Verificar se uma linha intersecta um retângulo (algoritmo melhorado)
   */
  private lineIntersectsRectangle(start: any, end: any, rect: any): boolean {
    // Adicionar margem de segurança ao redor do retângulo
    const margin = 10;
    const expandedRect = {
      x: rect.x - margin,
      y: rect.y - margin,
      width: rect.width + 2 * margin,
      height: rect.height + 2 * margin
    };
    
    // Verificar múltiplos pontos ao longo da linha
    const steps = 5;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const testX = start.x + (end.x - start.x) * t;
      const testY = start.y + (end.y - start.y) * t;
      
      if (testX > expandedRect.x && testX < expandedRect.x + expandedRect.width &&
          testY > expandedRect.y && testY < expandedRect.y + expandedRect.height) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Calcular waypoints intermediários otimizados
   */
  private calculateIntermediateWaypoints(source: Element, target: Element, startPoint: any, endPoint: any): any[] {
    // Para a maioria dos casos ER, usar roteamento ortogonal simples
    return this.calculateOrthogonalPath(startPoint, endPoint, source, target);
  }
  
  /**
   * Calcular caminho ortogonal otimizado (linhas retas horizontais/verticais)
   */
  private calculateOrthogonalPath(start: any, end: any, source: Element, target: Element): any[] {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    
    // Se já está alinhado horizontalmente ou verticalmente, não precisa de pontos intermediários
    if (Math.abs(dx) < 10 || Math.abs(dy) < 10) {
      return [];
    }
    
    // Determinar direção baseada na posição relativa dos elementos E nas bordas de conexão
    const sourceCenter = {
      x: source.x! + source.width! / 2,
      y: source.y! + source.height! / 2
    };
    
    const targetCenter = {
      x: target.x! + target.width! / 2,
      y: target.y! + target.height! / 2
    };
    
    // Calcular qual direção dá menor distância total
    const horizontalFirstDistance = Math.abs(end.x - start.x) + Math.abs(end.y - start.y);
    const verticalFirstDistance = Math.abs(start.x - end.x) + Math.abs(start.y - end.y);
    
    // Escolher baseado na configuração dos elementos e distância
    const preferHorizontalFirst = Math.abs(targetCenter.x - sourceCenter.x) > Math.abs(targetCenter.y - sourceCenter.y);
    
    if (preferHorizontalFirst) {
      // Horizontal primeiro, depois vertical
      const waypoint = {
        x: end.x,
        y: start.y
      };
      
      // Verificar se o waypoint não cria sobreposição com elementos
      if (this.isWaypointSafe(waypoint, source, target)) {
        return [waypoint];
      }
    }
    
    // Fallback: Vertical primeiro, depois horizontal  
    const waypoint = {
      x: start.x,
      y: end.y
    };
    
    return [waypoint];
  }
  
  /**
   * Verificar se um waypoint é seguro (não sobrepõe elementos)
   */
  private isWaypointSafe(waypoint: any, source: Element, target: Element): boolean {
    const margin = 15;
    
    // Verificar se waypoint está muito próximo dos elementos
    const sourceRect = {
      x: source.x! - margin,
      y: source.y! - margin,
      width: source.width! + 2 * margin,
      height: source.height! + 2 * margin
    };
    
    const targetRect = {
      x: target.x! - margin,
      y: target.y! - margin,
      width: target.width! + 2 * margin,
      height: target.height! + 2 * margin
    };
    
    // Waypoint não deve estar dentro dos elementos com margem
    const isInsideSource = waypoint.x >= sourceRect.x && waypoint.x <= sourceRect.x + sourceRect.width &&
                          waypoint.y >= sourceRect.y && waypoint.y <= sourceRect.y + sourceRect.height;
    
    const isInsideTarget = waypoint.x >= targetRect.x && waypoint.x <= targetRect.x + targetRect.width &&
                          waypoint.y >= targetRect.y && waypoint.y <= targetRect.y + targetRect.height;
    
    return !isInsideSource && !isInsideTarget;
  }
  
  /**
   * Calcular ponto na borda de um elemento mais próximo a outro elemento
   */
  private calculateBorderPoint(element: Element, targetElement: Element): any | null {
    try {
      if (!element.x || !element.y || !element.width || !element.height) {
        return null;
      }
      
      // Se não há elemento alvo, usar centro
      if (!targetElement || !targetElement.x || !targetElement.y || !targetElement.width || !targetElement.height) {
        return {
          x: element.x + element.width / 2,
          y: element.y + element.height / 2
        };
      }
      
      // Determinar se é um relacionamento (losango) ou elemento retangular
      const isRelationship = this.isRelationshipElement(element);
      
      if (isRelationship) {
        return this.calculateClosestDiamondPoint(element, targetElement);
      } else {
        return this.calculateClosestRectanglePoint(element, targetElement);
      }
      
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Calcular ponto mais próximo na borda de um losango
   */
  private calculateClosestDiamondPoint(element: Element, targetElement: Element): any {
    const center = {
      x: element.x! + element.width! / 2,
      y: element.y! + element.height! / 2
    };
    
    const halfWidth = element.width! / 2;
    const halfHeight = element.height! / 2;
    
    // Vértices do losango
    const vertices = [
      { x: center.x, y: center.y - halfHeight },          // topo
      { x: center.x + halfWidth, y: center.y },           // direita
      { x: center.x, y: center.y + halfHeight },          // baixo
      { x: center.x - halfWidth, y: center.y }            // esquerda
    ];
    
    // Encontrar vértice mais próximo do elemento alvo
    const targetCenter = {
      x: targetElement.x! + targetElement.width! / 2,
      y: targetElement.y! + targetElement.height! / 2
    };
    
    let closestVertex = vertices[0];
    let minDistance = this.calculateDistance(closestVertex, targetCenter);
    
    vertices.forEach(vertex => {
      const distance = this.calculateDistance(vertex, targetCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestVertex = vertex;
      }
    });
    
    return closestVertex;
  }
  
  /**
   * Calcular ponto mais próximo na borda de um retângulo
   */
  private calculateClosestRectanglePoint(element: Element, targetElement: Element): any {
    const targetCenter = {
      x: targetElement.x! + targetElement.width! / 2,
      y: targetElement.y! + targetElement.height! / 2
    };
    
    // Calcular pontos nas 4 bordas do retângulo
    const borders = [
      // Borda superior
      {
        x: Math.max(element.x!, Math.min(targetCenter.x, element.x! + element.width!)),
        y: element.y!,
        side: 'top'
      },
      // Borda inferior  
      {
        x: Math.max(element.x!, Math.min(targetCenter.x, element.x! + element.width!)),
        y: element.y! + element.height!,
        side: 'bottom'
      },
      // Borda esquerda
      {
        x: element.x!,
        y: Math.max(element.y!, Math.min(targetCenter.y, element.y! + element.height!)),
        side: 'left'
      },
      // Borda direita
      {
        x: element.x! + element.width!,
        y: Math.max(element.y!, Math.min(targetCenter.y, element.y! + element.height!)),
        side: 'right'
      }
    ];
    
    // Encontrar ponto mais próximo do centro do elemento alvo
    let closestPoint = borders[0];
    let minDistance = this.calculateDistance(closestPoint, targetCenter);
    
    borders.forEach(point => {
      const distance = this.calculateDistance(point, targetCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = point;
      }
    });
    
    return {
      x: closestPoint.x,
      y: closestPoint.y
    };
  }
  
  /**
   * Calcular distância euclidiana entre dois pontos
   */
  private calculateDistance(p1: any, p2: any): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  /**
   * Verificar se é um elemento relacionamento (losango)
   */
  private isRelationshipElement(element: Element): boolean {
    return element.type === 'bpmn:ParallelGateway' && 
           element.businessObject?.erType === 'Relationship';
  }    
}