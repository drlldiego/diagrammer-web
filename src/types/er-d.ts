// Tipos TypeScript para elementos ER
export interface ErEntity {
  id: string;
  name: string;
  type: 'er:Entity';
  isWeak?: boolean;
  attributes?: ErAttribute[];
  description?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface ErRelationship {
  id: string;
  name: string;
  type: 'er:Relationship';
  cardinalitySource?: '1' | 'N' | 'M' | '0..1' | '0..N' | '1..N';
  cardinalityTarget?: '1' | 'N' | 'M' | '0..1' | '0..N' | '1..N';
  isIdentifying?: boolean;
  attributes?: ErAttribute[];
  description?: string;
  connectedEntities?: ErEntity[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface ErAttribute {
  id: string;
  name: string;
  type: 'er:Attribute';
  dataType?: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  isRequired?: boolean;
  isMultivalued?: boolean;
  isDerived?: boolean;
  size?: string;
  defaultValue?: string;
  description?: string;
  connectedTo?: ErEntity | ErRelationship;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface ErConnection {
  id: string;
  type: 'er:Connection';
  source: ErEntity | ErRelationship | ErAttribute;
  target: ErEntity | ErRelationship | ErAttribute;
  waypoints?: Array<{ x: number; y: number }>;
}

export type ErElement = ErEntity | ErRelationship | ErAttribute;

export interface ErDiagram {
  xml: string;
  customElements: ErElement[];
  connections: ErConnection[];
  metadata: {
    type: 'ER';
    version: string;
    created: string;
    modified?: string;
  };
}

// Estender tipos do bpmn-js
declare module 'bpmn-js/lib/Modeler' {
  interface BpmnModeler {
    addCustomElements?: (elements: ErElement[]) => void;
    getCustomElements?: () => ErElement[];
  }
}

// Fazer este arquivo ser reconhecido como módulo
export {};