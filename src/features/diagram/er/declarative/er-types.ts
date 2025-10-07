// Tipos específicos para o ER declarativo baseado na sintaxe Mermaid

export interface ErAttribute {
  name: string;
  type?: string;
  primaryKey?: boolean;  
  required?: boolean;
  multivalued?: boolean;
  derived?: boolean;
  composite?: boolean;
}

export interface ErEntity {
  name: string;
  attributes?: ErAttribute[];
  isWeak?: boolean;
  x?: number;
  y?: number;
}

export interface ErRelationship {
  from: string;
  to: string;
  cardinality: string;
  label?: string;
  isIdentifying?: boolean;
}

export interface ErDiagram {
  title?: string;
  entities: ErEntity[];
  relationships: ErRelationship[];
}

// Sintaxe externa compatível com Mermaid
export interface MermaidErSyntax {
  title?: string;
  erDiagram: string | {
    entities?: Record<string, { attributes?: Record<string, any> }>;
    relationships?: string[];
  };
}

// Cardinalidades suportadas no Crow's Foot (formato Mermaid)
export const CROWSFOOT_CARDINALITIES = {
  // Um (exactly one)
  '||--||': { from: 'one', to: 'one', line: 'solid' },
  '||--o|': { from: 'one', to: 'zero-or-one', line: 'solid' },
  '||--|{': { from: 'one', to: 'one-or-many', line: 'solid' },
  '||--o{': { from: 'one', to: 'zero-or-many', line: 'solid' },
  
  // Zero ou Um (zero-or-one)
  '|o--||': { from: 'zero-or-one', to: 'one', line: 'solid' },
  '|o--o|': { from: 'zero-or-one', to: 'zero-or-one', line: 'solid' },
  '|o--|{': { from: 'zero-or-one', to: 'one-or-many', line: 'solid' },
  '|o--o{': { from: 'zero-or-one', to: 'zero-or-many', line: 'solid' },
  
  // Um ou Muitos (one-or-many)
  '}|--||': { from: 'one-or-many', to: 'one', line: 'solid' },
  '}|--o|': { from: 'one-or-many', to: 'zero-or-one', line: 'solid' },
  '}|--|{': { from: 'one-or-many', to: 'one-or-many', line: 'solid' },
  '}|--o{': { from: 'one-or-many', to: 'zero-or-many', line: 'solid' },
  
  // Zero ou Muitos (zero-or-many)
  '}o--||': { from: 'zero-or-many', to: 'one', line: 'solid' },
  '}o--o|': { from: 'zero-or-many', to: 'zero-or-one', line: 'solid' },
  '}o--|{': { from: 'zero-or-many', to: 'one-or-many', line: 'solid' },
  '}o--o{': { from: 'zero-or-many', to: 'zero-or-many', line: 'solid' }
} as const;

export type CardinalitySymbol = keyof typeof CROWSFOOT_CARDINALITIES;

// Interface para o parser
export interface ErDeclarativeParser {
  parse(input: string): Promise<ErDiagram>;
  serialize(diagram: ErDiagram): string;
  getVersion(): string;
}

// Interface para informações de erro com localização
export interface ErrorLocation {
  line: number;
  column?: number;
  length?: number;
  message: string;
}

// Posicionamento automático
export interface ErLayoutConfig {
  entityWidth: number;
  entityHeight: number;
  horizontalSpacing: number;
  verticalSpacing: number;
  startX: number;
  startY: number;
}