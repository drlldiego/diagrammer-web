/**
 * Tipos e interfaces para diagramas de fluxo com sintaxe declarativa.
 */
export type FlowElementType = 'start' | 'end' | 'process' | 'decision' | 'inputoutput';

/**
 * Elementos básicos do diagrama de fluxo.
 * @param id Identificador único do elemento
 * @param type Tipo do elemento (início, fim, processo, decisão, entrada/saída)
 * @param name Nome ou rótulo do elemento
 * @param position Posição 2D do elemento no diagrama (opcional)
 */
export interface FlowElement {
  id: string;
  type: FlowElementType;
  name: string;
  position?: Position;
}

/**
 * Posição 2D de um elemento no diagrama.
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Conexões entre elementos do diagrama de fluxo.
 * @param id Identificador único da conexão
 * @param from ID do elemento de origem
 * @param to ID do elemento de destino
 * @param label Rótulo opcional para a conexão (ex: condição em decisões)
 */
export interface FlowConnection {
  id: string;
  from: string;
  to: string;
  label?: string;
}

/**
 * Diagrama de fluxo completo.
 * @param name Nome do diagrama
 * @param elements Lista de elementos no diagrama
 * @param connections Lista de conexões entre os elementos
 */
export interface FlowDiagram {
  name: string;
  elements: FlowElement[];
  connections: FlowConnection[];
}

/**
 * Interface para parser de sintaxe declarativa de diagramas de fluxo.
 * Define métodos para analisar e serializar diagramas, além de obter a versão do parser.
 * @param parse Método para analisar uma string de entrada e retornar um diagrama de fluxo
 * @param serialize Método para converter um diagrama de fluxo em uma string
 * @param getVersion Método para obter a versão atual do parser
 */
export interface DeclarativeSyntaxParser {
  parse(input: string): FlowDiagram;
  serialize(diagram: FlowDiagram): string;
  getVersion(): string;
}