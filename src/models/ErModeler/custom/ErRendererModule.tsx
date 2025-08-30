import ErBpmnRenderer from './ErBpmnRenderer';

interface ErRendererModule {
  bpmnRenderer: [string, any];
}

const erRendererModule: ErRendererModule = {
  // Substituir o 'bpmnRenderer' padrão pelo ErBpmnRenderer
  bpmnRenderer: ['type', ErBpmnRenderer]
};

export default erRendererModule;