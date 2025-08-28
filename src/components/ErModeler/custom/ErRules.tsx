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
    console.log('🔄 ErRules: Nova lógica de bloqueio - conexões são bloqueadas apenas quando AMBOS os elementos estão no MESMO container');
    
    // Expor globalmente para debug
    (window as any).erRules = this;
    console.log('🔧 ErRules: Instância exposta em window.erRules');
    
    this.init();
    
    // Aplicar bloqueio DOM imediatamente e periodicamente
    setTimeout(() => {
      console.log('🔧 ErRules: Aplicando bloqueio DOM inicial...');
      this.blockConnectionInteractions();
    }, 1000);
    
    // Aplicar bloqueio a cada 2 segundos para garantir que novas conexões sejam bloqueadas
    setInterval(() => {
      this.blockConnectionInteractions();
    }, 2000);
    
    // Adicionar CSS global para bloquear conexões
    this.addGlobalBlockingCSS();
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
      this.addDeletionRules();
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
      // Sobrescrever o método canMove do bpmnRules
      const originalCanMove = this.bpmnRules.canMove.bind(this.bpmnRules);
      
      this.bpmnRules.canMove = (elements: any[], target: any) => {
        console.log('🎯 ErRules: canMove INTERCEPTADO:', { elements, target });
        
        // Verificar cada elemento
        for (const element of elements) {
          const mockContext = {
            element: element,
            shape: element,
            shapes: [element],
            target: target
          };
          
          const result = this.canMoveInComposite(mockContext);
          if (result === false) {
            console.log('🚫 ErRules: Movimento bloqueado pelo ErRules:', element.id);
            return false;
          }
        }
        
        // Se passou pelas nossas verificações, chamar o método original
        console.log('✅ ErRules: Chamando canMove original do bpmnRules');
        return originalCanMove(elements, target);
      };
      
      console.log('✅ ErRules: Método canMove do bpmnRules sobrescrito com sucesso');
    } catch (error) {
      console.warn('⚠️ ErRules: Erro ao sobrescrever canMove do bpmnRules:', error);
      this.setupEventBasedRules();
    }
  }

  private addDeletionRules() {
    try {
      this.bpmnRules.addRule(['elements.delete', 'element.delete'], 1500, (context: any) => {
        return this.canDeleteInComposite(context);
      });
      
      console.log('✅ ErRules: Regras de exclusão adicionadas via bpmnRules');
    } catch (error) {
      console.warn('⚠️ ErRules: Erro ao adicionar regras de exclusão via bpmnRules:', error);
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
    
    // ===== INTERCEPTAÇÃO TOTAL DE EVENTOS =====
    
    // Eventos de movimento de elementos
    this.eventBus.on('shape.move.start', (event: any) => {
      this.handleMoveStart(event);
    });

    this.eventBus.on('shape.move.move', (event: any) => {
      this.handleMoveProgress(event);
    });

    // ===== EVENTOS DE CONEXÃO - MÚLTIPLAS VARIAÇÕES =====
    
    // Eventos básicos de conexão
    this.eventBus.on('connection.move.start', (event: any) => {
      this.handleConnectionMoveStart(event);
    });

    this.eventBus.on('connection.updateWaypoints.start', (event: any) => {
      this.handleConnectionMoveStart(event);
    });

    this.eventBus.on('bendpoint.move.start', (event: any) => {
      this.handleConnectionMoveStart(event);
    });

    // Eventos de waypoint mais específicos
    this.eventBus.on('waypoint.move.start', (event: any) => {
      this.handleConnectionMoveStart(event);
    });

    this.eventBus.on('connectionSegment.move.start', (event: any) => {
      this.handleConnectionMoveStart(event);
    });

    // ===== INTERCEPTAÇÃO MAIS AGRESSIVA =====
    
    // Interceptar TODOS os eventos que começam com connection ou bendpoint
    const originalEventBusFire = this.eventBus.fire;
    this.eventBus.fire = (event: string, context?: any) => {
      // Log TODOS os eventos para debug intenso - MUITO mais agressivo
      if (event.includes('connection') || event.includes('bendpoint') || event.includes('waypoint') || 
          event.includes('move') || event.includes('drag') || event.includes('update') || event.includes('start') || 
          event.includes('end') || event.includes('hover') || event.includes('out') || event.includes('preExecute') ||
          event.includes('execute') || event.includes('postExecute') || event.includes('reverted')) {
        console.log('🔥 ErRules: Evento interceptado:', event, context);
        
        // Se é um evento de movimento de conexão, tentar bloquear
        if ((event.includes('move') || event.includes('update') || event.includes('drag') || 
             event.includes('execute') || event.includes('start')) && context) {
          const result = this.interceptConnectionEvent(event, context);
          if (result === false) {
            console.log('🚫 ErRules: Evento de conexão BLOQUEADO:', event);
            // Tentar diferentes formas de bloquear
            if (context.stopPropagation) context.stopPropagation();
            if (context.preventDefault) context.preventDefault();
            return false; // Tentar retornar false em vez de não propagar
          }
        }
      }
      
      // ===== INTERCEPTAÇÃO AINDA MAIS AGRESSIVA - TODOS OS EVENTOS =====
      // Interceptar QUALQUER evento que pode estar relacionado a movimento
      if (event.includes('move') || event.includes('drag') || event.includes('update') || 
          event.includes('waypoint') || event.includes('bendpoint') || event.includes('segment') ||
          event.includes('execute') || event.includes('preExecute') || event.includes('postExecute')) {
        
        const result = this.interceptConnectionEvent(event, context);
        if (result === false) {
          console.log('🚫 ErRules: Evento geral BLOQUEADO:', event);
          // Tentar diferentes formas de bloquear
          if (context && context.stopPropagation) context.stopPropagation();
          if (context && context.preventDefault) context.preventDefault();
          return false; // Tentar retornar false em vez de não propagar
        }
      }
      
      // Chamar o método original
      return originalEventBusFire.call(this.eventBus, event, context);
    };

    // Eventos de waypoints (pontos intermediários de conexões)
    this.eventBus.on('bendpoint.move.move', (event: any) => {
      this.handleConnectionMoveProgress(event);
    });

    this.eventBus.on('connection.updateWaypoints.move', (event: any) => {
      this.handleConnectionMoveProgress(event);
    });

    // Eventos de drag and drop mais gerais
    this.eventBus.on('element.hover', (event: any) => {
      this.checkConnectionBlockOnHover(event);
    });

    this.eventBus.on('drag.start', (event: any) => {
      this.handleDragStart(event);
    });

    // Eventos mais específicos para manipulação de waypoints
    this.eventBus.on('bendpoint.move.hover', (event: any) => {
      this.handleBendpointHover(event);
    });

    this.eventBus.on('bendpoint.move.out', (event: any) => {
      this.handleBendpointOut(event);
    });

    this.eventBus.on('connection.added', (event: any) => {
      this.handleConnectionAdded(event);
    });

    // Eventos de baixo nível para manipulação de conexões
    this.eventBus.on('element.mousedown', (event: any) => {
      this.handleElementMouseDown(event);
    });

    this.eventBus.on('canvas.init', () => {
      this.setupCanvasInterceptors();
    });

    // Interceptar tentativas de exclusão
    this.eventBus.on('element.remove.preExecute', (event: any) => {
      this.handleDeleteAttempt(event);
    });

    this.eventBus.on('elements.delete.preExecute', (event: any) => {
      this.handleDeleteAttempt(event);
    });

    // NOVO: Interceptar mudanças nos elementos para re-avaliar bloqueios
    this.eventBus.on('elements.changed', (event: any) => {
      if (event.elements && event.elements.some((el: any) => el.type === 'bpmn:SequenceFlow')) {
        console.log('🔄 ErRules: Conexões mudaram, re-avaliando bloqueios...');
        setTimeout(() => {
          this.blockConnectionInteractions();
        }, 100);
      }
    });

    this.eventBus.on('element.changed', (event: any) => {
      if (event.element?.type === 'bpmn:SequenceFlow') {
        console.log('🔄 ErRules: Conexão mudou, re-avaliando bloqueios...');
        setTimeout(() => {
          this.blockConnectionInteractions();
        }, 100);
      }
    });

    // NOVO: Interceptar movimentação de elementos para re-avaliar conexões
    this.eventBus.on('elements.move.postExecute', (event: any) => {
      console.log('🔄 ErRules: Elementos movidos, re-avaliando conexões...');
      setTimeout(() => {
        this.blockConnectionInteractions();
      }, 200);
    });

    console.log('✅ ErRules: Event-based rules configuradas (movimento + exclusão + conexões + re-avaliação)');
  }

  private canMoveInComposite(context: any): boolean | null {
    console.log('🎯🎯🎯 ErRules: MOVIMENTO DETECTADO - Contexto completo recebido:', context);
    
    const { element, target, source, shape, shapes, connection } = context;
    
    // Tentar diferentes formas de obter o elemento
    const actualElement = element || shape || connection || (shapes && shapes[0]);
    
    // Verificar se é uma operação específica de waypoint/bendpoint
    const isWaypointOperation = context.waypoint || context.bendpoint || 
                               (typeof context === 'object' && context.constructor?.name === 'BendpointMove');
    
    console.log('🔍 ErRules: Elemento detectado:', {
      element: element,
      shape: shape,
      shapes: shapes,
      connection: connection,
      actualElement: actualElement,
      elementId: actualElement?.id,
      elementType: actualElement?.type,
      businessObject: actualElement?.businessObject,
      erType: actualElement?.businessObject?.erType,
      parent: actualElement?.parent,
      parentErType: actualElement?.parent?.businessObject?.erType,
      isWaypointOperation: isWaypointOperation
    });

    if (!actualElement) {
      console.log('⚠️ ErRules: Nenhum elemento detectado no contexto');
      return null;
    }

    // Verificar se é uma conexão (SequenceFlow)
    const isConnection = actualElement?.type === 'bpmn:SequenceFlow';
    
    // Para conexões, verificar se source OU target estão dentro de container
    let connectionInsideContainer = false;
    let sourceInfo = null;
    let targetInfo = null;
    
    if (isConnection) {
      // NOVA LÓGICA: Verificar se source E target estão dentro do MESMO container
      // Se estão em containers diferentes ou apenas um está em container, permitir seleção
      const sourceInsideContainer = actualElement?.source?.parent?.type === 'bpmn:SubProcess' &&
                                   actualElement?.source?.parent?.businessObject?.erType === 'CompositeAttribute';
      const targetInsideContainer = actualElement?.target?.parent?.type === 'bpmn:SubProcess' &&
                                   actualElement?.target?.parent?.businessObject?.erType === 'CompositeAttribute';
      
      // Verificar se estão no mesmo container
      const sameContainer = sourceInsideContainer && targetInsideContainer &&
                           actualElement?.source?.parent?.id === actualElement?.target?.parent?.id;
      
      sourceInfo = {
        id: actualElement?.source?.id,
        parentType: actualElement?.source?.parent?.type,
        parentErType: actualElement?.source?.parent?.businessObject?.erType,
        parentId: actualElement?.source?.parent?.id,
        insideContainer: sourceInsideContainer
      };
      
      targetInfo = {
        id: actualElement?.target?.id,
        parentType: actualElement?.target?.parent?.type,
        parentErType: actualElement?.target?.parent?.businessObject?.erType,
        parentId: actualElement?.target?.parent?.id,
        insideContainer: targetInsideContainer
      };
      
      // BLOQUEAR apenas se AMBOS estão no MESMO container
      connectionInsideContainer = sameContainer;
      
      console.log('🔍 ErRules: Análise de container para conexão:', {
        connectionId: actualElement?.id,
        sourceInsideContainer,
        targetInsideContainer,
        sameContainer,
        connectionInsideContainer,
        sourceParentId: actualElement?.source?.parent?.id,
        targetParentId: actualElement?.target?.parent?.id
      });
    }
    
    // Verificar se é um elemento dentro de SubProcess (qualquer elemento)
    const parentIsSubProcess = actualElement?.parent?.type === 'bpmn:SubProcess';
    const parentIsComposite = actualElement?.parent?.businessObject?.erType === 'CompositeAttribute';
    const isInsideComposite = parentIsSubProcess || parentIsComposite;

    console.log('🔍 ErRules: Análise de movimento:', {
      elementId: actualElement.id,
      elementType: actualElement.type,
      isConnection: isConnection,
      parentType: actualElement.parent?.type,
      parentIsSubProcess: parentIsSubProcess,
      parentIsComposite: parentIsComposite,
      isInsideComposite: isInsideComposite,
      connectionInsideContainer: connectionInsideContainer,
      sourceInfo: sourceInfo,
      targetInfo: targetInfo
    });

    // ===== PRIORIDADE 1: BLOQUEAR CONEXÕES DENTRO DE CONTAINERS =====
    // BLOQUEAR MOVIMENTO DE CONEXÕES QUE ENVOLVEM ELEMENTOS DENTRO DE CONTAINERS
    if (isConnection && connectionInsideContainer) {
      console.log('🚫 ErRules: Conexão com elementos dentro de container - MOVIMENTO BLOQUEADO');
      console.log('🚫   Source:', sourceInfo);
      console.log('🚫   Target:', targetInfo);
      console.log('🚫   Operação waypoint:', isWaypointOperation);
      return false;
    }

    // BLOQUEAR ESPECIFICAMENTE OPERAÇÕES DE WAYPOINT EM CONEXÕES BLOQUEADAS
    if (isWaypointOperation && isConnection && connectionInsideContainer) {
      console.log('🚫 ErRules: Operação de waypoint/bendpoint em conexão de container - BLOQUEADO');
      return false;
    }

    // ===== PRIORIDADE 2: BLOQUEAR ELEMENTOS DENTRO DE CONTAINERS =====
    // BLOQUEAR MOVIMENTO DE QUALQUER ELEMENTO DENTRO DE SUBPROCESS/COMPOSITE (exceto se for elemento ER fora de containers)
    if (isInsideComposite && !isConnection) {
      console.log('🚫 ErRules: Elemento dentro de container composto - MOVIMENTO BLOQUEADO');
      return false;
    }

    // ===== PRIORIDADE 3: PERMITIR ELEMENTOS ER FORA DE CONTAINERS =====
    // Se é um elemento ER fora de containers, sempre permitir movimento livre
    const isErElement = actualElement?.businessObject?.erType;
    if (isErElement && !isConnection && !isInsideComposite) {
      console.log('✅ ErRules: Elemento ER fora de containers - MOVIMENTO LIVRE PERMITIDO');
      return true;
    }

    console.log('🔍 ErRules: Deixando outras regras decidirem');
    return null; // Deixar outras regras decidirem
  }

  private canDeleteInComposite(context: any): boolean | null {
    console.log('🔍 ErRules: Contexto de exclusão recebido:', context);
    
    const { element, elements, shape } = context;
    
    // Tentar diferentes formas de obter o elemento/elementos
    const actualElements = elements || (element ? [element] : (shape ? [shape] : []));
    
    if (actualElements.length === 0) {
      console.log('⚠️ ErRules: Nenhum elemento detectado no contexto de exclusão');
      return null;
    }

    console.log('🔍 ErRules: Elementos para exclusão:', actualElements.map((el: any) => ({
      id: el.id,
      type: el.type,
      erType: el.businessObject?.erType
    })));

    // Verificar cada elemento
    for (const actualElement of actualElements) {
      // Verificar se é uma conexão (SequenceFlow)
      const isConnection = actualElement?.type === 'bpmn:SequenceFlow';
      
      // Verificar se é um elemento dentro de SubProcess
      const isInsideComposite = actualElement?.parent?.type === 'bpmn:SubProcess' && 
                               actualElement?.parent?.businessObject?.erType === 'CompositeAttribute';
      
      // Para conexões, verificar se source E target estão dentro do MESMO container
      let connectionInsideContainer = false;
      if (isConnection) {
        const sourceInsideContainer = actualElement?.source?.parent?.type === 'bpmn:SubProcess' &&
                                     actualElement?.source?.parent?.businessObject?.erType === 'CompositeAttribute';
        const targetInsideContainer = actualElement?.target?.parent?.type === 'bpmn:SubProcess' &&
                                     actualElement?.target?.parent?.businessObject?.erType === 'CompositeAttribute';
        
        // BLOQUEAR apenas se AMBOS estão no MESMO container
        const sameContainer = sourceInsideContainer && targetInsideContainer &&
                             actualElement?.source?.parent?.id === actualElement?.target?.parent?.id;
        connectionInsideContainer = sameContainer;
      }

      console.log('🔍 ErRules: Análise de exclusão para', actualElement.id, ':', {
        elementType: actualElement.type,
        isConnection: isConnection,
        isInsideComposite: isInsideComposite,
        connectionInsideContainer: connectionInsideContainer
      });

      // BLOQUEAR EXCLUSÃO DE CONEXÕES QUE ENVOLVEM ELEMENTOS DENTRO DE CONTAINERS
      if (isConnection && connectionInsideContainer) {
        console.log('🚫 ErRules: Conexão com elementos dentro de container - EXCLUSÃO BLOQUEADA');
        return false;
      }

      // BLOQUEAR EXCLUSÃO DE ELEMENTOS DENTRO DE CONTAINERS
      if (isInsideComposite) {
        console.log('🚫 ErRules: Elemento dentro de container composto - EXCLUSÃO BLOQUEADA');
        return false;
      }
    }

    console.log('✅ ErRules: Exclusão permitida para todos os elementos');
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

  private handleConnectionMoveStart(event: any) {
    console.log('🎯 ErRules: connection move event:', event);
    
    const connection = event.element || event.connection || event.shape;
    if (!connection) {
      console.log('⚠️ ErRules: Nenhuma conexão no evento connection move');
      return;
    }

    console.log('🎯 ErRules: Conexão no connection move:', {
      id: connection.id,
      type: connection.type,
      sourceId: connection.source?.id,
      targetId: connection.target?.id,
      sourceParent: connection.source?.parent?.type,
      targetParent: connection.target?.parent?.type
    });

    // Verificar se source E target estão dentro do MESMO container
    const sourceInsideContainer = connection.source?.parent?.type === 'bpmn:SubProcess' &&
                                 connection.source?.parent?.businessObject?.erType === 'CompositeAttribute';
    const targetInsideContainer = connection.target?.parent?.type === 'bpmn:SubProcess' &&
                                 connection.target?.parent?.businessObject?.erType === 'CompositeAttribute';

    const sameContainer = sourceInsideContainer && targetInsideContainer &&
                         connection.source?.parent?.id === connection.target?.parent?.id;

    if (sameContainer) {
      console.log('🚫 ErRules: Bloqueando movimento de conexão - elementos em container');
      console.log('🚫   Source in container:', sourceInsideContainer);
      console.log('🚫   Target in container:', targetInsideContainer);
      
      // Tentar bloquear o evento
      if (event.stopPropagation) event.stopPropagation();
      if (event.preventDefault) event.preventDefault();
      
      // Marcar como não permitido
      event.allowed = false;
      if (event.context) {
        event.context.allowed = false;
      }
      
      return false;
    }

    console.log('✅ ErRules: Movimento de conexão permitido');
    return true;
  }

  private handleConnectionMoveProgress(event: any) {
    console.log('🎯 ErRules: connection move progress event:', event);
    
    const connection = event.element || event.connection || event.shape;
    if (!connection || connection.type !== 'bpmn:SequenceFlow') return;

    // Verificar se source E target estão dentro do MESMO container
    const sourceInsideContainer = connection.source?.parent?.type === 'bpmn:SubProcess' &&
                                 connection.source?.parent?.businessObject?.erType === 'CompositeAttribute';
    const targetInsideContainer = connection.target?.parent?.type === 'bpmn:SubProcess' &&
                                 connection.target?.parent?.businessObject?.erType === 'CompositeAttribute';

    const sameContainer = sourceInsideContainer && targetInsideContainer &&
                         connection.source?.parent?.id === connection.target?.parent?.id;

    if (sameContainer) {
      console.log('🚫 ErRules: Bloqueando progresso do movimento de conexão');
      
      // Bloquear o evento
      if (event.stopPropagation) event.stopPropagation();
      if (event.preventDefault) event.preventDefault();
      
      event.allowed = false;
      if (event.context) {
        event.context.allowed = false;
      }
      
      return false;
    }

    return true;
  }

  private checkConnectionBlockOnHover(event: any) {
    const element = event.element;
    if (!element || element.type !== 'bpmn:SequenceFlow') return;

    // Verificar se é uma conexão que deve ser bloqueada (ambos no mesmo container)
    const sourceInsideContainer = element.source?.parent?.type === 'bpmn:SubProcess' &&
                                 element.source?.parent?.businessObject?.erType === 'CompositeAttribute';
    const targetInsideContainer = element.target?.parent?.type === 'bpmn:SubProcess' &&
                                 element.target?.parent?.businessObject?.erType === 'CompositeAttribute';

    const sameContainer = sourceInsideContainer && targetInsideContainer &&
                         element.source?.parent?.id === element.target?.parent?.id;

    if (sameContainer) {
      // Adicionar uma classe CSS para indicar que não pode ser movida
      if (element.node && element.node.classList) {
        element.node.classList.add('er-connection-blocked');
      }
    }
  }

  private handleDragStart(event: any) {
    console.log('🎯 ErRules: drag start event:', event);
    
    const element = event.element || event.shape;
    if (!element) return;

    if (element.type === 'bpmn:SequenceFlow') {
      const sourceInsideContainer = element.source?.parent?.type === 'bpmn:SubProcess' &&
                                   element.source?.parent?.businessObject?.erType === 'CompositeAttribute';
      const targetInsideContainer = element.target?.parent?.type === 'bpmn:SubProcess' &&
                                   element.target?.parent?.businessObject?.erType === 'CompositeAttribute';

      const sameContainer = sourceInsideContainer && targetInsideContainer &&
                           element.source?.parent?.id === element.target?.parent?.id;

      if (sameContainer) {
        console.log('🚫 ErRules: Bloqueando drag start para conexão em container');
        
        if (event.stopPropagation) event.stopPropagation();
        if (event.preventDefault) event.preventDefault();
        
        event.allowed = false;
        if (event.context) {
          event.context.allowed = false;
        }
        
        return false;
      }
    }

    return true;
  }

  private handleBendpointHover(event: any) {
    const connection = event.element;
    if (!connection || connection.type !== 'bpmn:SequenceFlow') return;

    const sourceInsideContainer = connection.source?.parent?.type === 'bpmn:SubProcess' &&
                                 connection.source?.parent?.businessObject?.erType === 'CompositeAttribute';
    const targetInsideContainer = connection.target?.parent?.type === 'bpmn:SubProcess' &&
                                 connection.target?.parent?.businessObject?.erType === 'CompositeAttribute';

    const sameContainer = sourceInsideContainer && targetInsideContainer &&
                         connection.source?.parent?.id === connection.target?.parent?.id;

    if (sameContainer) {
      console.log('🚫 ErRules: Bloqueando hover em bendpoint de conexão em container');
      
      // Bloquear o hover para evitar que waypoints apareçam
      if (event.stopPropagation) event.stopPropagation();
      if (event.preventDefault) event.preventDefault();
      
      event.allowed = false;
      return false;
    }

    return true;
  }

  private handleBendpointOut(event: any) {
    // Similar ao hover, mas para quando sai do bendpoint
    return this.handleBendpointHover(event);
  }

  private handleConnectionAdded(event: any) {
    const connection = event.element;
    if (!connection || connection.type !== 'bpmn:SequenceFlow') return;

    // Verificar se a nova conexão envolve elementos no MESMO container
    const sourceInsideContainer = connection.source?.parent?.type === 'bpmn:SubProcess' &&
                                 connection.source?.parent?.businessObject?.erType === 'CompositeAttribute';
    const targetInsideContainer = connection.target?.parent?.type === 'bpmn:SubProcess' &&
                                 connection.target?.parent?.businessObject?.erType === 'CompositeAttribute';

    const sameContainer = sourceInsideContainer && targetInsideContainer &&
                         connection.source?.parent?.id === connection.target?.parent?.id;

    if (sameContainer) {
      console.log('🔍 ErRules: Nova conexão com elementos em container detectada:', connection.id);
      
      // Adicionar uma classe CSS para identificar conexões bloqueadas
      setTimeout(() => {
        if (connection.node) {
          connection.node.classList.add('er-connection-blocked');
          connection.node.style.pointerEvents = 'none'; // Bloquear eventos de mouse
          
          // Também bloquear nos filhos (waypoints, etc.)
          const children = connection.node.querySelectorAll('*');
          children.forEach((child: any) => {
            child.style.pointerEvents = 'none';
          });
          
          console.log('🚫 ErRules: DOM bloqueado para nova conexão:', connection.id);
        }
      }, 100);

      // Re-aplicar bloqueio em todas as conexões para garantir
      setTimeout(() => {
        this.blockConnectionInteractions();
      }, 500);
    }
  }

  private handleElementMouseDown(event: any) {
    console.log('🎯 ErRules: element.mousedown:', event);
    
    const element = event.element;
    if (!element) return;

    // Se é uma conexão que deveria ser bloqueada (ambos no mesmo container)
    if (element.type === 'bpmn:SequenceFlow') {
      const sourceInsideContainer = element.source?.parent?.type === 'bpmn:SubProcess' &&
                                   element.source?.parent?.businessObject?.erType === 'CompositeAttribute';
      const targetInsideContainer = element.target?.parent?.type === 'bpmn:SubProcess' &&
                                   element.target?.parent?.businessObject?.erType === 'CompositeAttribute';

      const sameContainer = sourceInsideContainer && targetInsideContainer &&
                           element.source?.parent?.id === element.target?.parent?.id;

      if (sameContainer) {
        console.log('🚫 ErRules: Bloqueando mousedown em conexão de container');
        
        if (event.originalEvent) {
          event.originalEvent.stopPropagation();
          event.originalEvent.preventDefault();
        }
        
        if (event.stopPropagation) event.stopPropagation();
        if (event.preventDefault) event.preventDefault();
        
        return false;
      }
    }

    return true;
  }

  private setupCanvasInterceptors() {
    console.log('🎯 ErRules: Configurando interceptors do canvas');
    
    // Aguardar um pouco para que o canvas esteja completamente carregado
    setTimeout(() => {
      this.blockConnectionInteractions();
    }, 1000);

    // Executar periodicamente para garantir que conexões novas sejam bloqueadas
    setInterval(() => {
      console.log('🔄 ErRules: Verificação periódica de conexões...');
      this.blockConnectionInteractions();
    }, 5000);
  }

  private blockConnectionInteractions() {
    if (!this.elementRegistry) return;

    console.log('🎯 ErRules: Bloqueando interações diretas no DOM');

    const allElements = this.elementRegistry.getAll();
    
    // Lista para armazenar conexões bloqueadas
    const blockedConnections: string[] = [];
    
    allElements.forEach((element: any) => {
      if (element.type === 'bpmn:SequenceFlow') {
        console.log('🔍 ErRules: Analisando conexão:', {
          id: element.id,
          sourceId: element.source?.id,
          targetId: element.target?.id,
          sourceParentType: element.source?.parent?.type,
          sourceParentErType: element.source?.parent?.businessObject?.erType,
          targetParentType: element.target?.parent?.type,
          targetParentErType: element.target?.parent?.businessObject?.erType
        });

        const sourceInsideContainer = element.source?.parent?.type === 'bpmn:SubProcess' &&
                                     element.source?.parent?.businessObject?.erType === 'CompositeAttribute';
        const targetInsideContainer = element.target?.parent?.type === 'bpmn:SubProcess' &&
                                     element.target?.parent?.businessObject?.erType === 'CompositeAttribute';

        // BLOQUEAR apenas se AMBOS estão no MESMO container
        const sameContainer = sourceInsideContainer && targetInsideContainer &&
                             element.source?.parent?.id === element.target?.parent?.id;

        console.log('🔍 ErRules: Resultado da análise de container:', {
          connectionId: element.id,
          sourceInsideContainer,
          targetInsideContainer,
          sameContainer,
          shouldBlock: sameContainer,
          sourceParentId: element.source?.parent?.id,
          targetParentId: element.target?.parent?.id
        });

        if (sameContainer) {
          console.log('🚫 ErRules: Aplicando bloqueio DOM para conexão:', element.id);
          blockedConnections.push(element.id);
          
          if (element.node) {
            // Aplicar classe de bloqueio (CSS já definido cuida do resto)
            element.node.classList.add('er-connection-blocked');
            
            // Aplicar bloqueio apenas nos elementos da conexão bloqueada
            element.node.style.pointerEvents = 'none';
            element.node.style.cursor = 'not-allowed';
            element.node.style.opacity = '0.7';
            
            // Também bloquear nos filhos (waypoints, etc.)
            const children = element.node.querySelectorAll('*');
            children.forEach((child: any) => {
              child.style.pointerEvents = 'none';
              child.style.cursor = 'not-allowed';
            });

            // Adicionar listeners de eventos para bloquear completamente
            const blockEvent = (e: Event) => {
              e.stopPropagation();
              e.preventDefault();
              console.log('🚫 ErRules: Evento DOM bloqueado para conexão:', element.id, e.type);
              return false;
            };

            // Remover listeners antigos se existirem
            element.node.removeEventListener('mousedown', blockEvent, true);
            element.node.removeEventListener('mousemove', blockEvent, true);
            element.node.removeEventListener('mouseup', blockEvent, true);
            element.node.removeEventListener('click', blockEvent, true);
            element.node.removeEventListener('dragstart', blockEvent, true);
            element.node.removeEventListener('drag', blockEvent, true);

            // Adicionar novos listeners
            element.node.addEventListener('mousedown', blockEvent, true);
            element.node.addEventListener('mousemove', blockEvent, true);
            element.node.addEventListener('mouseup', blockEvent, true);
            element.node.addEventListener('click', blockEvent, true);
            element.node.addEventListener('dragstart', blockEvent, true);
            element.node.addEventListener('drag', blockEvent, true);
            
            // Bloquear também nos filhos
            children.forEach((child: any) => {
              child.removeEventListener('mousedown', blockEvent, true);
              child.removeEventListener('mousemove', blockEvent, true);
              child.removeEventListener('mouseup', blockEvent, true);
              child.removeEventListener('click', blockEvent, true);
              child.removeEventListener('dragstart', blockEvent, true);
              child.removeEventListener('drag', blockEvent, true);

              child.addEventListener('mousedown', blockEvent, true);
              child.addEventListener('mousemove', blockEvent, true);
              child.addEventListener('mouseup', blockEvent, true);
              child.addEventListener('click', blockEvent, true);
              child.addEventListener('dragstart', blockEvent, true);
              child.addEventListener('drag', blockEvent, true);
            });
          }
        } else {
          console.log('✅ ErRules: Conexão não bloqueada (fora de containers):', element.id);
          
          // GARANTIR que conexões fora de containers sejam selecionáveis
          if (element.node) {
            // Remover classe de bloqueio se existir
            element.node.classList.remove('er-connection-blocked');
            
            // Restaurar propriedades normais de interação
            element.node.style.pointerEvents = '';
            element.node.style.cursor = '';
            element.node.style.opacity = '';
            
            // Restaurar nos filhos também
            const children = element.node.querySelectorAll('*');
            children.forEach((child: any) => {
              child.style.pointerEvents = '';
              child.style.cursor = '';
            });
            
            console.log('🔧 ErRules: Propriedades de interação restauradas para conexão:', element.id);
          }
        }
      }
    });

    console.log('📊 ErRules: Total de conexões bloqueadas:', blockedConnections.length, blockedConnections);

    // Adicionar bloqueio global para qualquer tentativa de manipular conexões bloqueadas
    this.setupGlobalConnectionBlocking(blockedConnections);
  }

  private setupGlobalConnectionBlocking(blockedConnectionIds: string[]) {
    console.log('🎯 ErRules: Configurando bloqueio global para conexões:', blockedConnectionIds);

    // Interceptar eventos globais de mouse que podem estar manipulando conexões
    const globalBlockEvent = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Verificar se o alvo ou algum ancestral é uma conexão bloqueada
      let currentElement: HTMLElement | null = target;
      while (currentElement && currentElement !== document.body) {
        // Verificar se é uma conexão e se está na lista de bloqueadas
        if (currentElement.classList && currentElement.classList.contains('er-connection-blocked')) {
          console.log('🚫 ErRules: Evento global bloqueado em conexão bloqueada:', e.type, currentElement);
          e.stopPropagation();
          e.preventDefault();
          return false;
        }

        // Verificar se tem atributo data-element-id que corresponde a uma conexão bloqueada
        const elementId = currentElement.getAttribute?.('data-element-id');
        if (elementId && blockedConnectionIds.includes(elementId)) {
          console.log('🚫 ErRules: Evento global bloqueado para conexão por ID:', e.type, elementId);
          e.stopPropagation();
          e.preventDefault();
          return false;
        }

        currentElement = currentElement.parentElement;
      }
    };

    // Remover listeners antigos
    document.removeEventListener('mousedown', globalBlockEvent, true);
    document.removeEventListener('mousemove', globalBlockEvent, true);
    document.removeEventListener('mouseup', globalBlockEvent, true);
    document.removeEventListener('dragstart', globalBlockEvent, true);

    // Adicionar novos listeners globais
    document.addEventListener('mousedown', globalBlockEvent, true);
    document.addEventListener('mousemove', globalBlockEvent, true);
    document.addEventListener('mouseup', globalBlockEvent, true);
    document.addEventListener('dragstart', globalBlockEvent, true);

    console.log('✅ ErRules: Bloqueio global configurado para', blockedConnectionIds.length, 'conexões');
  }

  private handleDeleteAttempt(event: any) {
    console.log('🎯 ErRules: Tentativa de exclusão interceptada:', event);
    
    const context = event.context || event;
    const elements = context.elements || (context.element ? [context.element] : []);
    
    if (elements.length === 0) {
      console.log('⚠️ ErRules: Nenhum elemento na tentativa de exclusão');
      return;
    }

    // Verificar cada elemento para exclusão
    for (const element of elements) {
      // Verificar se é uma conexão
      const isConnection = element?.type === 'bpmn:SequenceFlow';
      
      // Verificar se está dentro de container
      const isInsideComposite = element?.parent?.type === 'bpmn:SubProcess' && 
                               element?.parent?.businessObject?.erType === 'CompositeAttribute';
      
      // Para conexões, verificar se source E target estão no MESMO container
      let connectionInsideContainer = false;
      if (isConnection) {
        const sourceInsideContainer = element?.source?.parent?.type === 'bpmn:SubProcess' &&
                                     element?.source?.parent?.businessObject?.erType === 'CompositeAttribute';
        const targetInsideContainer = element?.target?.parent?.type === 'bpmn:SubProcess' &&
                                     element?.target?.parent?.businessObject?.erType === 'CompositeAttribute';
        
        // BLOQUEAR apenas se AMBOS estão no MESMO container
        const sameContainer = sourceInsideContainer && targetInsideContainer &&
                             element?.source?.parent?.id === element?.target?.parent?.id;
        connectionInsideContainer = sameContainer;
      }

      // Bloquear exclusão se necessário
      if (isInsideComposite || (isConnection && connectionInsideContainer)) {
        console.log('🚫 ErRules: Bloqueando tentativa de exclusão via evento:', element.id);
        event.stopPropagation();
        event.preventDefault();
        return false;
      }
    }

    console.log('✅ ErRules: Exclusão via evento permitida');
    return true;
  }

  private interceptConnectionEvent(eventName: string, context: any): boolean | null {
    console.log('🔍 ErRules: Interceptando evento de conexão:', eventName, context);
    
    if (!context) {
      console.log('⚠️ ErRules: Contexto não fornecido para interceptação');
      return null;
    }

    // Tentar extrair conexão do contexto
    const connection = context.connection || context.element || context.shape || 
                      (context.elements && context.elements[0]);
    
    if (!connection) {
      console.log('⚠️ ErRules: Nenhuma conexão encontrada no contexto');
      return null;
    }

    console.log('🔍 ErRules: Analisando conexão interceptada:', {
      eventName,
      connectionId: connection.id,
      connectionType: connection.type,
      sourceId: connection.source?.id,
      targetId: connection.target?.id
    });

    // Verificar se é uma conexão
    if (connection.type !== 'bpmn:SequenceFlow') {
      console.log('🔍 ErRules: Não é uma conexão SequenceFlow, permitindo');
      return null;
    }

    // Verificar se source E target estão dentro do MESMO container
    const sourceInsideContainer = connection.source?.parent?.type === 'bpmn:SubProcess' &&
                                 connection.source?.parent?.businessObject?.erType === 'CompositeAttribute';
    const targetInsideContainer = connection.target?.parent?.type === 'bpmn:SubProcess' &&
                                 connection.target?.parent?.businessObject?.erType === 'CompositeAttribute';

    const sameContainer = sourceInsideContainer && targetInsideContainer &&
                         connection.source?.parent?.id === connection.target?.parent?.id;
    const connectionInsideContainer = sameContainer;

    console.log('🔍 ErRules: Resultado da análise de interceptação:', {
      connectionId: connection.id,
      sourceInsideContainer,
      targetInsideContainer,
      connectionInsideContainer,
      shouldBlock: connectionInsideContainer
    });

    if (connectionInsideContainer) {
      console.log('🚫 ErRules: Interceptando evento para conexão em container:', connection.id, eventName);
      return false; // Bloquear o evento
    }

    console.log('✅ ErRules: Evento de conexão permitido:', connection.id, eventName);
    return null; // Permitir o evento (ou deixar outros decidirem)
  }

  // Método público para forçar bloqueio (útil para debug)
  public forceBlockConnections() {
    console.log('🎯 ErRules: Forçando bloqueio de conexões (chamada externa)');
    this.blockConnectionInteractions();
  }

  // Método público para listar todas as conexões (útil para debug)
  public listAllConnections() {
    if (!this.elementRegistry) {
      console.log('❌ ErRules: elementRegistry não disponível');
      return;
    }

    const allElements = this.elementRegistry.getAll();
    const connections = allElements.filter((el: any) => el.type === 'bpmn:SequenceFlow');
    
    console.log('🔍 ErRules: Listando todas as conexões:', connections.length);
    connections.forEach((conn: any) => {
      console.log('🔗', {
        id: conn.id,
        sourceId: conn.source?.id,
        targetId: conn.target?.id,
        sourceParent: conn.source?.parent?.id,
        targetParent: conn.target?.parent?.id,
        sourceParentType: conn.source?.parent?.type,
        targetParentType: conn.target?.parent?.type
      });
    });
    
    return connections;
  }

  // Método público para testar regras manualmente
  public testMoveRule(connectionId: string) {
    if (!this.elementRegistry) {
      console.log('❌ ErRules: elementRegistry não disponível');
      return;
    }

    const connection = this.elementRegistry.get(connectionId);
    if (!connection) {
      console.log('❌ ErRules: Conexão não encontrada:', connectionId);
      return;
    }

    console.log('🧪 ErRules: Testando regra de movimento para:', connectionId);
    
    const mockContext = {
      element: connection,
      shape: connection,
      connection: connection
    };

    const result = this.canMoveInComposite(mockContext);
    console.log('🧪 ErRules: Resultado do teste:', result);
    
    return result;
  }

  // Método para testar se regras de movimento estão sendo chamadas
  public testRulesCalled() {
    console.log('🧪 ErRules: Testando se regras estão sendo chamadas...');
    console.log('📋 bpmnRules disponível:', !!this.bpmnRules);
    console.log('📋 addRule disponível:', typeof this.bpmnRules?.addRule);
  }

  // Método público para restaurar TODAS as conexões (útil para debug/correção)
  public restoreAllConnections() {
    console.log('🔧 ErRules: Restaurando TODAS as conexões para estado selecionável');
    
    if (!this.elementRegistry) {
      console.log('❌ ErRules: elementRegistry não disponível');
      return;
    }

    const allElements = this.elementRegistry.getAll();
    const connections = allElements.filter((el: any) => el.type === 'bpmn:SequenceFlow');
    
    console.log('🔧 ErRules: Restaurando', connections.length, 'conexões');
    
    connections.forEach((connection: any) => {
      if (connection.node) {
        // Remover classe de bloqueio
        connection.node.classList.remove('er-connection-blocked');
        
        // Restaurar propriedades normais
        connection.node.style.pointerEvents = '';
        connection.node.style.cursor = '';
        connection.node.style.opacity = '';
        connection.node.style.userSelect = '';
        connection.node.style.touchAction = '';
        connection.node.style.webkitUserSelect = '';
        connection.node.style.mozUserSelect = '';
        connection.node.style.msUserSelect = '';
        
        // Restaurar nos filhos
        const children = connection.node.querySelectorAll('*');
        children.forEach((child: any) => {
          child.style.pointerEvents = '';
          child.style.cursor = '';
          child.style.userSelect = '';
          child.style.touchAction = '';
          child.style.webkitUserSelect = '';
          child.style.mozUserSelect = '';
          child.style.msUserSelect = '';
        });
        
        console.log('✅ ErRules: Conexão restaurada:', connection.id);
      }
    });
    
    // Reprocessar bloqueios apenas para conexões que realmente devem ser bloqueadas
    setTimeout(() => {
      this.blockConnectionInteractions();
    }, 100);
    
    console.log('🏁 ErRules: Restauração completa - apenas conexões em containers serão bloqueadas');
  }

  // Método público específico para desagrupamento
  public handleUngrouping(formerContainerElements?: any[]) {
    console.log('🔓 ErRules: Processando desagrupamento de container');
    
    if (formerContainerElements) {
      console.log('🔓 ErRules: Elementos do container desagrupado:', formerContainerElements.map(el => el.id));
    }
    
    // Restaurar todas as conexões primeiro
    this.restoreAllConnections();
    
    // Aguardar um pouco mais para garantir que DOM foi atualizado
    setTimeout(() => {
      console.log('🔓 ErRules: Re-avaliação final após desagrupamento...');
      this.blockConnectionInteractions();
    }, 500);
  }

  private addGlobalBlockingCSS() {
    console.log('🎨 ErRules: Adicionando CSS seletivo para bloquear apenas conexões de containers');
    
    // Criar elemento de estilo
    const style = document.createElement('style');
    style.id = 'er-connection-blocker-styles';
    
    // Verificar se já existe
    const existingStyle = document.getElementById('er-connection-blocker-styles');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    style.textContent = `
      /* Bloquear APENAS conexões marcadas como bloqueadas (dentro de containers compostos) */
      .er-connection-blocked,
      .er-connection-blocked *,
      .er-connection-blocked .djs-connection,
      .er-connection-blocked .djs-bendpoint,
      .er-connection-blocked .djs-segment {
        pointer-events: none !important;
        user-select: none !important;
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        touch-action: none !important;
        cursor: not-allowed !important;
        opacity: 0.7 !important;
      }
      
      /* REMOVIDO: CSS que bloqueava TODAS as conexões */
      /* PERMITIR: Todas as outras conexões devem permanecer selecionáveis */
    `;
    
    document.head.appendChild(style);
    console.log('✅ ErRules: CSS seletivo de bloqueio adicionado - apenas conexões marcadas como bloqueadas');
  }
}