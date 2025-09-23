/**
 * Service layer interfaces and types for ER diagram operations
 */
import { ErElement, ErElementDimensions, DiagramNotation } from './er-element.types';

/**
 * Options for property updates
 */
export interface PropertyUpdateOptions {
  skipValidation?: boolean;
  skipRerender?: boolean;
  skipEventDispatch?: boolean;
  batchUpdate?: boolean;
}

/**
 * Options for element resize operations
 */
export interface ElementResizeOptions {
  maintainAspectRatio?: boolean;
  minimumDimensions?: ErElementDimensions;
  maximumDimensions?: ErElementDimensions;
  snapToGrid?: boolean;
}

/**
 * Notation strategy interface for implementing different ER notations
 */
export interface NotationStrategyInterface {
  readonly name: DiagramNotation;
  readonly allowDirectEntityConnections: boolean;
  readonly hasRelationshipElements: boolean;
  readonly canAttributeConnectToRelationship: boolean;
  
  getCardinalityOptions(source: ErElement, target: ErElement): string[];
  validateConnection(source: ErElement, target: ErElement): boolean;
  getDefaultCardinality(source: ErElement, target: ErElement): string;
  formatCardinalityDisplay(cardinality: string): string;
}

/**
 * Event types for ER diagram operations
 */
export type ErEventType = 
  | 'element.created'
  | 'element.updated' 
  | 'element.deleted'
  | 'element.selected'
  | 'element.deselected'
  | 'property.changed'
  | 'connection.created'
  | 'connection.updated'
  | 'connection.deleted'
  | 'diagram.mode.changed'
  | 'diagram.notation.changed'
  | 'validation.completed'
  | 'export.completed'
  | 'import.completed';

/**
 * Event listener interface
 */
export interface ErEventListener<T = any> {
  (event: ErEventType, data: T): void;
}

/**
 * Service error interface
 */
export interface ErServiceError {
  code: string;
  message: string;
  details?: any;
  element?: ErElement;
  timestamp: number;
}

/**
 * Batch operation interface
 */
export interface ErBatchOperation {
  type: 'create' | 'update' | 'delete';
  element: ErElement;
  properties?: Record<string, any>;
  options?: PropertyUpdateOptions;
}

/**
 * Service operation result interface
 */
export interface ErServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: ErServiceError;
  warnings?: string[];
}