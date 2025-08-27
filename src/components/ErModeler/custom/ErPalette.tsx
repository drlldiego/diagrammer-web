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

interface LassoTool {
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
  lassoTool: LassoTool,
  handTool: HandTool,
  globalConnect: GlobalConnect,
  translate: Translate
) {
  palette.registerProvider(this);
  this.create = create;
  this.elementFactory = elementFactory;
  this.erElementFactory = erElementFactory;
  this.spaceTool = spaceTool;
  this.lassoTool = lassoTool;
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
  'lassoTool',
  'handTool',
  'globalConnect',
  'translate'
];

(ErPaletteProvider as any).prototype.getPaletteEntries = function(this: any): { [key: string]: PaletteEntry } {
  const {
    create,
    elementFactory,
    erElementFactory,
    spaceTool,
    lassoTool,
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
      console.log('🎨 ErPalette: createListener chamado para', type, 'com options:', options);
      const attrs = Object.assign({ type: type }, options);
      console.log('🎨 ErPalette: attrs final para createShape:', attrs);
      const shape = erElementFactory.createShape(attrs);
      console.log('🎨 ErPalette: shape criado:', shape);
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
      action: { click: handTool.activateHand }
    },
    'lasso-tool': {
      group: 'tools',
      className: 'bpmn-icon-lasso-tool',
      title: translate('Selecionar área'),
      action: { click: lassoTool.activateSelection }
    },
    'space-tool': {
      group: 'tools',
      className: 'bpmn-icon-space-tool',
      title: translate('Espaço'),
      action: { click: spaceTool.activateSelection }
    },
    'global-connect-tool': {
      group: 'tools',
      className: 'bpmn-icon-connection-multi',
      title: translate('Conectar elementos'),
      action: { click: globalConnect.start }
    },

    // Separador ER
    'er-separator': { group: 'er', separator: true },

    // Elementos ER (usando tipos BPMN válidos)
    'create.er-entity': createAction(
      'bpmn:Task',
      'er',
      'bpmn-icon-er-entity',
      'Entidade',
      { width: 120, height: 80, name: 'Entidade', isWeak: false, erType: 'Entity' }
    ),
    'create.er-weak-entity': createAction(
      'bpmn:Task',
      'er',
      'bpmn-icon-er-weak-entity',
      'Entidade Fraca',
      { width: 120, height: 80, name: 'Entidade Fraca', isWeak: true, erType: 'Entity' }
    ),
    'create.er-relationship': createAction(
      'bpmn:IntermediateCatchEvent',
      'er',
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
      'er',
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
    'create.er-composite-attribute': createAction(
      'bpmn:SubProcess',
      'er',
      'bpmn-icon-er-composite-attribute',
      'Atributo Composto',
      {
        width: 200,
        height: 150,
        name: 'Composto',
        isExpanded: true,
        dataType: 'COMPOSITE',
        isPrimaryKey: false,
        isForeignKey: false,
        isRequired: true,
        isMultivalued: false,
        isDerived: false,
        isComposite: true,
        erType: 'CompositeAttribute'
      }
    )
  };
};