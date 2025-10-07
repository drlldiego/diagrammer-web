// Gerador de diagramas ER visuais a partir da sintaxe declarativa
import BpmnModeler from "bpmn-js/lib/Modeler";
import { ErDiagram, ErEntity, ErRelationship } from './er-types';
import { logger } from "../../../../utils/logger";

export class ErDiagramGenerator {
  private modeler: BpmnModeler;
  private elementRegistry: any;
  private modeling: any;
  private elementFactory: any;
  private erElementFactory: any;
  private canvas: any;

  constructor(modeler: BpmnModeler) {
    this.modeler = modeler;
    this.elementRegistry = modeler.get('elementRegistry');
    this.modeling = modeler.get('modeling');
    this.elementFactory = modeler.get('elementFactory');
    this.erElementFactory = modeler.get('erElementFactory');
    this.canvas = modeler.get('canvas');
  }

  /**
   * Garantir que o processo tenha a estrutura semântica correta
   */
  private ensureProcessStructure(): void {
    const processElement = this.elementRegistry.filter((element: any) => {
      return element.type === 'bpmn:Process';
    });

    if (processElement.length === 0) {
      logger.info('Processo não encontrado, criando processo padrão...');
      const rootElement = this.canvas.getRootElement();
      
      if (rootElement) {
        const process = this.elementFactory.createProcessBusinessObject();
        const processShape = this.elementFactory.createShape({
          type: 'bpmn:Process',
          businessObject: process,
        });
        
        this.canvas.addShape(processShape, rootElement);
      }
    }
  }

  private validateAndFixElementStructure(element: any, parentElement: any): void {
    if (!element.businessObject) {
      logger.warn('Elemento sem businessObject detectado, corrigindo...');
      element.businessObject = this.elementFactory.createBusinessObject(element.type, element);
    }
    
    if (!element.parent) {
      element.parent = parentElement;
    }
  }

  async generateVisualDiagram(diagram: ErDiagram): Promise<void> {
    try {            
      await this.clearCanvas();

      if (!this.modeler) {
        throw new Error('Modeler não está disponível');
      }

      this.ensureProcessStructure();
      const rootElement = this.canvas.getRootElement();

      const entityElements = new Map<string, any>();
      for (const entity of diagram.entities) {
        const entityElement = await this.createEntity(entity);
        if (entityElement) {
          entityElements.set(entity.name, entityElement);
          this.validateAndFixElementStructure(entityElement, rootElement);
        }
      }
      const connections = [];
      for (const relationship of diagram.relationships) {
        const connectionElement = await this.createRelationship(relationship, entityElements);
        if (connectionElement) {
          connections.push({
            connection: connectionElement, 
            relationship, 
            fromEntity: entityElements.get(relationship.from), 
            toEntity: entityElements.get(relationship.to)
          });
          this.validateAndFixElementStructure(connectionElement, rootElement);
        }
      }      

      this.canvas.zoom('fit-viewport');            
      
      logger.info(`Diagrama ER gerado com sucesso: ${diagram.entities.length} entidades, ${diagram.relationships.length} relacionamentos`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Erro ao gerar diagrama ER visual:', errorMessage);
      throw new Error(`Falha na geração do diagrama ER: ${errorMessage}`);
    }
  }

  private async clearCanvas(): Promise<void> {
    const rootElement = this.canvas.getRootElement();
    const allElements = this.elementRegistry.filter((element: any) => {
      return element.parent === rootElement && element.type !== 'label';
    });

    if (allElements.length > 0) {
      this.modeling.removeElements(allElements);
    }
  }

  private async createEntity(entity: ErEntity): Promise<any> {            
    try {
      const entityElement = this.erElementFactory.createEntity(
        entity.name,
        entity.x || 300,
        entity.y || 200,
        entity.attributes || []
      );

      if (!entityElement) {
        throw new Error(`Falha ao criar entidade: ${entity.name}`);
      }

      return entityElement;
    } catch (error) {      
      logger.error(`Erro ao criar entidade "${entity.name}": ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async createRelationship(relationship: ErRelationship, entityElements: Map<string, any>): Promise<any> {                
    try {
      const fromEntity = entityElements.get(relationship.from);
      const toEntity = entityElements.get(relationship.to);

      if (!fromEntity || !toEntity) {
        throw new Error(`Entidades não encontradas para relacionamento: ${relationship.from} -> ${relationship.to}`);
      }

      // Usar cardinality string diretamente
      const cardinalityString = this.convertCardinalityToString(relationship.cardinality);
      
      const connectionElement = this.erElementFactory.createRelationship(
        fromEntity,
        toEntity,
        cardinalityString,
        relationship.label
      );

      if (!connectionElement) {
        throw new Error(`Falha ao criar relacionamento: ${relationship.from} -> ${relationship.to}`);
      }

      return connectionElement;
    } catch (error) {      
      logger.error(`Erro ao criar relacionamento "${relationship.from} -> ${relationship.to}": ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private convertCardinalityToString(cardinality: string): string {
    // Retornar a cardinalidade como está
    // O ErElementFactory deve lidar com isso nativamente
    return cardinality || '||--||';
  }
}