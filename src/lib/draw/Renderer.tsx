import inherits from 'inherits-browser';
import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer';
import EventBus from 'diagram-js/lib/core/EventBus';
import { append as svgAppend, create as svgCreate } from 'tiny-svg';

export default function ErRenderer(this: BaseRenderer, eventBus: EventBus) {
  BaseRenderer.call(this, eventBus, 1500);

  this.canRender = function(element: any) {
    return element.businessObject && element.businessObject.erType;
  };

  this.drawShape = function(parent: any, shape: any) {
    const type = shape.businessObject.erType;

    if (type === 'Entity') {
      const rect = svgCreate('rect', {
        x: 0,
        y: 0,
        width: shape.width,
        height: shape.height,
        stroke: '#000',
        strokeWidth: 2,
        fill: '#fff'
      });
      svgAppend(parent, rect);
      return rect;
    }

    if (type === 'Relationship') {
      const diamond = svgCreate('polygon', {
        points: `${shape.width/2},0 ${shape.width},${shape.height/2} ${shape.width/2},${shape.height} 0,${shape.height/2}`,
        stroke: '#000',
        strokeWidth: 2,
        fill: '#fff'
      });
      svgAppend(parent, diamond);
      return diamond;
    }

    const defaultRect = svgCreate('rect', {
      x: 0,
      y: 0,
      width: shape.width,
      height: shape.height,
      stroke: '#000',
      strokeWidth: 1,
      fill: '#f0f0f0'
    });
    svgAppend(parent, defaultRect);
    return defaultRect;
  };
}

inherits(ErRenderer, BaseRenderer);

ErRenderer.$inject = ['eventBus'];
