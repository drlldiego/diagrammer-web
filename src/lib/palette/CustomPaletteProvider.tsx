import type Palette from 'diagram-js/lib/features/palette/Palette';
import type Create from 'diagram-js/lib/features/create/Create';
import type ElementFactory from 'bpmn-js/lib/features/modeling/ElementFactory';

export default class CustomPaletteProvider {
  static $inject = ['palette', 'create', 'elementFactory', 'bpmnFactory'];

  private _create: Create;
  private _elementFactory: ElementFactory;
  private _bpmnFactory: any;

  constructor(palette: Palette, create: Create, elementFactory: ElementFactory, bpmnFactory: any) {
    this._create = create;
    this._elementFactory = elementFactory;
    this._bpmnFactory = bpmnFactory;
  }

  getPaletteEntries() {
    const elementFactory = this._elementFactory;
    const create = this._create;
    const bpmnFactory = this._bpmnFactory;

    function createServiceTask(event: any) {
      const businessObject = bpmnFactory.create('bpmn:ServiceTask', {
        name: 'Service Task'
      });

      const shape = elementFactory.createShape({
        type: 'bpmn:ServiceTask',
        businessObject: businessObject
      });

      create.start(event, shape);
    }

  }
}