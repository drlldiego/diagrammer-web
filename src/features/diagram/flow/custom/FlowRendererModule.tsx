import FlowBpmnRenderer from './FlowBpmnRenderer';

const flowRendererModule = {
  // Substituir o 'bpmnRenderer' padrão pelo FlowBpmnRenderer
  bpmnRenderer: ['type', FlowBpmnRenderer]
};

export default flowRendererModule;