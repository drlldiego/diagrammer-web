// Parser unificado que suporta tanto JSON quanto YAML
// Usa a biblioteca js-yaml para parsing de YAML

import * as yaml from 'js-yaml';
import { FlowDiagram, FlowElement, FlowConnection, DeclarativeSyntaxParser } from './types';
import { GraphPositioning } from './graph-positioning';
import { SimplifiedSyntaxParser, SimplifiedFlowDefinition } from './simplified-parser';

// Interface para sintaxe simplificada (único formato suportado)
interface SimplifiedExternalSyntax {
  flowchart: SimplifiedFlowDefinition;
}

export type SyntaxFormat = 'json' | 'yaml';

export class UnifiedDeclarativeParser implements DeclarativeSyntaxParser {
  private positioning: GraphPositioning;
  private simplifiedParser: SimplifiedSyntaxParser;

  constructor() {
    this.positioning = new GraphPositioning();
    this.simplifiedParser = new SimplifiedSyntaxParser();
  }

  parse(input: string): FlowDiagram {
    try {
      const format = this.detectFormat(input);
      
      // Parse do formato (JSON ou YAML)
      const parsedData = format === 'json' 
        ? this.parseJSON(input)
        : this.parseYAML(input);
      
      // Verificar se tem a estrutura da sintaxe simplificada
      if (!parsedData?.flowchart?.flow || typeof parsedData.flowchart.flow !== 'string') {
        throw new Error('Formato inválido. Use apenas a sintaxe simplificada com a propriedade "flow".');
      }
      
      return this.parseSimplifiedSyntax(parsedData as SimplifiedExternalSyntax);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Erro ao analisar sintaxe: ${errorMessage}`);
    }
  }

  serialize(diagram: FlowDiagram, format: SyntaxFormat = 'yaml'): string {
    const simplifiedDef = this.simplifiedParser.serializeToSimplified(diagram.elements, diagram.connections);
    const external = { flowchart: simplifiedDef };
    
    if (format === 'json') {
      return JSON.stringify(external, null, 2);
    } else {
      return this.serializeToYAML(external);
    }
  }

  getVersion(): string {
    return "2.0-simplified-only";
  }

  private parseSimplifiedSyntax(external: SimplifiedExternalSyntax): FlowDiagram {
    const { elements, connections } = this.simplifiedParser.parseSimplifiedFlow(external.flowchart);
    
    const diagram: FlowDiagram = {
      name: external.flowchart.name,
      elements,
      connections
    };

    // Aplicar posicionamento automático
    return this.positioning.calculatePositions(diagram);
  }


  private detectFormat(input: string): SyntaxFormat {
    const trimmed = input.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return 'json';
    }
    return 'yaml';
  }

  private parseJSON(input: string): any {
    return JSON.parse(input);
  }

  private parseYAML(input: string): any {
    return yaml.load(input);
  }


  private serializeToYAML(external: any): string {
    return yaml.dump(external);
  }

}