import { logger } from '../../../../../utils/logger';

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
  }

  private init() {
    // Listen for multiple movement events to ensure we catch all scenarios
    this.eventBus.on('element.moved', (event: MoveEvent) => {
      this.handleElementMoved(event);
    });
    
    // Also listen to shape.move.end for drag operations
    this.eventBus.on('shape.move.end', (event: any) => {      
      if (event.shape) {
        this.handleElementMoved({
          element: event.shape,
          delta: event.delta || { x: 0, y: 0 }
        });
      }
    });
    
    // Listen to elements.moved for multiple element moves
    this.eventBus.on('elements.moved', (event: any) => {      
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
      this.handleElementAdded(event);
    });

    this.eventBus.on('element.added', (event: any) => {      
      this.handleElementAdded(event);
    });

    this.eventBus.on('shape.move.end', (event: any) => {      
      // Verificar se foi movido para dentro de um composto
      setTimeout(() => this.checkForCompositeConversion(event.element), 100);
    });

    // ✨ NOVO: Escutar quando conexões são criadas para detectar sub-atributos
    this.eventBus.on('connection.added', (event: any) => {      
      this.handleConnectionAdded(event);
    });

  }

  private handleElementMoved(event: MoveEvent) {    
    if (this.isMovingGroup) {      
      return;
    }

    const movedElement = event.element;  
        
    if (!this.isCompositeAttribute(movedElement)) {      
      return;
    }    
    
    const children = this.findCompositeChildren(movedElement);
    
    if (children.length === 0) {      
      return;
    }

    try {      
      this.isMovingGroup = true;      
      if (this.modeling) {        
        setTimeout(() => {
          try {            
            this.modeling!.moveElements(children, event.delta, undefined, {
              autoResize: false,
              attach: false
            });
                        
          } catch (moveError) {
            
          } finally {            
            this.isMovingGroup = false;
          }
        }, 50);
      } else {        
        this.isMovingGroup = false;
      }
    } catch (error) {      
      this.isMovingGroup = false;
    }
  }

  private isCompositeAttribute(element: Element): boolean {
    return element.businessObject?.erType === 'Attribute' &&
           element.businessObject?.isComposite === true;
  }

  private findCompositeChildren(compositeElement: Element): Element[] {
    if (!this.elementRegistry) {      
      return [];
    }

    const allElements = this.elementRegistry.getAll();
    const children: Element[] = [];      
    const outgoingConnections = allElements.filter(element => {
      const isSequenceFlow = element.type === 'bpmn:SequenceFlow';
      const isFromComposite = element.source?.id === compositeElement.id;
      const isParentChild = element.businessObject?.isParentChild === true;
      const isCompositeContainment = element.businessObject?.isCompositeContainment === true;           
      
      // Aceitar tanto conexões pai-filho tradicionais quanto containment de compostos
      return isSequenceFlow && isFromComposite && (isParentChild || isCompositeContainment);
    });    
    
    outgoingConnections.forEach(connection => {
      if (connection.target) {
        const targetElement = connection.target;
                
        if (targetElement.businessObject?.erType === 'Attribute') {
          children.push(targetElement);          
        } else {          
        }
      } else {        
      }
    });
    
    return children;
  }

  private findElementsInsideComposite(compositeElement: Element): Element[] {
    if (!this.elementRegistry) {      
      return [];
    }

    const allElements = this.elementRegistry.getAll();
    const elementsInside: Element[] = [];

    // Obter bounds do atributo composto
    const compositeX = compositeElement.x || 0;
    const compositeY = compositeElement.y || 0;
    const compositeWidth = compositeElement.width || 200;
    const compositeHeight = compositeElement.height || 150;    

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
        // Só incluir se for um atributo ER ou outro elemento relevante
        if (element.businessObject?.erType === 'Attribute' || element.type === 'bpmn:UserTask') {
          elementsInside.push(element);
        }
      }
    });
    
    return elementsInside;
  }

  private handleElementAdded(event: any) {
    const element = event.element;
    if (!element) return;   

    // Verificar se é um atributo normal arrastado para dentro do container composto
    const isInsideCompositeContainer = element.parent?.type === 'bpmn:SubProcess' && 
                                      element.parent?.businessObject?.erType === 'CompositeAttribute';

    if (isInsideCompositeContainer && element.businessObject?.erType === 'Attribute') {                  
      setTimeout(() => {
        this.autoConvertToCompositeAttribute(element);
      }, 100);
    }
  }

  private checkForCompositeConversion(element: Element) {
    if (!element || !element.businessObject) return;    

    // Verificar se foi movido para dentro de um container composto
    const isInsideCompositeContainer = element.parent?.type === 'bpmn:SubProcess' && 
                                      element.parent?.businessObject?.erType === 'CompositeAttribute';

    if (isInsideCompositeContainer && element.businessObject?.erType === 'Attribute' && !element.businessObject?.isComposite) {
      this.autoConvertToCompositeAttribute(element);
    }
  }
  
   private autoConvertToCompositeAttribute(element: Element) {
     if (!this.modeling || !element.businessObject) return;
 
     try {              
       // Marcar como composto no businessObject
       this.modeling.updateProperties(element, {
         isComposite: true
       });               
       // Opcional: Disparar evento personalizado para atualizar painel de propriedades
       this.eventBus.fire('element.compositeChanged', { element: element, isComposite: true });
       
     } catch (error) {
       console.error('❌ ErMoveRules: Erro ao converter para composto:', error);
     }
   }

  public reorganizeSubAttributes(compositeElement: Element) {        
    const subAttributes = this.findElementsInsideComposite(compositeElement);
    
    if (subAttributes.length > 1) {      
      this.arrangeSubAttributesInLine(compositeElement, subAttributes);
    }
  }

  private organizeCompositeSubAttributes(composite: Element) {
    if (!composite) return;            
    const subAttributes = this.findElementsInsideComposite(composite);
    
    if (subAttributes.length > 1) {      
      this.arrangeSubAttributesInLine(composite, subAttributes);
    }
  }
 
  private handleConnectionAdded(event: any) {
    const connection = event.element;
    if (!connection) return; 

    // Verificar se é uma conexão pai-filho de atributo composto para atributo
    const isParentChildConnection = connection.businessObject?.isParentChild === true;
    const sourceIsComposite = connection.source?.businessObject?.erType === 'CompositeAttribute';
    const targetIsAttribute = connection.target?.businessObject?.erType === 'Attribute';

    if (isParentChildConnection && sourceIsComposite && targetIsAttribute) {            
      setTimeout(() => {
        this.autoPositionSubAttribute(connection.source, connection.target);
      }, 100);
    }
  }


  private repositionSubAttributeOutsideComposite(subAttribute: Element, compositeParent: Element) {
    if (!this.modeling) return;    
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

      // Mover elemento para a nova posição
      this.modeling.moveElements([subAttribute], { 
        x: newX - (subAttribute.x || 0), 
        y: newY - (subAttribute.y || 0) 
      });
      
    } catch (error) {
      logger.error('ErMoveRules: Erro ao reposicionar sub-atributo fora do composto:', undefined, error as Error);
    }
  }

  private autoPositionSubAttribute(compositeAttribute: Element, subAttribute: Element) {
    if (!this.modeling) return;    

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

      // Calcular delta para o movimento
      const deltaX = newX - (subAttribute.x || 0);
      const deltaY = newY - (subAttribute.y || 0);

      // Mover sub-atributo para a posição calculada
      this.modeling.moveElements([subAttribute], { x: deltaX, y: deltaY });
   
    } catch (error) {
      logger.error('ErMoveRules: Erro no auto-posicionamento:', undefined, error as Error);
    }
  }

  private rearrangeAllSubAttributes() {
    if (!this.elementRegistry || !this.modeling || this.isMovingGroup) return;

    try {
      const allElements = this.elementRegistry.getAll();
      
      // Encontrar todos os atributos compostos
      const compositeAttributes = allElements.filter(element => 
        element.businessObject?.erType === 'CompositeAttribute'
      );      

      compositeAttributes.forEach(composite => {
        // NOVA ESTRATÉGIA: Detectar por posição geográfica
        const subAttributes = this.findElementsInsideComposite(composite);
        
        if (subAttributes.length > 0) {          
          this.arrangeSubAttributesInLine(composite, subAttributes);
        }
      });

    } catch (error) {
      logger.error('ErMoveRules: Erro no rearranjo global:', undefined, error as Error);
    }
  }

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

      // Organizar sub-atributos por posição X atual (manter ordem escolhida pelo usuário)
      const sortedSubAttributes = [...subAttributes].sort((a, b) => (a.x || 0) - (b.x || 0));

      // Posicionar cada sub-atributo horizontalmente
      sortedSubAttributes.forEach((subAttribute, index) => {
        const targetX = startX + index * (subAttributeWidth + spacing);
        
        // MANTER a posição Y escolhida pelo usuário
        const currentY = subAttribute.y || (compositeY + 40); // Y atual ou padrão
        
        const currentX = subAttribute.x || 0;
        const deltaX = targetX - currentX;
        const deltaY = 0; // NÃO alterar Y!

        // Verificar se cabe dentro do composto
        const fitsInside = (targetX + subAttributeWidth) <= (compositeX + compositeWidth - margin);
        
        if (fitsInside && Math.abs(deltaX) > 5) {          
          
          if (this.modeling) {
            this.modeling.moveElements([subAttribute], { x: deltaX, y: deltaY });
          }
        } else if (!fitsInside) {
          logger.warn('ErMoveRules: Sub-atributo não cabe - ignorando: ', subAttribute.id);
        }
      });      
      
    } catch (error) {
      logger.error('ErMoveRules: Erro no arranjo interno:', undefined, error as Error);
    } finally {
      setTimeout(() => { this.isMovingGroup = false; }, 100);
    }
  }
}