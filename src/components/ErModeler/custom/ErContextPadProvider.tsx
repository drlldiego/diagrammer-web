// Interfaces para tipagem TypeScript
interface ContextPad {
  registerProvider: (provider: any) => void;
}

interface Create {
  start: (event: Event, shape: any, context?: { source: Element }) => void;
}

interface ErElementFactory {
  createShape: (options: ShapeOptions) => any;
}

interface Modeling {
  removeElements: (elements: Element[]) => void;
}

interface Translate {
  (text: string): string;
}

interface BusinessObject {
  id: string;
  name?: string;
  erType?: string;
  isWeak?: boolean;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  isIdentifying?: boolean;
  cardinalitySource?: string;
  cardinalityTarget?: string;
  dataType?: string;
  isRequired?: boolean;
  $attrs?: { [key: string]: string };
}

interface Element {
  id: string;
  type: string;
  width: number;
  height: number;
  businessObject: BusinessObject;
}

interface ShapeOptions {
  type: string;
  name: string;
  erType: string;
  width: number;
  height: number;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  isRequired?: boolean;
  dataType?: string;
  cardinalitySource?: string;
  cardinalityTarget?: string;
  isIdentifying?: boolean;
  isWeak?: boolean;
}

interface ContextPadEntry {
  group: string;
  className: string;
  title: string;
  action: {
    click: any;
  };
}

interface ContextPadEntries {
  [key: string]: ContextPadEntry;
}

export default function ErContextPadProvider(
  this: any,
  contextPad: ContextPad,
  create: Create,
  erElementFactory: ErElementFactory,
  modeling: Modeling,
  translate: Translate
) {
  contextPad.registerProvider(this);

  this.getContextPadEntries = function(this: any, element: Element): ContextPadEntries {
    const businessObject = element.businessObject;
    
    // Verificar erType tanto em businessObject.erType quanto em $attrs (para elementos importados)
    const erType = businessObject && (
      businessObject.erType || 
      (businessObject.$attrs && (
        businessObject.$attrs['er:erType'] || 
        businessObject.$attrs['ns0:erType']
      ))
    );

    if (!businessObject || !erType) {
      return {};
    }

    const removeElement = (event: Event, element: Element) => {
      modeling.removeElements([element]);
    };

    const deleteEntry: ContextPadEntries = {
      'delete': {
        group: 'edit',
        className: 'bpmn-icon-trash',
        title: translate('Remover'),
        action: {
          click: removeElement
        }
      }
    };

    if (erType === 'Entity') {
      const appendAttribute = (event: Event, element: Element) => {
        const shape = erElementFactory.createShape({
          type: 'bpmn:UserTask',
          name: 'Atributo',
          erType: 'Attribute',
          width: 80,
          height: 50,
          isPrimaryKey: false,
          isForeignKey: false,
          isRequired: true,
          dataType: 'VARCHAR'
        });
        create.start(event, shape, { source: element });
      };

      const appendRelationship = (event: Event, element: Element) => {
        const shape = erElementFactory.createShape({
          type: 'bpmn:IntermediateCatchEvent',
          name: 'Relacionamento',
          erType: 'Relationship',
          width: 140,
          height: 80,
          cardinalitySource: '1',
          cardinalityTarget: 'N',
          isIdentifying: false
        });
        create.start(event, shape, { source: element });
      };

      const appendWeakEntity = (event: Event, element: Element) => {
        const shape = erElementFactory.createShape({
          type: 'bpmn:Task',
          name: 'Entidade Fraca',
          isWeak: true,
          erType: 'Entity',
          width: 120,
          height: 80
        });
        create.start(event, shape, { source: element });
      };

      return {
        'append.attribute': {
          group: 'model',
          className: 'bpmn-icon-er-attribute',
          title: translate('Adicionar atributo'),
          action: {
            click: appendAttribute
          }
        },
        'append.relationship': {
          group: 'model',
          className: 'bpmn-icon-er-relationship',
          title: translate('Adicionar relacionamento'),
          action: {
            click: appendRelationship
          }
        },
        'append.weak-entity': {
          group: 'model',
          className: 'bpmn-icon-er-weak-entity',
          title: translate('Criar entidade fraca conectada'),
          action: {
            click: appendWeakEntity
          }
        },
        ...deleteEntry
      };
    }
    
    // Para Relacionamentos
    if (erType === 'Relationship') {
      const appendEntity = (event: Event, element: Element) => {
        const shape = erElementFactory.createShape({
          type: 'bpmn:Task',
          name: 'Entidade',
          erType: 'Entity',
          width: 120,
          height: 80,
          isWeak: false
        });
        create.start(event, shape, { source: element });
      };

      return {
        'append.entity': {
          group: 'model',
          className: 'bpmn-icon-er-entity',
          title: translate('Conectar a entidade'),
          action: {
            click: appendEntity
          }
        },
        ...deleteEntry
      };
    }
    
    // Para Atributos - só delete
    if (erType === 'Attribute') {
      return deleteEntry;
    }
    
    // Para outros elementos, só delete
    return deleteEntry;
  };

  // Definir prioridade
  this.getContextPadEntries.priority = 1000;
}

ErContextPadProvider.$inject = [
  'contextPad',
  'create',
  'erElementFactory',
  'modeling',
  'translate'
];