import ErPalette from './ErPalette';
import ErElementFactory from './ErElementFactory';
import ErContextPadProvider from './ErContextPadProvider';
import ErPropertiesProvider from './ErPropertiesProvider';
import ErRendererModule from './ErRendererModule';
import ErMoveRules from './ErMoveRules';
import ErOutlineProvider from './ErOutlineProvider';
import { NotationConfig } from '../../../../../features/diagram/shared/config/er';

interface ErModule {
  __depends__: any[];
  __init__: string[];
  erPalette: [string, any];
  erElementFactory: [string, any];
  erContextPad: [string, any];
  erPropertiesProvider: [string, any];
  erMoveRules: [string, any];
  erOutlineProvider: [string, any];
  notationConfig: [string, NotationConfig];
}

// Factory para criar módulo ER com configuração específica da notação
export function createErModule(notationConfig: NotationConfig): ErModule {
  return {
    __depends__: [ErRendererModule],
    __init__: ['erElementFactory', 'erPalette', 'erContextPad', 'erPropertiesProvider', 'erMoveRules', 'erOutlineProvider'],
    erPalette: ['type', ErPalette],
    erElementFactory: ['type', ErElementFactory],
    erContextPad: ['type', ErContextPadProvider],
    erPropertiesProvider: ['type', ErPropertiesProvider],
    erMoveRules: ['type', ErMoveRules],    
    erOutlineProvider: ['type', ErOutlineProvider],    
    notationConfig: ['value', notationConfig] // Injetar a configuração como valor
  };
}