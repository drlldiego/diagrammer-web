import BpmnRenderer from 'bpmn-js/lib/draw/BpmnRenderer';
import { 
  append,
  attr,
  create
} from 'tiny-svg';
import { logger } from '../../../../../utils/logger';
import { ER_STYLE_CONFIG, ErColorUtils } from '../../config/er/ErStyleConfig';

// Tipos para os parâmetros do construtor
interface RendererConfig {
  bpmnRenderer?: any;
}

interface EventBus {
  on: (event: string, callback: Function) => void;
  off: (event: string, callback: Function) => void;
  fire: (event: string, data?: any) => void;
}

interface Styles {
  computeStyle: (element: any, properties: any) => any;
}

interface PathMap {
  getScaledPath: (path: string, scale: number) => string;
}

interface Canvas {
  getContainer: () => HTMLElement;
  addMarker: (element: any, marker: string) => void;
  removeMarker: (element: any, marker: string) => void;
}

interface TextRenderer {
  createText: (text: string, options: any) => SVGElement;
  getTextBBox: (text: string, options: any) => { width: number; height: number };
}

interface BusinessObject {
  id: string;
  name?: string;
  erType?: string;
  isWeak?: boolean;
  isPrimaryKey?: boolean;  
  isRequired?: boolean;
  isMultivalued?: boolean;
  isDerived?: boolean;
  isComposite?: boolean;
  isIdentifying?: boolean;
  cardinalitySource?: string;
  cardinalityTarget?: string;
  isParentChild?: boolean;
  $attrs?: { [key: string]: string };
}

interface Element {
  id: string;
  type: string;
  width: number;
  height: number;
  businessObject: BusinessObject;
  source?: Element;
  target?: Element;
  waypoints?: { x: number; y: number }[];
}

/**
 * Validar se uma cor é válida
 */
function isValidColor(color: string): boolean {
  if (!color) return false;
  // Validar hex colors (3 ou 6 dígitos)
  const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexPattern.test(color);
}

/**
 * Verificar se o elemento tem cores customizadas definidas pelo ColorPick
 */
function getCustomColors(element: Element): { fill?: string; stroke?: string } {
  const colors: { fill?: string; stroke?: string } = {};
  
  // Verificar nos atributos do businessObject (BPMN Color Specification)
  if (element.businessObject?.$attrs) {
    const attrs = element.businessObject.$attrs;
    
    if (attrs['bioc:fill']) {
      const fillColor = attrs['bioc:fill'];
      const formattedFill = fillColor.startsWith('#') ? fillColor : `#${fillColor}`;
      if (isValidColor(formattedFill)) {
        colors.fill = formattedFill;
      } else {
        logger.warn(`Cor de preenchimento inválida para ${element.id}: ${formattedFill}`);
      }
    }
    if (attrs['bioc:stroke']) {
      const strokeColor = attrs['bioc:stroke'];
      const formattedStroke = strokeColor.startsWith('#') ? strokeColor : `#${strokeColor}`;
      if (isValidColor(formattedStroke)) {
        colors.stroke = formattedStroke;
      } else {
        logger.warn(`Cor de borda inválida para ${element.id}: ${formattedStroke}`);
      }
    }
  }
  
  // Verificar na DI (Diagram Interchange) - método alternativo
  const di = (element as any).di || (element as any).businessObject?.di;
  if (di && di.get && typeof di.get === 'function') {
    const diocFill = di.get('bioc:fill');
    const diocStroke = di.get('bioc:stroke');
    if (diocFill) {
      const formattedFill = diocFill.startsWith('#') ? diocFill : `#${diocFill}`;
      if (isValidColor(formattedFill)) {
        colors.fill = formattedFill;
      }
    }
    if (diocStroke) {
      const formattedStroke = diocStroke.startsWith('#') ? diocStroke : `#${diocStroke}`;
      if (isValidColor(formattedStroke)) {
        colors.stroke = formattedStroke;
      }
    }
  }
  
  // Verificar também diretamente no DI se não encontrou via get()
  if (di && !colors.fill && !colors.stroke) {
    if (di.fill && isValidColor(di.fill)) {
      colors.fill = di.fill;
    }
    if (di.stroke && isValidColor(di.stroke)) {
      colors.stroke = di.stroke;
    }
    
    // Verificar propriedades específicas do BPMN Color Extension no DI
    if (di.$attrs) {
      ['bioc:fill', 'bpmn:fill', 'color:fill', 'fill'].forEach(fillAttr => {
        if (di.$attrs[fillAttr] && isValidColor(di.$attrs[fillAttr])) {
          colors.fill = di.$attrs[fillAttr];
        }
      });
      
      ['bioc:stroke', 'bpmn:stroke', 'color:stroke', 'stroke'].forEach(strokeAttr => {
        if (di.$attrs[strokeAttr] && isValidColor(di.$attrs[strokeAttr])) {
          colors.stroke = di.$attrs[strokeAttr];
        }
      });
    }
  }
  
  // Verificar diretamente no element (algumas implementações armazenam aqui)
  if ((element as any).color) {
    if ((element as any).color.fill && isValidColor((element as any).color.fill)) {
      colors.fill = (element as any).color.fill;
    }
    if ((element as any).color.stroke && isValidColor((element as any).color.stroke)) {
      colors.stroke = (element as any).color.stroke;
    }
  }  
  
  return colors;
}

/**
 * ErBpmnRenderer - Substitui o BpmnRenderer padrão
 * Renderiza elementos ER de forma customizada, elementos BPMN normalmente
 */
export default function ErBpmnRenderer(
  this: any,
  config: RendererConfig,
  eventBus: EventBus,
  styles: Styles,
  pathMap: PathMap,
  canvas: Canvas,
  textRenderer: TextRenderer,
  elementRegistry: any,
  erConfig: any
): void {  
  // Chamar o construtor do BpmnRenderer
  (BpmnRenderer as any).call(this, config, eventBus, styles, pathMap, canvas, textRenderer);
  
  // Armazenar elementRegistry para uso em isSubAttribute
  this._elementRegistry = elementRegistry;
  
  // Armazenar configuração ER (incluindo notação)
  this._erConfig = erConfig || { notation: 'chen' };
  
  
  // Verificar se existe uma variável global com a configuração (fallback)
  if ((window as any).currentErNotation) {
    this._erConfig = { notation: (window as any).currentErNotation };
  }
  
  // Listener simplificado apenas para mudanças não automáticas na conexão
  eventBus.on('connection.changed', (event: any) => {
    const element = event.element;
    if (element?.waypoints) {
      setTimeout(() => {
        this.updateConnectionCardinalities(element);
      }, 100);
    }
  });

  // DESABILITADO TEMPORARIAMENTE - Listener para re-renderizar elementos pode estar interferindo
  // eventBus.on('elements.changed', (event: any) => {
  //   if (event.elements) {
  //     event.elements.forEach((element: any) => {
  //       const erType = element.businessObject && (
  //         element.businessObject.erType || 
  //         (element.businessObject.$attrs && (
  //           element.businessObject.$attrs['er:erType'] || 
  //           element.businessObject.$attrs['ns0:erType']
  //         ))
  //       );
        
  //       // Se é um elemento ER, forçar re-renderização
  //       if (erType && elementRegistry) {
  //         setTimeout(() => {
  //           try {
  //             const gfx = elementRegistry.getGraphics(element);
  //             if (gfx) {
  //               // Limpar conteúdo visual atual (preservando defs, markers e outline)
  //               const elementsToRemove = gfx.querySelectorAll('rect:not(.djs-outline), polygon:not(.djs-outline), ellipse:not(.djs-outline), text:not(.djs-outline), path:not([id*="marker"]):not(.djs-outline), circle:not(.djs-outline), line:not(.djs-outline), g:not([class*="djs-"]):not([class*="er-outline-"])');
  //               elementsToRemove.forEach((el: any) => {
  //                 if (el.parentNode) {
  //                   el.parentNode.removeChild(el);
  //                 }
  //               });
                
  //               // Re-renderizar elemento
  //               this.drawShape(gfx, element);
  //             }
  //           } catch (error) {
  //             // Ignorar erros de re-renderização
  //           }
  //         }, 10);
  //       }
  //     });
  //   }
  // });

  // Listener específico para eventos render.shape disparados pelo useErRenderManager
  eventBus.on('render.shape', (event: any) => {
    const element = event.element;
    if (element && elementRegistry) {
      const erType = element.businessObject && (
        element.businessObject.erType || 
        (element.businessObject.$attrs && (
          element.businessObject.$attrs['er:erType'] || 
          element.businessObject.$attrs['ns0:erType']
        ))
      );
      
      // Se é um elemento ER, forçar re-renderização imediata
      if (erType) {
        setTimeout(() => {
          try {
            const gfx = elementRegistry.getGraphics(element);
            if (gfx) {
              // Limpar conteúdo visual atual (preservando defs, markers e outline)
              const elementsToRemove = gfx.querySelectorAll('rect:not(.djs-outline), polygon:not(.djs-outline), ellipse:not(.djs-outline), text:not(.djs-outline), path:not([id*="marker"]):not(.djs-outline), circle:not(.djs-outline), line:not(.djs-outline), g:not([class*="djs-"]):not([class*="er-outline-"])');
              elementsToRemove.forEach((el: any) => {
                if (el.parentNode) {
                  el.parentNode.removeChild(el);
                }
              });
              
              // Re-renderizar elemento
              this.drawShape(gfx, element);
            }
          } catch (error) {
            // Ignorar erros de re-renderização
          }
        }, 5); // Timeout menor para resposta mais rápida
      }
    }
  });
  

  // Listener para edição inline (duplo clique) - detectar mudanças no nome
  eventBus.on('element.updateLabel', (event: any) => {
    const element = event.element;
    const newLabel = event.newLabel;
    
    // Verificar se é elemento ER
    const erType = element.businessObject && (
      element.businessObject.erType || 
      (element.businessObject.$attrs && (
        element.businessObject.$attrs['er:erType'] || 
        element.businessObject.$attrs['ns0:erType']
      ))
    );
    
    if (erType) {
      // Atualizar businessObject
      element.businessObject.name = newLabel;
      
      // Re-renderizar elemento ER
      setTimeout(() => {
        const gfx = elementRegistry.getGraphics(element);
        if (gfx) {
          // Remover apenas elementos visuais, preservando defs e markers
          const elementsToRemove = gfx.querySelectorAll('rect, polygon, ellipse, text, path:not([id*="marker"])');
          elementsToRemove.forEach((el: any) => {
            if (el.parentNode) {
              el.parentNode.removeChild(el);
            }
          });
          this.drawShape(gfx, element);
        }
      }, 10);
    }
  });

  // Listener alternativo para mudanças de nome
  eventBus.on('commandStack.executed', (event: any) => {
    if (event.command && event.command.startsWith && event.command.startsWith('element.updateLabel')) {
      const context = event.context;
      if (context && context.element) {
        const element = context.element;
        const erType = element.businessObject && (
          element.businessObject.erType || 
          (element.businessObject.$attrs && (
            element.businessObject.$attrs['er:erType'] || 
            element.businessObject.$attrs['ns0:erType']
          ))
        );
        
        if (erType) {
          setTimeout(() => {
            const gfx = elementRegistry.getGraphics(element);
            if (gfx) {
              // Remover apenas elementos visuais, preservando defs e markers
              const elementsToRemove = gfx.querySelectorAll('rect, polygon, ellipse, text, path:not([id*="marker"])');
              elementsToRemove.forEach((el: any) => {
            if (el.parentNode) {
              el.parentNode.removeChild(el);
            }
          });
              this.drawShape(gfx, element);
            }
          }, 10);
        }
      }
    }
  });

  // Listener para movimentação de elementos
  eventBus.on('element.move.end', (event: any) => {
    const element = event.element;
    // Encontrar todas as conexões conectadas a este elemento
    const allElements = elementRegistry.getAll();
    const connectedConnections = allElements.filter((conn: any) => {
      return conn.waypoints && (
        conn.source?.id === element.id || 
        conn.target?.id === element.id
      );
    });
    
    // Atualizar cardinalidades de todas as conexões conectadas
    connectedConnections.forEach((connection: any) => {      
      setTimeout(() => {
        this.updateConnectionCardinalities(connection);
      }, 50); // Delay maior para garantir que os waypoints foram recalculados
    });
  });  
  
  // Listener específico para comandos executados (inclui mudanças de cor e propriedades)
  eventBus.on('commandStack.executed', (event: any) => {
    const context = event.context;
    
    // Verificar se é um comando de mudança de cor
    if (context && context.elements) {
      context.elements.forEach((element: any) => {
        const erType = element.businessObject && (
          element.businessObject.erType || 
          (element.businessObject.$attrs && (
            element.businessObject.$attrs['er:erType'] || 
            element.businessObject.$attrs['ns0:erType']
          ))
        );
        
        if (erType) {
          // Re-renderizar elemento ER com possíveis mudanças de cor
          setTimeout(() => {
            const gfx = elementRegistry.getGraphics(element);
            if (gfx && gfx.innerHTML !== undefined) {
              // Remover apenas elementos visuais, preservando defs e markers
              const elementsToRemove = gfx.querySelectorAll('rect, polygon, ellipse, text, path:not([id*="marker"])');
              elementsToRemove.forEach((el: any) => {
            if (el.parentNode) {
              el.parentNode.removeChild(el);
            }
          });
              this.drawShape(gfx, element);
            }
          }, 10);
        }
      });
    }
    
    // Verificar se é um comando de mudança de propriedades
    if (context && context.element && event.command === 'element.updateModdleProperties') {
      const element = context.element;
      const erType = element.businessObject && (
        element.businessObject.erType || 
        (element.businessObject.$attrs && (
          element.businessObject.$attrs['er:erType'] || 
          element.businessObject.$attrs['ns0:erType']
        ))
      );
      
      if (erType) {
        // Re-renderizar elemento ER com mudanças de propriedades (preservando cores)
        setTimeout(() => {
          const gfx = elementRegistry.getGraphics(element);
          if (gfx && gfx.innerHTML !== undefined) {
            // Remover apenas elementos visuais, preservando defs e markers
            const elementsToRemove = gfx.querySelectorAll('rect, polygon, ellipse, text, path:not([id*="marker"])');
            elementsToRemove.forEach((el: any) => {
            if (el.parentNode) {
              el.parentNode.removeChild(el);
            }
          });
            this.drawShape(gfx, element);
          }
        }, 10);
      }
    }
  });
  
  // Listener para evento customizado de atualização preservando cores
  eventBus.on('er.element.update', (event: any) => {
    const { element, property, preserveColors } = event;
    
    if (preserveColors && property === 'isIdentifying') {
      // Re-renderizar preservando cores
      setTimeout(() => {
        const gfx = elementRegistry.getGraphics(element);
        if (gfx && gfx.innerHTML !== undefined) {
          // Remover apenas elementos visuais, preservando defs e markers
          const elementsToRemove = gfx.querySelectorAll('rect, polygon, ellipse, text, path:not([id*="marker"])');
          elementsToRemove.forEach((el: any) => {
            if (el.parentNode) {
              el.parentNode.removeChild(el);
            }
          });
          this.drawShape(gfx, element);          
        }
      }, 20); // Delay maior para garantir que a propriedade foi atualizada
    }
  });
  
}

// Inversão de Controle (IoC) / Dependency Injection
// Injeção de dependências via DI do bpmn-js - necessário para funcionamento do renderer customizado.
ErBpmnRenderer.$inject = [
  'config.bpmnRenderer',
  'eventBus',
  'styles',
  'pathMap',
  'canvas', 
  'textRenderer',
  'elementRegistry',
  'config.erConfig'
];

// Herdar do BpmnRenderer
ErBpmnRenderer.prototype = Object.create(BpmnRenderer.prototype);

/**
 * Override do drawShape para elementos ER
 */
(ErBpmnRenderer as any).prototype.drawShape = function(this: any, parentNode: SVGElement, element: Element): SVGElement | null {
  
  // Verificar erType tanto em businessObject.erType quanto em $attrs (para elementos importados)
  const erType = element.businessObject && (
    element.businessObject.erType || 
    (element.businessObject.$attrs && (
      element.businessObject.$attrs['er:erType'] || 
      element.businessObject.$attrs['ns0:erType']
    ))
  );
  
  // Também detectar atributos por IntermediateCatchEvent
  const isAttributeType = element.type === 'bpmn:IntermediateCatchEvent' && erType === 'Attribute';
  // Detectar atributo composto por IntermediateCatchEvent
  const isSubAttributeType = element.type === 'bpmn:IntermediateCatchEvent' && erType === 'SubAttribute';
  
  const isRelationshipType = element.type === 'bpmn:ParallelGateway' && erType === 'Relationship';
  
  
  // Se é elemento ER, usar renderização customizada
  if ((erType && element.type !== 'label') || isAttributeType || isSubAttributeType || isRelationshipType) {
    
    // Limpar elementos visuais para evitar duplicações, preservando estruturas importantes
    if (parentNode) {
      // Preservar defs e markers importantes
      const defsElements = parentNode.querySelectorAll('defs');
      const markerElements = parentNode.querySelectorAll('[id*="marker"]');
      
      // Remover apenas elementos visuais
      const elementsToRemove = parentNode.querySelectorAll('rect, polygon, ellipse, text, path:not([id*="marker"]), circle, line, g:not([class*="djs-"])');
      elementsToRemove.forEach((el: any) => {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });
    }
    
    let result: SVGElement | null = null;
    
    if (erType === 'Entity') {
      result = this.drawErEntity(parentNode, element);
    } else if (erType === 'Relationship' || isRelationshipType) {
      result = this.drawErRelationship(parentNode, element);
    } else if (erType === 'Attribute' || isAttributeType) {
      result = this.drawErAttribute(parentNode, element);
    } else if (erType === 'SubAttribute' || isSubAttributeType) {
      result = this.drawErSubAttribute(parentNode, element);
    }
    
    return result;
  }
  
  // Se é label de elemento ER, não renderizar (já temos texto no elemento principal)
  if (erType && element.type === 'label') {    
    return null; // Não renderizar label separada
  }
  
  // Se é label de conexão ER, não renderizar (já tratamos diretamente na conexão)
  if (element.type === 'label' && element.id && element.id.includes('Flow_')) {
    // Verificar se a conexão relacionada tem elementos ER
    const connectionId = element.id.replace('_label', '');
    const connectionElement = this._elementRegistry?.get(connectionId);
    
    if (connectionElement) {
      const source = connectionElement.source;
      const target = connectionElement.target;
      const hasErElements = (source && source.businessObject && source.businessObject.erType) 
                         || (target && target.businessObject && target.businessObject.erType);
      
      // Se conecta elementos ER, não renderizar label separado (já tratamos diretamente)
      if (hasErElements) {
        return null;
      }
    }
    
    return null; // Remover outros labels de conexão
  }
  
  // Para elementos BPMN normais, usar renderização padrão  
  return (BpmnRenderer.prototype.drawShape as any).call(this, parentNode, element);
};

/**
 * Desenhar entidade ER (retângulo)
 */
(ErBpmnRenderer as any).prototype.drawErEntity = function(this: any, parentNode: SVGElement, element: Element): SVGElement {  
  if (!parentNode) {
    return null as any;
  }
  
  const width = element.width || 120;
  const height = element.height || 80;
  
  // Verificar cores customizadas primeiro
  const customColors = getCustomColors(element);
  
  // Usar configuração centralizada para cores padrão
  const elementColors = ErColorUtils.getElementColors(element, 'entity');
  const defaultStroke = elementColors.stroke;
  const defaultFill = elementColors.fill;
  
  const rect = create('rect');
  attr(rect, {
    x: 0,
    y: 0,
    width: width,
    height: height,    
    stroke: customColors.stroke || defaultStroke,
    'stroke-width': 1,
    fill: customColors.fill || defaultFill,
    rx: 12,
    ry: 12,
    'vector-effect': 'non-scaling-stroke'
  });

  append(parentNode, rect);

  // Entidade fraca: alterar estilo e cores
  const isWeak = element.businessObject && (
    element.businessObject.isWeak === true || 
    (element.businessObject.$attrs && (
      element.businessObject.$attrs['er:isWeak'] === 'true' ||
      element.businessObject.$attrs['ns0:isWeak'] === 'true'
    ))
  );
  
  // Debug log para verificar a propriedade isWeak
  if (element.businessObject) {
  }
  
  if (isWeak) {        
    // Usar cores específicas para entidade fraca da configuração centralizada
    if (!customColors.stroke && !customColors.fill) {
      const weakColors = ER_STYLE_CONFIG.colors.entity.weak;
      attr(rect, {
        stroke: weakColors.stroke,
        fill: weakColors.fill
      });
    }
    
    const innerRect = create('rect');
    
    // Determinar cor do retângulo interno baseada no contraste usando utilitários centralizados
    let innerStrokeColor = ER_STYLE_CONFIG.colors.inner.darkBackground;
    
    // Priorizar cor de preenchimento para análise
    let colorToAnalyze = null;
    if (customColors.fill) {
      colorToAnalyze = customColors.fill;
    } else if (customColors.stroke) {
      colorToAnalyze = customColors.stroke;
    } else {
      colorToAnalyze = ER_STYLE_CONFIG.colors.entity.weak.fill;
    }
    
    if (colorToAnalyze) {
      innerStrokeColor = ErColorUtils.getContrastColor(colorToAnalyze);
    }
    
    attr(innerRect, {
      x: 4,
      y: 4,
      width: width - 8,
      height: height - 8,
      stroke: innerStrokeColor,
      'stroke-width': 1,
      fill: 'none',
      rx: 12,
      ry: 12,
      'vector-effect': 'non-scaling-stroke'
    });
    append(parentNode, innerRect);
  }

  // Adicionar texto dinâmico baseado no tipo da entidade
  let text = element.businessObject.name || element.id;
  
  // Se não tem nome customizado, mostrar tipo da entidade em português
  if (!element.businessObject.name || element.businessObject.name === 'Entidade' || element.businessObject.name === 'Entidade Fraca') {
    text = isWeak ? 'Entidade Fraca' : 'Entidade';
  }    
  
  const label = create('text');
  
  // Determinar cor do texto baseada no fundo usando utilitários centralizados
  let textColor = ER_STYLE_CONFIG.colors.inner.darkBackground;
  let backgroundColorToAnalyze = customColors.fill || defaultFill;
  
  if (backgroundColorToAnalyze) {
    textColor = ErColorUtils.getContrastColor(backgroundColorToAnalyze);
    
    // Adicionar outline/shadow apenas para texto branco em fundo escuro
    if (ErColorUtils.isColorDark(backgroundColorToAnalyze)) {
      attr(label, {
        'text-shadow': '1px 1px 2px rgba(0,0,0,0.8)',
        'paint-order': 'stroke fill',
        'stroke': 'rgba(0,0,0,0.5)',
        'stroke-width': '0.5px'
      });
    }
  }
  
  attr(label, {
    x: width / 2,
    y: height / 2 + 4,
    'text-anchor': 'middle',
    'dominant-baseline': 'central',
    'font-family': ER_STYLE_CONFIG.fonts.family,
    'font-size': `${ER_STYLE_CONFIG.fonts.sizes.label}px`,
    'font-weight': ER_STYLE_CONFIG.fonts.weights.bold.toString(),
    fill: textColor,
    'pointer-events': 'none'
  });
  label.textContent = text;
  append(parentNode, label);  

  return rect;
};

/**
 * Desenhar relacionamento ER (losango)
 */
(ErBpmnRenderer as any).prototype.drawErRelationship = function(this: any, parentNode: SVGElement, element: Element): SVGElement {  
  if (!parentNode) {
    return null as any;
  }
  
  const width = element.width || 120;
  const height = element.height || 80;
  
  // Verificar cores customizadas primeiro
  const customColors = getCustomColors(element);
  
  // Usar configuração centralizada para cores padrão
  const elementColors = ErColorUtils.getElementColors(element, 'relationship');
  const defaultStroke = elementColors.stroke;
  const defaultFill = elementColors.fill;
  
  const diamond = create('polygon');
  attr(diamond, {
    points: `
      ${width / 2},0
      ${width},${height / 2}
      ${width / 2},${height}
      0,${height / 2}
    `,
    stroke: customColors.stroke || defaultStroke,
    'stroke-width': 1,
    fill: customColors.fill || defaultFill,
    rx: 12,
    ry: 12,
    'vector-effect': 'non-scaling-stroke'
  });

  append(parentNode, diamond);

  // Entidade fraca: alterar estilo
  const isIdentifying = element.businessObject && (
    element.businessObject.isIdentifying === true ||
    (element.businessObject.$attrs && (
      element.businessObject.$attrs['er:isIdentifying'] === 'true' ||
      element.businessObject.$attrs['ns0:isIdentifying'] === 'true'
    ))
  );

  if (isIdentifying) {
    // Usar cores específicas para entidade identificadora da configuração centralizada
    if (!customColors.stroke && !customColors.fill) {
      const identifyingColors = ER_STYLE_CONFIG.colors.relationship.identifying;
      attr(diamond, {
        stroke: identifyingColors.stroke,
        fill: identifyingColors.fill
      });
    }

    const innerDiamond = create('polygon');

    // Determinar cor do losango interno baseada no contraste usando utilitários centralizados
    let innerStrokeColor = ER_STYLE_CONFIG.colors.inner.darkBackground;
    
    // Priorizar cor de preenchimento para análise
    let colorToAnalyze = null;
    if (customColors.fill) {
      colorToAnalyze = customColors.fill;
    } else if (customColors.stroke) {
      colorToAnalyze = customColors.stroke;
    } else {
      colorToAnalyze = ER_STYLE_CONFIG.colors.relationship.identifying.fill;
    }
    
    if (colorToAnalyze) {
      innerStrokeColor = ErColorUtils.getContrastColor(colorToAnalyze);
    }
    
    attr(innerDiamond, {
      points: `
        ${width / 2},${4}
        ${width - 4},${height / 2}
        ${width / 2},${height - 4}
        ${4},${height / 2}
      `,
      stroke: innerStrokeColor,
      'stroke-width': 1,
      fill: 'none',
      rx: 12,
      ry: 12,
      'vector-effect': 'non-scaling-stroke'
    });
    append(parentNode, innerDiamond);
  }

  // Adicionar texto dinâmico baseado no tipo do relacionamento
  let text = element.businessObject.name || element.id;

  // Se não tem nome customizado, mostrar tipo do relacionamento em português
  if (!element.businessObject.name || element.businessObject.name === 'Relacionamento') {
    text = 'Relacionamento';
  }    
  
  const label = create('text');
  
  // Determinar cor do texto baseada no fundo usando utilitários centralizados
  let textColor = ER_STYLE_CONFIG.colors.inner.darkBackground;
  let backgroundColorToAnalyze = customColors.fill || defaultFill;
  
  if (backgroundColorToAnalyze) {
    textColor = ErColorUtils.getContrastColor(backgroundColorToAnalyze);
    
    // Adicionar outline/shadow apenas para texto branco em fundo escuro
    if (ErColorUtils.isColorDark(backgroundColorToAnalyze)) {
      attr(label, {
        'text-shadow': '1px 1px 2px rgba(0,0,0,0.8)',
        'paint-order': 'stroke fill',
        'stroke': 'rgba(0,0,0,0.5)',
        'stroke-width': '0.5px'
      });
    }
  }
  
  attr(label, {
    x: width / 2,
    y: height / 2 + 4,
    'text-anchor': 'middle',
    'dominant-baseline': 'central',
    'font-family': ER_STYLE_CONFIG.fonts.family,
    'font-size': `${ER_STYLE_CONFIG.fonts.sizes.label}px`,
    'font-weight': ER_STYLE_CONFIG.fonts.weights.bold.toString(),
    fill: textColor,
    'pointer-events': 'none'
  });
  label.textContent = text;
  append(parentNode, label);  

  return diamond;
};

/**
 * Desenhar atributo ER (elipse)
 */
(ErBpmnRenderer as any).prototype.drawErAttribute = function(this: any, parentNode: SVGElement, element: Element): SVGElement {
  if (!parentNode) {
    return null as any;
  }
  
  const width = element.width || 90;
  const height = element.height || 50;
  // Calcular centro e raios da elipse
  const cx = width / 2;
  const cy = height / 2;
  const rx = (width - 4) / 2; // Margem de 2px de cada lado
  const ry = (height - 4) / 2; // Margem de 2px de cada lado
  const ellipse = create('ellipse');
  const isPrimaryKey = element.businessObject && element.businessObject.isPrimaryKey;
  const isRequired = element.businessObject && element.businessObject.isRequired;
  const isMultivalued = element.businessObject && element.businessObject.isMultivalued;
  const isDerived = element.businessObject && element.businessObject.isDerived;
  const isComposite = element.businessObject && element.businessObject.isComposite;
  // Verificar se é um sub-atributo
  const isSubAttribute = element.businessObject && (element.businessObject as any).isSubAttribute;
  
  // Verificar cores customizadas primeiro
  const customColors = getCustomColors(element);
  
  // Usar configuração centralizada para cores e estilos
  const elementColors = ErColorUtils.getElementColors(element, 'attribute');
  let strokeWidth: number, fill: string, stroke: string;
  
  if (customColors.fill || customColors.stroke) {
    // Se há cores customizadas, usar elas
    strokeWidth = ER_STYLE_CONFIG.dimensions.strokeWidths.default;
    fill = customColors.fill || elementColors.fill;
    stroke = customColors.stroke || elementColors.stroke;
  } else if (isSubAttribute) {    
    strokeWidth = ER_STYLE_CONFIG.dimensions.strokeWidths.default;
    fill = ER_STYLE_CONFIG.colors.system.gridPrimary; 
    stroke = ER_STYLE_CONFIG.colors.inner.darkBackground; 
  } else if (isPrimaryKey) {    
    strokeWidth = ER_STYLE_CONFIG.dimensions.strokeWidths.selected;
    const pkColors = ER_STYLE_CONFIG.colors.attribute.primaryKey;
    fill = pkColors.fill;
    stroke = pkColors.stroke;
  } else {
    strokeWidth = ER_STYLE_CONFIG.dimensions.strokeWidths.default;
    fill = elementColors.fill;
    stroke = elementColors.stroke;    
  }
  
  // Configurar estilo da elipse principal baseado no tipo
  const ellipseAttrs: any = {
    cx: cx,
    cy: cy,
    rx: rx,
    ry: ry,
    stroke: stroke,
    'stroke-width': strokeWidth,
    fill: fill,
    'vector-effect': 'non-scaling-stroke'
  };

  // Se é derivado (e não é sub-atributo), usar linha tracejada
  if (isDerived && !isSubAttribute) {
    ellipseAttrs['stroke-dasharray'] = '5,3';    
  }

  attr(ellipse, ellipseAttrs);
  append(parentNode, ellipse);

  // Se é multivalorado (e não é sub-atributo), adicionar contorno duplo
  if (isMultivalued && !isSubAttribute) {    
    const innerEllipse = create('ellipse');
    const innerOffset = 4;
    const innerAttrs: any = {
      cx: cx,
      cy: cy,
      rx: rx - innerOffset,
      ry: ry - innerOffset,
      stroke: stroke,
      'stroke-width': 1,
      fill: 'none',
      'vector-effect': 'non-scaling-stroke'
    };

    // Se também é derivado, aplicar tracejado no contorno interno
    if (isDerived) {
      innerAttrs['stroke-dasharray'] = '5,3';
    }

    attr(innerEllipse, innerAttrs);
    append(parentNode, innerEllipse);
  }

  // Adicionar texto com cor forte - mostrar PK/FK se aplicável
  let text = element.businessObject.name || element.id;
  
  // Para sub-atributos, apenas mostrar o nome (sem PK/FK)
  if (isSubAttribute) {
    text = element.businessObject.name || 'Sub-atributo';    
  }
  // Para chave primária, mostrar o nome real (se houver) em vez de apenas "PK"
  else if (isPrimaryKey) {
    // Se há nome definido, usar o nome; senão, usar nome padrão
    text = element.businessObject.name || 'Atributo';    
  }
  
  const label = create('text');
  
  // Determinar cor do texto baseada no fundo usando utilitários centralizados
  let textColor = ErColorUtils.getContrastColor(fill);
  
  // Configurar estilos do texto
  const textAttrs: any = {
    x: width / 2,
    y: height / 2 + 4,
    'text-anchor': 'middle',
    'dominant-baseline': 'central',
    'font-family': ER_STYLE_CONFIG.fonts.family,
    'font-size': `${ER_STYLE_CONFIG.fonts.sizes.property}px`,
    'font-weight': ER_STYLE_CONFIG.fonts.weights.bold.toString(),
    fill: textColor,
    'pointer-events': 'none'
  };
  
  // Adicionar outline/shadow apenas para texto branco em fundo escuro
  if (ErColorUtils.isColorDark(fill)) {
    textAttrs['text-shadow'] = '1px 1px 2px rgba(0,0,0,0.8)';
    textAttrs['paint-order'] = 'stroke fill';
    textAttrs['stroke'] = 'rgba(0,0,0,0.5)';
    textAttrs['stroke-width'] = '0.5px';
  }
  
  if (isPrimaryKey) {
    textAttrs['text-decoration'] = 'underline';
    textAttrs['font-weight'] = 'bold';
    // Adicionar indicador visual de PK no texto
    text = `${text}`;
  }

  if (isRequired) {
    text = `${text} *`;
  }

  attr(label, textAttrs);
  label.textContent = text;
  append(parentNode, label);

  return ellipse;
};

/**
 * Verificar se um elemento é um sub-atributo
 * Sub-atributos são conectados a atributos compostos via conexão pai-filho
 */
(ErBpmnRenderer as any).prototype.isSubAttribute = function(this: any, element: Element): boolean {
  // Se não tem eventBus ou elementRegistry, não conseguimos detectar
  if (!this.eventBus || !this._elementRegistry) {
    return false;
  }
  
  // Pegar todos os elementos do diagrama
  const elementRegistry = this._elementRegistry;
  const allElements = elementRegistry.getAll();  
  // Procurar por conexões que terminam neste elemento
  const incomingConnections = allElements.filter((conn: any) => {
    return conn.type === 'bpmn:SequenceFlow' &&
           conn.target?.id === element.id &&
           conn.businessObject?.isParentChild === true;
  });
  
  // Se há uma conexão pai-filho chegando neste elemento, é um sub-atributo
  const isSubAttr = incomingConnections.length > 0;    
  
  return isSubAttr;
};

/**
 * Override do getShapePath para elementos ER
 */
(ErBpmnRenderer as any).prototype.getShapePath = function(this: any, element: Element): string {
  // Usar a mesma lógica de detecção do drawShape para consistência
  const erType = element.businessObject && (
    element.businessObject.erType || 
    (element.businessObject.$attrs && (
      element.businessObject.$attrs['er:erType'] || 
      element.businessObject.$attrs['ns0:erType']
    ))
  );
  
  // Detectar ParallelGateway como Relationship
  const isRelationshipType = element.type === 'bpmn:ParallelGateway' && erType === 'Relationship';
  
  
  if (erType || isRelationshipType) {
    const width = element.width || 100;
    const height = element.height || 60;

    if (erType === 'Entity') {
      return `M 0,0 L ${width},0 L ${width},${height} L 0,${height} Z`;
    }

    if (erType === 'Relationship') {
      const halfWidth = width / 2;
      const halfHeight = height / 2;
      return `M ${halfWidth},0 L ${width},${halfHeight} L ${halfWidth},${height} L 0,${halfHeight} Z`;
    }

    if (erType === 'Attribute') {
      const rx = width / 2;
      const ry = height / 2;
      const cx = rx;
      const cy = ry;
      
      return `M ${cx-rx},${cy} 
              A ${rx},${ry} 0 1,1 ${cx+rx},${cy} 
              A ${rx},${ry} 0 1,1 ${cx-rx},${cy} Z`;
    }
  }
  
  // Para elementos BPMN normais, usar implementação padrão
  return (BpmnRenderer.prototype.getShapePath as any).call(this, element);
};

/**
 * Override do drawConnection para mostrar cardinalidade das conexões ER e remover setas
 */
(ErBpmnRenderer as any).prototype.drawConnection = function(this: any, parentNode: SVGElement, element: Element): SVGElement {
  
  // Verificar se a conexão conecta elementos ER
  const source = element.source;
  const target = element.target;
  const hasErElements = (source && source.businessObject && source.businessObject.erType) 
                     || (target && target.businessObject && target.businessObject.erType);

  // Também verificar se a conexão tem cardinalidades definidas (mesmo sem erType)
  const hasCardinalityAttrs = element.businessObject && (
    element.businessObject.cardinalitySource || 
    element.businessObject.cardinalityTarget ||
    (element.businessObject.$attrs && (
      element.businessObject.$attrs['er:cardinalitySource'] ||
      element.businessObject.$attrs['ns0:cardinalitySource'] ||
      element.businessObject.$attrs['er:cardinalityTarget'] ||
      element.businessObject.$attrs['ns0:cardinalityTarget']
    ))
  );
  
  
  // Verificar se é uma conexão pai-filho (atributo composto)
  const isParentChildConnection = element.businessObject && (
    element.businessObject.isParentChild ||
    (element.businessObject.$attrs && (
      element.businessObject.$attrs['er:isParentChild'] === 'true' ||
      element.businessObject.$attrs['ns0:isParentChild'] === 'true'
    ))
  );
  
  // Usar renderização padrão primeiro (garante atualização automática)
  const connectionGfx = (BpmnRenderer.prototype.drawConnection as any).call(this, parentNode, element);
  
  // Verificar se parentNode existe antes de continuar
  if (!parentNode) {
    return connectionGfx;
  }
  
  // Limpar labels de cardinalidade existentes antes de criar novas
  const existingCardinalityLabels = parentNode.querySelectorAll('.er-cardinality-label');
  existingCardinalityLabels.forEach(label => {
    if (label.parentNode) {
      label.parentNode.removeChild(label);
    }
  });
  
  // Se conecta elementos ER, tem cardinalidades ou é conexão pai-filho, customizar a conexão
  if (hasErElements || hasCardinalityAttrs || isParentChildConnection) {    
    
    // Verificar se a conexão termina em um atributo (não deve ter cardinalidades)
    const sourceIsAttribute = source?.businessObject?.erType === 'Attribute';
    const targetIsAttribute = target?.businessObject?.erType === 'Attribute';
    const connectsToAttribute = sourceIsAttribute || targetIsAttribute;
    
    // Verificar se a conexão começa e termina em uma entidade
    const sourceIsEntity = source?.businessObject?.erType === 'Entity';
    const targetIsEntity = target?.businessObject?.erType === 'Entity';
    const connectsTwoEntities = sourceIsEntity && targetIsEntity;

    // Se conecta elementos ER mas não tem cardinalidades definidas E NÃO conecta atributos, definir padrões
    if (hasErElements && !hasCardinalityAttrs && !isParentChildConnection && !connectsToAttribute) {  
      
      // Definir cardinalidades padrão no businessObject
      if (!element.businessObject.cardinalitySource) {
        element.businessObject.cardinalitySource = '1..1';
      }
      //if (!element.businessObject.cardinalityTarget) {
      //  element.businessObject.cardinalityTarget = 'N';
      //}
            
    } else if (connectsToAttribute) {
      // Se conecta a um atributo, não adicionar cardinalidades
      element.businessObject.cardinalitySource = '';
    } else if (connectsTwoEntities) {
      // Verificar se é uma conexão vinda do modo declarativo usando cast para any
      const businessObj = element.businessObject as any;
      const isDeclarativeConnection = businessObj.isDeclarative || 
                                     businessObj.mermaidCardinality ||
                                     (element.businessObject.$attrs && (
                                       element.businessObject.$attrs['er:isDeclarative'] ||
                                       element.businessObject.$attrs['ns0:isDeclarative'] ||
                                       element.businessObject.$attrs['er:mermaidCardinality'] ||
                                       element.businessObject.$attrs['ns0:mermaidCardinality']
                                     ));
      
      // Para conexões Entity-Entity, apenas definir padrões se NÃO for declarativa E não existirem valores
      if (!isDeclarativeConnection) {
        if (!element.businessObject.cardinalitySource) {
          element.businessObject.cardinalitySource = '1..1';
        }
        
        if (!element.businessObject.cardinalityTarget) {
          element.businessObject.cardinalityTarget = '1..N';
        }
      }
    }
    
    // Remover marcadores (setas) da conexão
    const pathElement = parentNode?.querySelector('path');
    if (pathElement) {
      pathElement.removeAttribute('marker-end');
      pathElement.removeAttribute('marker-start');
      
      // Estilo especial para conexões pai-filho (atributos compostos)
      if (isParentChildConnection) {
        
        attr(pathElement, {
          stroke: ER_STYLE_CONFIG.colors.inner.darkBackground, // Cor preta da configuração
          'stroke-width': 1.5,
          'stroke-dasharray': '3,3', // Linha pontilhada
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round'
        });
      } else {
        // Estilo normal para conexões ER regulares - SEMPRE PRETO
        attr(pathElement, {
          stroke: ER_STYLE_CONFIG.colors.inner.darkBackground, // Cor preta da configuração
          'stroke-width': 2,
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round'
        });
      }
    }
    
    // Adicionar label de relacionamento se existir
    if (hasErElements) {
      this.addRelationshipLabelToConnection(parentNode, element);
    }
    

    // Adicionar cardinalidades nas extremidades (só para conexões não pai-filho)
    // Verificar novamente se tem cardinalidades (podem ter sido definidas agora)
    const hasCardinalitiesNow = element.businessObject && (
      element.businessObject.cardinalitySource || 
      element.businessObject.cardinalityTarget ||
      (element.businessObject.$attrs && (
        element.businessObject.$attrs['er:cardinalitySource'] ||
        element.businessObject.$attrs['ns0:cardinalitySource'] //||
        //element.businessObject.$attrs['er:cardinalityTarget'] ||
        //element.businessObject.$attrs['ns0:cardinalityTarget']
      ))
    );
    
    // Verificar especificamente se conecta duas entidades primeiro (prioridade)
    if (connectsTwoEntities && !isParentChildConnection) {
      const cardinalitySource = element.businessObject?.cardinalitySource || 
                               element.businessObject?.$attrs?.['er:cardinalitySource'] ||
                               element.businessObject?.$attrs?.['ns0:cardinalitySource'] || '1';
      const cardinalityTarget = element.businessObject?.cardinalityTarget || 
                               element.businessObject?.$attrs?.['er:cardinalityTarget'] ||
                               element.businessObject?.$attrs?.['ns0:cardinalityTarget'] || 'N';            
      
      // Verificar se é notação Crow's Foot
      const notation = this._erConfig?.notation || 'chen';
      
      if (notation === 'crowsfoot') {
        this.addCrowsFootMarkersToConnection(parentNode, element, cardinalitySource, cardinalityTarget);
      } else {
        this.addCardinalityLabelsToConnection(parentNode, element, cardinalitySource, cardinalityTarget);
      }
    } else if (!isParentChildConnection && !connectsToAttribute && hasCardinalitiesNow) {
      const cardinalitySource = element.businessObject?.cardinalitySource || 
                               element.businessObject?.$attrs?.['er:cardinalitySource'] ||
                               element.businessObject?.$attrs?.['ns0:cardinalitySource'] || '1';
      
      // Verificar se é notação Crow's Foot
      const notation = this._erConfig?.notation || 'chen';
      
      if (notation === 'crowsfoot') {
        this.addCrowsFootMarkersToConnection(parentNode, element, cardinalitySource);
      } else {
        this.addCardinalityLabelsToConnection(parentNode, element, cardinalitySource);
      }
    }
}
  
  return connectionGfx;
};

/**
 * Adicionar labels de cardinalidade nas extremidades da conexão
 */
(ErBpmnRenderer as any).prototype.addCardinalityLabelsToConnection = function(
  this: any,
  parentNode: SVGElement,
  connection: Element,
  cardinalitySource: string,
  cardinalityTarget: string
): void {
  // Garantir que as cardinalidades têm valores padrão
  cardinalitySource = cardinalitySource || '1..1';
  cardinalityTarget = cardinalityTarget || '1..N';
  
  const waypoints = connection.waypoints;
  const source = connection.source;
  const target = connection.target;

  // Verificar se a conexão começa e termina em uma entidade
  const sourceIsEntity = source?.businessObject?.erType === 'Entity';
  const targetIsEntity = target?.businessObject?.erType === 'Entity';
  const connectsTwoEntities = sourceIsEntity && targetIsEntity;

  if (!waypoints || waypoints.length < 2) {
    return;
  }

  const startPoint = waypoints[0];
  const endPoint = waypoints[waypoints.length - 1];

  // --- Início da lógica de cálculo universal de posições ---
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Evita divisão por zero
  if (distance === 0) {
    return;
  }

  const unitVx = dx / distance;
  const unitVy = dy / distance;

  // --- Fim da lógica de cálculo universal de posições ---

  if (connectsTwoEntities) {
    // Definir as distâncias de ajuste para labels entre duas entidades
    const offsetDistance = 30; // Distância fixa em pixels a partir do ponto inicial
    const perpendicularOffset = -15; // Desvio para o lado da linha em pixels

    // Posição para a cardinalidade da origem (source)
    const sourceX = startPoint.x + unitVx * offsetDistance - unitVy * perpendicularOffset;
    const sourceY = startPoint.y + unitVy * offsetDistance + unitVx * perpendicularOffset;

    // Posição para a cardinalidade do destino (target)
    const targetX = endPoint.x - unitVx * offsetDistance - unitVy * perpendicularOffset;
    const targetY = endPoint.y - unitVy * offsetDistance + unitVx * perpendicularOffset;

    // Criar cardinalidade da origem
    this.createCardinalityLabel(parentNode, cardinalitySource, sourceX, sourceY, 'source');

    // Criar cardinalidade do destino
    this.createCardinalityLabel(parentNode, cardinalityTarget, targetX, targetY, 'target');

  } else {
    // Definir as distâncias de ajuste para outros tipos de conexões
    const offsetDistance = distance * 0.50; // 50% do caminho
    const perpendicularOffset = -20; // Ligeiramente acima

    // Posição para a cardinalidade da origem (source)
    const sourceX = startPoint.x + unitVx * offsetDistance - unitVy * perpendicularOffset;
    const sourceY = startPoint.y + unitVy * offsetDistance + unitVx * perpendicularOffset;

    // Criar cardinalidade da origem
    this.createCardinalityLabel(parentNode, cardinalitySource, sourceX, sourceY, 'source');
  }
};

/**
 * Criar uma label de cardinalidade individual (versão simplificada)
 */
(ErBpmnRenderer as any).prototype.createCardinalityLabel = function(
  this: any,
  parentNode: SVGElement, 
  cardinality: string, 
  x: number, 
  y: number, 
  position: string
): void {    
  // Verificar se cardinality está definida
  if (!cardinality || cardinality === '') {
    return;
  }
  
  // Criar grupo para a cardinalidade com transform simples
  const cardinalityGroup = create('g');
  attr(cardinalityGroup, {
    transform: `translate(${x}, ${y})`,
    class: `er-cardinality-label er-cardinality-${position}`
  });
  
  // Criar fundo ligeiramente maior para melhor visibilidade
  const textWidth = cardinality.length * 8 + 8;
  const bg = create('rect');
  attr(bg, {
    x: -textWidth/2,
    y: -10,
    width: textWidth,
    height: 18,
    fill: '#F8FAFC', // Branco moderno com leve tom cinza
    stroke: '#6366F1', // Índigo moderno
    'stroke-width': 1.5,
    rx: 6,
    ry: 6
  });
  append(cardinalityGroup, bg);
  
  // Criar texto centrado
  const label = create('text');
  attr(label, {
    x: 0,
    y: -1,
    'text-anchor': 'middle',
    'dominant-baseline': 'central',
    'font-family': 'Inter, -apple-system, sans-serif',
    'font-size': '12px',
    'font-weight': '700',
    fill: '#6366F1', // Índigo moderno
    'pointer-events': 'none'
  });
  label.textContent = cardinality;
  append(cardinalityGroup, label);
  
  // Adicionar grupo ao parentNode
  append(parentNode, cardinalityGroup);    
};

/**
 * Método específico para atualizar cardinalidades de uma conexão
 */
(ErBpmnRenderer as any).prototype.updateConnectionCardinalities = function(
  this: any,
  element: Element
): void {
  const elementRegistry = this._elementRegistry || this.get?.('elementRegistry');
  if (!elementRegistry) {
    return;
  }
  
  const connectionGfx = elementRegistry.getGraphics(element);
  if (!connectionGfx) {
    return;
  }
  
  // Verificar se é realmente uma conexão
  if (!element.waypoints) {
    return;
  }
  
  // Limpar labels de cardinalidade e marcadores Crow's Foot existentes
  const existingCardinalityLabels = connectionGfx.querySelectorAll('.er-cardinality-label, .er-crowsfoot-marker');
  existingCardinalityLabels.forEach((label: Element) => {
    const node = label as unknown as Node;
    if (node.parentNode) {
      node.parentNode.removeChild(node);
    }
  });
  
  // Verificar se conecta duas entidades
  const source = element.source;
  const target = element.target;
  const sourceIsEntity = source?.businessObject?.erType === 'Entity';
  const targetIsEntity = target?.businessObject?.erType === 'Entity';
  const connectsTwoEntities = sourceIsEntity && targetIsEntity;
  
  if (connectsTwoEntities) {
    const cardinalitySource = element.businessObject?.cardinalitySource || 
                             element.businessObject?.$attrs?.['er:cardinalitySource'] ||
                             element.businessObject?.$attrs?.['ns0:cardinalitySource'] || '1..1';
    const cardinalityTarget = element.businessObject?.cardinalityTarget || 
                             element.businessObject?.$attrs?.['er:cardinalityTarget'] ||
                             element.businessObject?.$attrs?.['ns0:cardinalityTarget'] || '1..N';
    
    try {
      // Verificar se é notação Crow's Foot
      const notation = this._erConfig?.notation || 'chen';
      
      if (notation === 'crowsfoot') {
        this.addCrowsFootMarkersToConnection(connectionGfx, element, cardinalitySource, cardinalityTarget);
      } else {
        this.addCardinalityLabelsToConnection(connectionGfx, element, cardinalitySource, cardinalityTarget);
      }
    } catch (error) {
      console.error('Erro ao adicionar cardinalidades/marcadores:', error);
    }
  } else {
    // Verificar se há outras condições para cardinalidades
    const hasCardinalityAttrs = element.businessObject && (
      element.businessObject.cardinalitySource || 
      (element.businessObject.$attrs && (
        element.businessObject.$attrs['er:cardinalitySource'] ||
        element.businessObject.$attrs['ns0:cardinalitySource']
      ))
    );
    
    if (hasCardinalityAttrs) {
      const cardinalitySource = element.businessObject?.cardinalitySource || 
                               element.businessObject?.$attrs?.['er:cardinalitySource'] ||
                               element.businessObject?.$attrs?.['ns0:cardinalitySource'] || '1..1';
      
      try {
        // Verificar se é notação Crow's Foot
        const notation = this._erConfig?.notation || 'chen';
        
        if (notation === 'crowsfoot') {
          this.addCrowsFootMarkersToConnection(connectionGfx, element, cardinalitySource);
        } else {
          this.addCardinalityLabelsToConnection(connectionGfx, element, cardinalitySource);
        }
      } catch (error) {
        console.error('Erro ao adicionar cardinalidade/marcador único:', error);
      }
    }
  }
};

/**
 * Desenha um atributo composto usando SubProcess como container
 */
(ErBpmnRenderer as any).prototype.drawErSubAttribute = function(parentNode: SVGElement, element: any): SVGElement {
  if (!parentNode) {
    return null as any;
  }
    
  const width = element.width || 200;
  const height = element.height || 150;
  
  // CORREÇÃO: Usar as dimensões calculadas sem forçar mínimos grandes
  const elementWidth = width;
  const elementHeight = height;   
  
  // Verificar cores customizadas primeiro
  const customColors = getCustomColors(element);
  
  // Container principal - mais simples, sem elementos que bloqueiem
  const containerGroup = create('g');
  attr(containerGroup, {
    class: 'er-composite-attribute-container'
  });
  
  // CORREÇÃO: Ocultar botão de expansão para containers ER
  // Remover qualquer indicador visual de SubProcess
  parentNode.style.setProperty('pointer-events', 'auto');
  
  // Nota: Controles de expansão são desabilitados via ErSubprocessControlProvider
  
  // Fundo do container SIMPLIFICADO - apenas borda tracejada
  const outerRect = create('rect');
  attr(outerRect, {
    x: 0,
    y: 0,
    width: elementWidth,
    height: elementHeight,
    rx: 8,
    ry: 8,
    fill: customColors.fill || 'rgba(59, 130, 246, 0.03)', // Usar cor customizada ou background muito transparente
    stroke: customColors.stroke || '#3B82F6', // Usar cor customizada ou azul
    'stroke-width': '2px',
    'stroke-dasharray': '8,4', // Linha tracejada mais visível
    'vector-effect': 'non-scaling-stroke',
    'pointer-events': 'none' // CORREÇÃO: Não interceptar eventos
  });
  append(containerGroup, outerRect);
  
  // Título do atributo composto
  const title = element.businessObject?.name || element.name || 'Composto';
  const titleText = create('text');
  
  // Determinar cor do texto baseada no fundo usando utilitários centralizados
  const backgroundColorToAnalyze = customColors.fill || 'rgba(59, 130, 246, 0.03)';
  let textColor = ErColorUtils.getContrastColor(backgroundColorToAnalyze);
  
  // Adicionar outline/shadow apenas para texto branco em fundo escuro
  if (ErColorUtils.isColorDark(backgroundColorToAnalyze)) {
    attr(titleText, {
      'text-shadow': '1px 1px 2px rgba(0,0,0,0.8)',
      'paint-order': 'stroke fill',
      'stroke': 'rgba(0,0,0,0.5)',
      'stroke-width': '0.5px'
    });
  }
  
  attr(titleText, {
    x: elementWidth / 2,
    y: 20,
    'text-anchor': 'middle',
    'dominant-baseline': 'central',
    'font-family': ER_STYLE_CONFIG.fonts.family,
    'font-size': `${ER_STYLE_CONFIG.fonts.sizes.label}px`,
    'font-weight': ER_STYLE_CONFIG.fonts.weights.bold.toString(),
    fill: textColor,
    'pointer-events': 'none'
  });
  titleText.textContent = title;
  append(containerGroup, titleText);
  
  // Adicionar container ao parentNode
  append(parentNode, containerGroup);
  
  // Nota: Controles de expansão são gerenciados via ErSubprocessControlProvider
  
  return containerGroup;
};

/**
 * Adicionar marcadores visuais Crow's Foot nas extremidades da conexão
 */
(ErBpmnRenderer as any).prototype.addCrowsFootMarkersToConnection = function(
  this: any,
  parentNode: SVGElement,
  connection: Element,
  cardinalitySource: string,
  cardinalityTarget?: string
): void {
  const waypoints = connection.waypoints;
  const source = connection.source;
  const target = connection.target;

  if (!waypoints || waypoints.length < 2) {
    return;
  }

  // Verificar se conecta duas entidades
  const sourceIsEntity = source?.businessObject?.erType === 'Entity';
  const targetIsEntity = target?.businessObject?.erType === 'Entity';
  const connectsTwoEntities = sourceIsEntity && targetIsEntity;

  if (connectsTwoEntities && cardinalityTarget) {
    // Renderizar marcadores nas duas extremidades com orientação correta
    
    // Para o marcador de origem: direção do primeiro para o segundo waypoint
    const sourceDirection = this.calculateLineSegmentDirection(waypoints, 0, true);
    this.drawCrowsFootMarker(parentNode, waypoints[0], sourceDirection.unitVx, sourceDirection.unitVy, cardinalitySource, 'source');
    
    // Para o marcador de destino: direção do penúltimo para o último waypoint
    const targetDirection = this.calculateLineSegmentDirection(waypoints, waypoints.length - 1, false);
    this.drawCrowsFootMarker(parentNode, waypoints[waypoints.length - 1], targetDirection.unitVx, targetDirection.unitVy, cardinalityTarget, 'target');
  } else {
    // Renderizar apenas na origem com orientação correta
    const sourceDirection = this.calculateLineSegmentDirection(waypoints, 0, true);
    this.drawCrowsFootMarker(parentNode, waypoints[0], sourceDirection.unitVx, sourceDirection.unitVy, cardinalitySource, 'source');
  }
};

/**
 * Calcular direção de um segmento específico da linha para orientação correta dos marcadores
 */
(ErBpmnRenderer as any).prototype.calculateLineSegmentDirection = function(
  this: any,
  waypoints: { x: number; y: number }[],
  pointIndex: number,
  isSource: boolean
): { unitVx: number; unitVy: number } {
  let fromPoint: { x: number; y: number };
  let toPoint: { x: number; y: number };

  if (isSource) {
    // Para marcador de origem: direção do primeiro para o segundo waypoint
    fromPoint = waypoints[0];
    toPoint = waypoints.length > 1 ? waypoints[1] : waypoints[0];
  } else {
    // Para marcador de destino: direção do penúltimo para o último waypoint
    fromPoint = waypoints.length > 1 ? waypoints[waypoints.length - 2] : waypoints[waypoints.length - 1];
    toPoint = waypoints[waypoints.length - 1];
  }

  // Calcular vetor direcional do segmento específico
  const dx = toPoint.x - fromPoint.x;
  const dy = toPoint.y - fromPoint.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Evitar divisão por zero
  if (distance === 0) {
    return { unitVx: 1, unitVy: 0 }; // Direção padrão horizontal
  }

  const unitVx = dx / distance;
  const unitVy = dy / distance;

  // Para marcador de destino, inverter a direção para apontar para o elemento
  if (!isSource) {
    return { unitVx: -unitVx, unitVy: -unitVy };
  }

  return { unitVx, unitVy };
};

/**
 * Desenhar um marcador Crow's Foot individual
 */
(ErBpmnRenderer as any).prototype.drawCrowsFootMarker = function(
  this: any,
  parentNode: SVGElement,
  point: { x: number; y: number },
  unitVx: number,
  unitVy: number,
  cardinality: string,
  position: string
): void {
  if (!cardinality || cardinality === '') {
    return;
  }

  // Posição do marcador (próximo ao ponto de conexão)
  const markerDistance = 15; // Reduzir distância para ficar mais próximo da linha
  const markerX = point.x + unitVx * markerDistance;
  const markerY = point.y + unitVy * markerDistance;

  // Criar grupo para o marcador
  const markerGroup = create('g');
  attr(markerGroup, {
    transform: `translate(${markerX}, ${markerY})`,
    class: `er-crowsfoot-marker er-crowsfoot-${position}`
  });

  // Normalizar cardinalidade para símbolos padrão
  const normalizedCardinality = this.normalizeCrowsFootCardinality(cardinality);

  // Desenhar símbolos baseados na cardinalidade
  this.drawCrowsFootSymbols(markerGroup, normalizedCardinality, unitVx, unitVy, cardinality);

  append(parentNode, markerGroup);
};

/**
 * Normalizar cardinalidade para símbolos Crow's Foot padrão
 */
(ErBpmnRenderer as any).prototype.normalizeCrowsFootCardinality = function(
  this: any,
  cardinality: string
): { optionality: 'mandatory' | 'optional', multiplicity: 'one' | 'many' } {
  const card = cardinality.toLowerCase().trim();

  // Lógica correta para Crow's Foot:
  
  // Casos específicos primeiro
  if (card === '1..1') {
    return { optionality: 'mandatory', multiplicity: 'one' }; // Exatamente um (apenas linha)
  }
  
  if (card === '0..1' || card === '0,1') {
    return { optionality: 'optional', multiplicity: 'one' }; // Zero ou um (círculo + linha)
  }
  
  if (card.includes('1..') && (card.includes('n') || card.includes('N'))) {
    return { optionality: 'mandatory', multiplicity: 'many' }; // Um ou muitos (linha + pé de corvo)
  }
  
  if (card.includes('0..') && (card.includes('n') || card.includes('N'))) {
    return { optionality: 'optional', multiplicity: 'many' }; // Zero ou muitos (círculo + pé de corvo)
  }
  
  // Casos genéricos
  
  // Determinar opcionalidade - APENAS se começar com 0
  let optionality: 'mandatory' | 'optional' = 'mandatory';
  if (card.startsWith('0') || card.includes('0..') || card.includes('0,') || 
      card.includes('opcional') || card.includes('optional')) {
    optionality = 'optional';
  }

  // Determinar multiplicidade - detectar "muitos"
  let multiplicity: 'one' | 'many' = 'one';
  if (card.includes('n') || card.includes('N') || card.includes('many') || card.includes('muitos') || 
      card.includes('∞') || card === 'm' || card.includes('..n') || card.includes('..N') ||
      card === 'n' || card === 'N') {
    multiplicity = 'many';
  }

  return { optionality, multiplicity };
};

/**
 * Desenhar símbolos específicos Crow's Foot
 */
(ErBpmnRenderer as any).prototype.drawCrowsFootSymbols = function(
  this: any,
  markerGroup: SVGElement,
  cardinalityInfo: { optionality: 'mandatory' | 'optional', multiplicity: 'one' | 'many' },
  unitVx: number,
  unitVy: number,
  originalCardinality: string
): void {
  const { optionality, multiplicity } = cardinalityInfo;

  // Calcular ângulo da linha para orientar os símbolos
  const angle = Math.atan2(unitVy, unitVx);

  // Posições relativas dos símbolos (da linha para fora)
  let symbolOffset = 0, symbolDiff = 6, symbolSpacing = 12, symbolCrowOffSpacing = -2;
  
  if (optionality === 'optional' && multiplicity === 'one') {
    // Para 0..1 (zero ou um): mostrar somente o círculo
    this.drawOptionalCircle(markerGroup, symbolOffset, angle);
    this.drawSingleLine(markerGroup, symbolSpacing, angle);
  } else if (optionality === 'mandatory' && multiplicity === 'one') {
    // Para 1..1 (exatamente um): mostrar somente a linha
    this.drawMandatoryLine(markerGroup, symbolDiff, angle);
    this.drawSingleLine(markerGroup, symbolSpacing, angle);
  } else if (optionality === 'optional' && multiplicity === 'many') {
    // APENAS para casos explícitos 0..N (zero ou muitos): mostrar círculo    
    this.drawOptionalCircle(markerGroup, symbolSpacing, angle);
    this.drawCrowsFoot(markerGroup, symbolCrowOffSpacing, angle);
  } else if (optionality === 'mandatory' && multiplicity === 'many') {
    // APENAS para casos explícitos 1..N (um ou muitos): mostrar linha de obrigatoriedade            
      this.drawMandatoryLine(markerGroup, symbolDiff, angle);
      this.drawCrowsFoot(markerGroup, symbolCrowOffSpacing, angle);        
  }  
};

/**
 * Desenhar pé de corvo (crow's foot) - indica "muitos"
 */
(ErBpmnRenderer as any).prototype.drawCrowsFoot = function(
  this: any,
  parentGroup: SVGElement,
  offset: number,
  angle: number
): void {
  const crowsFootPath = create('path');
  
  // Dimensões do pé de corvo
  const length = 12;
  const width = 10;
  
  // Calcular pontos do pé de corvo orientado pela linha
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  
  // Ponto central (na linha)
  const centerX = offset * cos;
  const centerY = offset * sin;
  
  // Pontos das três "garras" do pé de corvo
  const p1X = centerX - length * cos + width * sin;
  const p1Y = centerY - length * sin - width * cos;
  
  const p2X = centerX - length * cos;
  const p2Y = centerY - length * sin;
  
  const p3X = centerX - length * cos - width * sin;
  const p3Y = centerY - length * sin + width * cos;

  const pathData = `M ${centerX},${centerY} L ${p1X},${p1Y} M ${centerX},${centerY} L ${p2X},${p2Y} M ${centerX},${centerY} L ${p3X},${p3Y}`;

  attr(crowsFootPath, {
    d: pathData,
    stroke: ER_STYLE_CONFIG.colors.inner.darkBackground, // Sempre preto
    'stroke-width': 2,
    'stroke-linecap': 'round',
    fill: 'none'    
  });

  append(parentGroup, crowsFootPath);
};

/**
 * Desenhar linha única - indica "um"
 */
(ErBpmnRenderer as any).prototype.drawSingleLine = function(
  this: any,
  parentGroup: SVGElement,
  offset: number,
  angle: number
): void {
  const singleLine = create('line');
  
  const length = 18;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  
  // Linha perpendicular à conexão
  const perpCos = Math.cos(angle + Math.PI / 2);
  const perpSin = Math.sin(angle + Math.PI / 2);
  
  const centerX = offset * cos;
  const centerY = offset * sin;
  
  const x1 = centerX + (length / 2) * perpCos;
  const y1 = centerY + (length / 2) * perpSin;
  const x2 = centerX - (length / 2) * perpCos;
  const y2 = centerY - (length / 2) * perpSin;

  attr(singleLine, {
    x1: x1,
    y1: y1,
    x2: x2,
    y2: y2,
    stroke: ER_STYLE_CONFIG.colors.inner.darkBackground, // Sempre preto
    'stroke-width': 2,
    'stroke-linecap': 'round'
  });

  append(parentGroup, singleLine);
};

/**
 * Desenhar círculo - indica opcionalidade
 */
(ErBpmnRenderer as any).prototype.drawOptionalCircle = function(
  this: any,
  parentGroup: SVGElement,
  offset: number,
  angle: number
): void {
  const circle = create('circle');
  
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  
  const centerX = offset * cos;
  const centerY = offset * sin;

  attr(circle, {
    cx: centerX,
    cy: centerY,
    r: 5, // Aumentar raio para melhor visibilidade
    stroke: ER_STYLE_CONFIG.colors.inner.darkBackground, // Sempre preto
    'stroke-width': 2,
    fill: ER_STYLE_CONFIG.colors.inner.lightBackground // Sempre branco
  });

  append(parentGroup, circle);
};

/**
 * Desenhar linha de obrigatoriedade - indica obrigatório
 */
(ErBpmnRenderer as any).prototype.drawMandatoryLine = function(
  this: any,
  parentGroup: SVGElement,
  offset: number,
  angle: number
): void {
  const mandatoryLine = create('line');
  
  const length = 18;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  
  // Linha perpendicular à conexão
  const perpCos = Math.cos(angle + Math.PI / 2);
  const perpSin = Math.sin(angle + Math.PI / 2);
  
  const centerX = offset * cos;
  const centerY = offset * sin;
  
  const x1 = centerX + (length / 2) * perpCos;
  const y1 = centerY + (length / 2) * perpSin;
  const x2 = centerX - (length / 2) * perpCos;
  const y2 = centerY - (length / 2) * perpSin;

  attr(mandatoryLine, {
    x1: x1,
    y1: y1,
    x2: x2,
    y2: y2,
    stroke: ER_STYLE_CONFIG.colors.inner.darkBackground, // Sempre preto
    'stroke-width': 2,
    'stroke-linecap': 'round'
  });

  append(parentGroup, mandatoryLine);
};

/**
 * Desenhar label de relacionamento ER (texto sobre a conexão)
 */
(ErBpmnRenderer as any).prototype.drawErRelationshipLabel = function(
  this: any,
  parentNode: SVGElement,
  labelElement: Element,
  connectionElement: Element
): SVGElement | null {
  // Obter o texto do label
  let labelText = connectionElement.businessObject?.name ||
                  connectionElement.businessObject?.$attrs?.['er:name'] ||
                  connectionElement.businessObject?.$attrs?.['ns0:name'] ||
                  '';

  if (!labelText || labelText.trim() === '') {
    return null;
  }

  labelText = labelText.trim();

  // Criar grupo para o label com ligeiro offset vertical para evitar conflito com cardinalidades
  const labelGroup = create('g');
  attr(labelGroup, {
    class: 'er-relationship-label',
    transform: 'translate(0, -8)' // Mover 8px para cima para evitar sobreposição
  });

  // Fundo do label (caixa arredondada) - estilo melhorado
  const textWidth = Math.max(labelText.length * 8 + 16, 60); // Largura mínima para melhor aparência
  const textHeight = 26;

  const background = create('rect');
  attr(background, {
    x: -textWidth / 2,
    y: -textHeight / 2,
    width: textWidth,
    height: textHeight,
    rx: 12,
    ry: 12,
    fill: '#F0F9FF', // Azul muito claro
    stroke: '#2563EB', // Azul mais forte
    'stroke-width': 1.5,
    'filter': 'drop-shadow(0px 2px 6px rgba(0,0,0,0.15))'
  });

  append(labelGroup, background);

  // Texto do label - estilo melhorado
  const textElement = create('text');
  attr(textElement, {
    x: 0,
    y: 1, // Leve ajuste vertical para melhor alinhamento
    'text-anchor': 'middle',
    'dominant-baseline': 'central',
    'font-family': 'Inter, -apple-system, sans-serif',
    'font-size': '11px',
    'font-weight': '600',
    'font-style': 'italic',
    fill: '#1E40AF', // Azul mais escuro para melhor contraste
    'pointer-events': 'none'
  });
  
  textElement.textContent = labelText;
  append(labelGroup, textElement);

  append(parentNode, labelGroup);

  return labelGroup;
};

/**
 * Adicionar label de relacionamento diretamente à conexão (método direto)
 */
(ErBpmnRenderer as any).prototype.addRelationshipLabelToConnection = function(
  this: any,
  parentNode: SVGElement,
  connection: Element
): void {
  // Verificar se conecta elementos ER
  const source = connection.source;
  const target = connection.target;
  const hasErElements = (source && source.businessObject && source.businessObject.erType) 
                     || (target && target.businessObject && target.businessObject.erType);

  if (!hasErElements) {
    return;
  }

  // Obter o texto do label
  const labelText = connection.businessObject?.name ||
                    connection.businessObject?.$attrs?.['er:name'] ||
                    connection.businessObject?.$attrs?.['ns0:name'] ||
                    '';

  if (!labelText || labelText.trim() === '') {
    return;
  }

  // Calcular posição central da conexão
  const waypoints = connection.waypoints || [];
  
  if (waypoints.length < 2) {
    return;
  }

  let centerX, centerY;
  if (waypoints.length === 2) {
    // Conexão direta: meio da linha
    centerX = (waypoints[0].x + waypoints[waypoints.length - 1].x) / 2;
    centerY = (waypoints[0].y + waypoints[waypoints.length - 1].y) / 2;
  } else {
    // Conexão com waypoints: meio do segmento central
    const midIndex = Math.floor(waypoints.length / 2);
    centerX = waypoints[midIndex].x;
    centerY = waypoints[midIndex].y;
  }

  // Criar apenas o texto simples sem fundo
  const textElement = create('text');
  attr(textElement, {
    x: centerX,
    y: centerY - 10,
    'text-anchor': 'middle',
    'dominant-baseline': 'central',
    'font-family': 'Inter, -apple-system, sans-serif',
    'font-size': '12px',
    'font-weight': '600',
    'font-style': 'italic',
    fill: '#374151',
    'pointer-events': 'none',
    class: 'er-relationship-label-direct'
  });
  
  textElement.textContent = labelText.trim();

  append(parentNode, textElement);
};

/**
 * Determinar se uma cor é escura baseando-se na sua luminância
 * @deprecated Use ErColorUtils.isColorDark em vez desta função
 */
function isColorDark(color: string): boolean {
  return ErColorUtils.isColorDark(color);
}

// DEFINIR PRIORIDADE ALTA
ErBpmnRenderer.prototype.constructor.priority = 2000;