/**
 * Tipos centralizados para o sistema ER
 * Este arquivo consolida todas as interfaces que estavam duplicadas nos providers
 */

export interface ErBusinessObject {
  id: string;
  name?: string;
  erType?: string;
  isWeak?: boolean;
  isPrimaryKey?: boolean;  
  isRequired?: boolean;
  isMultivalued?: boolean;
  isDerived?: boolean;
  isComposite?: boolean;
  isIdentifying?: boolean;
  isParentChild?: boolean;
  cardinalitySource?: string;
  cardinalityTarget?: string;
  dataType?: string;
  type?: string;
  nullable?: boolean;
  cardinality?: string;
  documentation?: Array<{ $type: string; text: string }>;
  $attrs?: { [key: string]: any };
}

export interface ErElement {
  id: string;
  type: string;
  width: number;
  height: number;
  businessObject: ErBusinessObject;
  x?: number;
  y?: number;
  parent?: ErElement;
  source?: ErElement;
  target?: ErElement;
  waypoints?: { x: number; y: number }[];
  di?: any; // Diagram Interchange
}

export interface ErEventBus {
  on: (event: string, callback: Function) => void;
  off: (event: string, callback: Function) => void;
  fire: (event: string, data?: any) => void;
}

export interface ErTranslate {
  (text: string): string;
}

export interface ErModeling {
  updateLabel: (element: ErElement, newLabel: string) => void;
  updateModdleProperties: (element: ErElement, moddleElement: any, properties: any) => void;
  removeElements: (elements: ErElement[]) => void;
  moveElements: (elements: ErElement[], delta: { x: number; y: number }, target?: any, hints?: any) => void;
  updateProperties: (element: ErElement, properties: any) => void;
  createShape: (shape: ErElement, position: { x: number; y: number }, target: ErElement) => ErElement;
  createConnection: (source: ErElement, target: ErElement, attrs: any, target2: ErElement) => any;
  connect: (source: ErElement, target: ErElement, options: any) => any;
}

export interface ErElementRegistry {
  getGraphics: (element: ErElement) => SVGElement | null;
  getAll: () => ErElement[];
  get: (id: string) => ErElement | null;
}

export interface ErCreate {
  start: (event: Event, shape: any, context?: { source: ErElement }) => void;
}

export interface ErElementFactory {
  createShape: (options: ErShapeOptions) => ErElement;
}

export interface ErShapeOptions {
  type: string;
  name: string;
  erType: string;
  width: number;
  height: number;
  isPrimaryKey?: boolean;
  isRequired?: boolean;
  isMultivalued?: boolean;
  isDerived?: boolean;
  isComposite?: boolean;
  isWeak?: boolean;
  isIdentifying?: boolean;
  isParentChild?: boolean;
  dataType?: string;
  cardinality?: string;
  cardinalitySource?: string;
  cardinalityTarget?: string;
  isExpanded?: boolean;
  isSubAttribute?: boolean;
}

export interface ErContextPadEntry {
  group: string;
  className: string;
  title: string;
  action: {
    click: any;
  };
}

export interface ErContextPadEntries {
  [key: string]: ErContextPadEntry;
}

export interface ErPropertyEntry {
  id: string;
  label: string;
  modelProperty: string;
  widget?: string;
  selectOptions?: Array<{ name: string; value: string }>;
  get: (element: ErElement) => any;
  set: (element: ErElement, values: any) => any;
}

export interface ErPropertyGroup {
  id: string;
  label: string;
  entries: ErPropertyEntry[];
}

export interface ErPaletteEntry {
  group?: string;
  className?: string;
  title?: string;
  separator?: boolean;
  action?: {
    click?: any;
    dragstart?: any;
  };
}

export interface ErCanvas {
  getContainer: () => HTMLElement;
  addMarker: (element: ErElement, marker: string) => void;
  removeMarker: (element: ErElement, marker: string) => void;
  getRootElement: () => ErElement;
}

export interface ErTextRenderer {
  createText: (text: string, options: any) => SVGElement;
  getTextBBox: (text: string, options: any) => { width: number; height: number };
}

export interface ErStyles {
  computeStyle: (element: ErElement, properties: any) => any;
}

export interface ErPathMap {
  getScaledPath: (path: string, scale: number) => string;
}

// Tipos para regras de movimento
export interface ErMoveEvent {
  element: ErElement;
  delta: { x: number; y: number };
}

// Tipos para configuração de notação
export interface ErNotationConfig {
  notation: 'chen' | 'crowsfoot';
  elements: {
    hasRelationshipElement: boolean;
    allowDirectEntityToEntityConnection: boolean;
    attributeCanConnectToRelationship: boolean;
  };
  relationshipConfig?: {
    type: string;
    className: string;
    title: string;
    defaultProperties: any;
  };
}