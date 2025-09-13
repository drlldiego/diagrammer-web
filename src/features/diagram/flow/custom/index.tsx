import FlowPaletteProvider from './FlowPaletteProvider';
import FlowElementFactory from './FlowElementFactory';
import FlowRendererModule from './FlowRendererModule';

const flowModule = {
  __depends__: [FlowRendererModule],
  __init__: ['flowElementFactory', 'flowPalette'],
  flowPalette: ['type', FlowPaletteProvider],
  flowElementFactory: ['type', FlowElementFactory]
};

export default flowModule;