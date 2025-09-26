/**
 * Exports for ER diagram services
 * Centralized access point for all ER operation services
 */

// export { ErElementGroupingService } from './er-element-grouping.service'; // REMOVIDO - Serviço de agrupamento
export { ErSubAttributeService } from './er-sub-attribute.service';

// Export types
// export type { 
//   GroupingOptions, 
//   GroupingResult 
// } from './er-element-grouping.service'; // REMOVIDO - Tipos de agrupamento

export type { 
  SubAttributeOptions, 
  SubAttributeResult 
} from './er-sub-attribute.service';