// Parser para sintaxe declarativa de fluxogramas
// Suporta indentação, condições aninhadas e referências automáticas

import { FlowDiagram, FlowElement, FlowConnection, DeclarativeSyntaxParser } from './types';
import { HierarchicalPositioning } from './hierarchical-positioning';

// Tipos específicos para o parser hierárquico
export interface HierarchicalElement {
  type: 'Inicio' | 'Entrada' | 'Processo' | 'Decisao' | 'Saida' | 'Fim';
  name?: string;
  level: number; // Nível de indentação
  conditions?: HierarchicalCondition[];
  lineNumber: number; // Para debugging
}

export interface HierarchicalCondition {
  label: string; // "Sim", "Não", etc.
  elements: HierarchicalElement[];
  level: number;
}

interface ParsedLine {
  original: string;
  type: string;
  name?: string;
  level: number;
  isCondition: boolean;
  conditionLabel?: string;
  lineNumber: number;
}

export class FlowParser implements DeclarativeSyntaxParser {
  private positioning: HierarchicalPositioning;
  private elementCounter: number = 1;
  private connectionCounter: number = 1;
  private elementRegistry: Map<string, FlowElement> = new Map();

  constructor() {
    this.positioning = new HierarchicalPositioning();
  }

  parse(input: string): FlowDiagram {
    try {
      console.log('🔍 [FlowParser] Iniciando parse do input:', input);
      
      // Reset counters and registry
      this.elementCounter = 1;
      this.connectionCounter = 1;
      this.elementRegistry.clear();

      // 1. Parse lines into structured format
      const parsedLines = this.parseLines(input);
      console.log('📝 [FlowParser] Linhas parsed:', parsedLines);
      
      // 2. Build hierarchical structure
      const hierarchicalElements = this.buildHierarchy(parsedLines);
      console.log('🏗️ [FlowParser] Estrutura hierárquica:', hierarchicalElements);
      
      // 3. Convert to FlowDiagram format
      const { elements, connections } = this.resolveElements(hierarchicalElements);
      console.log('⚡ [FlowParser] Elementos resolvidos:', elements);
      console.log('🔗 [FlowParser] Conexões resolvidas:', connections);
      
      const diagram: FlowDiagram = {
        name: 'Fluxograma Hierárquico',
        elements,
        connections
      };

      // 4. Apply automatic positioning
      const positionedDiagram = this.positioning.calculatePositions(diagram);
      console.log('📍 [FlowParser] Diagrama final com posições:', positionedDiagram);
      
      return positionedDiagram;
      
    } catch (error) {
      console.error('❌ [FlowParser] Erro no parse:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Erro na sintaxe hierárquica: ${errorMessage}`);
    }
  }

  serialize(diagram: FlowDiagram): string {
    // Convert FlowDiagram back to hierarchical syntax
    return this.diagramToHierarchicalSyntax(diagram);
  }

  getVersion(): string {
    return "3.0-hierarchical";
  }

  // ===================================================================
  // PARSING METHODS
  // ===================================================================

  private parseLines(input: string): ParsedLine[] {
    const lines = input.split('\n').map(line => line.replace(/\r$/, ''));
    const parsedLines: ParsedLine[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) continue;
      
      // Calculate indentation level
      const level = this.calculateIndentationLevel(line);
      
      // Parse the line content
      const parsed = this.parseLine(trimmedLine, level, i + 1);
      if (parsed) {
        parsedLines.push(parsed);
      }
    }

    return parsedLines;
  }

  private calculateIndentationLevel(line: string): number {
    const match = line.match(/^(\s*)/);
    const spaces = match ? match[1].length : 0;
    return spaces; // Each level = 1 space
  }

  private parseLine(line: string, level: number, lineNumber: number): ParsedLine | null {
    // Check if it's a condition line
    const conditionMatch = line.match(/^Condicao:\s*"([^"]+)"$/);
    if (conditionMatch) {
      return {
        original: line,
        type: 'Condition',
        level,
        isCondition: true,
        conditionLabel: conditionMatch[1],
        lineNumber
      };
    }

    // Check if it's an element line
    const elementPatterns = [
      /^(Inicio)$/,
      /^(Fim)$/,
      /^(Entrada|Processo|Decisao|Saida):\s*"([^"]+)"$/,
    ];

    for (const pattern of elementPatterns) {
      const match = line.match(pattern);
      if (match) {
        return {
          original: line,
          type: match[1],
          name: match[2] || undefined,
          level,
          isCondition: false,
          lineNumber
        };
      }
    }

    throw new Error(`Linha ${lineNumber}: Sintaxe inválida - "${line}"`);
  }

  // ===================================================================
  // HIERARCHY BUILDING
  // ===================================================================

  private buildHierarchy(parsedLines: ParsedLine[]): HierarchicalElement[] {
    const result: HierarchicalElement[] = [];
    let i = 0;

    while (i < parsedLines.length) {
      const element = this.buildElement(parsedLines, i);
      result.push(element.element);
      i = element.nextIndex;
    }

    return result;
  }

  private buildElement(parsedLines: ParsedLine[], startIndex: number): { element: HierarchicalElement, nextIndex: number } {
    const line = parsedLines[startIndex];
    
    if (line.isCondition) {
      throw new Error(`Linha ${line.lineNumber}: Condição fora de contexto de decisão`);
    }

    const element: HierarchicalElement = {
      type: line.type as any,
      name: line.name,
      level: line.level,
      lineNumber: line.lineNumber,
      conditions: []
    };

    let nextIndex = startIndex + 1;

    // If this is a decision, look for conditions
    if (line.type === 'Decisao') {
      while (nextIndex < parsedLines.length) {
        const nextLine = parsedLines[nextIndex];
        
        // Stop if we encounter an element at the same or lower level than the decision
        if (nextLine.level <= line.level) {
          break;
        }

        if (nextLine.isCondition && nextLine.level === line.level + 1) {
          // Parse condition and its nested elements
          const condition = this.buildCondition(parsedLines, nextIndex);
          element.conditions!.push(condition.condition);
          nextIndex = condition.nextIndex;
        } else {
          // Skip non-condition lines that are processed as part of conditions
          nextIndex++;
        }
      }
    }

    return { element, nextIndex };
  }

  private buildCondition(parsedLines: ParsedLine[], startIndex: number): { condition: HierarchicalCondition, nextIndex: number } {
    const conditionLine = parsedLines[startIndex];
    
    if (!conditionLine.isCondition) {
      throw new Error(`Linha ${conditionLine.lineNumber}: Esperada condição`);
    }

    const condition: HierarchicalCondition = {
      label: conditionLine.conditionLabel!,
      level: conditionLine.level,
      elements: []
    };

    let nextIndex = startIndex + 1;

    // Parse nested elements
    while (nextIndex < parsedLines.length) {
      const nextLine = parsedLines[nextIndex];
      
      // Stop if we encounter a line at the same or lower level than the condition
      if (nextLine.level <= conditionLine.level) {
        break;
      }

      // Only process direct children (one level deeper)
      if (nextLine.level === conditionLine.level + 1 && !nextLine.isCondition) {
        const element = this.buildElement(parsedLines, nextIndex);
        condition.elements.push(element.element);
        nextIndex = element.nextIndex;
      } else {
        nextIndex++;
      }
    }

    return { condition, nextIndex };
  }

  // ===================================================================
  // ELEMENT RESOLUTION
  // ===================================================================

  private resolveElements(hierarchicalElements: HierarchicalElement[]): { elements: FlowElement[], connections: FlowConnection[] } {
    const elements: FlowElement[] = [];
    const connections: FlowConnection[] = [];

    this.processElementsSequentially(hierarchicalElements, elements, connections);

    return { elements, connections };
  }

  private processElementsSequentially(
    hierarchicalElements: HierarchicalElement[], 
    elements: FlowElement[], 
    connections: FlowConnection[],
    previousElement?: FlowElement
  ): FlowElement | undefined {
    let lastElement = previousElement;

    for (const hierElement of hierarchicalElements) {
      const flowElement = this.createOrReferenceElement(hierElement);
      
      // Add to elements array only if it's a new element
      if (!elements.find(el => el.id === flowElement.id)) {
        elements.push(flowElement);
      }

      // Create connection from previous element
      if (lastElement) {
        const connection: FlowConnection = {
          id: `connection_${this.connectionCounter++}`,
          from: lastElement.id,
          to: flowElement.id
        };
        connections.push(connection);
      }

      // Handle decision conditions
      if (hierElement.type === 'Decisao' && hierElement.conditions && hierElement.conditions.length > 0) {
        for (const condition of hierElement.conditions) {
          if (condition.elements.length > 0) {
            const firstConditionElement = condition.elements[0];
            const conditionFlowElement = this.createOrReferenceElement(firstConditionElement);
            
            // Add to elements array only if it's a new element
            if (!elements.find(el => el.id === conditionFlowElement.id)) {
              elements.push(conditionFlowElement);
            }
            
            // Connection from decision to first element of condition WITH LABEL
            const conditionConnection: FlowConnection = {
              id: `connection_${this.connectionCounter++}`,
              from: flowElement.id,
              to: conditionFlowElement.id,
              label: condition.label
            };
            connections.push(conditionConnection);

            // Process remaining elements in condition (skip first element as it's already connected)
            if (condition.elements.length > 1) {
              this.processElementsSequentially(
                condition.elements.slice(1), // Skip first element
                elements, 
                connections, 
                conditionFlowElement // Start from first element of condition
              );
            }
          }
        }
        // Decision doesn't continue sequentially, so don't update lastElement
        lastElement = undefined;
      } else {
        lastElement = flowElement;
      }
    }

    return lastElement;
  }

  private createOrReferenceElement(hierElement: HierarchicalElement): FlowElement {
    const elementKey = this.getElementKey(hierElement);
    
    // Check if element already exists
    const existingElement = this.elementRegistry.get(elementKey);
    if (existingElement) {
      return existingElement; // Return reference to existing element
    }

    // Create new element
    const flowElement: FlowElement = {
      id: `element_${this.elementCounter++}`,
      type: this.mapHierarchicalTypeToFlowType(hierElement.type),
      name: hierElement.name || this.getDefaultName(hierElement.type)
    };

    // Register the element
    this.elementRegistry.set(elementKey, flowElement);
    
    return flowElement;
  }

  private getElementKey(hierElement: HierarchicalElement): string {
    // Use type + name as unique key for element deduplication
    const name = hierElement.name || this.getDefaultName(hierElement.type);
    return `${hierElement.type}:${name}`;
  }

  private mapHierarchicalTypeToFlowType(type: string): 'start' | 'end' | 'process' | 'decision' | 'inputoutput' {
    switch (type) {
      case 'Inicio':
        return 'start';
      case 'Fim':
        return 'end';
      case 'Processo':
        return 'process';
      case 'Decisao':
        return 'decision';
      case 'Entrada':
      case 'Saida':
        return 'inputoutput';
      default:
        throw new Error(`Tipo hierárquico não suportado: ${type}`);
    }
  }

  private getDefaultName(type: string): string {
    switch (type) {
      case 'Inicio':
        return 'Início';
      case 'Fim':
        return 'Fim';
      case 'Processo':
        return 'Processo';
      case 'Decisao':
        return 'Decisão';
      case 'Entrada':
        return 'Entrada';
      case 'Saida':
        return 'Saída';
      default:
        return type;
    }
  }

  // ===================================================================
  // SERIALIZATION
  // ===================================================================

  private diagramToHierarchicalSyntax(diagram: FlowDiagram): string {
    // This is a simplified serialization - a full implementation would
    // need to reconstruct the hierarchical structure from the flat elements
    const lines: string[] = [];
    
    lines.push('// Diagrama gerado automaticamente');
    lines.push('// Use a sintaxe hierárquica para editar:');
    lines.push('');
    
    for (const element of diagram.elements) {
      const hierType = this.mapFlowTypeToHierarchicalType(element.type);
      if (element.name === this.getDefaultName(hierType)) {
        lines.push(hierType);
      } else {
        lines.push(`${hierType}: "${element.name}"`);
      }
    }

    return lines.join('\n');
  }

  private mapFlowTypeToHierarchicalType(type: string): string {
    switch (type) {
      case 'start':
        return 'Inicio';
      case 'end':
        return 'Fim';
      case 'process':
        return 'Processo';
      case 'decision':
        return 'Decisao';
      case 'inputoutput':
        return 'Entrada'; // Default to Entrada for inputoutput
      default:
        return 'Processo';
    }
  }
}