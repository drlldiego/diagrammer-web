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
    // Mapear tipos de fluxograma para BPMN
    let type = elementType;
    const flowType = attrs.flowType;

    if (flowType) {
      attrs = { ...attrs };
      attrs.flowType = flowType;
    }

    // Criação do elemento base - usando shape como padrão
    const validType = ['shape', 'connection', 'label', 'root'].includes(type) ? type as any : 'shape' as any;
    const element = super.create(validType, attrs);

    // Adicionar propriedades específicas do fluxograma
    if (element.businessObject && flowType) {
      element.businessObject.flowType = flowType;
      
      // Definir nomes padrão baseados no tipo
      if (!element.businessObject.name) {
        switch (flowType) {
          case 'Inicio':
            element.businessObject.name = 'Início';
            break;
          case 'Fim':
            element.businessObject.name = 'Fim';
            break;
          case 'Retangulo':
            element.businessObject.name = 'Processo';
            break;
          case 'Decisao':
            element.businessObject.name = 'Decisão';
            break;
          default:
            break;
        }
      }
    }

    return element;
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