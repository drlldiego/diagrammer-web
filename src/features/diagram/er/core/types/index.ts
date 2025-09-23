/**
 * Central export file for all ER diagram types
 * Provides a single import point for type safety across the application
 */

// Core element types
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

// Type guards
export {
  isErEntity,
  isErAttribute,
  isErRelationship,
  isErConnection,
} from './er-element.types';

// Diagram-level types
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

// Service interfaces
export type {
  PropertyUpdateOptions,
  ElementResizeOptions,
  NotationStrategyInterface,
  ErEventListener,
  ErEventType,
  ErServiceError,
  ErServiceResult,
} from './er-service.types';