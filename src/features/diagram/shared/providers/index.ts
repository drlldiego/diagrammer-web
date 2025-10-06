import ResizeAllRules from './ResizeAllRules';
import { ElementPlacementRulesModule } from './ElementPlacementRules';
import { ModuleDeclaration } from 'didi';

const resizeRulesModule: ModuleDeclaration = {
  __init__: ['resizeAllRules'],
  resizeAllRules: ['type', ResizeAllRules]
};

export default resizeRulesModule;
export { ElementPlacementRulesModule };