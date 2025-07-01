import { ERPaletteProvider } from '../providers/ERPaletteProvider';
import { ERContextPadProvider } from '../providers/ERContextPadProvider';
import { ERRules } from '../rules/ERRules';
import { ERRenderer } from '../renderer/ERRenderer';

// ER Module Definition
export const ERModule = {
  __init__: [
    'erPaletteProvider',
    'erContextPadProvider',
    'erRules',
    'erRenderer'
  ],
  erPaletteProvider: ['type', ERPaletteProvider],
  erContextPadProvider: ['type', ERContextPadProvider],
  erRules: ['type', ERRules],
  erRenderer: ['type', ERRenderer]
};