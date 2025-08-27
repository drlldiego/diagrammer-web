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

// interface LassoTool removida - ferramenta desabilitada

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
  cardinalityTarget?: string;
  isIdentifying?: boolean;
  dataType?: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  isRequired?: boolean;
  isMultivalued?: boolean;
  isDerived?: boolean;
  isComposite?: boolean;
}

// Provider da paleta ER
export default function ErPaletteProvider(
  this: any,
  palette: Palette,
  create: Create,
  elementFactory: ElementFactory,
  erElementFactory: ErElementFactory,
  spaceTool: SpaceTool,
  handTool: HandTool,
  globalConnect: GlobalConnect,
  translate: Translate
) {
  // Debug das dependências injetadas
  console.log('🔍 ErPaletteProvider: Dependências injetadas:', {
    palette: !!palette,
    create: !!create,
    elementFactory: !!elementFactory,
    erElementFactory: !!erElementFactory,
    spaceTool: !!spaceTool,
    handTool: !!handTool,
    globalConnect: !!globalConnect,
    translate: !!translate
  });
  
  if (spaceTool) {
    console.log('SpaceTool métodos disponíveis:', Object.getOwnPropertyNames(spaceTool));
    console.log('SpaceTool prototype:', Object.getOwnPropertyNames(Object.getPrototypeOf(spaceTool)));
  }

  palette.registerProvider(this);
  this.create = create;
  this.elementFactory = elementFactory;
  this.erElementFactory = erElementFactory;
  this.spaceTool = spaceTool;
  this.handTool = handTool;
  this.globalConnect = globalConnect;
  this.translate = translate;
}

ErPaletteProvider.$inject = [
  'palette',
  'create',
  'elementFactory',
  'erElementFactory',
  'spaceTool',
  'handTool',
  'globalConnect',
  'translate'
];

(ErPaletteProvider as any).prototype.getPaletteEntries = function(this: any): { [key: string]: PaletteEntry } {
  console.log('Entrei na função getPaletteEntries');
  const {
    create,
    elementFactory,
    erElementFactory,
    spaceTool,
    handTool,
    globalConnect,
    translate
  } = this;

  const createAction = (
    type: string,
    group: string,
    className: string,
    title: string,
    options: Partial<ElementOptions> = {}
  ): PaletteEntry => {
    const createListener = (event: Event) => {
      console.log('ErPalette: createListener chamado para', type, 'com options:', options);
      const attrs = Object.assign({ type: type }, options);
      console.log('ErPalette: attrs final para createShape:', attrs);
      const shape = erElementFactory.createShape(attrs);
      console.log('ErPalette: shape criado:', shape);
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

  return {
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
    // 'lasso-tool' removido devido a problemas de inicialização
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

    // Elementos ER (usando tipos BPMN válidos)
    'create.er-entity': createAction(
      'bpmn:Task',
      'model',
      'bpmn-icon-er-entity',
      'Entidade',
      { width: 120, height: 80, name: 'Entidade', isWeak: false, erType: 'Entity' }
    ),
    'create.er-weak-entity': createAction(
      'bpmn:Task',
      'model',
      'bpmn-icon-er-weak-entity',
      'Entidade Fraca',
      { width: 120, height: 80, name: 'Entidade Fraca', isWeak: true, erType: 'Entity' }
    ),
    'create.er-relationship': createAction(
      'bpmn:IntermediateCatchEvent',
      'model',
      'bpmn-icon-er-relationship',
      'Relacionamento',
      {
        width: 140,
        height: 80,
        name: 'Relacionamento',
        cardinalitySource: '1',
        cardinalityTarget: 'N',
        isIdentifying: false,
        erType: 'Relationship'
      }
    ),
    'create.er-attribute': createAction(
      'bpmn:UserTask',
      'model',
      'bpmn-icon-er-attribute',
      'Atributo',
      {
        width: 80,
        height: 50,
        name: 'Atributo',
        dataType: 'VARCHAR',
        isPrimaryKey: false,
        isForeignKey: false,
        isRequired: true,
        isMultivalued: false,
        isDerived: false,
        isComposite: false,
        erType: 'Attribute'
      }
    ),    
  };
};