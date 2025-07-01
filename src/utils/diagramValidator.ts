import BpmnJS from 'bpmn-js/lib/Modeler';

export interface ValidationError {
  elementId: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

interface DiagramElement {
  id: string;
  type: string;
  businessObject?: any;
  incoming?: any[];
  outgoing?: any[];
}

interface ElementRegistry {
  getAll(): DiagramElement[];
  get(id: string): DiagramElement | undefined;
}

export class DiagramValidator {
  static validateERDiagram(modeler: BpmnJS): ValidationError[] {
    const errors: ValidationError[] = [];
    
    try {
      // 🔧 CORREÇÃO 1: Linha 27 - Tipar elementRegistry
      const elementRegistry = modeler.get('elementRegistry') as ElementRegistry;
      const elements = elementRegistry.getAll();
      
      // Validate entities
      const entities = elements.filter((el: DiagramElement) => 
        el.type === 'er:Entity' || el.type === 'er:WeakEntity'
      );
      const relationships = elements.filter((el: DiagramElement) => 
        el.type === 'er:Relationship' || el.type === 'er:IdentifyingRelationship'
      );
      const attributes = elements.filter((el: DiagramElement) => 
        el.type === 'er:Attribute' || el.type === 'er:KeyAttribute'
      );
      
      // Check if entities have names
      entities.forEach((entity: DiagramElement) => {
        if (!entity.businessObject?.name || entity.businessObject.name.trim() === '') {
          errors.push({
            elementId: entity.id,
            message: 'Entidade deve ter um nome',
            severity: 'error'
          });
        }
      });
      
      // Check if relationships connect exactly two entities
      relationships.forEach((relationship: DiagramElement) => {
        const connections = this.getConnections(relationship, elementRegistry);
        const connectedEntities = connections.filter((conn: DiagramElement) => 
          conn.type === 'er:Entity' || conn.type === 'er:WeakEntity'
        );
        
        if (connectedEntities.length < 2) {
          errors.push({
            elementId: relationship.id,
            message: 'Relacionamento deve conectar pelo menos duas entidades',
            severity: 'error'
          });
        } else if (connectedEntities.length > 2) {
          errors.push({
            elementId: relationship.id,
            message: 'Relacionamento binário deve conectar exatamente duas entidades',
            severity: 'warning'
          });
        }
      });
      
      // Check if entities have at least one key attribute
      entities.forEach((entity: DiagramElement) => {
        const entityAttributes = this.getConnectedAttributes(entity, elementRegistry);
        const keyAttributes = entityAttributes.filter((attr: DiagramElement) => 
          attr.type === 'er:KeyAttribute'
        );
        
        if (keyAttributes.length === 0) {
          errors.push({
            elementId: entity.id,
            message: 'Entidade deve ter pelo menos um atributo chave',
            severity: 'warning'
          });
        }
      });
      
      // Check for orphaned attributes
      attributes.forEach((attribute: DiagramElement) => {
        const connections = this.getConnections(attribute, elementRegistry);
        const connectedEntities = connections.filter((conn: DiagramElement) => 
          conn.type === 'er:Entity' || conn.type === 'er:WeakEntity'
        );
        
        if (connectedEntities.length === 0) {
          errors.push({
            elementId: attribute.id,
            message: 'Atributo deve estar conectado a uma entidade',
            severity: 'error'
          });
        }
      });
      
    } catch (error) {
      errors.push({
        elementId: 'system',
        message: 'Erro durante validação ER: ' + (error instanceof Error ? error.message : 'Erro desconhecido'),
        severity: 'error'
      });
    }
    
    return errors;
  }
  
  static validateBPMNDiagram(modeler: BpmnJS): ValidationError[] {
    const errors: ValidationError[] = [];
    
    try {
      // 🔧 CORREÇÃO 2: Linha 112 - Tipar elementRegistry
      const elementRegistry = modeler.get('elementRegistry') as ElementRegistry;
      const elements = elementRegistry.getAll();
      
      // Basic BPMN validation
      // 🔧 CORREÇÃO 3 e 4: Linhas 115-116 - Tipar parâmetro 'el'
      const startEvents = elements.filter((el: DiagramElement) => el.type === 'bpmn:StartEvent');
      const endEvents = elements.filter((el: DiagramElement) => el.type === 'bpmn:EndEvent');
      
      if (startEvents.length === 0) {
        errors.push({
          elementId: 'process',
          message: 'Processo deve ter pelo menos um evento de início',
          severity: 'error'
        });
      }
      
      if (endEvents.length === 0) {
        errors.push({
          elementId: 'process',
          message: 'Processo deve ter pelo menos um evento de fim',
          severity: 'warning'
        });
      }
      
      // Check for disconnected elements
      // 🔧 CORREÇÃO 5: Linha 135 - Tipar parâmetro 'element'
      elements.forEach((element: DiagramElement) => {
        if (element.type?.startsWith('bpmn:') && element.type !== 'bpmn:Process') {
          const connections = this.getConnections(element, elementRegistry);
          if (connections.length === 0 && element.type !== 'bpmn:StartEvent') {
            errors.push({
              elementId: element.id,
              message: 'Elemento está desconectado do fluxo',
              severity: 'warning'
            });
          }
        }
      });
      
    } catch (error) {
      errors.push({
        elementId: 'system',
        message: 'Erro durante validação BPMN: ' + (error instanceof Error ? error.message : 'Erro desconhecido'),
        severity: 'error'
      });
    }
    
    return errors;
  }
  
  private static getConnections(element: DiagramElement, elementRegistry: ElementRegistry): DiagramElement[] {
    const connections: DiagramElement[] = [];
    
    try {
      // Get incoming connections
      if (element.incoming) {
        element.incoming.forEach((connection: any) => {
          if (connection.source) {
            connections.push(connection.source);
          }
        });
      }
      
      // Get outgoing connections
      if (element.outgoing) {
        element.outgoing.forEach((connection: any) => {
          if (connection.target) {
            connections.push(connection.target);
          }
        });
      }
    } catch (error) {
      console.warn('Error getting connections for element:', element.id, error);
    }
    
    return connections;
  }
  
  private static getConnectedAttributes(entity: DiagramElement, elementRegistry: ElementRegistry): DiagramElement[] {
    const attributes: DiagramElement[] = [];
    
    try {
      // Get all connections from entity
      if (entity.incoming) {
        entity.incoming.forEach((connection: any) => {
          if (connection.source && 
              (connection.source.type === 'er:Attribute' || connection.source.type === 'er:KeyAttribute')) {
            attributes.push(connection.source);
          }
        });
      }
    } catch (error) {
      console.warn('Error getting connected attributes for entity:', entity.id, error);
    }
    
    return attributes;
  }
}