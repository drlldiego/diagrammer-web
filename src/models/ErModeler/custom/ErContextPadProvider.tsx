// Interfaces para tipagem TypeScript
interface ContextPad {
  registerProvider: (provider: any) => void;
  open?: (element: any, force?: boolean) => void;
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
  parent?: Element;
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
  // Registrar nosso provider com prioridade máxima
  contextPad.registerProvider(this);
  
  // Interceptar o método open do contextPad para bloquear elementos em containers E seleção múltipla
  const originalOpen = contextPad.open;
  if (originalOpen) {
    contextPad.open = function(element: any, force?: boolean) {
      // Verificar se é seleção múltipla (array de elementos)
      if (Array.isArray(element)) {        
        return; // Não abrir o contextPad para seleção múltipla
      }
      
      // Verificar se elemento está dentro de container composto
      const isInsideCompositeContainer = element?.parent?.type === 'bpmn:SubProcess' && 
                                        element?.parent?.businessObject?.erType === 'CompositeAttribute';
      
      if (isInsideCompositeContainer) {        
        return; // Não abrir o contextPad
      }
      
      // Chamar método original se não está em container e não é seleção múltipla
      return originalOpen.call(this, element, force);
    };
  }
  
  // Também interceptar outros métodos que podem causar o contextPad aparecer
  const originalTrigger = (contextPad as any).trigger;
  if (originalTrigger) {
    (contextPad as any).trigger = function(event: string, context?: any) {
      // Bloquear eventos relacionados a seleção múltipla
      if (context && Array.isArray(context.elements)) {        
        return;
      }
      
      return originalTrigger.call(this, event, context);
    };
  }

  this.getContextPadEntries = function(this: any, element: Element): ContextPadEntries {
    const businessObject = element.businessObject;
    
    // Verificar se é seleção múltipla (elemento Array)
    if (Array.isArray(element)) {      
      return {}; // Bloquear contextPad para seleção múltipla (desabilita align problemático)
    }
    
    // Verificar se é uma conexão (SequenceFlow)
    const isConnection = element.type === 'bpmn:SequenceFlow';
    
    // Verificar se elemento está dentro de container composto
    const isInsideCompositeContainer = element.parent?.type === 'bpmn:SubProcess' && 
                                      element.parent?.businessObject?.erType === 'CompositeAttribute';
    
    // Para conexões, verificar se source ou target estão dentro de container
    let connectionInsideContainer = false;
    if (isConnection) {
      const sourceInsideContainer = (element as any)?.source?.parent?.type === 'bpmn:SubProcess' &&
                                   (element as any)?.source?.parent?.businessObject?.erType === 'CompositeAttribute';
      const targetInsideContainer = (element as any)?.target?.parent?.type === 'bpmn:SubProcess' &&
                                   (element as any)?.target?.parent?.businessObject?.erType === 'CompositeAttribute';
      connectionInsideContainer = sourceInsideContainer || targetInsideContainer;
    }       
    
    // Se está dentro de container composto, não mostrar contextPad
    if (isInsideCompositeContainer) {      
      return {};
    }
    
    // Se é uma conexão que envolve elementos dentro de container, não mostrar contextPad
    if (isConnection && connectionInsideContainer) {      
      return {};
    }
    
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

  // Definir prioridade alta para sobrepor providers padrão
  this.getContextPadEntries.priority = 2000;
}

ErContextPadProvider.$inject = [
  'contextPad',
  'create',
  'erElementFactory',
  'modeling',
  'translate'
];