import { NotationConfig } from '../config/NotationConfig';
import { ErColorUtils } from '../config/ErStyleConfig';
import { 
  ErElement, 
  ErCreate, 
  ErElementFactory, 
  ErModeling, 
  ErTranslate, 
  ErShapeOptions, 
  ErContextPadEntry, 
  ErContextPadEntries 
} from '../types';
import { ErElementUtils } from '../utils/ErElementUtils';
import { logger } from '../../../../../utils/logger';

// Função para verificar se está em modo declarativo
function isDeclarativeMode(): boolean {
  try {
    // Verificar se é ER em modo declarativo
    const erContextElement = document.querySelector('[data-er-declarative-mode="true"]');
    if (erContextElement) {
      return true;
    }
    
    // Verificar se é Flow (sempre declarativo)
    const flowContextElement = document.querySelector('[data-flow-declarative-mode="true"]');
    if (flowContextElement) {
      return true;
    }
    
    // Fallback: verificar se o painel de sintaxe está visível
    const syntaxPanel = document.querySelector('.er-syntax-panel, .syntax-panel, .flow-syntax-panel');
    if (syntaxPanel) {
      const isVisible = window.getComputedStyle(syntaxPanel).display !== 'none';
      return isVisible;
    }
    
    return false;
  } catch (error) {
    // Em caso de erro, assumir modo imperativo (seguro)
    return false;
  }
}

// Interfaces específicas para o ContextPad
interface ContextPad {
  registerProvider: (provider: any) => void;
  open?: (element: any, force?: boolean) => void;
}

export default function ErContextPadProvider(
  this: any,
  contextPad: ContextPad,
  create: ErCreate,
  erElementFactory: ErElementFactory,
  modeling: ErModeling,
  translate: ErTranslate,
  notationConfig: NotationConfig,
  elementRegistry: any,
  bpmnRenderer: any
) {
  // Armazenar referência do bpmnRenderer para uso em applyColorToElement
  this._bpmnRenderer = bpmnRenderer;
  
  // Override do método de posicionamento do ContextPad para elementos losangulares
  const originalOpen = contextPad.open?.bind(contextPad);
  if (originalOpen && contextPad.open) {
    contextPad.open = function(element: any, force?: boolean) {
      const result = originalOpen(element, force);
      
      // Verificar se é um elemento Relationship
      const erType = ErElementUtils.getErType(element);
      
      const isRelationship = element?.type === 'bpmn:ParallelGateway' && erType === 'Relationship';
      
      if (isRelationship) {
        // Aguardar um momento para o ContextPad ser renderizado
        setTimeout(() => {
          adjustContextPadPosition(element);
        }, 10);
      }
      
      return result;
    };
  }
  
  /**
   * Ajustar posição do ContextPad para elementos losangulares
   */
  function adjustContextPadPosition(element: any) {
    try {
      const contextPadContainer = document.querySelector('.djs-context-pad');
      if (!contextPadContainer) {
        return;
      }
      
      const htmlElement = contextPadContainer as HTMLElement;
      
      // Calcular posição ideal baseada nos vértices do losango
      const elementBounds = {
        x: element.x || 0,
        y: element.y || 0,
        width: element.width || 140,
        height: element.height || 80
      };
      
      // Posicionar o ContextPad à direita do vértice direito do losango
      const rightVertexX = elementBounds.x + elementBounds.width;
      const centerY = elementBounds.y + elementBounds.height / 2;
      
      // Adicionar offset para não sobrepor o elemento
      const offsetX = 15;
      const newX = rightVertexX + offsetX;
      const newY = centerY - 40; // Centralizar verticalmente no ContextPad
      
      // Aplicar nova posição
      htmlElement.style.left = `${newX}px`;
      htmlElement.style.top = `${newY}px`;            
      
    } catch (error) {
      logger.warn('Erro ao ajustar posição do ContextPad:', undefined, error as Error);
    }
  }
  // Registrar nosso provider com prioridade máxima
  contextPad.registerProvider(this);
  
  // CORREÇÃO: Interceptar criação de conexões para remover cardinalidade de atributos
  try {
    // Tentar acessar o eventBus de diferentes maneiras
    let eventBus = null;
    
    // Tentar através do modelingService
    if (modeling && (modeling as any)._eventBus) {
      eventBus = (modeling as any)._eventBus;
    }
    // Tentar através do elementRegistry
    else if (elementRegistry && (elementRegistry as any)._eventBus) {
      eventBus = (elementRegistry as any)._eventBus;
    }
    // Tentar através do this
    else if ((this as any)._eventBus) {
      eventBus = (this as any)._eventBus;
    }
    
    if (eventBus && typeof eventBus.on === 'function') {
      eventBus.on('connection.added', (event: any) => {
        try {
          const connection = event.element;
          if (connection && connection.businessObject && connection.target) {
            const targetErType = ErElementUtils.getErType(connection.target);
            
            // Se o target é um atributo, remover cardinalidade
            if (targetErType === 'Attribute') {
              // Remover propriedades de cardinalidade
              delete connection.businessObject.cardinality;
              delete connection.businessObject.cardinalitySource;
              delete connection.businessObject.cardinalityTarget;
              
              // Remover também dos $attrs se existirem
              if (connection.businessObject.$attrs) {
                delete connection.businessObject.$attrs['er:cardinality'];
                delete connection.businessObject.$attrs['er:cardinalitySource'];
                delete connection.businessObject.$attrs['er:cardinalityTarget'];
              }
              
              console.log('[ErContextPad] Cardinalidade removida de conexão para atributo:', connection.id);
            }
          }
        } catch (listenerError) {
          console.warn('[ErContextPad] Erro no listener de conexão:', listenerError);
        }
      });
      
      console.log('[ErContextPad] Listener de conexão registrado com sucesso');
    } else {
      console.warn('[ErContextPad] EventBus não encontrado - cardinalidade de atributos pode não ser removida automaticamente');
    }
  } catch (eventBusError) {
    console.warn('[ErContextPad] Erro ao configurar listener de conexão:', eventBusError);
  }

  // Usar ErColorUtils para detecção de cor escura
  this.isColorDark = ErColorUtils.isColorDark;

  // Método para aplicar cor a um elemento ER
  this.applyColorToElement = function(element: any, color: string, elementRegistry: any) {
    try {
      if (elementRegistry) {
        const gfx = elementRegistry.getGraphics(element);        
        if (gfx) {
          const isDark = ErColorUtils.isColorDark(color);
          const textColor = isDark ? '#ffffff' : '#000000';                    
          
          // CORREÇÃO: Salvar a cor nas propriedades corretas primeiro
          if (element.businessObject) {
            if (!element.businessObject.$attrs) {
              element.businessObject.$attrs = {};
            }
            
            // Salvar cor no padrão BPMN Color Extension
            element.businessObject.$attrs['bioc:fill'] = color;
            element.businessObject.$attrs['bioc:stroke'] = '#000000';                        
            
            // Manter também o formato antigo para compatibilidade
            (element.businessObject as any).fillColor = color;
            (element.businessObject as any).textColor = textColor;
          }
          
          // Também salvar no DI se disponível
          const di = (element as any).di;
          if (di) {
            if (di.set && typeof di.set === 'function') {
              di.set('bioc:fill', color);
              di.set('bioc:stroke', '#000000');              
            } else if (di.$attrs) {
              di.$attrs['bioc:fill'] = color;
              di.$attrs['bioc:stroke'] = '#000000';              
            }
          }

          // Forçar re-renderização usando o renderer customizado
          if (this._bpmnRenderer && this._bpmnRenderer.drawShape && gfx) {
            try {
              // Limpar elementos visuais, preservando defs e markers
              const elementsToRemove = gfx.querySelectorAll('rect, polygon, ellipse, text, path:not([id*="marker"]), circle, line, g:not([class*="djs-"])');
              elementsToRemove.forEach((el: any) => {
                if (el.parentNode) {
                  el.parentNode.removeChild(el);
                }
              });
              
              // Re-renderizar imediatamente usando o renderer customizado
              this._bpmnRenderer.drawShape(gfx, element);              
            } catch (error) {
              logger.warn('Erro ao re-renderizar elemento com nova cor:', undefined, error as Error);
              
              // Fallback: aplicar cor diretamente no SVG
              setTimeout(() => {
                const shapes = gfx.querySelectorAll('rect, circle, polygon, path, ellipse');
                shapes.forEach((shape: SVGElement) => {
                  shape.style.fill = color;
                  shape.style.stroke = '#000000';
                });
                
                const texts = gfx.querySelectorAll('text, tspan');
                texts.forEach((text: SVGElement) => {
                  text.style.fill = textColor;
                });                
              }, 10);
            }
          } else {
            // Se não temos renderer customizado, aplicar cor diretamente
            const shapes = gfx.querySelectorAll('rect, circle, polygon, path, ellipse');
            shapes.forEach((shape: SVGElement) => {
              shape.style.fill = color;
              shape.style.stroke = '#000000';
            });
            
            const texts = gfx.querySelectorAll('text, tspan');
            texts.forEach((text: SVGElement) => {
              text.style.fill = textColor;
            });            
          }
        }
      }
    } catch (error) {
      // Silenciar erros para não quebrar a interface
    }
  };
  
  // Também interceptar outros métodos que podem causar o contextPad aparecer
  const originalTrigger = (contextPad as any).trigger;
  if (originalTrigger) {
    (contextPad as any).trigger = function(event: string, context?: any) {
      // Bloquear eventos relacionados a seleção múltipla
      if (context && Array.isArray(context.elements)) {        
        return;
      }
      
      return originalTrigger.call(this, event, context);
    };
  }

  this.getContextPadEntries = function(this: any, element: ErElement): ErContextPadEntries {
    const businessObject = element.businessObject;
    
    // CORREÇÃO: Desabilitar ContextPad quando Interface Declarativa estiver ativada
    if (isDeclarativeMode()) {
      return {}; // Bloquear ContextPad no modo declarativo
    }
    
    // Verificar se é seleção múltipla (elemento Array)
    if (Array.isArray(element)) {            
      return {}; // Bloquear contextPad para seleção múltipla
    }

    // Verificar se é uma conexão (SequenceFlow)
    const isConnection = element.type === 'bpmn:SequenceFlow';
    
    // Para conexões (SequenceFlow), sempre permitir contextPad mas sem color picker
    if (isConnection) {      
      const removeElement = (event: Event, element: ErElement) => {
        modeling.removeElements([element]);
      };

      return {
        'delete': {
          group: 'edit',
          className: 'bpmn-icon-trash',
          title: translate('Remover'),
          action: {
            click: removeElement
          }
        }
      };
    }

    // Verificar erType usando utilitário centralizado
    const erType = ErElementUtils.getErType(element);

    // Para elementos ER, verificar tanto por erType quanto por tipo BPMN
    // CORREÇÃO: Melhorar detecção para elementos criados declarativamente
    const isErElement = erType || 
      ErElementUtils.isErElementByBpmnType(element) ||
      (element.type === 'bpmn:Task' && businessObject) ||  // Entidades
      (element.type === 'bpmn:IntermediateCatchEvent' && businessObject) ||  // Atributos
      (element.type === 'bpmn:ParallelGateway' && businessObject); // Relacionamentos


    if (!businessObject || !isErElement) {      
      return {};
    }

    const removeElement = (event: Event, element: ErElement) => {
      modeling.removeElements([element]);
    };

    // Função do ColorPicker para elementos que não são conexões
    const openColorPicker = (event: Event, element: ErElement) => {
      event.stopPropagation();
      
      // Criar um seletor de cor simples
      const colorPalette = [
        '#ffffff', '#f0f0f0', '#d9d9d9', '#bfbfbf', '#8c8c8c', '#595959', '#262626', '#000000',
        '#ffebe8', '#ff9696', '#ff4545', '#fa1c1c', '#d40d0d', '#ad1f1f', '#871414', '#5c1010',
        '#fff2e8', '#ffbb96', '#ff7a45', '#fa541c', '#d4660d', '#ad661f', '#874a14', '#714612',
        '#fef9dc', '#fff396', '#fff045', '#faf61c', '#d4d10d', '#ada31f', '#878514', '#747213',
        '#f6ffed', '#b7eb8f', '#73d13d', '#52c41a', '#389e0d', '#237804', '#135200', '#185a06',
        '#e6fffb', '#87e8de', '#36cfc9', '#13c2c2', '#08979c', '#006d75', '#005058', '#00353e',
        '#f0f5ff', '#adc6ff', '#597ef7', '#2f54eb', '#1d39c4', '#10239e', '#061178', '#02063d',
        '#f9f0ff', '#d3adf7', '#b37feb', '#722ed1', '#531dab', '#391085', '#22075e', '#120338'
      ];
      
      // Remover picker anterior se existir
      const existingPicker = document.querySelector('.er-color-picker');
      if (existingPicker && existingPicker.parentNode) {
        existingPicker.parentNode.removeChild(existingPicker);
      }
      
      // Criar elemento do picker
      const picker = document.createElement('div');
      picker.className = 'er-color-picker';
      picker.style.cssText = `
        position: fixed;
        top: ${(event as MouseEvent).clientY + 10}px;
        left: ${(event as MouseEvent).clientX + 10}px;
        background: white;
        border: 1px solid #bebebeff;
        border-radius: 6px;
        padding: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        display: grid;
        grid-template-columns: repeat(8, 20px);
        gap: 6px;
        z-index: 1000;
      `;
      
      colorPalette.forEach(color => {
        const colorSwatch = document.createElement('div');
        colorSwatch.style.cssText = `
          width: 20px;
          height: 20px;
          background-color: ${color};
          border: 1px solid #d9d9d9;
          border-radius: 2px;
          cursor: pointer;
          transition: transform 0.2s;
        `;
        
        colorSwatch.addEventListener('mouseenter', () => {
          colorSwatch.style.transform = 'scale(1.1)';
        });
        
        colorSwatch.addEventListener('mouseleave', () => {
          colorSwatch.style.transform = 'scale(1)';
        });
        
        colorSwatch.addEventListener('click', () => {
          this.applyColorToElement(element, color, elementRegistry);
          if (picker.parentNode) {
            picker.parentNode.removeChild(picker);
          }
        });
        
        picker.appendChild(colorSwatch);
      });
      
      // Fechar ao clicar fora
      const closeOnOutsideClick = (e: MouseEvent) => {
        if (!picker.contains(e.target as Node)) {
          if (picker.parentNode) {
            picker.parentNode.removeChild(picker);
          }
          document.removeEventListener('click', closeOnOutsideClick);
        }
      };
      
      document.body.appendChild(picker);
      setTimeout(() => {
        document.addEventListener('click', closeOnOutsideClick);
      }, 100);
    };

    const deleteEntry: ErContextPadEntries = {
      'delete': {
        group: 'edit',
        className: 'bpmn-icon-trash',
        title: translate('Remover'),
        action: {
          click: removeElement
        }
      }
    };

    // Entry do ColorPicker para elementos não-conexão
    const colorPickerEntry: ErContextPadEntries = {
      'er-color-picker': {
        group: 'edit',
        className: 'bpmn-icon-er-color-picker',
        title: translate('Alterar cor'),
        action: {
          click: openColorPicker
        }
      }
    };

    // Detectar tipo do elemento (erType ou por tipo BPMN)
    const elementErType = erType || 
      (element.type === 'bpmn:Task' ? 'Entity' : 
       element.type === 'bpmn:IntermediateCatchEvent' ? 'Attribute' : 
       element.type === 'bpmn:ParallelGateway' ? 'Relationship' : null);

    if (elementErType === 'Entity') {
      const appendEntity = (event: Event, element: any) => {
        try {
          const shape = erElementFactory.createShape({
            type: 'bpmn:Task',
            name: 'Entidade',
            erType: 'Entity',
            width: 120,
            height: 80,
            isWeak: false
          });
          
          const result = create.start(event, shape, { source: element });
          return result;
          
        } catch (error) {
          console.error('[ErContextPad] Erro em appendEntity:', error);
          logger.error('Erro ao criar entidade do ContextPad:', undefined, error as Error);
        }
      }; 

      const appendAttribute = (event: Event, element: any) => {
        const shape = erElementFactory.createShape({
          type: 'bpmn:IntermediateCatchEvent',
          name: 'Atributo',
          erType: 'Attribute',
          width: 90,
          height: 50,
          isPrimaryKey: false,          
          isRequired: true,
          dataType: 'VARCHAR'
        });
        
        return create.start(event, shape, { source: element });
      };

      const appendRelationship = (event: Event, element: any) => {
        const shape = erElementFactory.createShape({
          type: 'bpmn:ParallelGateway',
          name: 'Relacionamento',
          erType: 'Relationship',
          width: 140,
          height: 80,
          cardinalitySource: '1..1',
          cardinalityTarget: '1..N',
          isIdentifying: false
        });
        
        return create.start(event, shape, { source: element });
      };          

      const entries: any = {
        'append.attribute': {
          group: 'model',
          className: 'bpmn-icon-er-attribute',
          title: translate('Adicionar atributo'),
          action: {
            click: appendAttribute
          }
        },
        ...colorPickerEntry,
        ...deleteEntry
      };
      
      // Lógica específica por notação para conexão Entidade → Entidade
      if (notationConfig.elements.allowDirectEntityToEntityConnection) {
        // Crow's Foot: Entidades PODEM conectar diretamente a outras entidades
        entries['append.entity'] = {
          group: 'model',
          className: 'bpmn-icon-er-entity',
          title: translate('Conectar a entidade'),
          action: {
            click: appendEntity
          }
        };
      }
  
      // Adicionar relacionamento apenas se a notação suportar (Chen)
      if (notationConfig.elements.hasRelationshipElement) {
        entries['append.relationship'] = {
          group: 'model',
          className: 'bpmn-icon-er-relationship',
          title: translate('Adicionar relacionamento'),
          action: {
            click: appendRelationship
          }
        };
      }
      
      return entries;
    }    
    
    if (elementErType === 'Relationship' && notationConfig.elements.hasRelationshipElement) {
      const appendEntity = (event: Event, element: any) => {
        const shape = erElementFactory.createShape({
          type: 'bpmn:Task',
          name: 'Entidade',
          erType: 'Entity',
          width: 120,
          height: 80,
          isWeak: false
        });
        
        return create.start(event, shape, { source: element });
      };      

      const appendAttribute = (event: Event, element: any) => {
        const shape = erElementFactory.createShape({
          type: 'bpmn:IntermediateCatchEvent',
          name: 'Atributo',
          erType: 'Attribute',
          width: 80,
          height: 50,
          isPrimaryKey: false,          
          isRequired: true,
          dataType: 'VARCHAR'
        });
        
        return create.start(event, shape, { source: element });
      };

      const result = {
        'append.entity': {
          group: 'model',
          className: 'bpmn-icon-er-entity',
          title: translate('Conectar a entidade'),
          action: {
            click: appendEntity
          }
        },
        'append.attribute': {
          group: 'model',
          className: 'bpmn-icon-er-attribute',
          title: translate('Adicionar atributo'),
          action: {
            click: appendAttribute
          }
        },
        ...colorPickerEntry,
        ...deleteEntry
      };
      return result;
    }
    
    // Para Atributos - apenas delete (sem colorPicker)
    if (elementErType === 'Attribute') {
      return {
        ...deleteEntry
      };
    }
    
    // Para outros elementos, delete e colorPicker
    return {
      ...colorPickerEntry,
      ...deleteEntry
    };
  };

  // Definir prioridade alta para sobrepor providers padrão
  this.getContextPadEntries.priority = 2000;
}

ErContextPadProvider.$inject = [
  'contextPad',
  'create',
  'erElementFactory',
  'modeling',
  'translate',
  'notationConfig',
  'elementRegistry',
  'bpmnRenderer'
];