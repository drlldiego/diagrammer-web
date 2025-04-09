import Actor from '../actor';

import type Palette from 'diagram-js/lib/features/palette/Palette';
import type Create from 'diagram-js/lib/features/create/Create';
import type ElementFactory from 'bpmn-js/lib/features/modeling/ElementFactory';
import type { PaletteEntries } from 'bpmn-js/lib/features/palette/PaletteProvider';


export default class TestePalette {
  static $inject = ['palette', 'create', 'elementFactory'];

  private _create: Create;
  private _elementFactory: ElementFactory;

  constructor(palette: Palette, create: Create, elementFactory: ElementFactory) {
    this._create = create;
    this._elementFactory = elementFactory;

    palette.registerProvider(this);
  }

  getPaletteEntries(): PaletteEntries {
    const elementFactory = this._elementFactory;
    const create = this._create;
  
    function startCreate(event: any) {
      const serviceTaskShape = elementFactory.create('shape', {
        type: 'bpmn:ServiceTask'
      });
  
      create.start(event, serviceTaskShape);
    }
  
    const entries: PaletteEntries = {
      'create-service-task': {
        group: 'activity',
        title: 'Create a new test CAT!',
        imageUrl: Actor.imageURL,
        action: {
          dragstart: startCreate,
          click: startCreate
        }
      }
    };
  
    return entries;
  }
  
}
