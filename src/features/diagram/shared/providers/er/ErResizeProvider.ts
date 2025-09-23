/**
 * Provider para desabilitar handles de resize em containers ER CompositeAttribute
 * Este provider remove visualmente os handles de redimensionamento
 */

interface Canvas {
  addMarker: (element: any, marker: string) => void;
  removeMarker: (element: any, marker: string) => void;
}

interface EventBus {
  on: (event: string, callback: (event: any) => void) => void;
}

interface Element {
  type: string;
  businessObject?: {
    erType?: string;
    [key: string]: any;
  };
}

export default function ErResizeProvider(
  this: any,
  canvas: Canvas,
  eventBus: EventBus
) {
  
  // Escutar eventos de seleção para aplicar estilo
  eventBus.on('selection.changed', (event: any) => {
    const { newSelection } = event;
    
    newSelection.forEach((element: Element) => {
      if ((element.type === 'bpmn:SubProcess' || element.type === 'bpmn:UserTask') && 
          element.businessObject?.erType === 'CompositeAttribute') {
        
        // Adicionar marcador CSS para esconder handles de resize
        canvas.addMarker(element, 'er-no-resize');
      }
    });
  });
  
  // Também aplicar quando elemento for criado
  eventBus.on('element.added', (event: any) => {
    const { element } = event;
    
    if ((element.type === 'bpmn:SubProcess' || element.type === 'bpmn:UserTask') && 
        element.businessObject?.erType === 'CompositeAttribute') {
      
      canvas.addMarker(element, 'er-no-resize');
    }
  });
}

ErResizeProvider.$inject = ['canvas', 'eventBus'];