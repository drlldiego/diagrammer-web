import ErPalette from './ErPalette';
import ErElementFactory from './ErElementFactory';
import ErContextPadProvider from './ErContextPadProvider';
import ErPropertiesProvider from './ErPropertiesProvider';
import ErRendererModule from './ErRendererModule';
import ErMoveRules from './ErMoveRules';
import ErRules from './ErRules';
import ErSelectionEnhancer from './ErSelectionEnhancer';
import ErSubprocessControlProvider from './ErSubprocessControlProvider';
import ErResizeProvider from './ErResizeProvider';
import { VisualGroupingService } from '../../services/visual-grouping.service';
import { NotationConfig } from '../../../../../features/diagram/shared/config/er';

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
  erSubprocessControl: [string, any];
  erResizeProvider: [string, any];
  visualGroupingService: [string, any];
  notationConfig: [string, NotationConfig];
}

// Factory para criar módulo ER com configuração específica da notação
export function createErModule(notationConfig: NotationConfig): ErModule {
  return {
    __depends__: [ErRendererModule],
    __init__: ['erElementFactory', 'erPalette', 'erContextPad', 'erPropertiesProvider', 'erMoveRules', 'erRules', 'erSelectionEnhancer', 'erSubprocessControl', 'erResizeProvider', 'visualGroupingService'],
    erPalette: ['type', ErPalette],
    erElementFactory: ['type', ErElementFactory],
    erContextPad: ['type', ErContextPadProvider],
    erPropertiesProvider: ['type', ErPropertiesProvider],
    erMoveRules: ['type', ErMoveRules],
    erRules: ['type', ErRules],
    erSelectionEnhancer: ['type', ErSelectionEnhancer],
    erSubprocessControl: ['type', ErSubprocessControlProvider],
    erResizeProvider: ['type', ErResizeProvider],
    visualGroupingService: ['factory', function(canvas: any, elementRegistry: any, selection: any, eventBus: any) {
      return new VisualGroupingService(canvas, elementRegistry, selection, eventBus);
    }],
    notationConfig: ['value', notationConfig] // Injetar a configuração como valor
  };
}