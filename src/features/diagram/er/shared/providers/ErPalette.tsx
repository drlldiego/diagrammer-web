import { NotationConfig } from '../config/NotationConfig';
import { notifications } from '../../../../../utils/notifications';
import { ErElementUtils } from '../utils/ErElementUtils';

// Interfaces para tipagem TypeScript
interface Palette {
  registerProvider: (provider: any) => void;
}

interface Create {
  start: (event: Event, shape: any, context?: any) => void;
}

interface ElementFactory {
  createShape: (options: any) => any;
}

interface ErElementFactory {
  createShape: (options: any) => any;
}

interface SpaceTool {
  activateSelection: () => void;
}

interface HandTool {
  activateHand: () => void;
}

interface GlobalConnect {
  start: () => void;
}

interface Translate {
  (text: string): string;
}

interface PaletteEntry {
  group?: string;
  className?: string;
  title?: string;
  separator?: boolean;
  action?: {
    click?: any;
    dragstart?: any;
  };
}

interface ElementOptions {
  type: string;
  width: number;
  height: number;
  name: string;
  isWeak?: boolean;
  isExpanded?: boolean;
  erType: string;
  cardinalitySource?: string;  
  isIdentifying?: boolean;
  dataType?: string;
  isPrimaryKey?: boolean;  
  isRequired?: boolean;
  isMultivalued?: boolean;
  isDerived?: boolean;
  isComposite?: boolean;
}

// Provider da paleta ER unificado
export default function ErPaletteProvider(
  this: any,
  palette: Palette,
  create: Create,
  elementFactory: ElementFactory,
  erElementFactory: ErElementFactory,
  spaceTool: SpaceTool,
  handTool: HandTool,
  globalConnect: GlobalConnect,
  translate: Translate,
  eventBus: any,
  canvas: any,
  elementRegistry: any,
  modeling: any,
  notationConfig: NotationConfig // Nova injeção para configuração da notação
) {
  palette.registerProvider(this);
  this.create = create;
  this.elementFactory = elementFactory;
  this.erElementFactory = erElementFactory;
  this.spaceTool = spaceTool;
  this.handTool = handTool;
  this.globalConnect = globalConnect;
  this.translate = translate;
  this.eventBus = eventBus;
  this.canvas = canvas;
  this.elementRegistry = elementRegistry;
  this.modeling = modeling;
  this.notationConfig = notationConfig; // Armazenar configuração
  
  // Estado para o modo de conexão de atributo
  this.attributeConnectionMode = {
    active: false,
    pendingAttribute: null,
    originalCursor: ''
  };
}

ErPaletteProvider.$inject = [
  'palette',
  'create',
  'elementFactory',
  'erElementFactory',
  'spaceTool',
  'handTool',
  'globalConnect',
  'translate',
  'eventBus',
  'canvas',
  'elementRegistry',
  'modeling',
  'notationConfig' // Nova dependência
];

(ErPaletteProvider as any).prototype.getPaletteEntries = function(this: any): { [key: string]: PaletteEntry } { 
  const {
    create,    
    erElementFactory,
    spaceTool,
    handTool,
    globalConnect,
    translate,
    notationConfig
  } = this;

  const createAction = (
    type: string,
    group: string,
    className: string,
    title: string,
    options: Partial<ElementOptions> = {}
  ): PaletteEntry => {
    const createListener = (event: Event) => {      
      const attrs = Object.assign({ type: type }, options);      
      const shape = erElementFactory.createShape(attrs);      
      create.start(event, shape);
    };
    return {
      group,
      className,
      title: translate(title),
      action: {
        dragstart: createListener,
        click: createListener
      }
    };
  };

  // Entradas base (sempre presentes)
  const entries: { [key: string]: PaletteEntry } = {
    // Ferramentas básicas
    'hand-tool': {
      group: 'tools',
      className: 'bpmn-icon-hand-tool',
      title: translate('Mover diagrama'),
      action: { 
        click: () => {
          try {
            if (handTool && handTool.activateHand) {
              handTool.activateHand();
            } else {
              alert('Ferramenta de mover não está disponível no momento.');
            }
          } catch (error) {
            alert('Erro ao ativar a ferramenta de mover. Verifique o console para detalhes.');
          }
        }
      }
    },    
    'space-tool': {
      group: 'tools',
      className: 'bpmn-icon-space-tool',
      title: translate('Espaço'),
      action: { 
        click: () => {
          try {
            if (spaceTool && spaceTool.activateSelection) {
              spaceTool.activateSelection();
            } else {
              alert('Ferramenta de espaço não está disponível no momento.');
            }
          } catch (error) {
            alert('Erro ao ativar a ferramenta de espaço. Verifique o console para detalhes.');
          }
        }
      }
    },
    'global-connect-tool': {
      group: 'tools',
      className: 'bpmn-icon-connection-multi',
      title: translate('Conectar elementos'),
      action: { 
        click: () => {
          try {
            if (globalConnect && globalConnect.start) {
              globalConnect.start();
            } else {
              alert('Ferramenta de conectar não está disponível no momento.');
            }
          } catch (error) {
            alert('Erro ao ativar a ferramenta de conectar. Verifique o console para detalhes.');
          }
        }
      }
    },

    // Elementos ER base
    'create.er-entity': createAction(
      'bpmn:Task',
      'model',
      'bpmn-icon-er-entity',
      'Entidade',
      { width: 120, height: 80, name: 'Entidade', isWeak: false, erType: 'Entity' }
    ),
    
    'create.er-attribute': {
      group: 'model',
      className: 'bpmn-icon-er-attribute',
      title: translate('Atributo (clique aqui, depois na Entidade/Relacionamento)'),
      action: {
        click: (event: Event) => {
          this.startAttributeConnectionMode(event);
        },
        dragstart: (event: Event) => {
          // Para drag ainda usar o modo tradicional como fallback
          const attrs = {
            type: 'bpmn:IntermediateCatchEvent',
            width: 80,
            height: 50,
            name: 'Atributo',
            dataType: 'VARCHAR',
            isPrimaryKey: false,        
            isRequired: true,
            isMultivalued: false,
            isDerived: false,
            isComposite: false,
            erType: 'Attribute'
          };
          const shape = erElementFactory.createShape(attrs);
          create.start(event, shape);
        }
      }
    }
  };

  // Adicionar relacionamento condicionalmente baseado na notação
  if (notationConfig.elements.hasRelationshipElement && notationConfig.relationshipConfig) {
    const { relationshipConfig } = notationConfig;
    entries['create.er-relationship'] = createAction(
      relationshipConfig.type,
      'model',
      relationshipConfig.className,
      relationshipConfig.title,
      relationshipConfig.defaultProperties
    );
  }

  return entries;
};

// Método para iniciar o modo de conexão de atributo
(ErPaletteProvider as any).prototype.startAttributeConnectionMode = function(this: any, event: Event) {
  const {
    erElementFactory,
    eventBus,
    canvas,
    elementRegistry,
    modeling,
    translate
  } = this;


  // Ativar o modo de conexão
  this.attributeConnectionMode.active = true;
  
  // Criar o atributo pendente (ainda não no canvas)
  this.attributeConnectionMode.pendingAttribute = {
    type: 'bpmn:UserTask',
    width: 80,
    height: 50,
    name: 'Atributo',
    dataType: 'VARCHAR',
    isPrimaryKey: false,        
    isRequired: true,
    isMultivalued: false,
    isDerived: false,
    isComposite: false,
    erType: 'Attribute'
  };

  // Mudar cursor para indicar modo de conexão
  const canvasContainer = canvas.getContainer();
  this.attributeConnectionMode.originalCursor = canvasContainer.style.cursor;
  canvasContainer.style.cursor = 'crosshair';
  
  // Adicionar overlay visual
  this.addConnectionModeOverlay();
  
  // Configurar listeners para clique em elementos
  this.setupAttributeConnectionListeners();
  
  // Mostrar notificação
  this.showAttributeConnectionNotification();
  
};

// Adicionar overlay visual para indicar modo ativo
(ErPaletteProvider as any).prototype.addConnectionModeOverlay = function(this: any) {
  // Remover overlay anterior se existir
  this.removeConnectionModeOverlay();
  
  const canvasContainer = this.canvas.getContainer();
  const overlay = document.createElement('div');
  overlay.className = 'attribute-connection-overlay';
  overlay.innerHTML = `
    🔗 Clique em uma Entidade${this.notationConfig.elements.hasRelationshipElement ? ' ou Relacionamento' : ''} para conectar o atributo
    <div class="attribute-connection-overlay-subtitle">ESC para cancelar</div>
  `;
  
  canvasContainer.appendChild(overlay);
};

// Remover overlay visual
(ErPaletteProvider as any).prototype.removeConnectionModeOverlay = function(this: any) {
  const overlay = document.querySelector('.attribute-connection-overlay');
  if (overlay && overlay.parentNode) {
    overlay.parentNode.removeChild(overlay);
  }
};

// Configurar listeners para o modo de conexão
(ErPaletteProvider as any).prototype.setupAttributeConnectionListeners = function(this: any) {
  const canvasContainer = this.canvas.getContainer();
  
  // Listener para clique em elementos
  this.attributeClickListener = (event: Event) => {
    if (!this.attributeConnectionMode.active) return;
    
    const target = event.target as HTMLElement;
    const elementData = this.getElementFromDomNode(target);
    
    if (elementData && this.canConnectAttributeTo(elementData)) {
      this.createConnectedAttribute(elementData, event);
    } else {
      // Clique fora - cancelar modo
      this.cancelAttributeConnectionMode();
    }
  };
  
  // Listener para tecla ESC
  this.attributeKeyListener = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      this.cancelAttributeConnectionMode();
    }
  };
  
  // Listener para destacar elementos válidos
  this.attributeHoverListener = (event: Event) => {
    if (!this.attributeConnectionMode.active) return;
    
    const target = event.target as HTMLElement;
    const elementData = this.getElementFromDomNode(target);
    
    if (elementData && this.canConnectAttributeTo(elementData)) {
      this.highlightValidTarget(target, true);
    } else {
      this.clearAllHighlights();
    }
  };
  
  canvasContainer.addEventListener('click', this.attributeClickListener, true);
  document.addEventListener('keydown', this.attributeKeyListener);
  canvasContainer.addEventListener('mouseover', this.attributeHoverListener);
};

// Obter elemento do bpmn-js a partir do nó DOM
(ErPaletteProvider as any).prototype.getElementFromDomNode = function(this: any, domNode: HTMLElement): any {
  let current = domNode;
  while (current && current !== document.body) {
    const elementId = current.getAttribute('data-element-id');
    if (elementId) {
      return this.elementRegistry.get(elementId);
    }
    current = current.parentElement as HTMLElement;
  }
  return null;
};

// Verificar se pode conectar atributo ao elemento (baseado na configuração)
(ErPaletteProvider as any).prototype.canConnectAttributeTo = function(this: any, element: any): boolean {
  if (!element || !element.businessObject) return false;
  
  const erType = ErElementUtils.getErType(element);
  
  // Sempre permitir conexão a entidades
  if (erType === 'Entity') return true;
  
  // Para relacionamentos, verificar configuração da notação
  if (erType === 'Relationship') {
    return this.notationConfig.elements.attributeCanConnectToRelationship;
  }
  
  return false;
};

// Destacar elemento válido para conexão
(ErPaletteProvider as any).prototype.highlightValidTarget = function(this: any, domNode: HTMLElement, highlight: boolean) {
  let current = domNode;
  while (current && current !== document.body) {
    if (current.getAttribute('data-element-id')) {
      if (highlight) {
        current.style.outline = '3px solid #10B981';
        current.style.outlineOffset = '2px';
        current.style.cursor = 'pointer';
      } else {
        current.style.outline = '';
        current.style.outlineOffset = '';
        current.style.cursor = '';
      }
      break;
    }
    current = current.parentElement as HTMLElement;
  }
};

// Limpar todos os destaques
(ErPaletteProvider as any).prototype.clearAllHighlights = function(this: any) {
  const highlighted = this.canvas.getContainer().querySelectorAll('[style*="outline"]');
  highlighted.forEach((el: HTMLElement) => {
    el.style.outline = '';
    el.style.outlineOffset = '';
    el.style.cursor = '';
  });
};

// Criar atributo conectado ao elemento selecionado
(ErPaletteProvider as any).prototype.createConnectedAttribute = function(this: any, targetElement: any, event: Event) {
  
  // Calcular posição para o atributo (ao lado do elemento)
  const targetBounds = targetElement;
  const attributeX = targetBounds.x + targetBounds.width + 60;
  const attributeY = targetBounds.y + targetBounds.height / 2 - 25;
  
  // Criar o atributo
  const attributeShape = this.erElementFactory.createShape(this.attributeConnectionMode.pendingAttribute);
  
  // Adicionar ao canvas na posição calculada
  this.modeling.createShape(attributeShape, { x: attributeX, y: attributeY }, this.canvas.getRootElement());
  
  // Criar conexão entre o elemento e o atributo
  this.createConnectionBetweenElements(targetElement, attributeShape);
  
  // Finalizar modo de conexão
  this.cancelAttributeConnectionMode();
  
};

// Criar conexão entre dois elementos
(ErPaletteProvider as any).prototype.createConnectionBetweenElements = function(this: any, source: any, target: any) {
  const connectionAttrs = {
    type: 'bpmn:SequenceFlow',
    source: source,
    target: target
  };
  
  const waypoints = [
    { x: source.x + source.width, y: source.y + source.height / 2 },
    { x: target.x, y: target.y + target.height / 2 }
  ];
  
  this.modeling.createConnection(source, target, connectionAttrs, this.canvas.getRootElement());
};

// Mostrar notificação para o modo de conexão de atributo
(ErPaletteProvider as any).prototype.showAttributeConnectionNotification = function(this: any) {
  notifications.info('Clique em uma Entidade ou Relacionamento para conectar o atributo');
};

// Cancelar modo de conexão de atributo
(ErPaletteProvider as any).prototype.cancelAttributeConnectionMode = function(this: any) {
  
  // Desativar modo
  this.attributeConnectionMode.active = false;
  this.attributeConnectionMode.pendingAttribute = null;
  
  // Restaurar cursor
  const canvasContainer = this.canvas.getContainer();
  canvasContainer.style.cursor = this.attributeConnectionMode.originalCursor;
  
  // Remover overlay
  this.removeConnectionModeOverlay();
  
  // Limpar destaques
  this.clearAllHighlights();
  
  // Remover listeners
  if (this.attributeClickListener) {
    canvasContainer.removeEventListener('click', this.attributeClickListener, true);
  }
  if (this.attributeKeyListener) {
    document.removeEventListener('keydown', this.attributeKeyListener);
  }
  if (this.attributeHoverListener) {
    canvasContainer.removeEventListener('mouseover', this.attributeHoverListener);
  }
  
};