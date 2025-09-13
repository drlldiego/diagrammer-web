// Gerador que converte modelo interno para elementos visuais BPMN
// Preparado para customização visual futura (estilos não-BPMN)

import BpmnModeler from "bpmn-js/lib/Modeler";
import { FlowDiagram, FlowElement, FlowConnection } from './types';

export class DiagramVisualGenerator {
  private modeler: BpmnModeler;

  constructor(modeler: BpmnModeler) {
    this.modeler = modeler;
  }

  // Converte modelo interno para diagrama BPMN visual
  async generateVisualDiagram(diagram: FlowDiagram): Promise<void> {
    try {
      const bpmnXml = this.generateBpmnXml(diagram);
      await this.modeler.importXML(bpmnXml);
      console.log(`✅ Diagrama "${diagram.name}" gerado com sucesso`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Erro ao gerar diagrama visual: ${errorMessage}`);
    }
  }

  private generateBpmnXml(diagram: FlowDiagram): string {
    const processId = "DeclarativeProcess_1";
    const diagramId = "BPMNDiagram_1";
    const planeId = "BPMNPlane_1";

    // Gerar elementos do processo
    const processElements = diagram.elements
      .map(el => this.generateProcessElement(el))
      .join('\n        ');

    // Gerar conexões do processo  
    const processConnections = diagram.connections
      .map(conn => this.generateProcessConnection(conn, diagram.elements))
      .join('\n        ');

    // Gerar elementos visuais (DI)
    const diagramElements = diagram.elements
      .map(el => this.generateDiagramElement(el))
      .join('\n            ');

    // Gerar conexões visuais (DI)
    const diagramConnections = diagram.connections
      .map(conn => this.generateDiagramConnection(conn, diagram.elements))
      .join('\n            ');

    return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
    xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
    xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
    xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
    targetNamespace="http://bpmn.io/schema/bpmn">
    <bpmn:process id="${processId}" name="${diagram.name}" isExecutable="false">
        ${processElements}
        ${processConnections}
    </bpmn:process>
    <bpmndi:BPMNDiagram id="${diagramId}">
        <bpmndi:BPMNPlane id="${planeId}" bpmnElement="${processId}">
            ${diagramElements}
            ${diagramConnections}
        </bpmndi:BPMNPlane>
    </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
  }

  private generateProcessElement(element: FlowElement): string {
    const { id, type, name } = element;
    
    switch (type) {
      case 'start':
        return `<bpmn:startEvent id="${id}" name="${name}" />`;
      
      case 'end':
        return `<bpmn:endEvent id="${id}" name="${name}" />`;
      
      case 'process':
        return `<bpmn:task id="${id}" name="${name}" />`;
      
      case 'decision':
        return `<bpmn:exclusiveGateway id="${id}" name="${name}" />`;
      
      default:
        throw new Error(`Tipo de elemento não suportado: ${type}`);
    }
  }

  private generateProcessConnection(connection: FlowConnection, elements: FlowElement[]): string {
    const { id, from, to, label } = connection;
    const nameAttr = label ? ` name="${label}"` : '';
    
    return `<bpmn:sequenceFlow id="${id}" sourceRef="${from}" targetRef="${to}"${nameAttr} />`;
  }

  private generateDiagramElement(element: FlowElement): string {
    const { id, position, name } = element;
    
    if (!position) {
      throw new Error(`Elemento ${id} não possui posição definida`);
    }

    const { x, y } = position;
    const elementDiId = `${id}_di`;
    
    // Definir tamanhos baseados no tipo (preparado para customização futura)
    const dimensions = this.getElementDimensions(element.type);
    const bounds = `<dc:Bounds x="${x}" y="${y}" width="${dimensions.width}" height="${dimensions.height}" />`;
    
    let elementTag: string;
    
    switch (element.type) {
      case 'start':
      case 'end':
        elementTag = 'bpmndi:BPMNShape';
        break;
      case 'process':
        elementTag = 'bpmndi:BPMNShape';
        break;
      case 'decision':
        elementTag = 'bpmndi:BPMNShape';
        break;
      default:
        throw new Error(`Tipo de elemento visual não suportado: ${element.type}`);
    }

    const labelBounds = this.generateLabelBounds(x, y, dimensions, name);

    return `<${elementTag} id="${elementDiId}" bpmnElement="${id}">
                ${bounds}
                ${labelBounds}
            </${elementTag}>`;
  }

  private generateDiagramConnection(connection: FlowConnection, elements: FlowElement[]): string {
    const { id, from, to, label } = connection;
    const connectionDiId = `${id}_di`;
    
    const fromElement = elements.find(el => el.id === from);
    const toElement = elements.find(el => el.id === to);
    
    if (!fromElement?.position || !toElement?.position) {
      throw new Error(`Posições não definidas para conexão ${id}`);
    }

    // Calcular pontos de waypoint simples (centro dos elementos)
    const fromDimensions = this.getElementDimensions(fromElement.type);
    const toDimensions = this.getElementDimensions(toElement.type);
    
    const startX = fromElement.position.x + (fromDimensions.width / 2);
    const startY = fromElement.position.y + fromDimensions.height;
    const endX = toElement.position.x + (toDimensions.width / 2);
    const endY = toElement.position.y;

    const waypoints = `
                <di:waypoint x="${startX}" y="${startY}" />
                <di:waypoint x="${endX}" y="${endY}" />`;

    const labelElement = label ? this.generateConnectionLabel(label, startX, startY, endX, endY) : '';

    return `<bpmndi:BPMNEdge id="${connectionDiId}" bpmnElement="${id}">
                ${waypoints}${labelElement}
            </bpmndi:BPMNEdge>`;
  }

  // Dimensões dos elementos (facilita customização futura)
  private getElementDimensions(type: string): { width: number; height: number } {
    switch (type) {
      case 'start':
      case 'end':
        return { width: 36, height: 36 };
      case 'process':
        return { width: 100, height: 80 };
      case 'decision':
        return { width: 50, height: 50 };
      default:
        return { width: 100, height: 80 };
    }
  }

  private generateLabelBounds(x: number, y: number, dimensions: { width: number; height: number }, name: string): string {
    const labelY = y + dimensions.height + 5;
    const labelWidth = Math.max(name.length * 8, 60); // Estimativa baseada no texto
    const labelX = x + (dimensions.width / 2) - (labelWidth / 2);
    
    return `<bpmndi:BPMNLabel>
                    <dc:Bounds x="${labelX}" y="${labelY}" width="${labelWidth}" height="14" />
                </bpmndi:BPMNLabel>`;
  }

  private generateConnectionLabel(label: string, startX: number, startY: number, endX: number, endY: number): string {
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    const labelWidth = Math.max(label.length * 7, 20);
    
    // Ajustar posição da label baseada na direção da conexão
    let labelX = midX - (labelWidth / 2);
    let labelY = midY - 10;
    
    // Se conexão é horizontal (para elementos à direita), mover label para cima
    if (Math.abs(endX - startX) > Math.abs(endY - startY)) {
      labelY = Math.min(startY, endY) - 15;
    }
    
    return `
                <bpmndi:BPMNLabel>
                    <dc:Bounds x="${labelX}" y="${labelY}" width="${labelWidth}" height="14" />
                </bpmndi:BPMNLabel>`;
  }
}