interface EventBus {
  on(event: string, callback: (event: any) => void): void;
  off(event: string, callback: (event: any) => void): void;
  fire(event: string, data?: any): void;
}

interface Element {
  id: string;
  type: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  parent?: Element;
  businessObject?: {
    erType?: string;
    isComposite?: boolean;
    isParentChild?: boolean;
    $attrs?: Record<string, any>;
    [key: string]: any;
  };
  source?: Element;
  target?: Element;
}

interface MoveEvent {
  element: Element;
  delta: { x: number; y: number };
}

interface ElementRegistry {
  getAll(): Element[];
  get(id: string): Element | null;
}

interface Modeling {
  moveElements(elements: Element[], delta: { x: number; y: number }, target?: any, hints?: any): void;
  updateProperties(element: Element, properties: any): void;
}

/**
 * ErMoveRules - Handles group movement for composite attributes
 * When a composite attribute is moved, all its sub-attributes move with it
 */
export default class ErMoveRules {
  private eventBus: EventBus;
  private elementRegistry: ElementRegistry | null = null;
  private modeling: Modeling | null = null;
  private isMovingGroup = false; // Flag to prevent infinite recursion

  constructor(eventBus: EventBus, elementRegistry: ElementRegistry, modeling: Modeling) {
    this.eventBus = eventBus;
    this.elementRegistry = elementRegistry;
    this.modeling = modeling;
    
    this.init();
    console.log('✅ ErMoveRules: Inicializado - movimento em grupo ativo para atributos compostos');
  }

  private init() {
    // Listen for multiple movement events to ensure we catch all scenarios
    this.eventBus.on('element.moved', (event: MoveEvent) => {
      this.handleElementMoved(event);
    });
    
    // Also listen to shape.move.end for drag operations
    this.eventBus.on('shape.move.end', (event: any) => {
      console.log('🎯 ErMoveRules: shape.move.end detectado para:', event.shape?.id);
      if (event.shape) {
        this.handleElementMoved({
          element: event.shape,
          delta: event.delta || { x: 0, y: 0 }
        });
      }
    });
    
    // Listen to elements.moved for multiple element moves
    this.eventBus.on('elements.moved', (event: any) => {
      console.log('🎯 ErMoveRules: elements.moved detectado');
      if (event.elements && Array.isArray(event.elements)) {
        event.elements.forEach((element: any) => {
          this.handleElementMoved({
            element: element,
            delta: event.delta || { x: 0, y: 0 }
          });
        });
      }
    });

    // ✨ NOVO: Escutar múltiplos eventos para capturar arraste de elementos
    this.eventBus.on('shape.added', (event: any) => {
      console.log('🎯 ErMoveRules: shape.added detectado:', event.element?.id);
      this.handleElementAdded(event);
    });

    this.eventBus.on('element.added', (event: any) => {
      console.log('🎯 ErMoveRules: element.added detectado:', event.element?.id);
      this.handleElementAdded(event);
    });

    this.eventBus.on('shape.move.end', (event: any) => {
      console.log('🎯 ErMoveRules: shape.move.end detectado para:', event.element?.id);
      // Verificar se foi movido para dentro de um composto
      setTimeout(() => this.checkForCompositeConversion(event.element), 100);
    });

    // ✨ NOVO: Escutar quando conexões são criadas para detectar sub-atributos
    this.eventBus.on('connection.added', (event: any) => {
      console.log('🔗 ErMoveRules: connection.added detectado:', event.element?.id);
      this.handleConnectionAdded(event);
    });

    // ✨ DESABILITADO: Causava loop infinito
    // this.eventBus.on('commandStack.changed', (event: any) => {
    //   setTimeout(() => this.rearrangeAllSubAttributes(), 300);
    // });

    console.log('✅ ErMoveRules: Event listeners configurados (element.moved, shape.move.end, elements.moved, element.added, connection.added)');
  }

  private handleElementMoved(event: MoveEvent) {
    // Prevent infinite recursion when we're already moving a group
    if (this.isMovingGroup) {
      console.log('🔒 ErMoveRules: Movimento em grupo já em andamento, ignorando evento');
      return;
    }

    const movedElement = event.element;
    console.log('🔍 ErMoveRules: Analisando elemento movido:', {
      id: movedElement.id,
      type: movedElement.type,
      erType: movedElement.businessObject?.erType,
      isComposite: movedElement.businessObject?.isComposite
    });
    
    // Only handle composite attributes
    if (!this.isCompositeAttribute(movedElement)) {
      console.log('🚫 ErMoveRules: Elemento não é atributo composto, ignorando');
      return;
    }

    console.log('🔄 ErMoveRules: ✅ Detectado movimento de atributo composto:', movedElement.id);

    // Find all child sub-attributes
    const children = this.findCompositeChildren(movedElement);
    
    if (children.length === 0) {
      console.log('🔍 ErMoveRules: Nenhum sub-atributo encontrado para:', movedElement.id);
      return;
    }

    console.log(`🔄 ErMoveRules: ✅ Encontrados ${children.length} sub-atributos para mover:`, children.map(c => c.id));
    console.log('📍 ErMoveRules: Delta de movimento:', event.delta);

    try {
      // Set flag to prevent recursion
      this.isMovingGroup = true;

      // Move all children with the same delta
      if (this.modeling) {
        // Use a timeout to ensure the original move is completed first
        setTimeout(() => {
          try {
            console.log('🚀 ErMoveRules: Iniciando movimento dos sub-atributos...');
            this.modeling!.moveElements(children, event.delta, undefined, {
              autoResize: false,
              attach: false
            });
            
            console.log('✅ ErMoveRules: Sub-atributos movidos com sucesso');
          } catch (moveError) {
            console.error('❌ ErMoveRules: Erro durante movimento:', moveError);
          } finally {
            // Reset flag after movement
            this.isMovingGroup = false;
          }
        }, 50);
      } else {
        console.error('❌ ErMoveRules: Modeling service não disponível');
        this.isMovingGroup = false;
      }
    } catch (error) {
      console.error('❌ ErMoveRules: Erro ao configurar movimento de sub-atributos:', error);
      this.isMovingGroup = false;
    }
  }

  /**
   * Check if an element is a composite attribute
   */
  private isCompositeAttribute(element: Element): boolean {
    return element.businessObject?.erType === 'Attribute' &&
           element.businessObject?.isComposite === true;
  }

  /**
   * Find all sub-attributes that belong to a composite attribute
   * Sub-attributes are connected to the composite attribute via parent-child connections
   * Agora funciona tanto para UserTask compostos quanto SubProcess compostos
   */
  private findCompositeChildren(compositeElement: Element): Element[] {
    if (!this.elementRegistry) {
      console.log('❌ ErMoveRules: elementRegistry não disponível');
      return [];
    }

    const allElements = this.elementRegistry.getAll();
    const children: Element[] = [];

    console.log(`🔍 ErMoveRules: Buscando filhos para ${compositeElement.id} entre ${allElements.length} elementos`);
    console.log(`🔍 ErMoveRules: Tipo do container: ${compositeElement.type}, erType: ${compositeElement.businessObject?.erType}`);

    // Find all connections that originate from the composite attribute
    const outgoingConnections = allElements.filter(element => {
      const isSequenceFlow = element.type === 'bpmn:SequenceFlow';
      const isFromComposite = element.source?.id === compositeElement.id;
      const isParentChild = element.businessObject?.isParentChild === true;
      const isCompositeContainment = element.businessObject?.isCompositeContainment === true;
      
      if (isSequenceFlow && isFromComposite) {
        console.log(`🔗 ErMoveRules: Conexão encontrada de ${compositeElement.id}:`, {
          id: element.id,
          target: element.target?.id,
          isParentChild: isParentChild,
          isCompositeContainment: isCompositeContainment
        });
      }
      
      // Aceitar tanto conexões pai-filho tradicionais quanto containment de compostos
      return isSequenceFlow && isFromComposite && (isParentChild || isCompositeContainment);
    });

    console.log(`🔍 ErMoveRules: Encontradas ${outgoingConnections.length} conexões para ${compositeElement.id}`);

    // For each parent-child connection, find the target sub-attribute
    outgoingConnections.forEach(connection => {
      if (connection.target) {
        const targetElement = connection.target;
        
        console.log(`🎯 ErMoveRules: Analisando target:`, {
          id: targetElement.id,
          type: targetElement.type,
          erType: targetElement.businessObject?.erType,
          connectionType: connection.businessObject?.isCompositeContainment ? 'containment' : 'parent-child'
        });
        
        // Verify it's actually a sub-attribute (UserTask with Attribute erType)
        if (targetElement.businessObject?.erType === 'Attribute') {
          children.push(targetElement);
          console.log('✅ ErMoveRules: Sub-atributo válido encontrado:', targetElement.id, 
                     connection.businessObject?.isCompositeContainment ? '(via containment)' : '(via parent-child)');
        } else {
          console.log('⚠️ ErMoveRules: Target não é atributo:', targetElement.id);
        }
      } else {
        console.log('⚠️ ErMoveRules: Conexão sem target:', connection.id);
      }
    });

    console.log(`🎯 ErMoveRules: Total de sub-atributos encontrados: ${children.length}`);
    return children;
  }

  /**
   * ✨ NOVA ABORDAGEM: Encontra elementos que estão geograficamente dentro do atributo composto
   * Não depende de conexões pai-filho, apenas de posição física
   */
  private findElementsInsideComposite(compositeElement: Element): Element[] {
    if (!this.elementRegistry) {
      console.log('❌ ErMoveRules: elementRegistry não disponível');
      return [];
    }

    const allElements = this.elementRegistry.getAll();
    const elementsInside: Element[] = [];

    // Obter bounds do atributo composto
    const compositeX = compositeElement.x || 0;
    const compositeY = compositeElement.y || 0;
    const compositeWidth = compositeElement.width || 200;
    const compositeHeight = compositeElement.height || 150;

    console.log(`🔍 ErMoveRules: Buscando elementos dentro do composto ${compositeElement.id}`, {
      compositeX, compositeY, compositeWidth, compositeHeight
    });

    // Verificar cada elemento para ver se está dentro das bounds do composto
    allElements.forEach(element => {
      // Pular o próprio composto e conexões
      if (element.id === compositeElement.id || element.type === 'bpmn:SequenceFlow') {
        return;
      }

      const elementX = element.x || 0;
      const elementY = element.y || 0;
      const elementWidth = element.width || 80;
      const elementHeight = element.height || 50;

      // Verificar se o elemento está dentro das bounds do composto
      const isInsideX = elementX >= compositeX && (elementX + elementWidth) <= (compositeX + compositeWidth);
      const isInsideY = elementY >= compositeY && (elementY + elementHeight) <= (compositeY + compositeHeight);
      const isInside = isInsideX && isInsideY;

      if (isInside) {
        console.log(`🎯 ErMoveRules: Elemento encontrado dentro do composto:`, {
          elementId: element.id,
          elementType: element.type,
          erType: element.businessObject?.erType,
          position: { elementX, elementY, elementWidth, elementHeight }
        });
        
        // Só incluir se for um atributo ER ou outro elemento relevante
        if (element.businessObject?.erType === 'Attribute' || element.type === 'bpmn:UserTask') {
          elementsInside.push(element);
        }
      }
    });

    console.log(`🎯 ErMoveRules: Total de elementos dentro do composto: ${elementsInside.length}`);
    return elementsInside;
  }

  /**
   * ✨ NOVA FUNCIONALIDADE: Auto-posicionamento de sub-atributos
   * Quando um elemento é adicionado, verifica se precisa ser reposicionado
   */
  private handleElementAdded(event: any) {
    const element = event.element;
    if (!element) return;

    console.log('🎯 ErMoveRules: Elemento adicionado:', {
      id: element.id,
      type: element.type,
      erType: element.businessObject?.erType,
      parent: element.parent?.id,
      parentType: element.parent?.type
    });

    // Verificar se é um atributo normal arrastado para dentro do container composto
    const isInsideCompositeContainer = element.parent?.type === 'bpmn:SubProcess' && 
                                      element.parent?.businessObject?.erType === 'CompositeAttribute';

    if (isInsideCompositeContainer && element.businessObject?.erType === 'Attribute') {
      console.log('🎯 ErMoveRules: ✨ Atributo normal arrastado para container composto');
      
      // ✨ AUTOMATIZAÇÃO: Tornar o atributo composto automaticamente
      setTimeout(() => {
        this.autoConvertToCompositeAttribute(element);
      }, 100);
    }
  }

  /**
   * ✨ Verifica se um elemento foi movido para dentro de um composto e converte se necessário
   */
  private checkForCompositeConversion(element: Element) {
    if (!element || !element.businessObject) return;

    console.log('🔍 ErMoveRules: Verificando conversão para composto:', {
      elementId: element.id,
      elementType: element.type,
      erType: element.businessObject.erType,
      parent: element.parent?.id,
      parentType: element.parent?.type,
      parentErType: element.parent?.businessObject?.erType
    });

    // Verificar se foi movido para dentro de um container composto
    const isInsideCompositeContainer = element.parent?.type === 'bpmn:SubProcess' && 
                                      element.parent?.businessObject?.erType === 'CompositeAttribute';

    if (isInsideCompositeContainer && element.businessObject?.erType === 'Attribute' && !element.businessObject?.isComposite) {
      console.log('🎯 ErMoveRules: ✨ Atributo movido para container composto - convertendo automaticamente');
      this.autoConvertToCompositeAttribute(element);
    }
  }

   /**
    * ✨ Converte automaticamente um atributo normal para composto quando entra no container
    */
   private autoConvertToCompositeAttribute(element: Element) {
     if (!this.modeling || !element.businessObject) return;
 
     try {
       console.log('🔄 ErMoveRules: Convertendo atributo para composto automaticamente:', element.id);
       
       // Marcar como composto no businessObject
       this.modeling.updateProperties(element, {
         isComposite: true
       });
 
       console.log('✅ ErMoveRules: Atributo convertido para composto automaticamente');
       
       // Opcional: Disparar evento personalizado para atualizar painel de propriedades
       this.eventBus.fire('element.compositeChanged', { element: element, isComposite: true });
       
     } catch (error) {
       console.error('❌ ErMoveRules: Erro ao converter para composto:', error);
     }
   }

  /**
   * ✨ Reorganiza sub-atributos horizontalmente (chamado quando botão é clicado)
   * Esta função será chamada externamente pelo painel de propriedades
   */
  public reorganizeSubAttributes(compositeElement: Element) {
    console.log('🎯 ErMoveRules: ✨ Botão criar sub-atributo clicado - reorganizando:', compositeElement.id);
    
    const subAttributes = this.findElementsInsideComposite(compositeElement);
    
    if (subAttributes.length > 1) {
      console.log('🔄 ErMoveRules: Reorganizando', subAttributes.length, 'sub-atributos horizontalmente');
      this.arrangeSubAttributesInLine(compositeElement, subAttributes);
    } else {
      console.log('🔍 ErMoveRules: Menos de 2 sub-atributos, não é necessário reorganizar');
    }
  }

  /**
   * Organiza apenas os sub-atributos de um composto específico
   */
  private organizeCompositeSubAttributes(composite: Element) {
    if (!composite) return;
    
    console.log('🔄 ErMoveRules: Organizando sub-atributos para composto específico:', composite.id);
    
    const subAttributes = this.findElementsInsideComposite(composite);
    
    if (subAttributes.length > 1) {
      console.log('🔄 ErMoveRules: Organizando', subAttributes.length, 'sub-atributos');
      this.arrangeSubAttributesInLine(composite, subAttributes);
    }
  }

  /**
   * Detecta quando uma conexão pai-filho é criada para reposicionar sub-atributos
   */
  private handleConnectionAdded(event: any) {
    const connection = event.element;
    if (!connection) return;

    console.log('🔗 ErMoveRules: Conexão adicionada:', {
      id: connection.id,
      type: connection.type,
      source: connection.source?.id,
      target: connection.target?.id,
      isParentChild: connection.businessObject?.isParentChild
    });

    // Verificar se é uma conexão pai-filho de atributo composto para atributo
    const isParentChildConnection = connection.businessObject?.isParentChild === true;
    const sourceIsComposite = connection.source?.businessObject?.erType === 'CompositeAttribute';
    const targetIsAttribute = connection.target?.businessObject?.erType === 'Attribute';

    if (isParentChildConnection && sourceIsComposite && targetIsAttribute) {
      console.log('🔗 ErMoveRules: ✨ Conexão pai-filho de composto criada - reposicionando sub-atributo');
      
      setTimeout(() => {
        this.autoPositionSubAttribute(connection.source, connection.target);
      }, 100);
    }
  }

  /**
   * Remove sub-atributo de dentro do composto e posiciona externamente
   */
  private repositionSubAttributeOutsideComposite(subAttribute: Element, compositeParent: Element) {
    if (!this.modeling) return;

    console.log('📍 ErMoveRules: Reposicionando sub-atributo fora do composto:', subAttribute.id);

    try {
      // Calcular posição abaixo do atributo composto
      const compositeX = compositeParent.x || 0;
      const compositeY = compositeParent.y || 0;
      const compositeHeight = compositeParent.height || 150;

      // Contar quantos sub-atributos já existem para este composto
      const existingSubAttributes = this.findCompositeChildren(compositeParent);
      const position = existingSubAttributes.length; // 0-based index

      // Calcular posição horizontal (lado a lado)
      const subAttributeWidth = 80; // Largura padrão de atributo
      const spacing = 10; // Espaçamento entre atributos
      const startX = compositeX - ((existingSubAttributes.length * (subAttributeWidth + spacing)) / 2);

      const newX = startX + (position * (subAttributeWidth + spacing));
      const newY = compositeY + compositeHeight + 40; // 40px abaixo do composto

      console.log('📍 ErMoveRules: Nova posição calculada:', { newX, newY, position });

      // Mover elemento para a nova posição
      this.modeling.moveElements([subAttribute], { 
        x: newX - (subAttribute.x || 0), 
        y: newY - (subAttribute.y || 0) 
      });

      console.log('✅ ErMoveRules: Sub-atributo reposicionado com sucesso');
    } catch (error) {
      console.error('❌ ErMoveRules: Erro ao reposicionar sub-atributo:', error);
    }
  }

  /**
   * Posiciona automaticamente um sub-atributo conectado a um atributo composto
   */
  private autoPositionSubAttribute(compositeAttribute: Element, subAttribute: Element) {
    if (!this.modeling) return;

    console.log('📍 ErMoveRules: Auto-posicionando sub-atributo:', subAttribute.id, 'para composto:', compositeAttribute.id);

    try {
      // Obter posição do atributo composto
      const compositeX = compositeAttribute.x || 0;
      const compositeY = compositeAttribute.y || 0;
      const compositeHeight = compositeAttribute.height || 150;

      // Contar sub-atributos existentes conectados a este composto
      const existingSubAttributes = this.findCompositeChildren(compositeAttribute);
      const position = existingSubAttributes.length - 1; // -1 porque já inclui o novo

      // Configuração do layout
      const subAttributeWidth = 80;
      const spacing = 10;
      const totalWidth = existingSubAttributes.length * (subAttributeWidth + spacing);
      const startX = compositeX - (totalWidth / 2) + (subAttributeWidth / 2);

      const newX = startX + (position * (subAttributeWidth + spacing));
      const newY = compositeY + compositeHeight + 40;

      console.log('📍 ErMoveRules: Posicionamento calculado:', { 
        newX, 
        newY, 
        position, 
        existingCount: existingSubAttributes.length 
      });

      // Calcular delta para o movimento
      const deltaX = newX - (subAttribute.x || 0);
      const deltaY = newY - (subAttribute.y || 0);

      // Mover sub-atributo para a posição calculada
      this.modeling.moveElements([subAttribute], { x: deltaX, y: deltaY });

      console.log('✅ ErMoveRules: Sub-atributo auto-posicionado com sucesso');
    } catch (error) {
      console.error('❌ ErMoveRules: Erro no auto-posicionamento:', error);
    }
  }

  /**
   * ✨ Rearranja TODOS os sub-atributos de TODOS os atributos compostos
   * Funciona como backup para garantir layout correto
   */
  private rearrangeAllSubAttributes() {
    if (!this.elementRegistry || !this.modeling || this.isMovingGroup) return;

    console.log('🔄 ErMoveRules: ✨ Rearranjando todos os sub-atributos...');

    try {
      const allElements = this.elementRegistry.getAll();
      
      // Encontrar todos os atributos compostos
      const compositeAttributes = allElements.filter(element => 
        element.businessObject?.erType === 'CompositeAttribute'
      );

      console.log('🔄 ErMoveRules: Encontrados', compositeAttributes.length, 'atributos compostos');

      compositeAttributes.forEach(composite => {
        // NOVA ESTRATÉGIA: Detectar por posição geográfica
        const subAttributes = this.findElementsInsideComposite(composite);
        
        if (subAttributes.length > 0) {
          console.log('🔄 ErMoveRules: Rearranjando', subAttributes.length, 'elementos dentro do composto', composite.id);
          this.arrangeSubAttributesInLine(composite, subAttributes);
        }
      });

    } catch (error) {
      console.error('❌ ErMoveRules: Erro no rearranjo global:', error);
    }
  }

  /**
   * ✨ NOVA VERSÃO: Arranja sub-atributos DENTRO do composto horizontalmente
   * Respeita a posição Y escolhida pelo usuário, apenas ajusta X para evitar sobreposição
   */
  private arrangeSubAttributesInLine(composite: Element, subAttributes: Element[]) {
    if (!this.modeling || subAttributes.length === 0) return;

    try {
      this.isMovingGroup = true;

      // Configurações do layout DENTRO do composto
      const compositeX = composite.x || 0;
      const compositeY = composite.y || 0;
      const compositeWidth = composite.width || 200;
      const margin = 10; // Margem das bordas do composto
      
      const subAttributeWidth = 60; // Menor para caber mais
      const spacing = 8; // Espaçamento menor
      
      // Calcular posição inicial (lado esquerdo do composto)
      const startX = compositeX + margin;
      
      console.log('📍 ErMoveRules: Layout INTERNO calculado:', {
        compositeX, compositeY, compositeWidth,
        subAttributeCount: subAttributes.length,
        startX, availableWidth: compositeWidth - 2*margin
      });

      // Organizar sub-atributos por posição X atual (manter ordem escolhida pelo usuário)
      const sortedSubAttributes = [...subAttributes].sort((a, b) => (a.x || 0) - (b.x || 0));

      // Posicionar cada sub-atributo horizontalmente
      sortedSubAttributes.forEach((subAttribute, index) => {
        const targetX = startX + index * (subAttributeWidth + spacing);
        
        // MANTER a posição Y escolhida pelo usuário
        const currentY = subAttribute.y || (compositeY + 40); // Y atual ou padrão
        
        const currentX = subAttribute.x || 0;
        const deltaX = targetX - currentX;
        const deltaY = 0; // ✅ NÃO alterar Y!

        // Verificar se cabe dentro do composto
        const fitsInside = (targetX + subAttributeWidth) <= (compositeX + compositeWidth - margin);
        
        if (fitsInside && Math.abs(deltaX) > 5) {
          console.log('📍 ErMoveRules: Ajustando posição X de', subAttribute.id, 'índice', index, ':', {targetX, currentY, deltaX});
          
          if (this.modeling) {
            this.modeling.moveElements([subAttribute], { x: deltaX, y: deltaY });
          }
        } else if (!fitsInside) {
          console.log('⚠️ ErMoveRules: Sub-atributo', subAttribute.id, 'não cabe - ignorando');
        }
      });

      console.log('✅ ErMoveRules: Sub-atributos organizados horizontalmente DENTRO do composto');
      
    } catch (error) {
      console.error('❌ ErMoveRules: Erro no arranjo interno:', error);
    } finally {
      setTimeout(() => { this.isMovingGroup = false; }, 100);
    }
  }
}