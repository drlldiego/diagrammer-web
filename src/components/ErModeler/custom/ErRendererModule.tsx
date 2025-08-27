import ErBpmnRenderer from './ErBpmnRenderer';

console.log('🔥 ErRendererModule: Carregando módulo de substituição do renderer!');

// Interface para módulo de renderização ER
interface ErRendererModule {
  bpmnRenderer: [string, any];
}

/**
 * Módulo que substitui o renderer BPMN padrão pelo ErBpmnRenderer
 * Garante renderização única para elementos ER mantendo compatibilidade BPMN
 */
const erRendererModule: ErRendererModule = {
  // Substituir o 'bpmnRenderer' padrão pelo ErBpmnRenderer
  bpmnRenderer: ['type', ErBpmnRenderer]
};

export default erRendererModule;