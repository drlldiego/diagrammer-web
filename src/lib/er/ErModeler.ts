import BpmnModeler from 'bpmn-js/lib/Modeler';
import erModule from './index';

export default class ErModeler extends BpmnModeler {
  constructor(options: any) {
    super({
      ...options,
      additionalModules: [
        erModule,
        ...(options.additionalModules || [])
      ]
    });
  }

  // Override para não usar BPMN XML
  importXML(xml: string): Promise<any> {
    // Inicializa um diagrama vazio
    const canvas = this.get<any>('canvas');
    const elementFactory = this.get<any>('elementFactory');
    
    // Cria um root element se não existir
    const rootElement = elementFactory.createRoot({
      id: 'Process_1',
      type: 'bpmn:Process'
    });
    
    canvas.setRootElement(rootElement);
    
    return Promise.resolve({ warnings: [] });
  }

  // Override para exportar formato ER
  saveXML(): Promise<any> {
    const elementRegistry = this.get<any>('elementRegistry');
    const elements = elementRegistry?.getAll() || [];
    
    const diagramData = {
      type: 'er-diagram',
      elements: elements
        .filter((el: any) => el.type && el.type.startsWith('er:'))
        .map((el: any) => ({
          id: el.id,
          type: el.type,
          name: el.businessObject?.name,
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height
        }))
    };
    
    return Promise.resolve({ 
      xml: JSON.stringify(diagramData, null, 2) 
    });
  }
}