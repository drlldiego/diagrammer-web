/**
 * Core types for ER diagram elements with enhanced type safety
 * Centralized type definitions for both imperative and declarative modes
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * Core ER business object that extends BPMN business object
 * Contains all ER-specific properties with proper typing
 */
export interface ErBusinessObject {
  id: string;
  name: string;
  erType: 'Entity' | 'Attribute' | 'Relationship' | 'CompositeAttribute';
  
  // Entity specific properties
  isWeak?: boolean;
  
  // Attribute specific properties
  isPrimaryKey?: boolean;
  isRequired?: boolean;
  isMultivalued?: boolean;
  isDerived?: boolean;
  isComposite?: boolean;
  isSubAttribute?: boolean;
  dataType?: string;
  
  // Relationship specific properties
  isIdentifying?: boolean;
  
  // Connection specific properties
  cardinalitySource?: string;
  cardinalityTarget?: string;
  
  // Declarative mode properties
  isDeclarative?: boolean;
  mermaidCardinality?: string;
  
  // Common properties
  description?: string;
  nullable?: boolean;
  type?: string;
}

/**
 * Base ER element interface extending BPMN element structure
 */
export interface ErElement {
  id: string;
  type: string;
  businessObject: ErBusinessObject;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  
  // Connection specific properties
  source?: ErElement;
  target?: ErElement;
  waypoints?: Point[];
  
  // Additional element properties
  incoming?: ErElement[];
  outgoing?: ErElement[];
  parent?: ErElement;
  children?: ErElement[];
}

/**
 * Specialized interfaces for different element types
 */
export interface ErEntity extends ErElement {
  businessObject: ErBusinessObject & {
    erType: 'Entity';
    isWeak?: boolean;
  };
}

export interface ErAttribute extends ErElement {
  businessObject: ErBusinessObject & {
    erType: 'Attribute';
    isPrimaryKey?: boolean;
    isRequired?: boolean;
    isMultivalued?: boolean;
    isDerived?: boolean;
    isComposite?: boolean;
    isSubAttribute?: boolean;
    dataType?: string;
  };
}

export interface ErRelationship extends ErElement {
  businessObject: ErBusinessObject & {
    erType: 'Relationship';
    isIdentifying?: boolean;
  };
}

export interface ErConnection extends ErElement {
  source: ErElement;
  target: ErElement;
  waypoints: Point[];
  businessObject: ErBusinessObject & {
    cardinalitySource?: string;
    cardinalityTarget?: string;
  };
}

/**
 * Type guards for element identification
 */
export const isErEntity = (element: ErElement): element is ErEntity => {
  return element.businessObject.erType === 'Entity';
};

export const isErAttribute = (element: ErElement): element is ErAttribute => {
  return element.businessObject.erType === 'Attribute';
};

export const isErRelationship = (element: ErElement): element is ErRelationship => {
  return element.businessObject.erType === 'Relationship';
};

export const isErConnection = (element: ErElement): element is ErConnection => {
  return element.waypoints != null && element.source != null && element.target != null;
};

/**
 * Union type for all ER elements
 */
export type ErElementType = ErEntity | ErAttribute | ErRelationship | ErConnection;

/**
 * Diagram modes and notations
 */
export type DiagramMode = 'declarative' | 'imperative';
export type DiagramNotation = 'chen' | 'crowsfoot';

/**
 * Property update event interface
 */
export interface ErPropertyUpdateEvent {
  element: ErElement;
  property: string;
  oldValue: any;
  newValue: any;
  timestamp: number;
}

/**
 * Element dimensions interface
 */
export interface ErElementDimensions {
  width: number;
  height: number;
}

/**
 * Cardinality options interface
 */
export interface CardinalityOptions {
  source: string[];
  target: string[];
}