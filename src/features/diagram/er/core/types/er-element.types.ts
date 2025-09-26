/**
 * Tipos centrais para elementos de diagrama ER
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * Objeto de negócio central ER com todas as propriedades específicas
 */
export interface ErBusinessObject {
  id: string;
  name: string;
  erType: 'Entity' | 'Attribute' | 'Relationship' | 'CompositeAttribute';
  
  // Propriedades de entidade
  isWeak?: boolean;
  
  // Propriedades de atributo
  isPrimaryKey?: boolean;
  isRequired?: boolean;
  isMultivalued?: boolean;
  isDerived?: boolean;
  isComposite?: boolean;
  isSubAttribute?: boolean;
  dataType?: string;
  
  // Propriedades de relacionamento
  isIdentifying?: boolean;
  
  // Propriedades de conexão
  cardinalitySource?: string;
  cardinalityTarget?: string;
  
  // Propriedades do modo declarativo
  isDeclarative?: boolean;
  mermaidCardinality?: string;
  
  // Propriedades comuns
  description?: string;
  nullable?: boolean;
  type?: string;
}

/**
 * Interface base de elemento ER
 */
export interface ErElement {
  id: string;
  type: string;
  businessObject: ErBusinessObject;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  
  // Propriedades de conexão
  source?: ErElement;
  target?: ErElement;
  waypoints?: Point[];
  
  // Propriedades adicionais
  incoming?: ErElement[];
  outgoing?: ErElement[];
  parent?: ErElement;
  children?: ErElement[];
}

/**
 * Interfaces especializadas para diferentes tipos de elementos
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
 * Guards de tipo para identificação de elementos
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

export type ErElementType = ErEntity | ErAttribute | ErRelationship | ErConnection;

export type DiagramMode = 'declarative' | 'imperative';
export type DiagramNotation = 'chen' | 'crowsfoot';

export interface ErPropertyUpdateEvent {
  element: ErElement;
  property: string;
  oldValue: any;
  newValue: any;
  timestamp: number;
}

export interface ErElementDimensions {
  width: number;
  height: number;
}

export interface CardinalityOptions {
  source: string[];
  target: string[];
}