// Parser para sintaxe simplificada usando arrow flow
// Suporta sintaxe: start -> process:"Nome" -> decision:"Pergunta?" 

import { FlowElement, FlowConnection } from './types';

export interface SimplifiedFlowDefinition {
  name: string;
  flow: string;
  branches?: SimplifiedBranch[];
}

export interface SimplifiedBranch {
  from: string;  // Nome do elemento decision
  condition: string;  // "Sim", "Não", etc.
  flow: string;  // Continuação do fluxo
}

export class SimplifiedSyntaxParser {
  private elementCounter: number = 1;
  private connectionCounter: number = 1;
  private createdElements: Map<string, FlowElement> = new Map();

  parseSimplifiedFlow(definition: SimplifiedFlowDefinition): { elements: FlowElement[], connections: FlowConnection[] } {
    this.elementCounter = 1;
    this.connectionCounter = 1;
    this.createdElements.clear();

    // Parse do fluxo principal
    const { elements: mainElements, connections: mainConnections } = this.parseFlowString(definition.flow);
    
    // Parse dos branches (se houver)
    let branchElements: FlowElement[] = [];
    let branchConnections: FlowConnection[] = [];
    
    if (definition.branches) {
      for (const branch of definition.branches) {
        const decisionElement = this.findElementByName(branch.from);
        if (!decisionElement) {
          throw new Error(`Elemento de decisão "${branch.from}" não encontrado para branch`);
        }
        
        const { elements: branchEls, connections: branchConns } = this.parseFlowString(branch.flow);
        branchElements = branchElements.concat(branchEls);
        
        // Conectar decision ao primeiro elemento do branch
        if (branchEls.length > 0) {
          const connectionToBranch: FlowConnection = {
            id: `connection_${this.connectionCounter++}`,
            from: decisionElement.id,
            to: branchEls[0].id,
            label: branch.condition
          };
          branchConnections.push(connectionToBranch);
        }
        
        branchConnections = branchConnections.concat(branchConns);
      }
    }

    return {
      elements: [...mainElements, ...branchElements],
      connections: [...mainConnections, ...branchConnections]
    };
  }

  private parseFlowString(flowString: string): { elements: FlowElement[], connections: FlowConnection[] } {
    const elements: FlowElement[] = [];
    const connections: FlowConnection[] = [];
    
    // Split por -> e limpar espacos
    const parts = flowString.split('->').map(part => part.trim());
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const element = this.parseElementPart(part);
      
      // Verificar se já existe um elemento com esse nome (para evitar duplicatas)
      const existingElement = this.findElementByName(element.name);
      if (existingElement) {
        elements.push(existingElement);
      } else {
        elements.push(element);
        this.createdElements.set(element.name, element);
      }
      
      // Criar conexão com o próximo elemento
      if (i > 0) {
        const connection: FlowConnection = {
          id: `connection_${this.connectionCounter++}`,
          from: elements[i - 1].id,
          to: elements[i].id
        };
        connections.push(connection);
      }
    }
    
    return { elements, connections };
  }

  private parseElementPart(part: string): FlowElement {
    // Formatos suportados:
    // start
    // process:"Nome do Processo"
    // decision:"Pergunta?"
    // end:"Resultado"
    
    if (part.includes(':')) {
      const [type, nameWithQuotes] = part.split(':');
      const name = nameWithQuotes.replace(/['"]/g, ''); // Remove aspas
      return this.createElement(type.trim(), name.trim());
    } else {
      // Elementos simples sem nome específico
      return this.createElement(part.trim(), this.getDefaultName(part.trim()));
    }
  }

  private createElement(type: string, name: string): FlowElement {
    // Verificar se já existe
    const existing = this.findElementByName(name);
    if (existing) {
      return existing;
    }

    const element: FlowElement = {
      id: `element_${this.elementCounter++}`,
      type: type as 'start' | 'end' | 'process' | 'decision',
      name: name
    };

    this.createdElements.set(name, element);
    return element;
  }

  private findElementByName(name: string): FlowElement | undefined {
    return this.createdElements.get(name);
  }

  private getDefaultName(type: string): string {
    switch (type) {
      case 'start': return 'Início';
      case 'end': return 'Fim';
      case 'process': return 'Processo';
      case 'decision': return 'Decisão';
      default: return type;
    }
  }

  // Serializar de volta para sintaxe simplificada
  serializeToSimplified(elements: FlowElement[], connections: FlowConnection[]): SimplifiedFlowDefinition {
    // Encontrar elemento inicial
    const startElement = elements.find(el => el.type === 'start');
    if (!startElement) {
      throw new Error('Nenhum elemento start encontrado para serialização');
    }

    // Construir fluxo principal seguindo conexões
    const { flowString, visitedElements, branches } = this.buildFlowString(startElement, elements, connections);
    
    return {
      name: 'Fluxo Gerado',
      flow: flowString,
      branches: branches.length > 0 ? branches : undefined
    };
  }

  private buildFlowString(
    startElement: FlowElement, 
    elements: FlowElement[], 
    connections: FlowConnection[],
    visited: Set<string> = new Set()
  ): { flowString: string, visitedElements: Set<string>, branches: SimplifiedBranch[] } {
    
    const flowParts: string[] = [];
    const branches: SimplifiedBranch[] = [];
    let currentElement = startElement;
    
    visited.add(currentElement.id);

    while (currentElement) {
      // Adicionar elemento atual ao fluxo
      flowParts.push(this.elementToString(currentElement));
      
      // Encontrar próximas conexões
      const nextConnections = connections.filter(conn => conn.from === currentElement.id);
      
      if (nextConnections.length === 0) {
        // Fim do fluxo
        break;
      } else if (nextConnections.length === 1) {
        // Fluxo linear
        const nextElementId = nextConnections[0].to;
        const nextElement = elements.find(el => el.id === nextElementId);
        
        if (!nextElement || visited.has(nextElement.id)) {
          break;
        }
        
        visited.add(nextElement.id);
        currentElement = nextElement;
      } else {
        // Múltiplas saídas (decision) - criar branches
        for (const connection of nextConnections) {
          const nextElement = elements.find(el => el.id === connection.to);
          if (nextElement && !visited.has(nextElement.id)) {
            const branchFlow = this.buildFlowString(nextElement, elements, connections, new Set(visited));
            branches.push({
              from: currentElement.name,
              condition: connection.label || 'Padrão',
              flow: branchFlow.flowString
            });
            // Adicionar elementos visitados do branch
            branchFlow.visitedElements.forEach(id => visited.add(id));
          }
        }
        break; // Parar o fluxo principal
      }
    }

    return {
      flowString: flowParts.join(' -> '),
      visitedElements: visited,
      branches
    };
  }

  private elementToString(element: FlowElement): string {
    if (element.name === this.getDefaultName(element.type)) {
      return element.type;
    } else {
      return `${element.type}:"${element.name}"`;
    }
  }
}