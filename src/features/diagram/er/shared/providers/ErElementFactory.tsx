import { ErElement, ErShapeOptions } from '../types';

// Interface específica para o ElementFactory base
interface ElementFactory {
  createShape: (attrs: any) => ErElement;
}

export default function ErElementFactory(this: any, elementFactory: ElementFactory, canvas: any, modeling: any) {
  this._elementFactory = elementFactory;
  this._canvas = canvas;
  this._modeling = modeling;
}

ErElementFactory.$inject = ['elementFactory', 'canvas', 'modeling'];

(ErElementFactory as any).prototype.createShape = function(this: any, attrs: ErShapeOptions): ErElement {
  const { erType, ...otherAttrs } = attrs;
  
  // Criar elemento base usando o factory padrão
  const element = this._elementFactory.createShape(otherAttrs);    
  
  // Adicionar propriedades ER ao businessObject
  if (erType && element.businessObject) {
    // Definir propriedades ER tanto no businessObject quanto nos $attrs para persistência no XML
    element.businessObject.erType = erType;
    
    // Inicializar $attrs se não existir
    if (!element.businessObject.$attrs) {
      element.businessObject.$attrs = {};
    }
    
    // Salvar propriedades ER nos $attrs com namespace 'er:' para persistência no XML
    element.businessObject.$attrs['er:erType'] = erType;
    
    // Copiar outras propriedades ER específicas
    if (attrs.isWeak !== undefined) {
      element.businessObject.isWeak = attrs.isWeak;
      element.businessObject.$attrs['er:isWeak'] = attrs.isWeak.toString();
    }
    
    if (attrs.cardinality) {
      element.businessObject.cardinality = attrs.cardinality;
      element.businessObject.$attrs['er:cardinality'] = attrs.cardinality;
    }
    
    if (attrs.cardinalitySource) {
      element.businessObject.cardinalitySource = attrs.cardinalitySource;
      element.businessObject.$attrs['er:cardinalitySource'] = attrs.cardinalitySource;
    }
    
     if (attrs.cardinalityTarget) {
       element.businessObject.cardinalityTarget = attrs.cardinalityTarget;
       element.businessObject.$attrs['er:cardinalityTarget'] = attrs.cardinalityTarget;
     }
    
    if (attrs.isIdentifying !== undefined) {
      element.businessObject.isIdentifying = attrs.isIdentifying;
      element.businessObject.$attrs['er:isIdentifying'] = attrs.isIdentifying.toString();
    }
    
    if (attrs.dataType) {
      element.businessObject.dataType = attrs.dataType;
      element.businessObject.$attrs['er:dataType'] = attrs.dataType;
    }
    
    if (attrs.isPrimaryKey !== undefined) {
      element.businessObject.isPrimaryKey = attrs.isPrimaryKey;
      element.businessObject.$attrs['er:isPrimaryKey'] = attrs.isPrimaryKey.toString();
    }    
    
    if (attrs.isRequired !== undefined) {
      element.businessObject.isRequired = attrs.isRequired;
      element.businessObject.$attrs['er:isRequired'] = attrs.isRequired.toString();
    }
    
    if (attrs.isMultivalued !== undefined) {
      element.businessObject.isMultivalued = attrs.isMultivalued;
      element.businessObject.$attrs['er:isMultivalued'] = attrs.isMultivalued.toString();
    }
    
    if (attrs.isDerived !== undefined) {
      element.businessObject.isDerived = attrs.isDerived;
      element.businessObject.$attrs['er:isDerived'] = attrs.isDerived.toString();
    }
    
    if (attrs.isComposite !== undefined) {
      element.businessObject.isComposite = attrs.isComposite;
      element.businessObject.$attrs['er:isComposite'] = attrs.isComposite.toString();
    }
    
    if (attrs.isParentChild !== undefined) {
      element.businessObject.isParentChild = attrs.isParentChild;
      element.businessObject.$attrs['er:isParentChild'] = attrs.isParentChild.toString();
    }
    
    if (attrs.isSubAttribute !== undefined) {
      element.businessObject.isSubAttribute = attrs.isSubAttribute;
      element.businessObject.$attrs['er:isSubAttribute'] = attrs.isSubAttribute.toString();
    }
    
    if (attrs.name) {
      element.businessObject.name = attrs.name;
    }        
  }
  
  return element;
};

// Método para criar entidades ER
(ErElementFactory as any).prototype.createEntity = function(this: any, name: string, x: number, y: number, attributes: any[] = []): any {
  const entityAttrs: ErShapeOptions = {
    type: 'bpmn:Task',
    width: 120,
    height: 80,
    name: name,
    erType: 'Entity'
  };

  const entity = this.createShape(entityAttrs);
  
  // Posicionar a entidade
  entity.x = x;
  entity.y = y;
  
  // Adicionar ao canvas
  if (this._canvas && this._modeling) {
    const rootElement = this._canvas.getRootElement();
    const createdEntity = this._modeling.createShape(entity, { x, y }, rootElement);
    return createdEntity;
  }
  
  return entity;
};

// Método para criar relacionamentos ER
(ErElementFactory as any).prototype.createRelationship = function(this: any, fromEntity: any, toEntity: any, cardinality: string, label?: string): any {
  if (!this._modeling || !fromEntity || !toEntity) {
    throw new Error('Modeling service ou entidades não disponíveis para criar relacionamento');
  }
  
  // Criar conexão usando o modeling service
  const connection = this._modeling.connect(fromEntity, toEntity, {
    type: 'bpmn:SequenceFlow'
  });
  
  // Configurar propriedades ER da conexão
  if (connection && connection.businessObject) {
    // Usar updateProperties para definir as propriedades corretamente
    const updateProps: any = {
      cardinality: cardinality,
      cardinalitySource: cardinality,
      cardinalityTarget: cardinality
    };
    
    if (label) {
      updateProps.name = label;
    }
    
    // Atualizar properties usando o modeling service
    this._modeling.updateProperties(connection, updateProps);
    
    // Configurar $attrs para persistência XML
    if (!connection.businessObject.$attrs) {
      connection.businessObject.$attrs = {};
    }
    connection.businessObject.$attrs['er:cardinality'] = cardinality;
    connection.businessObject.$attrs['er:cardinalitySource'] = cardinality;
    connection.businessObject.$attrs['er:cardinalityTarget'] = cardinality;
    
    if (label) {
      connection.businessObject.$attrs['name'] = label;
    }
  }
  
  return connection;
};