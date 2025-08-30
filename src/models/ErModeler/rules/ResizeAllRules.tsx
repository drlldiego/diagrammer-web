import RuleProvider from 'diagram-js/lib/features/rules/RuleProvider';
import EventBus from 'diagram-js/lib/core/EventBus';

export default class ResizeAllRules extends RuleProvider {
  static $inject = ['eventBus'];

  constructor(eventBus: EventBus) {
    super(eventBus);
    this.init(); 
  }

  public init() {
    this.addRule('shape.resize', 1500, function (context: any) {
      const shape = context.shape;
      
      // Verificar se elemento está dentro de container composto
      const isInsideCompositeContainer = shape?.parent?.type === 'bpmn:SubProcess' && 
                                        shape?.parent?.businessObject?.erType === 'CompositeAttribute';
      
      // Se está dentro de container composto, não permitir redimensionamento
      if (isInsideCompositeContainer) {
        return false;
      }
      
      return true;
    });
  }
}
