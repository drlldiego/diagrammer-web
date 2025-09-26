/**
 * Arquivo central de exportação de todos os tipos de diagrama ER
 */

// Tipos de elementos centrais
export type {
  Point,
  ErBusinessObject,
  ErElement,
  ErEntity,
  ErAttribute,
  ErRelationship,
  ErConnection,
  ErElementType,
  DiagramMode,
  DiagramNotation,
  ErPropertyUpdateEvent,
  ErElementDimensions,
  CardinalityOptions,
} from './er-element.types';

// Guards de tipo
export {
  isErEntity,
  isErAttribute,
  isErRelationship,
  isErConnection,
} from './er-element.types';

// Tipos de nível de diagrama
export type {
  ErDiagramConfig,
  ErDiagramMetadata,
  ErDiagram,
  ErDiagramValidationResult,
  ErDiagramValidationError,
  ErDiagramValidationWarning,
  ErExportFormat,
  ErExportOptions,
  ErDiagramStatistics,
} from './er-diagram.types';

// Interfaces de serviço
export type {
  PropertyUpdateOptions,
  ElementResizeOptions,
  NotationStrategyInterface,
  ErEventListener,
  ErEventType,
  ErServiceError,
  ErServiceResult,
} from './er-service.types';