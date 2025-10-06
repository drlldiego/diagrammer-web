/**
 * ElementPlacementBlockerService
 * 
 * Serviço responsável por bloquear a colocação ou movimento de elementos
 * sobre conexões existentes, garantindo visibilidade adequada.
 */

import { ErrorHandler, ErrorType } from '../../../../utils/errorHandler';
import { notifications } from '../../../../utils/notifications';

export interface Point {
  x: number;
  y: number;
}

export interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Connection {
  id: string;
  waypoints: Point[];
  source?: any;
  target?: any;
}

export interface DiagramElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
}

export class ElementPlacementBlockerService {
  private elementRegistry: any;
  private eventBus: any;

  constructor(elementRegistry: any, eventBus: any) {
    this.elementRegistry = elementRegistry;
    this.eventBus = eventBus;
  }

  /**
   * Verificar se uma posição/área está livre de conexões e outros elementos
   */
  public isPositionValid(x: number, y: number, width: number, height: number, excludeElementId?: string): boolean {
    // Sistema reabilitado com margens ajustadas
    
    try {
      if (!this.elementRegistry) {
        return true; // Se não há registry, permitir
      }

      const allElements = this.elementRegistry.getAll();
      const elementBounds: ElementBounds = { x, y, width, height };
      
      // 1. Verificar sobreposição com outros elementos (novidade!)
      const otherElements = this.getOtherElements(allElements, excludeElementId);
      for (const otherElement of otherElements) {
        if (this.elementsOverlap(elementBounds, otherElement)) {
          return false;
        }
      }

      // 2. Verificar sobreposição com conexões (existente)
      const connections = this.getConnections(allElements);
      for (const connection of connections) {
        // Excluir conexões conectadas ao próprio elemento (se for movimento)
        if (excludeElementId && this.isConnectionLinkedToElement(connection, excludeElementId!)) {
          continue;
        }

        if (this.elementIntersectsConnection(elementBounds, connection.waypoints)) {
          return false;
        }
      }

      return true;

    } catch (error) {
      ErrorHandler.handle({
        type: ErrorType.CANVAS_OPERATION,
        operation: 'isPositionValid',
        userMessage: 'Erro ao verificar posição do elemento',
        showNotification: false
      }, error as Error);
      
      return true; // Em caso de erro, permitir movimento
    }
  }

  /**
   * Verificar se um movimento é válido e bloquear se necessário
   */
  public validateElementMove(element: any, delta: { x: number; y: number }): { isValid: boolean; reason?: string } {
    const newX = element.x + delta.x;
    const newY = element.y + delta.y;
    
    const validationResult = this.getDetailedValidation(newX, newY, element.width, element.height, element.id);
    
    if (!validationResult.isValid) {
      const message = validationResult.reason === 'element' 
        ? 'Não é possível mover o elemento sobre outro elemento existente'
        : 'Não é possível mover o elemento sobre uma conexão existente';
      
      notifications.warning(message);
      return { isValid: false, reason: validationResult.reason };
    }
    
    return { isValid: true };
  }

  /**
   * Verificar se uma criação é válida
   */
  public validateElementCreation(x: number, y: number, width: number, height: number): { isValid: boolean; reason?: string } {
    const validationResult = this.getDetailedValidation(x, y, width, height);
    
    if (!validationResult.isValid) {
      const message = validationResult.reason === 'element'
        ? 'Não é possível criar elemento sobre outro elemento existente'
        : 'Não é possível criar elemento sobre uma conexão existente';
      
      notifications.warning(message);
      return { isValid: false, reason: validationResult.reason };
    }
    
    return { isValid: true };
  }

  /**
   * Verificar se um redimensionamento é válido
   */
  public validateElementResize(element: any, newBounds: ElementBounds): { isValid: boolean; reason?: string } {
    const validationResult = this.getDetailedValidation(newBounds.x, newBounds.y, newBounds.width, newBounds.height, element.id);
    
    if (!validationResult.isValid) {
      const message = validationResult.reason === 'element'
        ? 'Não é possível redimensionar elemento sobre outro elemento existente'
        : 'Não é possível redimensionar elemento sobre uma conexão existente';
      
      notifications.warning(message);
      return { isValid: false, reason: validationResult.reason };
    }
    
    return { isValid: true };
  }

  /**
   * Validação detalhada que retorna o tipo de conflito
   */
  private getDetailedValidation(x: number, y: number, width: number, height: number, excludeElementId?: string): { isValid: boolean; reason?: 'element' | 'connection' } {
    try {
      if (!this.elementRegistry) {
        return { isValid: true };
      }

      const allElements = this.elementRegistry.getAll();
      const elementBounds: ElementBounds = { x, y, width, height };
      
      // 1. Verificar sobreposição com outros elementos primeiro
      const otherElements = this.getOtherElements(allElements, excludeElementId);
      for (const otherElement of otherElements) {
        if (this.elementsOverlap(elementBounds, otherElement)) {
          return { isValid: false, reason: 'element' };
        }
      }

      // 2. Verificar sobreposição com conexões
      const connections = this.getConnections(allElements);
      for (const connection of connections) {
        if (excludeElementId && this.isConnectionLinkedToElement(connection, excludeElementId!)) {
          continue;
        }

        if (this.elementIntersectsConnection(elementBounds, connection.waypoints)) {
          return { isValid: false, reason: 'connection' };
        }
      }

      return { isValid: true };

    } catch (error) {
      return { isValid: true }; // Em caso de erro, permitir
    }
  }

  /**
   * Obter todas as conexões do diagrama
   */
  private getConnections(allElements: any[]): Connection[] {
    return allElements
      .filter((element: any) => element.waypoints && element.waypoints.length >= 2)
      .map((element: any) => ({
        id: element.id,
        waypoints: element.waypoints,
        source: element.source,
        target: element.target
      }));
  }

  /**
   * Obter outros elementos (não conexões) do diagrama
   */
  private getOtherElements(allElements: any[], excludeElementId?: string): DiagramElement[] {
    return allElements.filter((element: any) => {
      // Excluir o próprio elemento
      if (excludeElementId && element.id === excludeElementId) {
        return false;
      }

      // Excluir conexões (que já têm tratamento separado)
      if (element.waypoints) {
        return false;
      }

      // Excluir labels
      if (element.type === 'label') {
        return false;
      }

      // Excluir root/implicit
      if (element.id === '__implicitroot' || element.type === 'bpmn:Process') {
        return false;
      }

      // Incluir apenas elementos com dimensões válidas
      return element.x !== undefined && element.y !== undefined && 
             element.width > 0 && element.height > 0;
    }).map((element: any) => ({
      id: element.id,
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
      type: element.type
    }));
  }

  /**
   * Verificar se dois elementos se sobrepõem
   */
  private elementsOverlap(bounds1: ElementBounds, bounds2: DiagramElement): boolean {
    // Adicionar margem de segurança reduzida para permitir melhor posicionamento
    const margin = 10;
    
    const expandedBounds1 = {
      x: bounds1.x - margin,
      y: bounds1.y - margin,
      width: bounds1.width + (margin * 2),
      height: bounds1.height + (margin * 2)
    };

    const expandedBounds2 = {
      x: bounds2.x - margin,
      y: bounds2.y - margin,
      width: bounds2.width + (margin * 2),
      height: bounds2.height + (margin * 2)
    };

    // Verificar se retângulos se sobrepõem
    return !(expandedBounds1.x + expandedBounds1.width <= expandedBounds2.x ||
             expandedBounds2.x + expandedBounds2.width <= expandedBounds1.x ||
             expandedBounds1.y + expandedBounds1.height <= expandedBounds2.y ||
             expandedBounds2.y + expandedBounds2.height <= expandedBounds1.y);
  }

  /**
   * Verificar se uma conexão está ligada a um elemento específico
   */
  private isConnectionLinkedToElement(connection: Connection, elementId: string): boolean {
    return (connection.source?.id === elementId) || (connection.target?.id === elementId);
  }

  /**
   * Verificar se um elemento intersecta uma conexão
   */
  private elementIntersectsConnection(elementBounds: ElementBounds, waypoints: Point[]): boolean {
    // Adicionar margem de segurança reduzida para labels de conexões
    const margin = 20;
    const expandedBounds = {
      x: elementBounds.x - margin,
      y: elementBounds.y - margin,
      width: elementBounds.width + (margin * 2),
      height: elementBounds.height + (margin * 2)
    };

    // Verificar cada segmento da conexão
    for (let i = 0; i < waypoints.length - 1; i++) {
      const start = waypoints[i];
      const end = waypoints[i + 1];

      if (this.lineIntersectsRectangle(start, end, expandedBounds)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Verificar se uma linha intersecta um retângulo
   */
  private lineIntersectsRectangle(start: Point, end: Point, rect: ElementBounds): boolean {
    const left = rect.x;
    const right = rect.x + rect.width;
    const top = rect.y;
    const bottom = rect.y + rect.height;

    // Verificar se algum dos pontos está dentro do retângulo
    if (this.pointInRectangle(start, rect) || this.pointInRectangle(end, rect)) {
      return true;
    }

    // Verificar interseção com cada lado do retângulo
    return (
      this.lineIntersectsLine(start, end, { x: left, y: top }, { x: right, y: top }) ||
      this.lineIntersectsLine(start, end, { x: right, y: top }, { x: right, y: bottom }) ||
      this.lineIntersectsLine(start, end, { x: right, y: bottom }, { x: left, y: bottom }) ||
      this.lineIntersectsLine(start, end, { x: left, y: bottom }, { x: left, y: top })
    );
  }

  /**
   * Verificar se um ponto está dentro de um retângulo
   */
  private pointInRectangle(point: Point, rect: ElementBounds): boolean {
    return (
      point.x >= rect.x &&
      point.x <= rect.x + rect.width &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.height
    );
  }

  /**
   * Verificar se duas linhas se intersectam
   */
  private lineIntersectsLine(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
    const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
    
    if (Math.abs(denom) < 1e-10) {
      return false; // Linhas paralelas
    }

    const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denom;
    const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / denom;

    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  }

  /**
   * Encontrar posição válida próxima (para caso queiramos rearranjar automaticamente)
   */
  public findNearbyValidPosition(
    preferredX: number, 
    preferredY: number, 
    width: number, 
    height: number, 
    excludeElementId?: string
  ): { x: number; y: number } | null {
    
    // Testar posições em círculos concêntricos ao redor da posição preferida
    const maxRadius = 200;
    const step = 40;
    
    for (let radius = step; radius <= maxRadius; radius += step) {
      // Testar 8 direções ao redor da posição
      const positions = [
        { x: preferredX + radius, y: preferredY },          // Direita
        { x: preferredX - radius, y: preferredY },          // Esquerda
        { x: preferredX, y: preferredY + radius },          // Baixo
        { x: preferredX, y: preferredY - radius },          // Cima
        { x: preferredX + radius, y: preferredY + radius },  // Diagonal inferior direita
        { x: preferredX - radius, y: preferredY + radius },  // Diagonal inferior esquerda
        { x: preferredX + radius, y: preferredY - radius },  // Diagonal superior direita
        { x: preferredX - radius, y: preferredY - radius }   // Diagonal superior esquerda
      ];
      
      for (const pos of positions) {
        if (this.isPositionValid(pos.x, pos.y, width, height, excludeElementId)) {
          return pos;
        }
      }
    }
    
    return null; // Nenhuma posição válida encontrada
  }
}

// Factory para criação do serviço
export function createElementPlacementBlockerService(
  elementRegistry: any,
  eventBus: any
): ElementPlacementBlockerService {
  return new ElementPlacementBlockerService(elementRegistry, eventBus);
}