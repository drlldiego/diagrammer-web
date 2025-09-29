/**
 * ErOutlineProvider - Provider customizado para outlines de elementos ER
 * 
 * PROBLEMA RESOLVIDO:
 * - Elementos Relationship (ParallelGateway com erType='Relationship') mostravam 
 *   outline retangular em vez de losangular quando selecionados
 * 
 * SOLUÇÃO:
 * - Intercepta apenas chamadas getOutline para relacionamentos
 * - Cria outline losangular perfeito usando a MESMA geometria do ErBpmnRenderer
 * - Usa a geometria exata do polygon original com padding para criar rebordo correto
 * - Preserva comportamento padrão para todos os outros elementos
 * - NÃO interfere com feedback visual de seleção de outros elementos
 * 
 * GEOMETRIA:
 * - Baseada nos pontos do polygon em ErBpmnRenderer.drawErRelationship()
 * - Topo: (width/2, 0), Direita: (width, height/2), 
 *   Baixo: (width/2, height), Esquerda: (0, height/2)
 * - Outline adiciona padding de 4px para criar rebordo visível
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
  static $inject = ['outlineProvider', 'canvas', 'eventBus'];
  
  private _outlineProvider: any;
  private _canvas: any;
  private _eventBus: any;
  private _currentOutlines: Map<string, SVGElement> = new Map();

  constructor(outlineProvider: any, canvas: any, eventBus: any) {
    this._outlineProvider = outlineProvider;
    this._canvas = canvas;
    this._eventBus = eventBus;
    
    // Listener para limpar outlines quando seleção muda ou é removida
    this.setupSelectionListeners();
    
    // Override do método getOutline
    // CORREÇÃO: Agora só intercepta relacionamentos, preservando feedback visual para outros elementos
    const originalGetOutline = outlineProvider.getOutline.bind(outlineProvider);
    
    outlineProvider.getOutline = (element: Element): Outline | null => {
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
        // Só limpar outline anterior para relacionamentos
        // this.clearPreviousOutline(element.id);
        
        // Criar outline losangular customizado usando a mesma geometria do ErBpmnRenderer
        const outline = svgCreate('path');
        
        const width = element.width || 120;
        const height = element.height || 80;
        
        // Usar a mesma geometria exata do ErBpmnRenderer mas com padding para o outline
        const padding = 8;
        
        // Pontos do losango com padding (baseado na geometria real do ErBpmnRenderer):
        // Topo: (width/2, 0) -> (width/2, -padding)  
        // Direita: (width, height/2) -> (width+padding, height/2)
        // Baixo: (width/2, height) -> (width/2, height+padding)
        // Esquerda: (0, height/2) -> (-padding, height/2)
        const outlinePath = `M ${width/2},${-padding} L ${width + padding},${height/2} L ${width/2},${height + padding} L ${-padding},${height/2} Z`;
        
        svgAttr(outline, {
          d: outlinePath,
          fill: 'none',
          stroke: '#1976d2', // Azul mais forte para melhor visibilidade
          'stroke-width': '2.5',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          'pointer-events': 'none',
          'opacity': '0.8',
          'class': `er-outline-${element.id}` // Adicionar classe única para fácil identificação
        });
        
        // Armazenar referência do outline atual
        this._currentOutlines.set(element.id, outline);
        
        return outline;
      }
      
      // Para outros elementos, usar implementação padrão SEM interferir
      return originalGetOutline(element);
    };
    
    // Override do método updateOutline se existir
    if (outlineProvider.updateOutline) {
      const originalUpdateOutline = outlineProvider.updateOutline.bind(outlineProvider);
      
      outlineProvider.updateOutline = (element: Element): void => {
        // Detectar se é um relacionamento antes de interferir
        const erType = element.businessObject && (
          element.businessObject.erType || 
          element.businessObject.$attrs?.['er:erType'] ||
          element.businessObject.$attrs?.['ns0:erType']
        );
        
        const isParallelGatewayWithRelationshipType = (
          element.type === 'bpmn:ParallelGateway' && 
          erType === 'Relationship'
        );
        
        // if (isParallelGatewayWithRelationshipType) {
        //   // Só limpar outline anterior para relacionamentos
        //   this.clearPreviousOutline(element.id);
        // }
        
        return originalUpdateOutline(element);
      };
    }
  }
  
  /**
   * Configurar listeners para limpar outlines quando seleção muda
   */
  private setupSelectionListeners(): void {
    // CORREÇÃO SIMPLIFICADA: Remover listener selection.changed problemático
    // Usar apenas limpeza específica quando necessário
    
    // Listener adicional para quando elementos são removidos ou modificados
    this._eventBus.on('elements.changed', (event: any) => {
      if (event.elements) {
        event.elements.forEach((element: any) => {
          // Se o elemento foi removido ou modificado, limpar seu outline
          //this.clearPreviousOutline(element.id);
        });
      }
    });

    // Listener para cliques no canvas vazio
    this._eventBus.on('canvas.click', (event: any) => {
      // Clique no canvas vazio - limpar todos os outlines
      this.clearAllCustomOutlines();
    });
    
    // Listener para detectar quando outro elemento é selecionado
    this._eventBus.on('element.click', (event: any) => {
      if (event.element) {
        // Elemento foi clicado - limpar outlines de outros elementos
        setTimeout(() => {
          this.cleanupOutlinesExcept(event.element.id);
        }, 5);
      }
    });
  }
  
  /**
   * Limpar outlines de todos os elementos EXCETO o especificado
   */
  private cleanupOutlinesExcept(preserveElementId: string): void {
    // Limpar todos os outlines exceto o do elemento preservado
    const outlinesToRemove: string[] = [];
    
    this._currentOutlines.forEach((outline, elementId) => {
      if (elementId !== preserveElementId) {
        // Este elemento não é o preservado, pode remover seu outline
        if (outline && outline.parentNode) {
          try {
            outline.parentNode.removeChild(outline);
            outlinesToRemove.push(elementId);
          } catch (error) {
            // Ignorar erros de remoção
          }
        }
      }
    });
    
    // Remover do mapa os outlines que foram removidos
    outlinesToRemove.forEach(elementId => {
      this._currentOutlines.delete(elementId);
    });
    
    // Limpeza extra do DOM para outlines órfãos (exceto o preservado)
    try {
      const canvas = this._canvas?.getContainer?.();
      if (canvas) {
        const allErOutlines = canvas.querySelectorAll('[class*="er-outline-"]');
        allErOutlines.forEach((outline: any) => {
          // Só remover se não for o outline do elemento preservado
          if (!outline.classList.contains(`er-outline-${preserveElementId}`) && outline.parentNode) {
            outline.parentNode.removeChild(outline);
          }
        });
      }
    } catch (error) {
      // Ignorar erros de limpeza DOM
    }
  }
  
  /**
   * Limpar todos os outlines customizados de relacionamentos
   */
  private clearAllCustomOutlines(): void {
    // Limpar todos os outlines armazenados
    this._currentOutlines.forEach((outline, elementId) => {
      if (outline && outline.parentNode) {
        try {
          outline.parentNode.removeChild(outline);
        } catch (error) {
          // Ignorar erros de remoção
        }
      }
    });
    
    // Limpar também do DOM diretamente (limpeza extra)
    try {
      const canvas = this._canvas?.getContainer?.();
      if (canvas) {
        const allErOutlines = canvas.querySelectorAll('[class*="er-outline-"]');
        allErOutlines.forEach((outline: any) => {
          if (outline.parentNode) {
            outline.parentNode.removeChild(outline);
          }
        });
      }
    } catch (error) {
      // Ignorar erros de limpeza DOM
    }
    
    // Limpar o mapa
    this._currentOutlines.clear();
  }
  
  /**
   * Limpar outline anterior de um elemento específico (apenas relacionamentos)
   */
  // private clearPreviousOutline(elementId: string): void {
  //   // Só limpar outlines que criamos (relacionamentos)
  //   const previousOutline = this._currentOutlines.get(elementId);
  //   if (previousOutline && previousOutline.parentNode) {
  //     try {
  //       previousOutline.parentNode.removeChild(previousOutline);
  //     } catch (error) {
  //       // Ignorar erros de remoção
  //     }
  //   }
    
    // Limpar apenas outlines específicos de relacionamentos que criamos
    // try {
    //   const canvas = this._canvas?.getContainer?.();
    //   if (canvas) {
    //     // Buscar apenas por outlines que criamos especificamente
    //     const erOutlines = canvas.querySelectorAll(`.er-outline-${elementId}`);
    //     erOutlines.forEach((outline: any) => {
    //       if (outline.parentNode) {
    //         outline.parentNode.removeChild(outline);
    //       }
    //     });
    //   }
    // } catch (error) {
    //   // Ignorar erros de limpeza DOM silenciosamente
    // }
    
    //this._currentOutlines.delete(elementId);
  //}
}