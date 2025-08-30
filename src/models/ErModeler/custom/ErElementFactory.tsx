// Interfaces para tipagem TypeScript
interface ElementFactory {
  createShape: (attrs: any) => Element;
}

interface BusinessObject {
  id: string;
  name?: string;
  erType?: string;
  isWeak?: boolean;
  cardinality?: string;
  isIdentifying?: boolean;
  dataType?: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  isRequired?: boolean;
  isMultivalued?: boolean;
  isDerived?: boolean;
  isComposite?: boolean;
  cardinalitySource?: string;
  cardinalityTarget?: string;
  isParentChild?: boolean;
}

interface Element {
  id: string;
  type: string;
  width: number;
  height: number;
  businessObject: BusinessObject;
}

interface ErAttributes {
  type: string;
  width: number;
  height: number;
  name?: string;
  erType?: string;
  isWeak?: boolean;
  cardinality?: string;
  isIdentifying?: boolean;
  dataType?: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  isRequired?: boolean;
  isMultivalued?: boolean;
  isDerived?: boolean;
  isComposite?: boolean;
  isSubAttribute?: boolean;
  cardinalitySource?: string;
  cardinalityTarget?: string;
  isParentChild?: boolean;
}

export default function ErElementFactory(this: any, elementFactory: ElementFactory) {
  this._elementFactory = elementFactory;
}

ErElementFactory.$inject = ['elementFactory'];

(ErElementFactory as any).prototype.createShape = function(this: any, attrs: ErAttributes): Element {
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
    
    if (attrs.isForeignKey !== undefined) {
      element.businessObject.isForeignKey = attrs.isForeignKey;
      element.businessObject.$attrs['er:isForeignKey'] = attrs.isForeignKey.toString();
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