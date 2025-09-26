import RuleProvider from 'diagram-js/lib/features/rules/RuleProvider';
import EventBus from 'diagram-js/lib/core/EventBus';

const HIGH_PRIORITY = 1500;

interface ResizeContext {
  shape: any;
  newBounds?: { x: number; y: number; width: number; height: number };
}

export default class ResizeAllRules extends RuleProvider {
  static $inject = ['eventBus'];

  constructor(eventBus: EventBus) {
    super(eventBus);
    this.init(); 
  }

  public init() {
    this.addRule('shape.resize', HIGH_PRIORITY, (context: ResizeContext) => {
      const { shape } = context;
      
      // Elementos que geralmente não devem ser redimensionados
      const nonResizableTypes = [
        'bpmn:StartEvent',
        'bpmn:EndEvent', 
        'bpmn:IntermediateThrowEvent',
        'bpmn:IntermediateCatchEvent',
        'bpmn:BoundaryEvent'
      ];
      
      // Verificar se é um tipo não redimensionável
      if (nonResizableTypes.includes(shape?.type)) {
        return false;
      }
      
      // Por padrão, permitir redimensionamento
      return true;
    });
  }
}

