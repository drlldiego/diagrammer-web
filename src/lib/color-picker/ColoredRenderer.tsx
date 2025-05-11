import inherits from 'inherits-browser';

import {
  attr as svgAttr
} from 'tiny-svg';

import BpmnRenderer from 'bpmn-js/lib/draw/BpmnRenderer';

import {
  is
} from 'bpmn-js/lib/util/ModelUtil';


export default function ColoredRenderer(this: any, 
    config: any, eventBus: any, styles: any,
    pathMap: any, canvas: any, textRenderer: any) {

  BpmnRenderer.call(
    this,
    config, eventBus, styles,
    pathMap, canvas, textRenderer,
    1400
  );

  this.canRender = function(element: { color: any; }) {
    return is(element, 'bpmn:BaseElement') && element.color;
  };

  this.drawShape = function(parent: any, shape: { color: any; }) {

    var bpmnShape = this.drawBpmnShape(parent, shape);

    svgAttr(bpmnShape, { fill: shape.color });

    return bpmnShape;
  };
}

inherits(ColoredRenderer, BpmnRenderer);

ColoredRenderer.prototype.drawBpmnShape = BpmnRenderer.prototype.drawShape;


ColoredRenderer.$inject = [
  'config.bpmnRenderer',
  'eventBus',
  'styles',
  'pathMap',
  'canvas',
  'textRenderer'
];