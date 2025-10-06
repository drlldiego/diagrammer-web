// Tipos para interface declarativa do FlowChart
// Modelo interno independente da sintaxe externa

export type FlowElementType = 'start' | 'end' | 'process' | 'decision' | 'inputoutput';

export interface FlowElement {
  id: string;           // Gerado automaticamente 
  type: FlowElementType;
  name: string;
  position?: Position;  // Será calculada automaticamente
}

export interface Position {
  x: number;
  y: number;
}

export interface FlowConnection {
  id: string;           // Gerado automaticamente
  from: string;         // ID do elemento origem
  to: string;           // ID do elemento destino  
  label?: string;       // Texto da conexão (ex: "Sim", "Não")
}

export interface FlowDiagram {
  name: string;
  elements: FlowElement[];
  connections: FlowConnection[];
}

// Interface para diferentes parsers de sintaxe
export interface DeclarativeSyntaxParser {
  parse(input: string): FlowDiagram;
  serialize(diagram: FlowDiagram): string;
  getVersion(): string;
}