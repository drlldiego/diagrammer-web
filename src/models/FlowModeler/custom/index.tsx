import FlowPaletteProvider from './FlowPaletteProvider';
import FlowElementFactory from './FlowElementFactory';
import FlowDrawRenderer from './FlowDrawRenderer';

export default {
  __init__: [
    'flowPaletteProvider',
    'flowElementFactory', 
    'flowDrawRenderer'
  ],
  flowPaletteProvider: ['type', FlowPaletteProvider],
  flowElementFactory: ['type', FlowElementFactory],
  flowDrawRenderer: ['type', FlowDrawRenderer]
};