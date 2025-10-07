// Extrai diagramas ER do canvas e converte para sintaxe declarativa

import BpmnModeler from "bpmn-js/lib/Modeler";
import { ErDiagram, ErEntity, ErRelationship, ErAttribute } from './er-types';
import { MermaidErParser } from './er-parser';

export class ErDiagramSerializer {
  private modeler: BpmnModeler;
  private elementRegistry: any;
  private parser: MermaidErParser;

  constructor(modeler: BpmnModeler) {
    this.modeler = modeler;
    this.elementRegistry = modeler.get('elementRegistry');
    this.parser = new MermaidErParser();
  }

  canSerialize(): boolean {
    const allElements = this.elementRegistry.getAll();
    const erElements = allElements.filter((element: any) => 
      element.businessObject?.erType || 
      (element.businessObject?.$attrs && 
       (element.businessObject.$attrs['er:erType'] || element.businessObject.$attrs['ns0:erType']))
    );
    
    return erElements.length > 0;
  }

  serializeToDeclarative(): string {
    try {
      const diagram = this.extractErDiagramFromCanvas();
      return this.parser.serialize(diagram);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Erro ao extrair diagrama ER: ${errorMessage}`);
    }
  }

  private extractErDiagramFromCanvas(): ErDiagram {
    const allElements = this.elementRegistry.getAll();
    
    // Separar entidades, atributos e conexões
    const entities = new Map<string, ErEntity>();
    const attributes = new Map<string, ErAttribute & { entityId?: string }>();
    const relationships: ErRelationship[] = [];

    // Primeira passada: identificar entidades
    for (const element of allElements) {
      if (this.isEntity(element)) {
        const entity = this.extractEntity(element);
        entities.set(element.id, entity);
      }
    }

    // Segunda passada: identificar atributos
    for (const element of allElements) {
      if (this.isAttribute(element)) {
        const attribute = this.extractAttribute(element);
        attributes.set(element.id, attribute);
      }
    }

    // Terceira passada: identificar conexões e relacionamentos
    for (const element of allElements) {
      if (this.isConnection(element)) {
        const sourceElement = element.source;
        const targetElement = element.target;

        // Conexão atributo -> entidade
        if (this.isAttribute(sourceElement) && this.isEntity(targetElement)) {
          const attribute = attributes.get(sourceElement.id);
          if (attribute) {
            attribute.entityId = targetElement.id;
          }
        }
        // Conexão entidade -> entidade (relacionamento)
        else if (this.isEntity(sourceElement) && this.isEntity(targetElement)) {
          const relationship = this.extractRelationship(element, sourceElement, targetElement);
          if (relationship) {
            relationships.push(relationship);
          }
        }
      }
    }

    // Associar atributos às entidades
    attributes.forEach((attribute, attrId) => {
      if (attribute.entityId) {
        const entity = entities.get(attribute.entityId);
        if (entity) {
          if (!entity.attributes) {
            entity.attributes = [];
          }
          entity.attributes.push({
            name: attribute.name,
            type: attribute.type,
            primaryKey: attribute.primaryKey,            
            required: attribute.required,
            multivalued: attribute.multivalued,
            derived: attribute.derived,
            composite: attribute.composite
          });
        }
      }
    });

    return {
      title: this.extractDiagramTitle(),
      entities: Array.from(entities.values()),
      relationships
    };
  }

  private isEntity(element: any): boolean {
    return element.businessObject?.erType === 'Entity' ||
           element.businessObject?.$attrs?.['er:erType'] === 'Entity' ||
           element.businessObject?.$attrs?.['ns0:erType'] === 'Entity';
  }

  private isAttribute(element: any): boolean {
    return element.businessObject?.erType === 'Attribute' ||
           element.businessObject?.$attrs?.['er:erType'] === 'Attribute' ||
           element.businessObject?.$attrs?.['ns0:erType'] === 'Attribute';
  }

  private isConnection(element: any): boolean {
    return element.type === 'bpmn:SequenceFlow' || element.waypoints;
  }

  private extractEntity(element: any): ErEntity {
    const businessObject = element.businessObject;
    
    return {
      name: businessObject.name || 'Entidade',
      isWeak: this.getBooleanProperty(businessObject, 'isWeak'),
      attributes: [],
      x: element.x,
      y: element.y
    };
  }

  private extractAttribute(element: any): ErAttribute & { entityId?: string } {
    const businessObject = element.businessObject;
    
    return {
      name: businessObject.name || 'atributo',
      type: this.getStringProperty(businessObject, 'dataType') || 'string',
      primaryKey: this.getBooleanProperty(businessObject, 'isPrimaryKey'),      
      required: this.getBooleanProperty(businessObject, 'isRequired'),
      multivalued: this.getBooleanProperty(businessObject, 'isMultivalued'),
      derived: this.getBooleanProperty(businessObject, 'isDerived'),
      composite: this.getBooleanProperty(businessObject, 'isComposite')
    };
  }

  private extractRelationship(connectionElement: any, sourceElement: any, targetElement: any): ErRelationship | null {
    const businessObject = connectionElement.businessObject;
    
    // Extrair cardinalidades
    const cardinalitySource = this.getStringProperty(businessObject, 'cardinalitySource') || '1..1';
    const cardinalityTarget = this.getStringProperty(businessObject, 'cardinalityTarget') || '1..1';
    
    // Converter cardinalidades para formato Mermaid
    const mermaidCardinality = this.convertCardinalitiesToMermaid(cardinalitySource, cardinalityTarget);
    
    const isIdentifying = this.getBooleanProperty(businessObject, 'isParentChild');
    
    return {
      from: sourceElement.businessObject.name || 'Entidade1',
      to: targetElement.businessObject.name || 'Entidade2',
      cardinality: mermaidCardinality,
      label: businessObject.name || '',
      isIdentifying
    };
  }

  private convertCardinalitiesToMermaid(sourceCard: string, targetCard: string): string {
    // Normalizar entradas de cardinalidade
    const normalizeCardinality = (card: string): 'one' | 'zero-or-one' | 'one-or-many' | 'zero-or-many' => {
      const normalized = card?.toLowerCase().trim();
      
      // One (exactly one)
      if (normalized === '1' || normalized === '1..1' || normalized === 'one' || normalized === 'exactly-one') {
        return 'one';
      }
      
      // Zero-or-One (optional)
      if (normalized === '0..1' || normalized === 'zero-or-one' || normalized === 'optional' || normalized === '?') {
        return 'zero-or-one';
      }
      
      // One-or-Many (at least one)
      if (normalized === '1..*' || normalized === '1..n' || normalized === 'one-or-many' || 
          normalized === 'one-to-many' || normalized === '1+') {
        return 'one-or-many';
      }
      
      // Zero-or-Many (none or many)
      if (normalized === '0..*' || normalized === '0..n' || normalized === 'zero-or-many' || 
          normalized === 'many' || normalized === '*') {
        return 'zero-or-many';
      }
      
      // Default fallback
      return 'zero-or-many';
    };

    const sourceType = normalizeCardinality(sourceCard);
    const targetType = normalizeCardinality(targetCard);
    
    // Mapear combinações para símbolos Crow's Foot
    const cardinalityMap: Record<string, string> = {
      // One to X
      'one-one': '||--||',
      'one-zero-or-one': '||--o|',
      'one-one-or-many': '||--|{',
      'one-zero-or-many': '||--o{',
      
      // Zero-or-One to X
      'zero-or-one-one': '|o--||',
      'zero-or-one-zero-or-one': '|o--o|',
      'zero-or-one-one-or-many': '|o--|{',
      'zero-or-one-zero-or-many': '|o--o{',
      
      // One-or-Many to X
      'one-or-many-one': '}|--||',
      'one-or-many-zero-or-one': '}|--o|',
      'one-or-many-one-or-many': '}|--|{',
      'one-or-many-zero-or-many': '}|--o{',
      
      // Zero-or-Many to X
      'zero-or-many-one': '}o--||',
      'zero-or-many-zero-or-one': '}o--o|',
      'zero-or-many-one-or-many': '}o--|{',
      'zero-or-many-zero-or-many': '}o--o{',
    };

    const key = `${sourceType}-${targetType}`;
    return cardinalityMap[key] || '}o--o{'; // Fallback para zero-or-many to zero-or-many
  }

  private getBooleanProperty(businessObject: any, propertyName: string): boolean {
    // Verificar propriedade direta
    if (businessObject[propertyName] !== undefined) {
      return Boolean(businessObject[propertyName]);
    }
    
    // Verificar em $attrs com prefixo er:
    const erAttr = businessObject.$attrs?.[`er:${propertyName}`];
    if (erAttr !== undefined) {
      return erAttr === 'true' || erAttr === true;
    }
    
    // Verificar em $attrs com prefixo ns0:
    const ns0Attr = businessObject.$attrs?.[`ns0:${propertyName}`];
    if (ns0Attr !== undefined) {
      return ns0Attr === 'true' || ns0Attr === true;
    }
    
    return false;
  }

  private getStringProperty(businessObject: any, propertyName: string): string | undefined {
    // Verificar propriedade direta
    if (businessObject[propertyName] !== undefined) {
      return String(businessObject[propertyName]);
    }
    
    // Verificar em $attrs com prefixo er:
    const erAttr = businessObject.$attrs?.[`er:${propertyName}`];
    if (erAttr !== undefined) {
      return String(erAttr);
    }
    
    // Verificar em $attrs com prefixo ns0:
    const ns0Attr = businessObject.$attrs?.[`ns0:${propertyName}`];
    if (ns0Attr !== undefined) {
      return String(ns0Attr);
    }
    
    return undefined;
  }

  private extractDiagramTitle(): string {
    // Extrair título do diagrama da mesma forma que o painel de propriedades
    try {
      const definitions = this.modeler.getDefinitions();
      const rootElement = definitions?.rootElements?.[0];
      
      if (rootElement?.name) {
        return rootElement.name;
      }
    } catch (error) {
      // Ignorar erro e usar título padrão
    }
    
    return 'Diagrama ER';
  }
}