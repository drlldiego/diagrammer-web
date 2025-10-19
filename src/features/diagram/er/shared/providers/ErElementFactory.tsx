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
    
    // CORREÇÃO: Garantir que o elemento criado tenha a estrutura correta
    // Verificar e corrigir businessObject se necessário
    if (createdEntity && createdEntity.businessObject) {
      // Garantir que as propriedades ER estão presentes no businessObject
      if (!createdEntity.businessObject.erType) {
        createdEntity.businessObject.erType = 'Entity';
      }
      
      // Garantir que $attrs existe e tem as propriedades ER
      if (!createdEntity.businessObject.$attrs) {
        createdEntity.businessObject.$attrs = {};
      }
      
      if (!createdEntity.businessObject.$attrs['er:erType']) {
        createdEntity.businessObject.$attrs['er:erType'] = 'Entity';
      }
      
      // Garantir que o nome está definido corretamente
      if (name && !createdEntity.businessObject.name) {
        createdEntity.businessObject.name = name;
      }
      
      // CORREÇÃO CRÍTICA: Garantir que bounds estão definidos para o ContextPad funcionar
      if (!createdEntity.bounds) {
        createdEntity.bounds = {
          x: x,
          y: y,
          width: entity.width || 120,
          height: entity.height || 80
        };
      }
      
      // Também garantir que x, y, width, height estão no elemento
      if (createdEntity.x === undefined) createdEntity.x = x;
      if (createdEntity.y === undefined) createdEntity.y = y;
      if (createdEntity.width === undefined) createdEntity.width = entity.width || 120;
      if (createdEntity.height === undefined) createdEntity.height = entity.height || 80;
    }
    
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
    
    // CORREÇÃO: Garantir que $attrs existe e tem as propriedades necessárias
    if (!connection.businessObject.$attrs) {
      connection.businessObject.$attrs = {};
    }
    connection.businessObject.$attrs['er:cardinality'] = cardinality;
    connection.businessObject.$attrs['er:cardinalitySource'] = cardinality;
    connection.businessObject.$attrs['er:cardinalityTarget'] = cardinality;
    
    if (label) {
      connection.businessObject.$attrs['name'] = label;
    }
    
    // Garantir estrutura correta para que o ContextPad funcione
    if (!connection.businessObject.erType) {
      connection.businessObject.erType = 'Connection';
    }
  }
  
  return connection;
};

// Método para criar atributos ER
(ErElementFactory as any).prototype.createAttribute = function(this: any, name: string, x: number, y: number, options: any = {}): any {
  const attributeAttrs: ErShapeOptions = {
    type: 'bpmn:IntermediateCatchEvent',
    width: 90,
    height: 50,
    name: name,
    erType: 'Attribute',
    isPrimaryKey: options.isPrimaryKey || false,
    isRequired: options.isRequired !== undefined ? options.isRequired : true,
    dataType: options.dataType || 'VARCHAR'
  };

  const attribute = this.createShape(attributeAttrs);
  
  // Posicionar o atributo
  attribute.x = x;
  attribute.y = y;
  
  // Adicionar ao canvas
  if (this._canvas && this._modeling) {
    const rootElement = this._canvas.getRootElement();
    const createdAttribute = this._modeling.createShape(attribute, { x, y }, rootElement);
    
    // CORREÇÃO: Garantir que o elemento criado tenha a estrutura correta
    if (createdAttribute && createdAttribute.businessObject) {
      // Garantir que as propriedades ER estão presentes no businessObject
      if (!createdAttribute.businessObject.erType) {
        createdAttribute.businessObject.erType = 'Attribute';
      }
      
      // Garantir que $attrs existe e tem as propriedades ER
      if (!createdAttribute.businessObject.$attrs) {
        createdAttribute.businessObject.$attrs = {};
      }
      
      if (!createdAttribute.businessObject.$attrs['er:erType']) {
        createdAttribute.businessObject.$attrs['er:erType'] = 'Attribute';
      }
      
      // Garantir que o nome está definido corretamente
      if (name && !createdAttribute.businessObject.name) {
        createdAttribute.businessObject.name = name;
      }
      
      // Garantir propriedades específicas do atributo
      if (options.isPrimaryKey !== undefined) {
        createdAttribute.businessObject.isPrimaryKey = options.isPrimaryKey;
        createdAttribute.businessObject.$attrs['er:isPrimaryKey'] = options.isPrimaryKey.toString();
      }
      
      if (options.isRequired !== undefined) {
        createdAttribute.businessObject.isRequired = options.isRequired;
        createdAttribute.businessObject.$attrs['er:isRequired'] = options.isRequired.toString();
      }
      
      if (options.dataType) {
        createdAttribute.businessObject.dataType = options.dataType;
        createdAttribute.businessObject.$attrs['er:dataType'] = options.dataType;
      }
      
      // CORREÇÃO CRÍTICA: Garantir que bounds estão definidos para o ContextPad funcionar
      if (!createdAttribute.bounds) {
        createdAttribute.bounds = {
          x: x,
          y: y,
          width: attribute.width || 90,
          height: attribute.height || 50
        };
      }
      
      // Também garantir que x, y, width, height estão no elemento
      if (createdAttribute.x === undefined) createdAttribute.x = x;
      if (createdAttribute.y === undefined) createdAttribute.y = y;
      if (createdAttribute.width === undefined) createdAttribute.width = attribute.width || 90;
      if (createdAttribute.height === undefined) createdAttribute.height = attribute.height || 50;
    }
    
    return createdAttribute;
  }
  
  return attribute;
};

// Método auxiliar para garantir que qualquer elemento criado declarativamente tenha a estrutura correta
(ErElementFactory as any).prototype.ensureElementStructure = function(this: any, element: any, erType: string): any {
  if (!element || !element.businessObject) {
    return element;
  }
  
  // Garantir que as propriedades ER estão presentes no businessObject
  if (!element.businessObject.erType) {
    element.businessObject.erType = erType;
  }
  
  // Garantir que $attrs existe e tem as propriedades ER
  if (!element.businessObject.$attrs) {
    element.businessObject.$attrs = {};
  }
  
  if (!element.businessObject.$attrs['er:erType']) {
    element.businessObject.$attrs['er:erType'] = erType;
  }
  
  // CORREÇÃO CRÍTICA: Garantir que bounds estão definidos para o ContextPad funcionar
  if (!element.bounds && element.x !== undefined && element.y !== undefined) {
    element.bounds = {
      x: element.x,
      y: element.y,
      width: element.width || (erType === 'Entity' ? 120 : erType === 'Attribute' ? 90 : 140),
      height: element.height || (erType === 'Entity' ? 80 : erType === 'Attribute' ? 50 : 80)
    };
  }
  
  return element;
};

// Método para criar conexões simples (sem cardinalidade) para atributos
(ErElementFactory as any).prototype.createAttributeConnection = function(this: any, fromElement: any, toAttribute: any, label?: string): any {
  if (!this._modeling || !fromElement || !toAttribute) {
    throw new Error('Modeling service ou elementos não disponíveis para criar conexão de atributo');
  }
  
  // Criar conexão simples usando o modeling service
  const connection = this._modeling.connect(fromElement, toAttribute, {
    type: 'bpmn:SequenceFlow'
  });
  
  // Para conexões de atributos, NÃO configurar cardinalidade
  if (connection && connection.businessObject) {
    // Apenas configurar nome se fornecido
    if (label) {
      const updateProps: any = { name: label };
      this._modeling.updateProperties(connection, updateProps);
      
      if (!connection.businessObject.$attrs) {
        connection.businessObject.$attrs = {};
      }
      connection.businessObject.$attrs['name'] = label;
    } else {
      // Garantir que $attrs existe mesmo sem propriedades
      if (!connection.businessObject.$attrs) {
        connection.businessObject.$attrs = {};
      }
    }
  }
  
  return connection;
};