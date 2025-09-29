import { NotationConfig } from '../../../../../features/diagram/shared/config/er';

// Interfaces para tipagem TypeScript
interface ContextPad {
  registerProvider: (provider: any) => void;
  open?: (element: any, force?: boolean) => void;
}

interface Create {
  start: (event: Event, shape: any, context?: { source: Element }) => void;
}

interface ErElementFactory {
  createShape: (options: ShapeOptions) => any;
}

interface Modeling {
  removeElements: (elements: Element[]) => void;
}

interface Translate {
  (text: string): string;
}

interface BusinessObject {
  id: string;
  name?: string;
  erType?: string;
  isWeak?: boolean;
  isPrimaryKey?: boolean;
  isIdentifying?: boolean;
  cardinalitySource?: string;
  cardinalityTarget?: string;
  dataType?: string;
  isRequired?: boolean;
  $attrs?: { [key: string]: string };
}

interface Element {
  id: string;
  type: string;
  width: number;
  height: number;
  businessObject: BusinessObject;
  parent?: Element;
}

interface ShapeOptions {
  type: string;
  name: string;
  erType: string;
  width: number;
  height: number;
  isPrimaryKey?: boolean;
  isRequired?: boolean;
  dataType?: string;
  cardinalitySource?: string;
  cardinalityTarget?: string;
  isIdentifying?: boolean;
  isWeak?: boolean;
}

interface ContextPadEntry {
  group: string;
  className: string;
  title: string;
  action: {
    click: any;
  };
}

interface ContextPadEntries {
  [key: string]: ContextPadEntry;
}

export default function ErContextPadProvider(
  this: any,
  contextPad: ContextPad,
  create: Create,
  erElementFactory: ErElementFactory,
  modeling: Modeling,
  translate: Translate,
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
      const erType = element?.businessObject && (
        element.businessObject.erType || 
        element.businessObject.$attrs?.['er:erType'] ||
        element.businessObject.$attrs?.['ns0:erType']
      );
      
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
      
      console.log(`ContextPad reposicionado para elemento losangular: (${newX}, ${newY})`);
      
    } catch (error) {
      console.warn('Erro ao ajustar posição do ContextPad:', error);
    }
  }
  // Registrar nosso provider com prioridade máxima
  contextPad.registerProvider(this);

  // Função para detectar se uma cor é escura
  this.isColorDark = function(color: string): boolean {
    // Converter cor hex para RGB
    let r: number, g: number, b: number;
    if (color.length === 4) {
      r = parseInt(color[1] + color[1], 16);
      g = parseInt(color[2] + color[2], 16);
      b = parseInt(color[3] + color[3], 16);
    } else {
      r = parseInt(color.slice(1, 3), 16);
      g = parseInt(color.slice(3, 5), 16);
      b = parseInt(color.slice(5, 7), 16);
    }
    
    // Calcular luminância usando fórmula padrão
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5; // Cores com luminância < 0.5 são consideradas escuras
  };

  // Método para aplicar cor a um elemento ER
  this.applyColorToElement = function(element: Element, color: string, elementRegistry: any) {
    try {
      if (elementRegistry) {
        const gfx = elementRegistry.getGraphics(element);
        console.log('- gfx obtido do elementRegistry:', !!gfx);
        if (gfx) {
          const isDark = this.isColorDark(color);
          const textColor = isDark ? '#ffffff' : '#000000';
          
          console.log(`[COLOR APPLY] Aplicando cor ${color} ao elemento ${element.id}`);
          
          // CORREÇÃO: Salvar a cor nas propriedades corretas primeiro
          if (element.businessObject) {
            if (!element.businessObject.$attrs) {
              element.businessObject.$attrs = {};
            }
            
            // Salvar cor no padrão BPMN Color Extension
            element.businessObject.$attrs['bioc:fill'] = color;
            element.businessObject.$attrs['bioc:stroke'] = '#000000';
            
            console.log('- Cor salva em $attrs:', element.businessObject.$attrs);
            
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
              console.log('- Cor salva no DI via set()');
            } else if (di.$attrs) {
              di.$attrs['bioc:fill'] = color;
              di.$attrs['bioc:stroke'] = '#000000';
              console.log('- Cor salva no DI.$attrs');
            }
          }
          
          console.log('- Re-renderizando elemento com nova cor...');
          console.log('- bpmnRenderer disponível:', !!this._bpmnRenderer);
          console.log('- drawShape disponível:', !!(this._bpmnRenderer && this._bpmnRenderer.drawShape));
          
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
              console.log('- Elemento re-renderizado via drawShape');
            } catch (error) {
              console.warn('Erro no re-render via drawShape:', error);
              
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
                console.log('- Cor aplicada via fallback SVG');
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
            console.log('- Cor aplicada diretamente no SVG');
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

  this.getContextPadEntries = function(this: any, element: Element): ContextPadEntries {
    const businessObject = element.businessObject;
    
    // Verificar se é seleção múltipla (elemento Array)
    if (Array.isArray(element)) {      
      return {}; // Bloquear contextPad para seleção múltipla
    }

    // Verificar se é uma conexão (SequenceFlow)
    const isConnection = element.type === 'bpmn:SequenceFlow';
    
    // Para conexões (SequenceFlow), sempre permitir contextPad mas sem color picker
    if (isConnection) {
      const removeElement = (event: Event, element: Element) => {
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

    // Verificar erType tanto em businessObject.erType quanto em $attrs (para elementos importados)
    const erType = businessObject && (
      businessObject.erType || 
      (businessObject.$attrs && (
        businessObject.$attrs['er:erType'] || 
        businessObject.$attrs['ns0:erType']
      ))
    );

    // Para elementos ER, também verificar por tipo BPMN
    const isErElement = erType || 
      (element.type === 'bpmn:Task' && businessObject) ||  // Entidades
      (element.type === 'bpmn:UserTask' && businessObject) ||  // Atributos
      (element.type === 'bpmn:ParallelGateway' && businessObject); // Relacionamentos

    if (!businessObject || !isErElement) {
      return {};
    }

    const removeElement = (event: Event, element: Element) => {
      modeling.removeElements([element]);
    };

    // Função do ColorPicker para elementos que não são conexões
    const openColorPicker = (event: Event, element: Element) => {
      event.stopPropagation();
      
      // Criar um seletor de cor simples
      const colorPalette = [
        '#ffffff', '#f0f0f0', '#d9d9d9', '#bfbfbf', '#8c8c8c', '#595959', '#262626', '#000000',
        '#fff2e8', '#ffbb96', '#ff7a45', '#fa541c', '#d4380d', '#ad2f1f', '#872014', '#5c1e10',
        '#f6ffed', '#b7eb8f', '#73d13d', '#52c41a', '#389e0d', '#237804', '#135200', '#092b00',
        '#e6fffb', '#87e8de', '#36cfc9', '#13c2c2', '#08979c', '#006d75', '#00474f', '#002329',
        '#f0f5ff', '#adc6ff', '#597ef7', '#2f54eb', '#1d39c4', '#10239e', '#061178', '#030852',
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
        border: 1px solid #d9d9d9;
        border-radius: 6px;
        padding: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        display: grid;
        grid-template-columns: repeat(8, 20px);
        gap: 4px;
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
          transition: transform 0.1s;
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

    const deleteEntry: ContextPadEntries = {
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
    const colorPickerEntry: ContextPadEntries = {
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
       element.type === 'bpmn:UserTask' ? 'Attribute' : 
       element.type === 'bpmn:ParallelGateway' ? 'Relationship' : null);

    if (elementErType === 'Entity') {
      const appendEntity = (event: Event, element: Element) => {
        const shape = erElementFactory.createShape({
          type: 'bpmn:Task',
          name: 'Entidade',
          erType: 'Entity',
          width: 120,
          height: 80,
          isWeak: false
        });
        create.start(event, shape, { source: element });
      }; 

      const appendAttribute = (event: Event, element: Element) => {
        const shape = erElementFactory.createShape({
          type: 'bpmn:UserTask',
          name: 'Atributo',
          erType: 'Attribute',
          width: 80,
          height: 50,
          isPrimaryKey: false,          
          isRequired: true,
          dataType: 'VARCHAR'
        });
        create.start(event, shape, { source: element });
      };

      const appendRelationship = (event: Event, element: Element) => {
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
        create.start(event, shape, { source: element });
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
      // Chen: Entidades NÃO podem conectar diretamente (omitimos append.entity)
      
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
    
    // Para Relacionamentos (apenas na notação Chen)
    if (elementErType === 'Relationship' && notationConfig.elements.hasRelationshipElement) {
      const appendEntity = (event: Event, element: Element) => {
        const shape = erElementFactory.createShape({
          type: 'bpmn:Task',
          name: 'Entidade',
          erType: 'Entity',
          width: 120,
          height: 80,
          isWeak: false
        });
        create.start(event, shape, { source: element });
      };      

      const appendAttribute = (event: Event, element: Element) => {
        const shape = erElementFactory.createShape({
          type: 'bpmn:UserTask',
          name: 'Atributo',
          erType: 'Attribute',
          width: 80,
          height: 50,
          isPrimaryKey: false,          
          isRequired: true,
          dataType: 'VARCHAR'
        });
        create.start(event, shape, { source: element });
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