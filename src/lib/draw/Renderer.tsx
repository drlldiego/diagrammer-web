import inherits from 'inherits-browser';
import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer';
import { is } from 'bpmn-js/lib/util/ModelUtil';
import  EventBus  from 'diagram-js/lib/core/EventBus'; 

// Defina o tipo de 'this' como sendo a instância de 'Render' que estende 'BaseRenderer'
export default function Renderer(this: BaseRenderer, eventBus: EventBus) {  
  BaseRenderer.call(this, eventBus, 1500);

  this.canRender = function(element: any) {  
    return is(element, 'bpmn:Task');
  };

}

// Declare a função construtora de forma correta
inherits(Renderer, BaseRenderer);

// Tipagem explícita de Render como um construtor
export type RenderConstructor = new (eventBus: EventBus) => BaseRenderer;

Renderer.$inject = [ 'eventBus' ];
