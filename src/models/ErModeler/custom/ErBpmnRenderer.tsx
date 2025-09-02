import BpmnRenderer from 'bpmn-js/lib/draw/BpmnRenderer';
import { 
  append,
  attr,
  create
} from 'tiny-svg';
import { logger } from '../../../utils/logger';

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
  isForeignKey?: boolean;
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
  elementRegistry: any
): void {  
  // Chamar o construtor do BpmnRenderer
  (BpmnRenderer as any).call(this, config, eventBus, styles, pathMap, canvas, textRenderer);
  
  // Armazenar elementRegistry para uso em isSubAttribute
  this._elementRegistry = elementRegistry;
  
  // Listener simplificado apenas para mudanças não automáticas na conexão
  eventBus.on('connection.changed', (event: any) => {
    const element = event.element;
    if (element?.waypoints) {
      console.log('[DEBUG] Conexão alterada, atualizando cardinalidades:', element.id);
      // Delay maior para garantir que todas as propriedades foram atualizadas
      setTimeout(() => {
        this.updateConnectionCardinalities(element);
      }, 100);
    }
  });
  
  // Listener para movimentação de elementos
  eventBus.on('element.move.end', (event: any) => {
    const element = event.element;
    console.log('[DEBUG] Elemento movido:', element.id);
    
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
      console.log('[DEBUG] Atualizando cardinalidades após movimentação para conexão:', connection.id);
      setTimeout(() => {
        this.updateConnectionCardinalities(connection);
      }, 50); // Delay maior para garantir que os waypoints foram recalculados
    });
  });
  
  // Listener para redimensionamento de elementos
  eventBus.on('element.resize.end', (event: any) => {
    const element = event.element;
    console.log('[DEBUG] Elemento redimensionado:', element.id);
    
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
      console.log('[DEBUG] Atualizando cardinalidades após redimensionamento para conexão:', connection.id);
      setTimeout(() => {
        this.updateConnectionCardinalities(connection);
      }, 50);
    });
  });
}

ErBpmnRenderer.$inject = [
  'config.bpmnRenderer',
  'eventBus',
  'styles',
  'pathMap',
  'canvas', 
  'textRenderer',
  'elementRegistry'
];

// Herdar do BpmnRenderer
ErBpmnRenderer.prototype = Object.create(BpmnRenderer.prototype);

/**
 * Override do drawShape para elementos ER - VERSÃO SIMPLIFICADA SEM CACHE
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
  
  // CORREÇÃO: Também detectar atributos por tipo BPMN (bpmn:UserTask com erType Attribute)
  const isUserTaskWithAttributeType = element.type === 'bpmn:UserTask' && erType === 'Attribute';
  // Detectar atributo composto por SubProcess
  const isCompositeAttributeSubProcess = element.type === 'bpmn:SubProcess' && erType === 'CompositeAttribute';
  
  
  // Se é elemento ER, usar renderização customizada
  if ((erType && element.type !== 'label') || isUserTaskWithAttributeType || isCompositeAttributeSubProcess) {
    
    // Limpar completamente o parentNode para evitar duplicações
    parentNode.innerHTML = '';
    
    let result: SVGElement | null = null;
    
    if (erType === 'Entity') {
      result = this.drawErEntity(parentNode, element);
    } else if (erType === 'Relationship') {
      result = this.drawErRelationship(parentNode, element);
    } else if (erType === 'Attribute' || isUserTaskWithAttributeType) {
      result = this.drawErAttribute(parentNode, element);
    } else if (erType === 'CompositeAttribute' || isCompositeAttributeSubProcess) {
      result = this.drawErCompositeAttribute(parentNode, element);
    }
    
    return result;
  }
  
  // Se é label de elemento ER, não renderizar (já temos texto no elemento principal)
  if (erType && element.type === 'label') {    
    return null; // Não renderizar label separada
  }
  
  // Se é label de conexão, não renderizar (remover texto das conexões)
  if (element.type === 'label' && element.id && element.id.includes('Flow_')) {    
    return null; // Não renderizar label de conexão
  }
  
  // Para elementos BPMN normais, usar renderização padrão  
  return (BpmnRenderer.prototype.drawShape as any).call(this, parentNode, element);
};

/**
 * Desenhar entidade ER (retângulo)
 */
(ErBpmnRenderer as any).prototype.drawErEntity = function(this: any, parentNode: SVGElement, element: Element): SVGElement {  
  const width = element.width || 120;
  const height = element.height || 80;
  
  const rect = create('rect');
  attr(rect, {
    x: 0,
    y: 0,
    width: width,
    height: height,    
    stroke: '#3B82F6', // Azul moderno
    'stroke-width': 2,
    fill: '#EFF6FF', // Azul muito claro moderno
    rx: 8,
    ry: 8,
    'vector-effect': 'non-scaling-stroke'
  });

  append(parentNode, rect);

  // Entidade fraca: alterar estilo e cores modernas
  const isWeak = element.businessObject && (
    element.businessObject.isWeak || 
    (element.businessObject.$attrs && (
      element.businessObject.$attrs['er:isWeak'] === 'true' ||
      element.businessObject.$attrs['ns0:isWeak'] === 'true'
    ))
  );
  
  if (isWeak) {        
    // Mudar cor da entidade principal para índigo
    attr(rect, {
      stroke: '#6366F1', // Índigo moderno
      fill: '#EEF2FF'    // Índigo muito claro
    });
    
    const innerRect = create('rect');
    attr(innerRect, {
      x: 8,
      y: 8,
      width: width - 16,
      height: height - 16,
      stroke: '#4F46E5', // Índigo mais escuro
      'stroke-width': 2,
      fill: 'none',
      rx: 4,
      ry: 4,
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
  attr(label, {
    x: width / 2,
    y: height / 2 + 4,
    'text-anchor': 'middle',
    'dominant-baseline': 'central',
    'font-family': 'Inter, -apple-system, sans-serif',
    'font-size': '13px',
    'font-weight': '600',
    fill: '#1F2937', // Cinza escuro moderno para legibilidade
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
  const width = element.width || 140;
  const height = element.height || 80;
  const halfWidth = width / 2;
  const halfHeight = height / 2;  

  // Criar losango diretamente no parentNode com cores de alto contraste
  const diamond = create('path');
  const pathData = `M ${halfWidth},0 L ${width},${halfHeight} L ${halfWidth},${height} L 0,${halfHeight} Z`;    
  
  attr(diamond, {
    d: pathData,
    stroke: '#8B5CF6', // Violeta moderno
    'stroke-width': 2,
    fill: '#F3E8FF', // Violeta muito claro
    'stroke-linejoin': 'round',
    'vector-effect': 'non-scaling-stroke'
  });

  append(parentNode, diamond);

  // Se é relacionamento identificador, adicionar duplo contorno
  const isIdentifying = element.businessObject && element.businessObject.isIdentifying;  
  
  if (isIdentifying) {    
    const innerDiamond = create('path');
    const innerOffset = 8; // Espaçamento do contorno interior
    const innerPathData = `M ${halfWidth},${innerOffset} L ${width - innerOffset},${halfHeight} L ${halfWidth},${height - innerOffset} L ${innerOffset},${halfHeight} Z`;
    
    attr(innerDiamond, {
      d: innerPathData,
      stroke: '#7C3AED', // Roxo mais escuro para contraste
      'stroke-width': 2,
      fill: 'none',
      'stroke-linejoin': 'round',
      'vector-effect': 'non-scaling-stroke'
    });
    
    append(parentNode, innerDiamond);    
  } else {
    // Relacionamento normal (não identificador) - não é um erro
  }

  // Adicionar texto com cor forte
  const text = element.businessObject.name || 'Relacionamento';    
  const label = create('text');
  attr(label, {
    x: halfWidth,
    y: halfHeight + 4,
    'text-anchor': 'middle',
    'dominant-baseline': 'central',
    'font-family': 'Inter, -apple-system, sans-serif',
    'font-size': '12px',
    'font-weight': '600',
    fill: '#1F2937', // Cinza escuro moderno para legibilidade
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
  
  const width = element.width || 80;
  const height = element.height || 50;
  // Calcular centro e raios da elipse
  const cx = width / 2;
  const cy = height / 2;
  const rx = (width - 4) / 2; // Margem de 2px de cada lado
  const ry = (height - 4) / 2; // Margem de 2px de cada lado
  const ellipse = create('ellipse');
  const isPrimaryKey = element.businessObject && element.businessObject.isPrimaryKey;
  const isForeignKey = element.businessObject && element.businessObject.isForeignKey;
  const isRequired = element.businessObject && element.businessObject.isRequired;
  const isMultivalued = element.businessObject && element.businessObject.isMultivalued;
  const isDerived = element.businessObject && element.businessObject.isDerived;
  const isComposite = element.businessObject && element.businessObject.isComposite;
  // Verificar se é um sub-atributo
  const isSubAttribute = element.businessObject && (element.businessObject as any).isSubAttribute;
  
  // Determinar estilo baseado no tipo de chave
  let strokeWidth: number, fill: string, stroke: string;
  
  if (isSubAttribute) {    
    strokeWidth = 2;
    fill = '#F5F5F5'; 
    stroke = '#000000'; 
  } else if (isPrimaryKey) {    
    strokeWidth = 3;
    fill = '#FFFBEB'; 
    stroke = '#F59E0B';
  } else if (isForeignKey) {    
    strokeWidth = 2;
    fill = '#DBEAFE'; 
    stroke = '#3B82F6';
  } else {    
    strokeWidth = 2;
    fill = '#ECFDF5';
    stroke = '#10B981';    
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
  // Se é chave primária (e não sub-atributo), mostrar "PK"
  else if (isPrimaryKey) {
    text = 'PK';    
  }
  // Se é chave estrangeira (e não sub-atributo), mostrar "FK" 
  else if (isForeignKey) {
    text = 'FK';    
  }
  
  const label = create('text');
  
  // Configurar estilos do texto
  const textAttrs: any = {
    x: width / 2,
    y: height / 2 + 4,
    'text-anchor': 'middle',
    'dominant-baseline': 'central',
    'font-family': 'Inter, -apple-system, sans-serif',
    'font-size': '11px',
    'font-weight': '600',
    fill: '#1F2937',
    'pointer-events': 'none'
  };
  
  if (isRequired && !isPrimaryKey && !isForeignKey && !isSubAttribute) {
    textAttrs['text-decoration'] = 'underline';    
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
  const erType = element.businessObject && element.businessObject.erType;
  
  if (erType) {
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
  // Debug log para verificar se drawConnection está sendo chamado
  console.log(`[DEBUG] drawConnection chamado para ${element.id}`);
  
  // Verificar se a conexão conecta elementos ER
  const source = element.source;
  const target = element.target;
  const hasErElements = (source && source.businessObject && source.businessObject.erType) 
                     || (target && target.businessObject && target.businessObject.erType);

  // Também verificar se a conexão tem cardinalidades definidas (mesmo sem erType)
  const hasCardinalityAttrs = element.businessObject && (
    element.businessObject.cardinalitySource || 
    //element.businessObject.cardinalityTarget ||
    (element.businessObject.$attrs && (
      element.businessObject.$attrs['er:cardinalitySource'] ||
      element.businessObject.$attrs['ns0:cardinalitySource'] //||
      //element.businessObject.$attrs['er:cardinalityTarget'] ||
      //element.businessObject.$attrs['ns0:cardinalityTarget']
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
        element.businessObject.cardinalitySource = '1';
      }
      //if (!element.businessObject.cardinalityTarget) {
      //  element.businessObject.cardinalityTarget = 'N';
      //}
            
    } else if (connectsToAttribute) {
      // Se conecta a um atributo, não adicionar cardinalidades
      element.businessObject.cardinalitySource = '';
    } else if (connectsTwoEntities) {
      // Para conexões Entity-Entity, apenas definir padrões se NÃO existirem valores
      if (!element.businessObject.cardinalitySource) {
        element.businessObject.cardinalitySource = '1';
      }
      
      if (!element.businessObject.cardinalityTarget) {
        element.businessObject.cardinalityTarget = 'N';
      }
    }
    
    // Remover marcadores (setas) da conexão
    const pathElement = parentNode.querySelector('path');
    if (pathElement) {
      pathElement.removeAttribute('marker-end');
      pathElement.removeAttribute('marker-start');
      
      // Estilo especial para conexões pai-filho (atributos compostos)
      if (isParentChildConnection) {
        
        attr(pathElement, {
          stroke: '#6B7280', // Cinza mais claro
          'stroke-width': 1.5,
          'stroke-dasharray': '3,3', // Linha pontilhada
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round'
        });
      } else {
        // Estilo normal para conexões ER regulares
        attr(pathElement, {
          stroke: '#2c3e50',
          'stroke-width': 2,
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round'
        });
      }
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
      
      // Debug log para verificar cardinalidades
      console.log(`[DEBUG] Renderizando cardinalidades para ${element.id}: Source=${cardinalitySource}, Target=${cardinalityTarget}`);
      
      this.addCardinalityLabelsToConnection(parentNode, element, cardinalitySource, cardinalityTarget);
    } else if (!isParentChildConnection && !connectsToAttribute && hasCardinalitiesNow) {
      const cardinalitySource = element.businessObject?.cardinalitySource || 
                               element.businessObject?.$attrs?.['er:cardinalitySource'] ||
                               element.businessObject?.$attrs?.['ns0:cardinalitySource'] || '1';
      
      this.addCardinalityLabelsToConnection(parentNode, element, cardinalitySource);
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
  cardinalitySource = cardinalitySource || '1';
  cardinalityTarget = cardinalityTarget || 'N';
  
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
    console.warn('[DEBUG] ElementRegistry não encontrado');
    return;
  }
  
  const connectionGfx = elementRegistry.getGraphics(element);
  if (!connectionGfx) {
    console.warn('[DEBUG] ConnectionGfx não encontrado para elemento:', element.id);
    return;
  }
  
  // Verificar se é realmente uma conexão
  if (!element.waypoints) {
    console.warn('[DEBUG] Elemento não é uma conexão:', element.id);
    return;
  }
  
  // Limpar apenas as labels de cardinalidade existentes
  const existingCardinalityLabels = connectionGfx.querySelectorAll('.er-cardinality-label');
  console.log(`[DEBUG] Removendo ${existingCardinalityLabels.length} labels existentes`);
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
  
  console.log(`[DEBUG] Verificando conexão ${element.id}: sourceIsEntity=${sourceIsEntity}, targetIsEntity=${targetIsEntity}, connectsTwoEntities=${connectsTwoEntities}`);
  
  if (connectsTwoEntities) {
    const cardinalitySource = element.businessObject?.cardinalitySource || 
                             element.businessObject?.$attrs?.['er:cardinalitySource'] ||
                             element.businessObject?.$attrs?.['ns0:cardinalitySource'] || '1';
    const cardinalityTarget = element.businessObject?.cardinalityTarget || 
                             element.businessObject?.$attrs?.['er:cardinalityTarget'] ||
                             element.businessObject?.$attrs?.['ns0:cardinalityTarget'] || 'N';
    
    console.log(`[DEBUG] Adicionando cardinalidades para ${element.id}: Source=${cardinalitySource}, Target=${cardinalityTarget}`);
    
    try {
      this.addCardinalityLabelsToConnection(connectionGfx, element, cardinalitySource, cardinalityTarget);
      console.log(`[DEBUG] Cardinalidades adicionadas com sucesso para ${element.id}`);
    } catch (error) {
      console.error('[DEBUG] Erro ao adicionar cardinalidades:', error);
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
                               element.businessObject?.$attrs?.['ns0:cardinalitySource'] || '1';
      
      console.log(`[DEBUG] Adicionando cardinalidade única para ${element.id}: Source=${cardinalitySource}`);
      
      try {
        this.addCardinalityLabelsToConnection(connectionGfx, element, cardinalitySource);
        console.log(`[DEBUG] Cardinalidade única adicionada com sucesso para ${element.id}`);
      } catch (error) {
        console.error('[DEBUG] Erro ao adicionar cardinalidade única:', error);
      }
    }
  }
};

/**
 * Desenha um atributo composto usando SubProcess como container
 */
(ErBpmnRenderer as any).prototype.drawErCompositeAttribute = function(parentNode: SVGElement, element: any): SVGElement {
    
  const width = element.width || 200;
  const height = element.height || 150;
  
  // CORREÇÃO: Usar as dimensões calculadas sem forçar mínimos grandes
  const elementWidth = width;
  const elementHeight = height;   
  
  // Container principal - mais simples, sem elementos que bloqueiem
  const containerGroup = create('g');
  attr(containerGroup, {
    class: 'er-composite-attribute-container'
  });
  
  // Fundo do container SIMPLIFICADO - apenas borda tracejada
  const outerRect = create('rect');
  attr(outerRect, {
    x: 0,
    y: 0,
    width: elementWidth,
    height: elementHeight,
    rx: 8,
    ry: 8,
    fill: 'rgba(59, 130, 246, 0.03)', // Background muito transparente
    stroke: '#3B82F6', // Azul
    'stroke-width': '2px',
    'stroke-dasharray': '8,4', // Linha tracejada mais visível
    'vector-effect': 'non-scaling-stroke',
    'pointer-events': 'none' // CORREÇÃO: Não interceptar eventos
  });
  append(containerGroup, outerRect);
  
  // Título do atributo composto
  const title = element.businessObject?.name || element.name || 'Composto';
  const titleText = create('text');
  attr(titleText, {
    x: elementWidth / 2,
    y: 20,
    'text-anchor': 'middle',
    'dominant-baseline': 'central',
    'font-family': 'Inter, -apple-system, sans-serif',
    'font-size': '14px',
    'font-weight': '600',
    fill: '#1F2937',
    'pointer-events': 'none'
  });
  titleText.textContent = title;
  append(containerGroup, titleText);
  
  // Adicionar container ao parentNode
  append(parentNode, containerGroup);    
  
  return containerGroup;
};