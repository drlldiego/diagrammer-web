/**
 * Index for ER Rules
 * Exporta todas as regras e interfaces para facilitar imports
 */

import { 
  ErConnectionRulesFactory,
  BaseErRules,
  type Element,
  type ConnectionValidationResult,
  type ErNotationRules 
} from './ErConnectionRules';

import { ChenRules } from './ChenRules';
import { CrowsFootRules } from './CrowsFootRules';

export { 
  ErConnectionRulesFactory,
  BaseErRules,
  type Element,
  type ConnectionValidationResult,
  type ErNotationRules 
} from './ErConnectionRules';

export { ChenRules } from './ChenRules';
export { CrowsFootRules } from './CrowsFootRules';

/**
 * Função de conveniência para inicializar as regras
 */
export function initializeErRules(notation: 'chen' | 'crowsfoot' = 'chen') {
  const factory = ErConnectionRulesFactory.getInstance();
  
  // Registrar as regras específicas usando imports diretos
  factory.registerChenRules(new ChenRules());
  factory.registerCrowsFootRules(new CrowsFootRules());
  factory.setNotation(notation);
  
  return factory;
}