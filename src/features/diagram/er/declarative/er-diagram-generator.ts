// Gerador de diagramas ER visuais a partir da sintaxe declarativa
import BpmnModeler from "bpmn-js/lib/Modeler";
import { ErDiagram, ErEntity, ErRelationship, CROWSFOOT_CARDINALITIES } from './er-types';
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

  async generateVisualDiagram(diagram: ErDiagram): Promise<void> {
    try {            
      // Limpar canvas atual      
      await this.clearCanvas();

      // Verificar se modeler está disponível
      if (!this.modeler) {
        throw new Error('Modeler não está disponível');
      }            

      // Criar entidades      
      const entityElements = new Map<string, any>();
      for (const entity of diagram.entities) {        
        const entityElement = await this.createEntity(entity);
        entityElements.set(entity.name, entityElement);        
      }            

      // Criar relacionamentos (conexões diretas entre entidades)      
      for (const relationship of diagram.relationships) {        
        await this.createRelationship(relationship, entityElements);
      }

      // Aplicar zoom para ajustar visualização
      this.canvas.zoom('fit-viewport');            
      
    } catch (error) {      
      throw error;
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
      const entityElement = this.erElementFactory.createShape({
        type: 'bpmn:Task',
        width: 120,
        height: 80,
        name: entity.name,
        erType: 'Entity',
        isWeak: entity.isWeak || false
      });            

      // Posicionamento
      const position = {
        x: entity.x || 100,
        y: entity.y || 100
      };            

      // Adicionar entidade ao canvas      
      const addedEntity = this.modeling.createShape(
        entityElement,
        position,
        this.canvas.getRootElement()
      );            

      return addedEntity;
      
    } catch (error) {      
      throw error;
    }
  }

  // Métodos de atributos removidos
  private async createRelationship(relationship: ErRelationship, entityElements: Map<string, any>): Promise<void> {        
    const fromEntity = entityElements.get(relationship.from);
    const toEntity = entityElements.get(relationship.to);

    if (!fromEntity) {      
      throw new Error(`Entidade de origem não encontrada: ${relationship.from}`);
    }

    if (!toEntity) {      
      throw new Error(`Entidade de destino não encontrada: ${relationship.to}`);
    }    

    // Obter informações da cardinalidade
    const cardinalityInfo = CROWSFOOT_CARDINALITIES[relationship.cardinality as keyof typeof CROWSFOOT_CARDINALITIES];
    
    const sourceConverted = this.convertCardinalityToString(cardinalityInfo.from);
    const targetConverted = this.convertCardinalityToString(cardinalityInfo.to);
    
    try {
      // Criar conexão usando modeling.createConnection com atributos apropriados      
      
      
      const connectionAttrs = {
        type: 'bpmn:SequenceFlow',
        source: fromEntity,
        target: toEntity,
        name: relationship.label || '',
        cardinalitySource: sourceConverted,
        cardinalityTarget: targetConverted,
        isParentChild: relationship.isIdentifying || false,
        // Marcar como vinda do modo declarativo
        isDeclarative: true,
        mermaidCardinality: relationship.cardinality
      };
      
      const connection = this.modeling.createConnection(
        fromEntity, 
        toEntity, 
        connectionAttrs, 
        this.canvas.getRootElement()
      );

      if (connection) {
        // // Otimizar roteamento da conexão
        // this.optimizeConnectionRouting(connection, fromEntity, toEntity);
        
        // Explicitly set properties on the businessObject
        const propertiesToUpdate: any = {};
        
        if (relationship.label) {
          propertiesToUpdate.name = relationship.label;
        }
        
        if (cardinalityInfo) {
          propertiesToUpdate.cardinalitySource = this.convertCardinalityToString(cardinalityInfo.from);
          propertiesToUpdate.cardinalityTarget = this.convertCardinalityToString(cardinalityInfo.to);
          // Marcar como vinda do modo declarativo para evitar sobrescrita pelo renderer
          propertiesToUpdate.isDeclarative = true;
          propertiesToUpdate.mermaidCardinality = relationship.cardinality;
        }
        
        if (relationship.isIdentifying !== undefined) {
          propertiesToUpdate.isParentChild = relationship.isIdentifying;
        }
        
        // Definir propriedades diretamente no businessObject (solução para propriedades customizadas)
        if (connection.businessObject) {
          Object.assign(connection.businessObject, propertiesToUpdate);
        }
        
        // Também tentar updateProperties como backup
        if (Object.keys(propertiesToUpdate).length > 0) {
          this.modeling.updateProperties(connection, propertiesToUpdate);
        }
      } else {        
        throw new Error(`Falha ao criar conexão entre ${relationship.from} e ${relationship.to}`);
      }      
      
    } catch (connectionError) {
      logger.error(`Erro ao criar relacionamento ${relationship.from} -> ${relationship.to}:`, undefined, connectionError as Error);
      throw connectionError;
    }
  }

  private convertCardinalityToString(cardinality: 'one' | 'many' | 'zero-or-many' | 'one-or-many'): string {
    switch (cardinality) {
      case 'one':
        return '1';
      case 'many':
        return 'N';
      case 'zero-or-many':
        return '0..N';
      case 'one-or-many':
        return '1..N';
      default:
        return '1';
    }
  }

  // Método utilitário para calcular posições automáticas se não fornecidas
  private calculateAutomaticPositions(entities: ErEntity[]): void {
    const entitiesPerRow = Math.ceil(Math.sqrt(entities.length));
    const spacing = { x: 250, y: 200 };
    const startPos = { x: 150, y: 150 };

    entities.forEach((entity, index) => {
      if (!entity.x || !entity.y) {
        const row = Math.floor(index / entitiesPerRow);
        const col = index % entitiesPerRow;
        
        entity.x = startPos.x + (col * spacing.x);
        entity.y = startPos.y + (row * spacing.y);
      }
    });
  }

  private optimizeConnectionRouting(connection: any, fromEntity: any, toEntity: any): void {
    try {
      // Calcular posições dos elementos
      const fromBounds = fromEntity.businessObject?.di?.bounds || fromEntity;
      const toBounds = toEntity.businessObject?.di?.bounds || toEntity;
      
      if (!fromBounds || !toBounds) return;

      const fromCenter = {
        x: fromBounds.x + (fromBounds.width || 120) / 2,
        y: fromBounds.y + (fromBounds.height || 80) / 2
      };

      const toCenter = {
        x: toBounds.x + (toBounds.width || 120) / 2,
        y: toBounds.y + (toBounds.height || 80) / 2
      };

      const horizontalDistance = Math.abs(toCenter.x - fromCenter.x);
      const verticalDistance = Math.abs(toCenter.y - fromCenter.y);
      const totalDistance = Math.sqrt(horizontalDistance * horizontalDistance + verticalDistance * verticalDistance);

      // Aplicar roteamento ortogonal para evitar sobreposições
      if (this.shouldUseOrthogonalRouting(horizontalDistance, verticalDistance)) {
        this.applyOrthogonalRouting(connection, fromCenter, toCenter);
      }

    } catch (error) {
      logger.warn('Não foi possível otimizar roteamento da conexão:', undefined, error as Error);
    }
  }

  private shouldUseOrthogonalRouting(horizontalDistance: number, verticalDistance: number): boolean {
    // Usar roteamento ortogonal para elementos próximos ou quando há risco de sobreposição
    return horizontalDistance < 250 || verticalDistance < 100;
  }

  private applyOrthogonalRouting(connection: any, fromCenter: {x: number, y: number}, toCenter: {x: number, y: number}): void {
    // Criar roteamento ortogonal inteligente que evita sobreposições
    const horizontalDistance = Math.abs(toCenter.x - fromCenter.x);
    const verticalDistance = Math.abs(toCenter.y - fromCenter.y);
    
    let waypoints;

    if (horizontalDistance > verticalDistance) {
      // Rota predominantemente horizontal: sair horizontalmente primeiro
      const midX = fromCenter.x + (toCenter.x - fromCenter.x) * 0.7;
      waypoints = [
        { x: fromCenter.x, y: fromCenter.y },
        { x: midX, y: fromCenter.y },
        { x: midX, y: toCenter.y },
        { x: toCenter.x, y: toCenter.y }
      ];
    } else {
      // Rota predominantemente vertical: sair verticalmente primeiro
      const midY = fromCenter.y + (toCenter.y - fromCenter.y) * 0.7;
      waypoints = [
        { x: fromCenter.x, y: fromCenter.y },
        { x: fromCenter.x, y: midY },
        { x: toCenter.x, y: midY },
        { x: toCenter.x, y: toCenter.y }
      ];
    }

    try {
      if (this.modeling.updateWaypoints) {
        this.modeling.updateWaypoints(connection, waypoints);
      }
    } catch (error) {
      logger.warn('Não foi possível aplicar roteamento ortogonal:', undefined, error as Error);
    }
  }

}