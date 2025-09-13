// Serializador que converte diagramas visuais de volta para sintaxe declarativa
// Processo inverso: Canvas Visual → JSON/YAML

import BpmnModeler from "bpmn-js/lib/Modeler";
import { FlowDiagram, FlowElement, FlowConnection } from './types';
import { UnifiedDeclarativeParser } from './unified-parser';

interface BpmnElement {
  id: string;
  type: string;
  businessObject: {
    name?: string;
    sourceRef?: string;
    targetRef?: string;
    $type: string;
  };
}

export class DiagramSerializer {
  private modeler: BpmnModeler;

  constructor(modeler: BpmnModeler) {
    this.modeler = modeler;
  }

  // Converte diagrama visual atual para sintaxe declarativa
  serializeToDeclarative(): string {
    try {
      const diagram = this.extractDiagramFromCanvas();
      const parser = new UnifiedDeclarativeParser();
      return parser.serialize(diagram, 'yaml');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Erro ao serializar diagrama: ${errorMessage}`);
    }
  }

  private extractDiagramFromCanvas(): FlowDiagram {
    const elementRegistry = this.modeler.get('elementRegistry') as any;
    const allElements = elementRegistry.getAll();

    // Filtrar apenas elementos de processo (não elementos de diagrama)
    const processElements = allElements.filter((element: any) => 
      element.businessObject && 
      (element.type === 'bpmn:StartEvent' || 
       element.type === 'bpmn:EndEvent' || 
       element.type === 'bpmn:Task' || 
       element.type === 'bpmn:ExclusiveGateway' ||
       element.type === 'bpmn:SequenceFlow')
    );

    // Separar elementos de conexões
    const flowElements: FlowElement[] = [];
    const flowConnections: FlowConnection[] = [];

    processElements.forEach((element: any) => {
      if (element.type === 'bpmn:SequenceFlow') {
        // É uma conexão
        const connection: FlowConnection = {
          id: element.id,
          from: element.businessObject.sourceRef?.id || '',
          to: element.businessObject.targetRef?.id || '',
          label: element.businessObject.name || undefined
        };
        flowConnections.push(connection);
      } else {
        // É um elemento
        const flowElement: FlowElement = {
          id: element.id,
          type: this.mapBpmnTypeToFlowType(element.type),
          name: element.businessObject.name || this.getDefaultName(element.type),
          position: element.x && element.y ? { x: element.x, y: element.y } : undefined
        };
        flowElements.push(flowElement);
      }
    });

    // Obter nome do processo
    const processName = this.getProcessName();

    return {
      name: processName,
      elements: flowElements,
      connections: flowConnections
    };
  }

  private mapBpmnTypeToFlowType(bpmnType: string): 'start' | 'end' | 'process' | 'decision' {
    switch (bpmnType) {
      case 'bpmn:StartEvent':
        return 'start';
      case 'bpmn:EndEvent':
        return 'end';
      case 'bpmn:Task':
        return 'process';
      case 'bpmn:ExclusiveGateway':
        return 'decision';
      default:
        console.warn(`Tipo BPMN não reconhecido: ${bpmnType}, usando 'process'`);
        return 'process';
    }
  }

  private getDefaultName(bpmnType: string): string {
    switch (bpmnType) {
      case 'bpmn:StartEvent':
        return 'Início';
      case 'bpmn:EndEvent':
        return 'Fim';
      case 'bpmn:Task':
        return 'Processo';
      case 'bpmn:ExclusiveGateway':
        return 'Decisão';
      default:
        return 'Elemento';
    }
  }

  private getProcessName(): string {
    try {
      const canvas = this.modeler.get('canvas') as any;
      const rootElement = canvas.getRootElement();
      return rootElement.businessObject.name || 'Fluxograma Extraído';
    } catch (error) {
      return 'Fluxograma Extraído';
    }
  }

  private convertToExternalSyntax(diagram: FlowDiagram) {
    // Criar mapeamento de IDs para índices
    const elementIdToIndex = new Map<string, number>();
    diagram.elements.forEach((element, index) => {
      elementIdToIndex.set(element.id, index);
    });

    // Converter elementos
    const externalElements = diagram.elements.map(element => ({
      type: element.type,
      name: element.name
    }));

    // Converter conexões (IDs para índices)
    const externalConnections = diagram.connections.map(connection => {
      const fromIndex = elementIdToIndex.get(connection.from);
      const toIndex = elementIdToIndex.get(connection.to);

      if (fromIndex === undefined || toIndex === undefined) {
        console.warn(`Conexão inválida: ${connection.from} → ${connection.to}`);
        return null;
      }

      const externalConnection: any = {
        from: fromIndex,
        to: toIndex
      };

      if (connection.label) {
        externalConnection.label = connection.label;
      }

      return externalConnection;
    }).filter(conn => conn !== null); // Remover conexões inválidas

    return {
      flowchart: {
        name: diagram.name,
        elements: externalElements,
        connections: externalConnections
      }
    };
  }

  // Verifica se há conteúdo válido no canvas para serializar
  canSerialize(): boolean {
    try {
      const elementRegistry = this.modeler.get('elementRegistry') as any;
      const allElements = elementRegistry.getAll();
      
      // Verificar se há pelo menos um elemento que não seja o processo raiz
      const validElements = allElements.filter((element: any) => 
        element.businessObject && 
        element.type !== 'bpmn:Process' &&
        element.type !== 'label'
      );
      
      return validElements.length > 0;
    } catch (error) {
      return false;
    }
  }
}