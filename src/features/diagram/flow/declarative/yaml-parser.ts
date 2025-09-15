// Parser para sintaxe declarativa de fluxogramas
// Inicialmente usando JSON (facilita desenvolvimento sem dependências externas)
// TODO: Adicionar suporte a YAML real posteriormente

import { FlowDiagram, FlowElement, FlowConnection, DeclarativeSyntaxParser } from './types';
import { GraphPositioning } from './graph-positioning';

// Interface para sintaxe externa (o que o usuário escreve)
interface ExternalSyntax {
  flowchart: {
    name: string;
    elements: ExternalElement[];
    connections: ExternalConnection[];
  };
}

interface ExternalElement {
  type: 'start' | 'end' | 'process' | 'decision';
  name: string;
}

interface ExternalConnection {
  from: number;  // Índice do elemento de origem
  to: number;    // Índice do elemento de destino
  label?: string; // Texto da conexão (ex: "Sim", "Não")
}

export class FlowchartDeclarativeParser implements DeclarativeSyntaxParser {
  private positioning: GraphPositioning;
  private elementCounter: number = 1;
  private connectionCounter: number = 1;

  constructor() {
    this.positioning = new GraphPositioning();
  }

  parse(input: string): FlowDiagram {
    try {
      // Por enquanto usando JSON - depois adaptamos para YAML
      const external: ExternalSyntax = JSON.parse(input);
      
      // Validação básica
      this.validateSyntax(external);
      
      // Converter elementos externos para modelo interno
      const elements = this.convertElements(external.flowchart.elements);
      const connections = this.convertConnections(external.flowchart.connections, elements);
      
      const diagram: FlowDiagram = {
        name: external.flowchart.name,
        elements,
        connections
      };

      // Aplicar posicionamento automático
      return this.positioning.calculatePositions(diagram);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Erro ao analisar sintaxe declarativa: ${errorMessage}`);
    }
  }

  serialize(diagram: FlowDiagram): string {
    // Converter modelo interno de volta para sintaxe externa
    const external: ExternalSyntax = {
      flowchart: {
        name: diagram.name,
        elements: diagram.elements.map(el => ({
          type: el.type,
          name: el.name
        })),
        connections: diagram.connections.map(conn => {
          const fromIndex = diagram.elements.findIndex(el => el.id === conn.from);
          const toIndex = diagram.elements.findIndex(el => el.id === conn.to);
          
          const connection: ExternalConnection = {
            from: fromIndex,
            to: toIndex
          };
          
          if (conn.label) {
            connection.label = conn.label;
          }
          
          return connection;
        })
      }
    };

    return JSON.stringify(external, null, 2);
  }

  getVersion(): string {
    return "1.0-json";
  }

  private validateSyntax(external: ExternalSyntax): void {
    if (!external.flowchart) {
      throw new Error('Propriedade "flowchart" é obrigatória');
    }
    
    if (!external.flowchart.name || typeof external.flowchart.name !== 'string') {
      throw new Error('Propriedade "flowchart.name" é obrigatória e deve ser string');
    }
    
    if (!Array.isArray(external.flowchart.elements) || external.flowchart.elements.length === 0) {
      throw new Error('Propriedade "flowchart.elements" deve ser array com pelo menos um elemento');
    }
    
    if (!Array.isArray(external.flowchart.connections)) {
      throw new Error('Propriedade "flowchart.connections" deve ser array');
    }

    // Verificar se há pelo menos um elemento "start"
    const hasStart = external.flowchart.elements.some(el => el.type === 'start');
    if (!hasStart) {
      throw new Error('Fluxograma deve ter pelo menos um elemento do tipo "start"');
    }

    // Validar conexões
    external.flowchart.connections.forEach((conn, index) => {
      if (typeof conn.from !== 'number' || typeof conn.to !== 'number') {
        throw new Error(`Conexão ${index}: "from" e "to" devem ser números (índices)`);
      }
      
      if (conn.from < 0 || conn.from >= external.flowchart.elements.length) {
        throw new Error(`Conexão ${index}: "from" (${conn.from}) está fora do range de elementos`);
      }
      
      if (conn.to < 0 || conn.to >= external.flowchart.elements.length) {
        throw new Error(`Conexão ${index}: "to" (${conn.to}) está fora do range de elementos`);
      }
    });
  }

  private convertElements(externalElements: ExternalElement[]): FlowElement[] {
    this.elementCounter = 1; // Reset counter
    
    return externalElements.map(extEl => ({
      id: `element_${this.elementCounter++}`,
      type: extEl.type,
      name: extEl.name,
      // position será calculada pelo AutoPositioning
    }));
  }

  private convertConnections(externalConnections: ExternalConnection[], elements: FlowElement[]): FlowConnection[] {
    this.connectionCounter = 1; // Reset counter
    
    return externalConnections.map(extConn => ({
      id: `connection_${this.connectionCounter++}`,
      from: elements[extConn.from].id,
      to: elements[extConn.to].id,
      label: extConn.label
    }));
  }
}