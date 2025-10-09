/**
 * Utilities compartilhadas para operações com elementos ER
 * Funções puras que podem ser reutilizadas em diferentes operações
 */

import { ErElement } from '../../core';
import { logger } from '../../../../../utils/logger';

export interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface PositionOptions {
  searchRadius?: number;
  step?: number;
  margin?: number;
}

export interface ContainerSize {
  width: number;
  height: number;
}

/**
 * Utilities para cálculos geométricos e posicionamento
 */
export class ErElementUtils {
  
  /**
   * Calcula os bounds (limites) de um grupo de elementos
   */
  static calculateBounds(elements: ErElement[]): ElementBounds {
    if (elements.length === 0) {
      return { x: 0, y: 0, width: 200, height: 150 };
    }
    
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
    elements.forEach(el => {
      const x = el.x || 0;
      const y = el.y || 0;
      const width = el.width || 80;
      const height = el.height || 50;
      
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    });
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  /**
   * Calcula o tamanho ideal para um container baseado nos elementos
   */
  static calculateIdealContainerSize(elements: ErElement[], padding: number = 20): ContainerSize {
    const bounds = this.calculateBounds(elements);
    const minWidth = 120;
    const minHeight = 80;
    
    return {
      width: Math.max(bounds.width + padding * 2, minWidth),
      height: Math.max(bounds.height + padding * 2, minHeight)
    };
  }

  /**
   * Verifica se uma posição colide com elementos existentes
   */
  static checkCollision(
    elementRegistry: any,
    x: number, 
    y: number, 
    width: number, 
    height: number,
    excludeElements: ErElement[] = [],
    options: PositionOptions = {}
  ): boolean {
    const { margin = 10 } = options;
    const allElements = elementRegistry.getAll();
    
    const newElementBounds = { x, y, width, height };
    
    for (const existingElement of allElements) {
      // Pular conexões, labels e elementos excluídos
      if (!existingElement.x || !existingElement.y || 
          existingElement.type === 'bpmn:SequenceFlow' || 
          existingElement.type === 'label' ||
          excludeElements.some(el => el.id === existingElement.id)) {
        continue;
      }
      
      const existingBounds = {
        x: existingElement.x,
        y: existingElement.y,
        width: existingElement.width || 80,
        height: existingElement.height || 50
      };
      
      // Verificar sobreposição com margem de segurança
      if (!(newElementBounds.x + newElementBounds.width + margin <= existingBounds.x || 
            existingBounds.x + existingBounds.width + margin <= newElementBounds.x || 
            newElementBounds.y + newElementBounds.height + margin <= existingBounds.y || 
            existingBounds.y + existingBounds.height + margin <= newElementBounds.y)) {
        return true; // Há colisão
      }
    }
    
    return false; // Sem colisão
  }

  /**
   * Encontra uma posição livre usando busca em espiral
   */
  static findFreePosition(
    elementRegistry: any,
    startX: number, 
    startY: number, 
    width: number, 
    height: number,
    excludeElements: ErElement[] = [],
    options: PositionOptions = {}
  ): Position {
    const { searchRadius = 200, step = 20 } = options;
    
    // Primeiro tentar a posição inicial
    if (!this.checkCollision(elementRegistry, startX, startY, width, height, excludeElements, options)) {
      return { x: startX, y: startY };
    }
    
    // Busca em espiral partindo da posição inicial
    for (let radius = step; radius <= searchRadius; radius += step) {
      const positions = [
        { x: startX + radius, y: startY }, // Direita
        { x: startX, y: startY + radius }, // Baixo
        { x: startX - radius, y: startY }, // Esquerda
        { x: startX, y: startY - radius }, // Cima
        { x: startX + radius, y: startY + radius }, // Diagonal inferior direita
        { x: startX - radius, y: startY + radius }, // Diagonal inferior esquerda
        { x: startX + radius, y: startY - radius }, // Diagonal superior direita
        { x: startX - radius, y: startY - radius }, // Diagonal superior esquerda
      ];
      
      for (const pos of positions) {
        if (!this.checkCollision(elementRegistry, pos.x, pos.y, width, height, excludeElements, options)) {              
          return pos;
        }
      }
    }
                    
    // Se não encontrar posição livre, retornar posição com offset
    return { x: startX + 100, y: startY + 100 };
  }

  /**
   * Gera um nome único para elemento baseado em elementos existentes
   */
  static generateUniqueName(
    elementRegistry: any,
    baseName: string,
    elementType: string,
    parentId?: string
  ): string {
    const allElements = elementRegistry.getAll();
    
    // Contar elementos existentes com o mesmo padrão de nome
    let count = 0;
    for (const existingElement of allElements) {
      if (existingElement.type === 'bpmn:UserTask' && 
          existingElement.businessObject?.erType === elementType &&
          existingElement.businessObject?.name && 
          existingElement.businessObject.name.startsWith(baseName) &&
          (!parentId || existingElement.parent?.id === parentId)) {
        count++;
      }
    }
    
    // Gerar nome único
    if (count === 0) {
      return baseName;
    } else {
      return `${baseName} ${count + 1}`;
    }
  }

  /**
   * Valida se elementos podem ser agrupados baseado na notação
   */
  static validateGrouping(elements: ErElement[], notation: 'chen' | 'crowsfoot'): {
    isValid: boolean;
    reason?: string;
  } {
    if (elements.length < 2) {
      return {
        isValid: false,
        reason: 'Selecione pelo menos 2 elementos para agrupar em container composto.'
      };
    }

    // Filtrar apenas elementos ER (não conexões nem labels)
    const erElements = elements.filter(el => 
      el.businessObject?.erType && el.type !== 'bpmn:SequenceFlow' && el.type !== 'label'
    );

    if (erElements.length < 2) {
      return {
        isValid: false,
        reason: 'Selecione pelo menos 2 elementos ER (entidades, atributos, relacionamentos) para agrupar.'
      };
    }

    // Para notação Crow's Foot, verificar se pode agrupar (não tem relacionamentos)
    if (notation === 'crowsfoot') {
      const hasRelationships = erElements.some(el => el.businessObject?.erType === 'Relationship');
      if (hasRelationships) {
        return {
          isValid: false,
          reason: "Na notação Crow's Foot, relacionamentos não podem ser agrupados em containers."
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Valida se um elemento pode ter sub-atributos
   */
  static validateSubAttributeCreation(element: ErElement, properties: any): {
    isValid: boolean;
    reason?: string;
  } {
    if (!element) {
      return {
        isValid: false,
        reason: 'Nenhum elemento selecionado.'
      };
    }

    // Verificar se é atributo composto (UserTask ou SubProcess)
    const isCompositeUserTask = properties?.erType === 'Attribute' && properties?.isComposite;
    const isCompositeSubProcess = properties?.erType === 'CompositeAttribute';
    
    if (!isCompositeUserTask && !isCompositeSubProcess) {
      return {
        isValid: false,
        reason: 'Não é possível adicionar sub-atributo: elemento não é composto.'
      };
    }

    return { isValid: true };
  }

  /**
   * Log de debug para operações de elementos
   */
  static logOperation(operation: string, elementCount: number, details?: any): void {
    logger.info(`${operation} iniciada para ${elementCount} elemento(s)`, 'ErElementUtils');
    if (details) {
      logger.debug(`Detalhes da operação: ${JSON.stringify(details)}`, 'ErElementUtils');
    }
  }
}