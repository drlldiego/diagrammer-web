import ElementFactory from 'bpmn-js/lib/features/modeling/ElementFactory';

export default class ErFactory {
  static $inject = ['elementFactory'];
  
  private _elementFactory: ElementFactory;

  constructor(elementFactory: ElementFactory) {
    this._elementFactory = elementFactory;
  }

  createEntity(attrs: any = {}) {
    return this._elementFactory.createShape({
      type: 'er:Entity',
      businessObject: {
        $type: 'er:Entity',
        name: attrs.name || 'Nova Entidade'
      },
      width: 120,
      height: 80,
      ...attrs
    });
  }

  createAttribute(attrs: any = {}) {
    return this._elementFactory.createShape({
      type: 'er:Attribute',
      businessObject: {
        $type: 'er:Attribute',
        name: attrs.name || 'Atributo',
        isKey: attrs.isKey || false
      },
      width: 80,
      height: 50,
      ...attrs
    });
  }

  createRelationship(attrs: any = {}) {
    return this._elementFactory.createShape({
      type: 'er:Relationship',
      businessObject: {
        $type: 'er:Relationship',
        name: attrs.name || 'Relacionamento'
      },
      width: 100,
      height: 60,
      ...attrs
    });
  }

  createConnection(source: any, target: any, attrs: any = {}) {
    return this._elementFactory.createConnection({
      type: 'er:Connection',
      source: source,
      target: target,
      businessObject: {
        $type: 'er:Connection'
      },
      ...attrs
    });
  }
}