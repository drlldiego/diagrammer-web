import ErBpmnRenderer from './ErBpmnRenderer';

interface ErRendererModule {
  bpmnRenderer: [string, any];
  erConfig: [string, any];
}

const erRendererModule: ErRendererModule = {
  // Substituir o 'bpmnRenderer' padrão pelo ErBpmnRenderer
  bpmnRenderer: ['type', ErBpmnRenderer],
  // Configuração ER será injetada via notationConfig
  erConfig: ['factory', function(notationConfig: any) {
    return { notation: notationConfig?.notation || 'chen' };
  }]
};

// Injeção de dependência para o factory de erConfig
(erRendererModule.erConfig[1] as any).$inject = ['notationConfig'];

export default erRendererModule;