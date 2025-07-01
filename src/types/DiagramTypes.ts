export type DiagramType = 'bpmn' | 'er' | 'uml';

export interface DiagramConfig {
  type: DiagramType;
  name: string;
  modules: string[];
  initialXML: string;
}

export interface ERElement {
  id: string;
  type: 'er:Entity' | 'er:WeakEntity' | 'er:Relationship' | 'er:IdentifyingRelationship' | 'er:Attribute' | 'er:KeyAttribute';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  businessObject?: any;
}