// Módulo principal que agrega todos os submódulos ER
import ErRenderer from './ErRenderer';
import ErPalette from './ErPalette';
import ErRules from './ErRules';
import ErFactory from './ErFactory';

export default {
  __init__: [
    'erRenderer',
    'erPalette',
    'erRules',
    'erFactory'
  ],
  erRenderer: ['type', ErRenderer],
  erPalette: ['type', ErPalette],
  erRules: ['type', ErRules],
  erFactory: ['type', ErFactory]
};