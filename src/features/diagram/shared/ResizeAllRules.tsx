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
      
      console.log('[ResizeAllRules] Verificando resize para:', {
        shapeId: shape?.id,
        shapeType: shape?.type,
        businessObject: !!shape?.businessObject,
        erType: shape?.businessObject?.erType,
        flowType: shape?.businessObject?.flowType,
        hasFlowAttrs: !!shape?.businessObject?.$attrs?.['flow:flowType']
      });
      
      // Elementos que geralmente não devem ser redimensionados
      const nonResizableTypes = [
        'bpmn:StartEvent',
        'bpmn:EndEvent', 
        'bpmn:IntermediateThrowEvent',
        'bpmn:IntermediateCatchEvent',
        'bpmn:BoundaryEvent'
      ];
      
      
      // CORREÇÃO CRÍTICA: Detectar diagrama Flow PRIMEIRO
      const isInFlowDiagram = document.querySelector('[data-flow-declarative-mode="true"]');
      if (isInFlowDiagram) {
        // Em diagramas Flow, permitir resize para TODOS os elementos exceto eventos
        const flowNonResizableTypes = ['bpmn:StartEvent', 'bpmn:EndEvent'];
        if (flowNonResizableTypes.includes(shape?.type)) {
          console.log(`[ResizeAllRules] Elemento Flow ${shape.type}: NÃO redimensionável (evento)`);
          return false;
        } else {
          console.log(`[ResizeAllRules] Elemento Flow ${shape.type}: REDIMENSIONÁVEL (diagrama flow)`);
          return true;
        }
      }
      
      // Verificar se é um tipo não redimensionável (apenas para ER)
      if (nonResizableTypes.includes(shape?.type)) {
        console.log(`[ResizeAllRules] Elemento ${shape.type}: NÃO redimensionável (tipo bloqueado)`);
        return false;
      }
      
      // Para elementos ER, sempre permitir redimensionamento
      if (shape?.businessObject?.erType) {
        console.log(`[ResizeAllRules] Elemento ER ${shape.businessObject.erType}: REDIMENSIONÁVEL`);
        return true;
      }
      
      // Para outros elementos BPMN, permitir redimensionamento por padrão
      console.log(`[ResizeAllRules] Elemento ${shape?.type}: REDIMENSIONÁVEL (padrão)`);
      return true;
    });
  }
}

