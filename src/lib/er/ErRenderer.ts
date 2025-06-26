import inherits from 'inherits-browser';
import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer';
import {
  append as svgAppend,
  create as svgCreate,
  attr as svgAttr
} from 'tiny-svg';
import EventBus from 'diagram-js/lib/core/EventBus';

export default function ErRenderer(this: BaseRenderer, eventBus: EventBus) {
  BaseRenderer.call(this, eventBus, 1500);

  this.canRender = function(element: any) {
    // Verifica se é um elemento ER
    return element.type && element.type.startsWith('er:');
  };

  this.drawShape = function(parent: any, shape: any): SVGElement {
    const type = shape.type;

    if (type === 'er:Entity') {
      return drawEntity(parent, shape);
    }
    
    if (type === 'er:Attribute') {
      return drawAttribute(parent, shape);
    }
    
    if (type === 'er:Relationship') {
      return drawRelationship(parent, shape);
    }

    // Retorna um elemento vazio como fallback
    const g = svgCreate('g');
    svgAppend(parent, g);
    return g;
  };

  this.drawConnection = function(parent: any, connection: any) {
    const line = svgCreate('polyline');
    
    const points = connection.waypoints.map((p: any) => `${p.x},${p.y}`).join(' ');
    
    svgAttr(line, {
      points: points,
      stroke: '#333',
      'stroke-width': 2,
      fill: 'none'
    });

    svgAppend(parent, line);
    return line;
  };
}

// Função para desenhar Entidade (retângulo)
function drawEntity(parent: any, shape: any): SVGElement {
  const g = svgCreate('g');
  
  const rect = svgCreate('rect');
  
  svgAttr(rect, {
    x: 0,
    y: 0,
    width: shape.width,
    height: shape.height,
    stroke: '#333',
    'stroke-width': 2,
    fill: '#E3F2FD',
    rx: 5,
    ry: 5
  });

  svgAppend(g, rect);

  // Adiciona o texto (nome da entidade)
  const text = svgCreate('text');
  svgAttr(text, {
    x: shape.width / 2,
    y: shape.height / 2,
    'text-anchor': 'middle',
    'dominant-baseline': 'middle',
    'font-family': 'Arial',
    'font-size': 14,
    fill: '#333'
  });
  
  text.textContent = shape.businessObject?.name || 'Entidade';
  svgAppend(g, text);
  
  svgAppend(parent, g);
  return g;
}

// Função para desenhar Atributo (oval/elipse)
function drawAttribute(parent: any, shape: any): SVGElement {
  const g = svgCreate('g');
  
  const ellipse = svgCreate('ellipse');
  
  svgAttr(ellipse, {
    cx: shape.width / 2,
    cy: shape.height / 2,
    rx: shape.width / 2,
    ry: shape.height / 2,
    stroke: '#333',
    'stroke-width': shape.businessObject?.isKey ? 3 : 2,
    fill: shape.businessObject?.isKey ? '#FFF3E0' : '#F5F5F5'
  });

  svgAppend(g, ellipse);

  // Adiciona o texto (nome do atributo)
  const text = svgCreate('text');
  svgAttr(text, {
    x: shape.width / 2,
    y: shape.height / 2,
    'text-anchor': 'middle',
    'dominant-baseline': 'middle',
    'font-family': 'Arial',
    'font-size': 12,
    'font-weight': shape.businessObject?.isKey ? 'bold' : 'normal',
    fill: '#333'
  });
  
  text.textContent = shape.businessObject?.name || 'Atributo';
  svgAppend(g, text);
  
  svgAppend(parent, g);
  return g;
}

// Função para desenhar Relacionamento (losango)
function drawRelationship(parent: any, shape: any): SVGElement {
  const g = svgCreate('g');
  
  const points = [
    `${shape.width / 2},0`,
    `${shape.width},${shape.height / 2}`,
    `${shape.width / 2},${shape.height}`,
    `0,${shape.height / 2}`
  ].join(' ');

  const polygon = svgCreate('polygon');
  
  svgAttr(polygon, {
    points: points,
    stroke: '#333',
    'stroke-width': 2,
    fill: '#E8F5E9'
  });

  svgAppend(g, polygon);

  // Adiciona o texto (nome do relacionamento)
  const text = svgCreate('text');
  svgAttr(text, {
    x: shape.width / 2,
    y: shape.height / 2,
    'text-anchor': 'middle',
    'dominant-baseline': 'middle',
    'font-family': 'Arial',
    'font-size': 12,
    fill: '#333'
  });
  
  text.textContent = shape.businessObject?.name || 'Relaciona';
  svgAppend(g, text);
  
  svgAppend(parent, g);
  return g;
}

inherits(ErRenderer, BaseRenderer);

ErRenderer.$inject = ['eventBus'];