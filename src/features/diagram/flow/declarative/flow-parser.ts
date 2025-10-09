/**
 * Flow Parser - Versão Hierárquica
 * Implementa um parser para a sintaxe hierárquica de fluxogramas.
 * Permite definir elementos e condições aninhadas com indentação. 
 */
import { FlowDiagram, FlowElement, FlowConnection, DeclarativeSyntaxParser } from './types';
import { HierarchicalPositioning } from './hierarchical-positioning';
import { logger } from '../../../../utils/logger';

// Tipos específicos para o parser hierárquico
export interface HierarchicalElement {
  type: 'Inicio' | 'Entrada' | 'Processo' | 'Decisao' | 'Saida' | 'Fim';
  name?: string;
  level: number;
  conditions?: HierarchicalCondition[];
  lineNumber: number;
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

  /**
   * Faz o parse da sintaxe hierárquica e gera um diagrama de fluxo.
   * @param input String de entrada na sintaxe hierárquica
   * @returns Diagrama de fluxo gerado
   */
  parse(input: string): FlowDiagram {
    try {            
      // Reset de contadores e registros
      this.elementCounter = 1;
      this.connectionCounter = 1;
      this.elementRegistry.clear();

      // 1. Linhas do parse
      const parsedLines = this.parseLines(input);      
      
      // 2. Construção da hierarquia
      const hierarchicalElements = this.buildHierarchy(parsedLines);      
      
      // 3. Converter hierarquia em elementos e conexões
      const { elements, connections } = this.resolveElements(hierarchicalElements);      
      
      const diagram: FlowDiagram = {
        name: 'Fluxograma Hierárquico',
        elements,
        connections
      };

      // 4. Aplicar posicionamento automático
      const positionedDiagram = this.positioning.calculatePositions(diagram);      
      
      return positionedDiagram;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[FlowParser] Erro no parse:', errorMessage);
      throw new Error(`Erro na sintaxe hierárquica: ${errorMessage}`);
    }
  }

  serialize(diagram: FlowDiagram): string {
    // Converter o diagrama de volta para a sintaxe hierárquica
    return this.diagramToHierarchicalSyntax(diagram);
  }

  getVersion(): string {
    return "3.0-hierarchical";
  }

  // ===================================================================
  // MÉTODOS DE PARSING
  // ===================================================================

  private parseLines(input: string): ParsedLine[] {
    const lines = input.split('\n').map(line => line.replace(/\r$/, ''));
    const parsedLines: ParsedLine[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Pular linhas vazias
      if (!trimmedLine) continue;
      
      // Calcular nível de indentação
      const level = this.calculateIndentationLevel(line);
      
      // Parse do conteúdo da linha
      const parsed = this.parseLine(trimmedLine, level, i + 1);
      if (parsed) {
        parsedLines.push(parsed);
      }
    }

    return parsedLines;
  }

  /**
   * Calcular o nível de indentação baseado em espaços no início da linha.
   * @param line Linha de texto 
   * @returns Nível de indentação (0 = sem indentação) 
   */
  private calculateIndentationLevel(line: string): number {
    const match = line.match(/^(\s*)/);
    const spaces = match ? match[1].length : 0;
    return spaces; // Each level = 1 space
  }

  private parseLine(line: string, level: number, lineNumber: number): ParsedLine | null {
    // Verificar se é uma linha de condição
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

    // Verificar se é uma linha de elemento
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
  // CONSTRUÇÃO DE HIERARQUIA
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

  /**
   * Construção recursiva de um elemento e suas condições (se for decisão).
   * @param parsedLines Linhas analisadas
   * @param startIndex Índice da linha de início
   * @returns Elemento hierárquico construído e índice da próxima linha a ser processada
   */
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

    // Se for uma decisão, procurar condições
    if (line.type === 'Decisao') {
      while (nextIndex < parsedLines.length) {
        const nextLine = parsedLines[nextIndex];

        // Parar se encontrar um elemento no mesmo nível ou inferior à decisão
        if (nextLine.level <= line.level) {
          break;
        }

        if (nextLine.isCondition && nextLine.level === line.level + 1) {
          // Analisar condição e seus elementos aninhados
          const condition = this.buildCondition(parsedLines, nextIndex);
          element.conditions!.push(condition.condition);
          nextIndex = condition.nextIndex;
        } else {
          // Ignorar linhas que não são condições e que são processadas como parte das condições
          nextIndex++;
        }
      }
    }

    return { element, nextIndex };
  }

  /**
   * Construção de uma condição e seus elementos aninhados.
   * @param parsedLines Linhas analisadas
   * @param startIndex Índice da linha de início
   * @returns Condição hierárquica construída e índice da próxima linha a ser processada
   */
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

    // Analisar elementos aninhados
    while (nextIndex < parsedLines.length) {
      const nextLine = parsedLines[nextIndex];

      // Parar se encontrar uma linha no mesmo nível ou inferior à condição
      if (nextLine.level <= conditionLine.level) {
        break;
      }

      // Processar apenas filhos diretos (um nível mais profundo)
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
  // RESOLUÇÃO DE ELEMENTOS
  // ===================================================================

  private resolveElements(hierarchicalElements: HierarchicalElement[]): { elements: FlowElement[], connections: FlowConnection[] } {
    const elements: FlowElement[] = [];
    const connections: FlowConnection[] = [];

    this.processElementsSequentially(hierarchicalElements, elements, connections);

    return { elements, connections };
  }

  /**
   * Processamento de elementos hierárquicos.
   * @param hierarchicalElements Elementos hierárquicos a serem processados
   * @param elements Elementos de fluxo resultantes
   * @param connections Conexões de fluxo resultantes
   * @param previousElement Elemento anterior para conexão
   * @returns Último elemento processado
   */
  private processElementsSequentially(
    hierarchicalElements: HierarchicalElement[], 
    elements: FlowElement[], 
    connections: FlowConnection[],
    previousElement?: FlowElement
  ): FlowElement | undefined {
    let lastElement = previousElement;

    for (const hierElement of hierarchicalElements) {
      const flowElement = this.createOrReferenceElement(hierElement);

      // Adicionar ao array de elementos apenas se for um novo elemento
      if (!elements.find(el => el.id === flowElement.id)) {
        elements.push(flowElement);
      }

      // Criar conexão do elemento anterior
      if (lastElement) {
        const connection: FlowConnection = {
          id: `connection_${this.connectionCounter++}`,
          from: lastElement.id,
          to: flowElement.id
        };
        connections.push(connection);
      }

      // Tratar condições de decisão
      if (hierElement.type === 'Decisao' && hierElement.conditions && hierElement.conditions.length > 0) {
        for (const condition of hierElement.conditions) {
          if (condition.elements.length > 0) {
            const firstConditionElement = condition.elements[0];
            const conditionFlowElement = this.createOrReferenceElement(firstConditionElement);

            // Adicionar ao array de elementos apenas se for um novo elemento
            if (!elements.find(el => el.id === conditionFlowElement.id)) {
              elements.push(conditionFlowElement);
            }

            // Conexão do elemento de decisão para o primeiro elemento da condição COM RÓTULO
            const conditionConnection: FlowConnection = {
              id: `connection_${this.connectionCounter++}`,
              from: flowElement.id,
              to: conditionFlowElement.id,
              label: condition.label
            };
            connections.push(conditionConnection);

            // Processar elementos restantes na condição (pular primeiro elemento, pois já está conectado)
            if (condition.elements.length > 1) {
              this.processElementsSequentially(
                condition.elements.slice(1), // Pular primeiro elemento
                elements,
                connections,
                conditionFlowElement // Começar a partir do primeiro elemento da condição
              );
            }
          }
        }
        // A decisão não continua sequencialmente, então não atualize lastElement
        lastElement = undefined;
      } else {
        lastElement = flowElement;
      }
    }

    return lastElement;
  }

  private createOrReferenceElement(hierElement: HierarchicalElement): FlowElement {
    const elementKey = this.getElementKey(hierElement);
    
    // Verificar se o elemento já existe
    const existingElement = this.elementRegistry.get(elementKey);
    if (existingElement) {
      return existingElement; // Retornar referência ao elemento existente
    }

    // Criar novo elemento
    const flowElement: FlowElement = {
      id: `element_${this.elementCounter++}`,
      type: this.mapHierarchicalTypeToFlowType(hierElement.type),
      name: hierElement.name || this.getDefaultName(hierElement.type)
    };

    // Registrar o elemento
    this.elementRegistry.set(elementKey, flowElement);
    
    return flowElement;
  }

  private getElementKey(hierElement: HierarchicalElement): string {
    // Usar tipo e nome (ou nome padrão) como chave única
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
  // SERIALIZAÇÃO
  // ===================================================================

  /**
   * Converte o diagrama de fluxo de volta para a sintaxe hierárquica.
   * @param diagram Diagrama de fluxo
   * @returns String na sintaxe hierárquica
   */
  private diagramToHierarchicalSyntax(diagram: FlowDiagram): string {    
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

  /**
   * Mapeia o tipo do elemento do fluxo para o tipo hierárquico correspondente.
   * @param type Tipo do elemento do fluxo
   * @returns Tipo hierárquico correspondente
   */
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
        return 'Entrada'; // Pode ser Entrada ou Saida, mas escolhemos Entrada como padrão
      default:
        return 'Processo';
    }
  }
}