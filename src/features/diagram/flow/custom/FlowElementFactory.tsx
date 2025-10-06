import { is } from 'bpmn-js/lib/util/ModelUtil';
import ElementFactory from 'bpmn-js/lib/features/modeling/ElementFactory';


interface BusinessObject {
  id: string;
  name?: string;
  flowType?: string;
  $attrs?: { [key: string]: any };
}

interface FlowElement {
  id: string;
  type: string;
  businessObject: BusinessObject;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  parent?: FlowElement;
  children?: FlowElement[];
  incoming?: FlowElement[];
  outgoing?: FlowElement[];
}

interface FlowAttrs {
  type?: string;
  flowType?: string;
  name?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  isExpanded?: boolean;
  [key: string]: any;
}

/**
 * Factory customizado para elementos de fluxograma
 */
export default class FlowElementFactory extends ElementFactory {
  private _bpmnFactory: any;
  private _moddle: any;

  constructor(bpmnFactory: any, moddle: any) {
    super(bpmnFactory, moddle);
    this._bpmnFactory = bpmnFactory;
    this._moddle = moddle;
  }

  /**
   * Criar elemento customizado de fluxograma
   */
  create(elementType: string, attrs: any = {}): any {
    const flowType = attrs.flowType;
    
    // Se temos um flowType, criar como elemento flow:
    if (flowType) {
      const flowElementType = `flow:${flowType}`;
      
      // Criar elemento base
      const element = super.create('shape', {
        ...attrs,
        type: flowElementType
      });

      // Definir dimensões padrão baseadas no tipo
      switch (flowType) {
        case 'Inicio':
        case 'Fim':
          element.width = 60;
          element.height = 60;
          element.businessObject.name = flowType === 'Inicio' ? 'Início' : 'Fim';
          break;
        case 'Retangulo':
          element.width = 140;
          element.height = 80;
          element.businessObject.name = 'Processo';
          break;
        case 'Decisao':
          element.width = 140;
          element.height = 100;
          element.businessObject.name = 'Decisão';
          break;
        case 'InputOutput':
          element.width = 140;
          element.height = 80;
          element.businessObject.name = 'Input/Output';
          break;
      }

      // Garantir que o tipo está definido corretamente
      element.type = flowElementType;
      element.businessObject.flowType = flowType;
      
      return element;
    }

    // Para outros tipos, usar o comportamento padrão
    const validType = ['shape', 'connection', 'label', 'root'].includes(elementType) ? elementType as any : 'shape' as any;
    return super.create(validType, attrs);
  }

  /**
   * Criar shape customizado
   */
  createShape(attrs: any = {}): any {
    return this.create('shape', attrs);
  }

  /**
   * Criar conexão customizada
   */
  createConnection(attrs: any = {}): any {
    return this.create('connection', { 
      type: 'bpmn:SequenceFlow', 
      ...attrs 
    });
  }

  /**
   * Criar participante (não usado no fluxograma, mas mantido para compatibilidade)
   */
  createParticipantShape(): any {
    return this.createShape({
      type: 'bpmn:Participant',
      isExpanded: true
    });
  }
}

// Injeção de dependências para bpmn-js
(FlowElementFactory as any).$inject = [
  'bpmnFactory',
  'moddle'
];