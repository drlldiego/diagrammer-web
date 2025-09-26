/**
 * ErOutlineProvider - Provider customizado para outlines de elementos ER
 * Resolve o problema de elementos Relationship (ParallelGateway) mostrarem 
 * outline retangular em vez de losangular quando selecionados
 */

import { create as svgCreate, attr as svgAttr } from 'tiny-svg';

interface Element {
  id: string;
  type: string;
  width: number;
  height: number;
  businessObject?: {
    erType?: string;
    [key: string]: any;
  };
  $attrs?: {
    [key: string]: any;
  };
}

// Definição de tipos para outline
type Outline = SVGElement;

export default class ErOutlineProvider {
  static $inject = ['outlineProvider', 'canvas'];
  
  private _outlineProvider: any;
  private _canvas: any;
  private _currentOutlines: Map<string, SVGElement> = new Map();

  constructor(outlineProvider: any, canvas: any) {
    this._outlineProvider = outlineProvider;
    this._canvas = canvas;
    
    // Override do método getOutline
    const originalGetOutline = outlineProvider.getOutline.bind(outlineProvider);
    
    outlineProvider.getOutline = (element: Element): Outline | null => {
      // Limpar outline anterior para este elemento (se existir)
      this.clearPreviousOutline(element.id);
      
      // Detectar se é um elemento Relationship usando a mesma lógica do renderer
      const erType = element.businessObject && (
        element.businessObject.erType || 
        element.businessObject.$attrs?.['er:erType'] ||
        element.businessObject.$attrs?.['ns0:erType']
      );
      
      const isParallelGatewayWithRelationshipType = (
        element.type === 'bpmn:ParallelGateway' && 
        erType === 'Relationship'
      );
      
      if (isParallelGatewayWithRelationshipType) {
        // Criar outline losangular customizado
        const outline = svgCreate('path');
        
        const width = element.width;
        const height = element.height;
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        
        // Definir o caminho losangular com padding para o outline
        const padding = 5;
        const outlinePath = `M ${halfWidth},${-padding} L ${width + padding},${halfHeight} L ${halfWidth},${height + padding} L ${-padding},${halfHeight} Z`;
        
        svgAttr(outline, {
          d: outlinePath,
          fill: 'none',
          stroke: '#3b82f6',
          'stroke-width': '3',
          'stroke-dasharray': 'none',
          'class': `er-outline-${element.id}` // Adicionar classe única para fácil identificação
        });
        
        // Armazenar referência do outline atual
        this._currentOutlines.set(element.id, outline);
        
        return outline;
      }
      
      // Para outros elementos, usar implementação padrão
      const standardOutline = originalGetOutline(element);
      if (standardOutline) {
        this._currentOutlines.set(element.id, standardOutline);
      }
      
      return standardOutline;
    };
    
    // Override do método updateOutline se existir
    if (outlineProvider.updateOutline) {
      const originalUpdateOutline = outlineProvider.updateOutline.bind(outlineProvider);
      
      outlineProvider.updateOutline = (element: Element): void => {
        // Limpar outline anterior antes de atualizar
        this.clearPreviousOutline(element.id);
        return originalUpdateOutline(element);
      };
    }
  }
  
  /**
   * Limpar outline anterior de um elemento específico
   */
  private clearPreviousOutline(elementId: string): void {
    const previousOutline = this._currentOutlines.get(elementId);
    if (previousOutline && previousOutline.parentNode) {
      previousOutline.parentNode.removeChild(previousOutline);
    }
    
    // Limpar também quaisquer outlines duplicados encontrados no DOM
    try {
      const canvas = this._canvas?.getContainer?.();
      if (canvas) {
        const duplicateOutlines = canvas.querySelectorAll(`.er-outline-${elementId}`);
        duplicateOutlines.forEach((outline: Element) => {
          const node = outline as unknown as Node;
          if (node.parentNode) {
            node.parentNode.removeChild(node);
          }
        });
      }
    } catch (error) {
      // Ignorar erros de limpeza DOM silenciosamente
    }
    
    this._currentOutlines.delete(elementId);
  }
}