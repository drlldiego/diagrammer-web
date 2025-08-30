import ResizeAllRules from './ResizeAllRules';
import { ModuleDeclaration } from 'didi';

const resizeRulesModule: ModuleDeclaration = {
  __init__: ['resizeAllRules'],
  resizeAllRules: ['type', ResizeAllRules]
};

export default resizeRulesModule;
