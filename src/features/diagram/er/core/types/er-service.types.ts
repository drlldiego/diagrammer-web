/**
 * Interfaces e tipos da camada de serviço para operações de diagrama ER
 */
import { ErElement, ErElementDimensions, DiagramNotation } from './er-element.types';

export interface PropertyUpdateOptions {
  skipValidation?: boolean;
  skipRerender?: boolean;
  skipEventDispatch?: boolean;
  batchUpdate?: boolean;
}

export interface ElementResizeOptions {
  maintainAspectRatio?: boolean;
  minimumDimensions?: ErElementDimensions;
  maximumDimensions?: ErElementDimensions;
  snapToGrid?: boolean;
}

/**
 * Interface de estratégia de notação para implementar diferentes notações ER
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
 * Tipos de eventos para operações de diagrama ER
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

export interface ErEventListener<T = any> {
  (event: ErEventType, data: T): void;
}

export interface ErServiceError {
  code: string;
  message: string;
  details?: any;
  element?: ErElement;
  timestamp: number;
}

export interface ErBatchOperation {
  type: 'create' | 'update' | 'delete';
  element: ErElement;
  properties?: Record<string, any>;
  options?: PropertyUpdateOptions;
}

/**
 * Interface de resultado de operação de serviço
 */
export interface ErServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: ErServiceError;
  warnings?: string[];
}