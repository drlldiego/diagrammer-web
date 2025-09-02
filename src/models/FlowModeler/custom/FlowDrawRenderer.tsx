import BpmnRenderer from 'bpmn-js/lib/draw/BpmnRenderer';
import { 
  append,
  attr,
  create
} from 'tiny-svg';
import { logger } from '../../../utils/logger';
import { Element } from 'bpmn-js/lib/model/Types';

// Tipos para os parâmetros do construtor
interface RendererConfig {
  defaultFillColor?: string;
  defaultStrokeColor?: string;
  defaultLabelColor?: string;
}



interface BusinessObject {
  id: string;
  name?: string;
  flowType?: string;
  $attrs?: { [key: string]: string };
}


/**
 * Renderizador customizado para elementos de fluxograma
 */
export default class FlowDrawRenderer extends BpmnRenderer {
  private eventBus: any;

  constructor(
    config: RendererConfig,
    eventBus: any,
    styles: any,
    pathMap: any,
    canvas: any,
    textRenderer: any,
    priority?: number
  ) {
    super(config, eventBus, styles, pathMap, canvas, textRenderer, priority);
    this.eventBus = eventBus;

    // Registrar handlers para elementos de fluxograma
    (this as any).flowHandlers = {
      'flow:Inicio': this.drawFlowInicio.bind(this),
      'flow:Fim': this.drawFlowFim.bind(this),
      'flow:Retangulo': this.drawFlowRetangulo.bind(this),
      'flow:Decisao': this.drawFlowDecisao.bind(this),
      'flow:Linha': this.drawFlowLinha.bind(this),
    };

    logger.info('FlowDrawRenderer initialized with custom handlers');
  }

  /**
   * Verificar se o elemento pode ser renderizado por este renderer
   */
  canRender(element: any): boolean {
    return element.type?.startsWith('flow:') || false;
  }

  /**
   * Desenhar elemento Início (círculo verde)
   */
  drawFlowInicio(parentNode: SVGElement, element: any): SVGElement {
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
      stroke: '#16a34a', // Verde moderno
      'stroke-width': 3,
      fill: '#dcfce7', // Verde muito claro
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
      fill: '#166534', // Verde escuro para legibilidade
      'pointer-events': 'none'
    });
    label.textContent = text;
    append(parentNode, label);

    return circle;
  }

  /**
   * Desenhar elemento Fim (círculo vermelho)
   */
  drawFlowFim(parentNode: SVGElement, element: any): SVGElement {
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
      stroke: '#dc2626', // Vermelho moderno
      'stroke-width': 3,
      fill: '#fecaca', // Vermelho muito claro
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
      y: centerY + 30,
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
      'font-family': 'Inter, -apple-system, sans-serif',
      'font-size': '12px',
      'font-weight': '600',
      fill: '#991b1b', // Vermelho escuro para legibilidade
      'pointer-events': 'none'
    });
    label.textContent = text;
    append(parentNode, label);

    return circle;
  }

  /**
   * Desenhar elemento Retângulo (processo)
   */
  drawFlowRetangulo(parentNode: SVGElement, element: any): SVGElement {
    const width = element.width || 120;
    const height = element.height || 80;

    const rect = create('rect');
    attr(rect, {
      x: 0,
      y: 0,
      width: width,
      height: height,
      stroke: '#2563eb', // Azul moderno
      'stroke-width': 2,
      fill: '#dbeafe', // Azul muito claro
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
      fill: '#1e40af', // Azul escuro para legibilidade
      'pointer-events': 'none'
    });
    label.textContent = text;
    append(parentNode, label);

    return rect;
  }

  /**
   * Desenhar elemento Decisão (losango)
   */
  drawFlowDecisao(parentNode: SVGElement, element: any): SVGElement {
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
      fill: '#a16207', // Amarelo escuro para legibilidade
      'pointer-events': 'none'
    });
    label.textContent = text;
    append(parentNode, label);

    return diamond;
  }

  /**
   * Desenhar elemento Linha (seta de conexão)
   */
  drawFlowLinha(parentNode: SVGElement, element: any): SVGElement {
    // Para linhas, usar o renderer padrão do BPMN mas com estilos customizados
    const path = (BpmnRenderer.prototype as any).drawConnection.call(this, parentNode, element);
    
    // Customizar estilo da linha
    attr(path, {
      stroke: '#4b5563', // Cinza moderno
      'stroke-width': 2,
      fill: 'none',
      'marker-end': 'url(#sequenceflow-end)',
      'vector-effect': 'non-scaling-stroke'
    });

    return path;
  }

  /**
   * Override do método drawShape para interceptar elementos de fluxograma
   */
  drawShape(parentNode: SVGElement, element: any): SVGElement {
    const type = element.type;

    if (type?.startsWith('flow:')) {
      const handler = (this as any).flowHandlers[type];
      if (handler) {
        return handler(parentNode, element);
      }
    }

    // Usar renderer padrão para outros elementos
    return super.drawShape(parentNode, element);
  }

  /**
   * Override do método drawConnection para interceptar conexões de fluxograma
   */
  drawConnection(parentNode: SVGElement, element: any): SVGElement {
    const type = element.type;

    if (type === 'flow:Linha') {
      return this.drawFlowLinha(parentNode, element);
    }

    // Usar renderer padrão para outras conexões
    return super.drawConnection(parentNode, element);
  }
}

// Exportar a configuração do módulo para integração com bpmn-js
(FlowDrawRenderer as any).$inject = [
  'config.bpmnRenderer',
  'eventBus',
  'styles',
  'pathMap',
  'canvas',
  'textRenderer'
];