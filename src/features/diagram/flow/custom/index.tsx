import FlowElementFactory from './FlowElementFactory';
import FlowRendererModule from './FlowRendererModule';

const flowModule = {
  __depends__: [FlowRendererModule],
  __init__: ['flowElementFactory'],  
  flowElementFactory: ['type', FlowElementFactory]
};

export default flowModule;