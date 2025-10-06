import BpmnRenderer from 'bpmn-js/lib/draw/BpmnRenderer';
import { 
  append,
  attr,
  create
} from 'tiny-svg';
import { logger } from '../../../../utils/logger';

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
  flowType?: string;
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
 * FlowBpmnRenderer - Substitui o BpmnRenderer padrão
 * Renderiza elementos Flow de forma customizada, elementos BPMN normalmente
 */
export default function FlowBpmnRenderer(
  this: any,
  config: RendererConfig,
  eventBus: EventBus,
  styles: Styles,
  pathMap: PathMap,
  canvas: Canvas,
  textRenderer: TextRenderer
): void {  
  // Chamar o construtor do BpmnRenderer
  (BpmnRenderer as any).call(this, config, eventBus, styles, pathMap, canvas, textRenderer);
  
  logger.info('FlowBpmnRenderer initialized');
}

FlowBpmnRenderer.$inject = [
  'config.bpmnRenderer',
  'eventBus',
  'styles',
  'pathMap',
  'canvas', 
  'textRenderer'
];

// Herdar do BpmnRenderer
FlowBpmnRenderer.prototype = Object.create(BpmnRenderer.prototype);

/**
 * Override do drawShape para elementos Flow
 */
(FlowBpmnRenderer as any).prototype.drawShape = function(this: any, parentNode: SVGElement, element: Element): SVGElement | null {
  // Verificar flowType tanto em businessObject.flowType quanto em $attrs
  const flowType = element.businessObject && (
    element.businessObject.flowType || 
    (element.businessObject.$attrs && (
      element.businessObject.$attrs['flow:flowType'] || 
      element.businessObject.$attrs['ns0:flowType']
    ))
  );
  
  // Se é elemento Flow, usar renderização customizada
  if (flowType && element.type !== 'label') {
    
    // Limpar completamente o parentNode para evitar duplicações
    parentNode.innerHTML = '';
    
    let result: SVGElement | null = null;
    
    if (flowType === 'Inicio') {
      result = this.drawFlowInicio(parentNode, element);
    } else if (flowType === 'Fim') {
      result = this.drawFlowFim(parentNode, element);
    } else if (flowType === 'Retangulo') {
      result = this.drawFlowRetangulo(parentNode, element);
    } else if (flowType === 'Decisao') {
      result = this.drawFlowDecisao(parentNode, element);
    } else if (flowType === 'InputOutput') {
      result = this.drawFlowInputOutput(parentNode, element);
    }
    
    return result;
  }
  
  // Se é label de elemento Flow, não renderizar (já temos texto no elemento principal)
  if (flowType && element.type === 'label') {    
    return null; // Não renderizar label separada
  }
  
  // Para elementos BPMN normais, usar renderização padrão  
  return (BpmnRenderer.prototype.drawShape as any).call(this, parentNode, element);
};

/**
 * Desenhar elemento Início (círculo verde)
 */
(FlowBpmnRenderer as any).prototype.drawFlowInicio = function(this: any, parentNode: SVGElement, element: Element): SVGElement {
  const width = element.width || 60;
  const height = element.height || 60;
  const radius = Math.min(width, height) / 2 - 2;
  const centerX = width / 2;
  const centerY = height / 2;

  const circle = create('circle');
  attr(circle, {
    cx: centerX,
    cy: centerY,
    r: radius,
    stroke: '#16a34a',
    'stroke-width': 3,
    fill: '#dcfce7', 
    'vector-effect': 'non-scaling-stroke'
  });

  append(parentNode, circle);

  // Adicionar texto
  const text = element.businessObject.name || 'Início';
  const label = create('text');
  attr(label, {
    x: centerX,
    y: centerY + 4,
    'text-anchor': 'middle',
    'dominant-baseline': 'central',
    'font-family': 'Inter, -apple-system, sans-serif',
    'font-size': '12px',
    'font-weight': '600',
    fill: '#000000ff',
    'pointer-events': 'none'
  });
  label.textContent = text;
  append(parentNode, label);

  return circle;
};

/**
 * Desenhar elemento Fim (círculo vermelho)
 */
(FlowBpmnRenderer as any).prototype.drawFlowFim = function(this: any, parentNode: SVGElement, element: Element): SVGElement {
  const width = element.width || 60;
  const height = element.height || 60;
  const radius = Math.min(width, height) / 2 - 2;
  const centerX = width / 2;
  const centerY = height / 2;

  const circle = create('circle');
  attr(circle, {
    cx: centerX,
    cy: centerY,
    r: radius,
    stroke: '#dc2626', 
    'stroke-width': 3,
    fill: '#e95050ff', 
    'vector-effect': 'non-scaling-stroke'
  });

  append(parentNode, circle);

  // Adicionar círculo interno para indicar fim
  const innerCircle = create('circle');
  attr(innerCircle, {
    cx: centerX,
    cy: centerY,
    r: radius - 8,
    stroke: '#dc2626',
    'stroke-width': 2,
    fill: '#dc2626',
    'vector-effect': 'non-scaling-stroke'
  });

  append(parentNode, innerCircle);

  // Adicionar texto
  const text = element.businessObject.name || 'Fim';
  const label = create('text');
  attr(label, {
    x: centerX,
    y: centerY + 1,
    'text-anchor': 'middle',
    'dominant-baseline': 'central',
    'font-family': 'Inter, -apple-system, sans-serif',
    'font-size': '12px',
    'font-weight': '600',
    fill: '#ffffff',
    'pointer-events': 'none'
  });
  label.textContent = text;
  append(parentNode, label);

  return circle;
};

/**
 * Desenhar elemento Retângulo (processo)
 */
(FlowBpmnRenderer as any).prototype.drawFlowRetangulo = function(this: any, parentNode: SVGElement, element: Element): SVGElement {
  const width = element.width || 120;
  const height = element.height || 80;

  const rect = create('rect');
  attr(rect, {
    x: 0,
    y: 0,
    width: width,
    height: height,
    stroke: '#2563eb',
    'stroke-width': 2,
    fill: '#dbeafe', 
    rx: 8,
    ry: 8,
    'vector-effect': 'non-scaling-stroke'
  });

  append(parentNode, rect);

  // Adicionar texto
  const text = element.businessObject.name || 'Processo';
  const label = create('text');
  attr(label, {
    x: width / 2,
    y: height / 2 + 4,
    'text-anchor': 'middle',
    'dominant-baseline': 'central',
    'font-family': 'Inter, -apple-system, sans-serif',
    'font-size': '13px',
    'font-weight': '600',
    fill: '#000000ff',
    'pointer-events': 'none'
  });
  label.textContent = text;
  append(parentNode, label);

  return rect;
};

/**
 * Desenhar elemento Decisão (losango)
 */
(FlowBpmnRenderer as any).prototype.drawFlowDecisao = function(this: any, parentNode: SVGElement, element: Element): SVGElement {
  const width = element.width || 140;
  const height = element.height || 100;
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  // Criar losango
  const diamond = create('path');
  const pathData = `M ${halfWidth},0 L ${width},${halfHeight} L ${halfWidth},${height} L 0,${halfHeight} Z`;

  attr(diamond, {
    d: pathData,
    stroke: '#eab308', // Amarelo moderno
    'stroke-width': 2,
    fill: '#fefce8', // Amarelo muito claro
    'stroke-linejoin': 'round',
    'vector-effect': 'non-scaling-stroke'
  });

  append(parentNode, diamond);

  // Adicionar texto
  const text = element.businessObject.name || 'Decisão';
  const label = create('text');
  attr(label, {
    x: halfWidth,
    y: halfHeight + 4,
    'text-anchor': 'middle',
    'dominant-baseline': 'central',
    'font-family': 'Inter, -apple-system, sans-serif',
    'font-size': '12px',
    'font-weight': '600',
    fill: '#000000ff', 
    'pointer-events': 'none'
  });
  label.textContent = text;
  append(parentNode, label);

  return diamond;
};

/**
 * Desenhar elemento Input/Output (retângulo inclinado)
 */
(FlowBpmnRenderer as any).prototype.drawFlowInputOutput = function(this: any, parentNode: SVGElement, element: Element): SVGElement {
  const width = element.width || 140;
  const height = element.height || 80;
  const skew = 18; // Inclinação em pixels

  // Criar retângulo inclinado (parallelogram)
  const parallelogram = create('path');
  const pathData = `M ${skew},0 L ${width},0 L ${width - skew},${height} L 0,${height} Z`;

  attr(parallelogram, {
    d: pathData,
    stroke: '#7c3aed',
    'stroke-width': 2,
    fill: '#f3e8ff', 
    'stroke-linejoin': 'round',
    'vector-effect': 'non-scaling-stroke'
  });

  append(parentNode, parallelogram);

  // Adicionar texto
  const text = element.businessObject.name || 'Input/Output';
  const label = create('text');
  attr(label, {
    x: width / 2,
    y: height / 2 + 4,
    'text-anchor': 'middle',
    'dominant-baseline': 'central',
    'font-family': 'Inter, -apple-system, sans-serif',
    'font-size': '12px',
    'font-weight': '600',
    fill: '#000000ff', 
    'pointer-events': 'none'
  });
  label.textContent = text;
  append(parentNode, label);

  return parallelogram;
};

/**
 * Override do getShapePath para elementos Flow
 */
(FlowBpmnRenderer as any).prototype.getShapePath = function(this: any, element: Element): string {
  const flowType = element.businessObject && element.businessObject.flowType;
  
  if (flowType) {
    const width = element.width || 140;
    const height = element.height || 60;

    if (flowType === 'Retangulo') {
      return `M 0,0 L ${width},0 L ${width},${height} L 0,${height} Z`;
    }

    if (flowType === 'Decisao') {
      const halfWidth = width / 2;
      const halfHeight = height / 2;
      return `M ${halfWidth},0 L ${width},${halfHeight} L ${halfWidth},${height} L 0,${halfHeight} Z`;
    }

    if (flowType === 'InputOutput') {
      const skew = 18;
      return `M ${skew},0 L ${width},0 L ${width - skew},${height} L 0,${height} Z`;
    }

    if (flowType === 'Inicio' || flowType === 'Fim') {
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