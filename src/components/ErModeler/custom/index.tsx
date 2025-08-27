import ErPaletteProvider from './ErPalette';
import ErElementFactory from './ErElementFactory';
import ErContextPadProvider from './ErContextPadProvider';
import ErPropertiesProvider from '../properties/ErPropertiesProvider';
import ErRendererModule from './ErRendererModule';
import ErMoveRules from './ErMoveRules';
import ErRules from './ErRules';
import ErSelectionEnhancer from './ErSelectionEnhancer';

console.log('🔥 ErModule: Carregando módulo ER com renderer substituído...');

// Interface para módulo ER
interface ErModule {
  __depends__: any[];
  __init__: string[];
  erPalette: [string, any];
  erElementFactory: [string, any];
  erContextPad: [string, any];
  erPropertiesProvider: [string, any];
  erMoveRules: [string, any];
  erRules: [string, any];
  erSelectionEnhancer: [string, any];
}

// Versão com ErRendererModule restaurado
const erModule: ErModule = {
  __depends__: [ErRendererModule],
  __init__: ['erElementFactory', 'erPalette', 'erContextPad', 'erPropertiesProvider', 'erMoveRules', 'erRules', 'erSelectionEnhancer'],
  erPalette: ['type', ErPaletteProvider],
  erElementFactory: ['type', ErElementFactory],
  erContextPad: ['type', ErContextPadProvider],
  erPropertiesProvider: ['type', ErPropertiesProvider],
  erMoveRules: ['type', ErMoveRules],
  erRules: ['type', ErRules],
  erSelectionEnhancer: ['type', ErSelectionEnhancer]
};

export default erModule;