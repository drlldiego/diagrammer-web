interface RulesProvider {
  addRule: (actions: string | string[], priority?: number, fn?: Function) => void;
}

interface Element {
  id: string;
  type: string;
  parent?: Element;
  businessObject?: {
    erType?: string;
    isComposite?: boolean;
    [key: string]: any;
  };
}

interface MoveContext {
  source: Element;
  target: Element;
  position?: { x: number; y: number };
  element: Element;
  elements?: Element[];
}

/**
 * ErRules - Regras customizadas para elementos ER
 * Permite movimento livre de sub-atributos dentro de containers compostos
 */
export default class ErRules {
  static $inject = ['eventBus', 'bpmnRules', 'elementRegistry'];
  
  private eventBus: any;
  private bpmnRules: any;
  private elementRegistry: any;

  constructor(eventBus: any, bpmnRules: any, elementRegistry: any) {
    this.eventBus = eventBus;
    this.bpmnRules = bpmnRules;
    this.elementRegistry = elementRegistry;
    
    console.log('✅ ErRules: Inicializado - testando serviços disponíveis');
    console.log('📋 bpmnRules service:', bpmnRules);
    console.log('📋 métodos disponíveis:', Object.keys(bpmnRules || {}));
    
    this.init();
  }

  private init() {
    // Tentar diferentes abordagens para implementar regras customizadas
    this.setupCustomRules();
  }

  private setupCustomRules() {
    // Abordagem 1: Usar bpmnRules se disponível
    if (this.bpmnRules && typeof this.bpmnRules.addRule === 'function') {
      console.log('🎯 ErRules: Usando bpmnRules.addRule');
      this.addMovementRules();
    } else if (this.bpmnRules && typeof this.bpmnRules.init === 'function') {
      console.log('🎯 ErRules: Tentando abordagem alternativa com bpmnRules');
      this.setupAlternativeRules();
    } else {
      console.log('⚠️ ErRules: bpmnRules não disponível, usando approach baseado em eventos');
      this.setupEventBasedRules();
    }
  }

  private addMovementRules() {
    try {
      this.bpmnRules.addRule(['elements.move', 'element.move'], 1500, (context: any) => {
        return this.canMoveInComposite(context);
      });
      
      console.log('✅ ErRules: Regras de movimento adicionadas via bpmnRules');
    } catch (error) {
      console.warn('⚠️ ErRules: Erro ao adicionar regras via bpmnRules:', error);
      this.setupEventBasedRules();
    }
  }

  private setupAlternativeRules() {
    // Tentar abordagem alternativa se addRule não existir
    console.log('🔄 ErRules: Tentando abordagem alternativa');
    this.setupEventBasedRules();
  }

  private setupEventBasedRules() {
    // Approach baseado em interceptar eventos de movimento
    console.log('🎯 ErRules: Configurando regras baseadas em eventos');
    
    this.eventBus.on('shape.move.start', (event: any) => {
      this.handleMoveStart(event);
    });

    this.eventBus.on('shape.move.move', (event: any) => {
      this.handleMoveProgress(event);
    });

    console.log('✅ ErRules: Event-based rules configuradas');
  }

  private canMoveInComposite(context: any): boolean | null {
    console.log('🔍 ErRules: Contexto completo recebido:', context);
    
    const { element, target, source, shape, shapes } = context;
    
    // Tentar diferentes formas de obter o elemento
    const actualElement = element || shape || (shapes && shapes[0]);
    
    console.log('🔍 ErRules: Elemento detectado:', {
      element: element,
      shape: shape,
      shapes: shapes,
      actualElement: actualElement,
      elementId: actualElement?.id,
      elementType: actualElement?.type,
      businessObject: actualElement?.businessObject,
      erType: actualElement?.businessObject?.erType,
      parent: actualElement?.parent,
      parentErType: actualElement?.parent?.businessObject?.erType
    });

    if (!actualElement) {
      console.log('⚠️ ErRules: Nenhum elemento detectado no contexto');
      return null;
    }

    // Verificar se é um elemento dentro de SubProcess (qualquer elemento)
    const parentIsSubProcess = actualElement?.parent?.type === 'bpmn:SubProcess';
    const parentIsComposite = actualElement?.parent?.businessObject?.erType === 'CompositeAttribute';
    const isInsideComposite = parentIsSubProcess || parentIsComposite;

    console.log('🔍 ErRules: Análise de movimento:', {
      elementId: actualElement.id,
      elementType: actualElement.type,
      parentType: actualElement.parent?.type,
      parentIsSubProcess: parentIsSubProcess,
      parentIsComposite: parentIsComposite,
      isInsideComposite: isInsideComposite
    });

    // BLOQUEAR MOVIMENTO DE QUALQUER ELEMENTO DENTRO DE SUBPROCESS/COMPOSITE
    if (isInsideComposite) {
      console.log('🚫 ErRules: Elemento dentro de container composto - MOVIMENTO BLOQUEADO');
      return false;
    }

    // Se é um elemento ER, sempre permitir movimento livre
    const isErElement = actualElement?.businessObject?.erType;
    if (isErElement) {
      console.log('✅ ErRules: Elemento ER - MOVIMENTO LIVRE PERMITIDO');
      return true;
    }

    console.log('🔍 ErRules: Deixando outras regras decidirem');
    return null; // Deixar outras regras decidirem
  }

  private handleMoveStart(event: any) {
    console.log('🎯 ErRules: shape.move.start event:', event);
    
    const element = event.element || event.shape;
    if (!element) {
      console.log('⚠️ ErRules: Nenhum elemento no evento move.start');
      return;
    }

    console.log('🎯 ErRules: Elemento no move.start:', {
      id: element.id,
      type: element.type,
      erType: element.businessObject?.erType,
      parent: element.parent,
      parentType: element.parent?.type,
      parentErType: element.parent?.businessObject?.erType
    });

    // Verificar se está dentro de SubProcess (container composto)
    const parentIsSubProcess = element.parent?.type === 'bpmn:SubProcess';
    const parentIsComposite = element.parent?.businessObject?.erType === 'CompositeAttribute';

    if (parentIsSubProcess || parentIsComposite) {
      console.log('✅ ErRules: Elemento dentro de container - marcando para movimento livre');
      element._allowMove = true;
      
      // Tentar forçar permissão no evento
      if (event.context) {
        event.context.allowed = true;
      }
      event.allowed = true;
    }
  }

  private handleMoveProgress(event: any) {
    const element = event.element || event.shape;
    if (!element) return;

    if (element._allowMove) {
      console.log('✅ ErRules: Movimento em progresso - forçando permissão:', element.id);
      event.allowed = true;
      if (event.context) {
        event.context.allowed = true;
      }
    }
  }
}