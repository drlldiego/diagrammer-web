// Interfaces para tipagem
interface Palette {
  registerProvider: (provider: FlowPaletteProvider) => void;
}

interface Create {
  start: (event: Event, shape: any) => void;
}

interface ElementFactory {
  createShape: (attrs: any) => any;
  createParticipantShape: () => any;
}

interface Tool {
  activateHand?: (event: Event) => void;
  activateSelection?: (event: Event) => void;
}

interface PaletteAction {
  dragstart?: (event: Event) => void;
  click?: (event: Event) => void;
}

interface PaletteEntry {
  group: string;
  className?: string;
  title?: string;
  separator?: boolean;
  action?: PaletteAction;
}

interface PaletteEntries {
  [key: string]: PaletteEntry;
}

/**
 * Provedor de paleta customizado para elementos de fluxograma
 */
export default class FlowPaletteProvider {
  private _palette: Palette;
  private _create: Create;
  private _elementFactory: ElementFactory;
  private _spaceTool: Tool;
  private _lassoTool: Tool;
  private _handTool: Tool;

  constructor(
    palette: Palette, 
    create: Create, 
    elementFactory: ElementFactory, 
    spaceTool: Tool, 
    lassoTool: Tool, 
    handTool: Tool
  ) {
    this._palette = palette;
    this._create = create;
    this._elementFactory = elementFactory;
    this._spaceTool = spaceTool;
    this._lassoTool = lassoTool;
    this._handTool = handTool;

    palette.registerProvider(this);
  }

  /**
   * Obter entradas da paleta para elementos de fluxograma
   */
  getPaletteEntries(element?: any): PaletteEntries {
    const actions: PaletteEntries = {};
    const create = this._create;
    const elementFactory = this._elementFactory;

    /**
     * Criar ação para elemento da paleta
     */
    const createAction = (
      type: string, 
      group: string, 
      className: string, 
      title: string, 
      options: any = {}
    ): PaletteEntry => {
      const createListener = (event: Event) => {
        const shape = elementFactory.createShape({
          type: type,
          ...options
        });
        create.start(event, shape);
      };

      const shortType = type.replace(/^flow:/, '');

      return {
        group: group,
        className: className,
        title: title || `Criar ${shortType}`,
        action: {
          dragstart: createListener,
          click: createListener
        }
      };
    };

    // Ferramentas básicas
    actions['hand-tool'] = {
      group: 'tools',
      className: 'bpmn-icon-hand-tool',
      title: 'Ativar ferramenta de mão',
      action: {
        click: (event: Event) => {
          this._handTool.activateHand?.(event);
        }
      }
    };

    actions['lasso-tool'] = {
      group: 'tools',
      className: 'bpmn-icon-lasso-tool',
      title: 'Ativar ferramenta de seleção',
      action: {
        click: (event: Event) => {
          this._lassoTool.activateSelection?.(event);
        }
      }
    };

    actions['space-tool'] = {
      group: 'tools',
      className: 'bpmn-icon-space-tool',
      title: 'Ativar ferramenta de espaço',
      action: {
        click: (event: Event) => {
          this._spaceTool.activateSelection?.(event);
        }
      }
    };

    actions['tool-separator'] = {
      group: 'tools',
      separator: true
    };

    // Elementos de fluxograma
    actions['create.flow-start'] = createAction(
      'bpmn:StartEvent',
      'event',
      'flow-icon-inicio',
      'Criar evento de início',
      { flowType: 'Inicio' }
    );

    actions['create.flow-end'] = createAction(
      'bpmn:EndEvent',
      'event', 
      'flow-icon-fim',
      'Criar evento de fim',
      { flowType: 'Fim' }
    );

    actions['create.flow-rectangle'] = createAction(
      'bpmn:Task',
      'activity',
      'flow-icon-retangulo',
      'Criar processo (retângulo)',
      { flowType: 'Retangulo' }
    );

    actions['create.flow-decision'] = createAction(
      'bpmn:ExclusiveGateway',
      'gateway',
      'flow-icon-decisao', 
      'Criar decisão (losango)',
      { flowType: 'Decisao' }
    );

    return actions;
  }
}

// Injeção de dependências para bpmn-js
(FlowPaletteProvider as any).$inject = [
  'palette',
  'create',
  'elementFactory',
  'spaceTool',
  'lassoTool',
  'handTool'
];