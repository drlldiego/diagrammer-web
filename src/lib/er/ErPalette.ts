import Palette from 'diagram-js/lib/features/palette/Palette';
import Create from 'diagram-js/lib/features/create/Create';
import ErFactory from './ErFactory';

interface PaletteEntry {
  group: string;
  className: string;
  title: string;
  action: {
    dragstart?: (event: any) => void;
    click: (event: any) => void;
  };
}

interface PaletteEntries {
  [key: string]: PaletteEntry;
}

export default class ErPalette {
  static $inject = ['palette', 'create', 'erFactory'];

  private _create: Create;
  private _erFactory: ErFactory;

  constructor(palette: Palette, create: Create, erFactory: ErFactory) {
    this._create = create;
    this._erFactory = erFactory;

    palette.registerProvider(this);
  }

  getPaletteEntries(): PaletteEntries {
    const create = this._create;
    const erFactory = this._erFactory;

    function createEntity(event: any) {
      const shape = erFactory.createEntity();
      create.start(event, shape);
    }

    function createAttribute(event: any) {
      const shape = erFactory.createAttribute();
      create.start(event, shape);
    }

    function createRelationship(event: any) {
      const shape = erFactory.createRelationship();
      create.start(event, shape);
    }

    return {
      'create-entity': {
        group: 'er',
        className: 'bpmn-icon-task',
        title: 'Criar Entidade',
        action: {
          dragstart: createEntity,
          click: createEntity
        }
      },
      'create-attribute': {
        group: 'er',
        className: 'bpmn-icon-data-object',
        title: 'Criar Atributo',
        action: {
          dragstart: createAttribute,
          click: createAttribute
        }
      },
      'create-relationship': {
        group: 'er',
        className: 'bpmn-icon-gateway-none',
        title: 'Criar Relacionamento',
        action: {
          dragstart: createRelationship,
          click: createRelationship
        }
      }
    };
  }
}