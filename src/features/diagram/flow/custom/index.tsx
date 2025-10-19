import FlowElementFactory from './FlowElementFactory';
import FlowRendererModule from './FlowRendererModule';
import FlowContextPadProvider from './FlowContextPadProvider';
import FlowResizeRules from './FlowResizeRules';

const flowModule = {
  __depends__: [FlowRendererModule],
  __init__: ['flowElementFactory', 'flowContextPad', 'flowResizeRules'],  
  flowElementFactory: ['type', FlowElementFactory],
  flowContextPad: ['type', FlowContextPadProvider],
  flowResizeRules: ['type', FlowResizeRules]
};

export default flowModule;