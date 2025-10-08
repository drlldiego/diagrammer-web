// Traduções portuguesas para bpmn-js seguindo padrão oficial
const translations: { [key: string]: string } = {
  // Palette
  'Search in diagram': 'Pesquisar no diagrama',
  'Open minimap': 'Abrir minimapa',
  'Activate hand tool': 'Ativar ferramenta de mão',
  'Activate the hand tool': 'Ativar ferramenta de mão',
  'Activate lasso tool': 'Ativar ferramenta de seleção',
  'Activate the lasso tool': 'Ativar ferramenta de seleção',
  'Activate create/remove space tool': 'Ativar ferramenta criar/remover espaço',
  'Activate the create/remove space tool': 'Ativar ferramenta criar/remover espaço',
  'Activate global connect tool': 'Ativar ferramenta de conexão global',
  'Activate the global connect tool': 'Ativar ferramenta de conexão global',
  'Create start event': 'Criar evento de início',
  'Create end event': 'Criar evento de fim',
  'Create task': 'Criar tarefa',
  'Create gateway': 'Criar gateway',
  'Create exclusive gateway': 'Criar gateway exclusivo',
  'Create parallel gateway': 'Criar gateway paralelo',
  'Create inclusive gateway': 'Criar gateway inclusivo',
  'Create complex gateway': 'Criar gateway complexo',
  'Create event based gateway': 'Criar gateway baseado em eventos',
  'Create intermediate/boundary event': 'Criar evento intermediário/limite',
  'Create data object reference': 'Criar referência de objeto de dados',
  'Create data object': 'Criar objeto de dados',
  'Create data store reference': 'Criar referência de armazenamento de dados',
  'Create data store': 'Criar armazenamento de dados',
  'Create expanded sub-process': 'Criar subprocesso expandido',
  'Create pool/participant': 'Criar pool/participante',
  'Create group': 'Criar grupo',
  'Create text annotation': 'Criar anotação de texto',

  // Context Pad
  'Append task': 'Adicionar tarefa',
  'Append end event': 'Adicionar evento de fim',
  'Append gateway': 'Adicionar gateway',
  'Append intermediate/boundary event': 'Adicionar evento intermediário/limite',
  'Change type': 'Alterar tipo',
  'Change element': 'Alterar elemento',
  'Connect using Association': 'Conectar usando Associação',
  'Connect using Sequence/MessageFlow or Association': 'Conectar usando Fluxo de Sequência/Mensagem ou Associação',
  'Connect using DataInputAssociation': 'Conectar usando Associação de Entrada de Dados',
  'Connect to other element': 'Conectar a outro elemento',
  'Add text annotation': 'Adicionar anotação de texto',
  'Remove': 'Remover',
  'Delete': 'Excluir',
  
  // Tipos de eventos específicos
  'Intermediate throw event': 'Evento intermediário de envio',
  'End event': 'Evento de fim',
  'Message start event': 'Evento de início de mensagem',
  'Timer start event': 'Evento de início de timer',
  'Conditional start event': 'Evento de início condicional',
  'Signal start event': 'Evento de início de sinal',

  // Properties Panel
  'General': 'Geral',
  'Details': 'Detalhes',
  'Documentation': 'Documentação',
  'Element documentation': 'Documentação do elemento',
  'Forms': 'Formulários',
  'Listeners': 'Ouvintes',
  'Input/Output': 'Entrada/Saída',
  'Connector': 'Conector',
  'Field Injection': 'Injeção de Campo',
  'Extensions': 'Extensões',
  'Multi Instance': 'Multi Instância',
  'Multi-instance': 'Multi-instância',
  'Asynchronous Continuations': 'Continuações Assíncronas',
  'Job Configuration': 'Configuração do Job',
  'External Task Configuration': 'Configuração de Tarefa Externa',
  
  // Tipos de eventos e elementos específicos
  'Compensation': 'Compensação',
  'Error': 'Erro',
  'Link': 'Link',
  'Signal': 'Sinal',
  'Escalation': 'Escalação',
  'Timer': 'Timer',

  // Properties fields
  'Id': 'ID',
  'ID': 'ID',
  'Name': 'Nome',
  'Process Id': 'ID do Processo',
  'Process Name': 'Nome do Processo',
  'Version Tag': 'Tag da Versão',
  'Executable': 'Executável',
  'History Time To Live': 'Tempo de Vida do Histórico',
  'Job Priority': 'Prioridade do Job',
  'Candidate Users': 'Usuários Candidatos',
  'Candidate Groups': 'Grupos Candidatos',
  'Assignee': 'Responsável',
  'Due Date': 'Data de Vencimento',
  'Follow Up Date': 'Data de Acompanhamento',
  'Priority': 'Prioridade',
  'Form Key': 'Chave do Formulário',
  'Business Key': 'Chave de Negócio',
  'Topic': 'Tópico',
  'Type': 'Tipo',
  'Implementation': 'Implementação',
  'Delegate Expression': 'Expressão do Delegado',
  'Class': 'Classe',
  'Expression': 'Expressão',
  'Script Format': 'Formato do Script',
  'Script Type': 'Tipo do Script',
  'Script': 'Script',
  'Resource': 'Recurso',
  'Inline Script': 'Script Inline',
  'External Resource': 'Recurso Externo',
  'Result Variable': 'Variável de Resultado',
  'Condition': 'Condição',
  'Condition Type': 'Tipo de Condição',
  'Variable Name': 'Nome da Variável',
  'Variable Event': 'Evento da Variável',
  'Source': 'Fonte',
  'Target': 'Destino',
  'Label': 'Rótulo',
  'Message': 'Mensagem',
  'Message Name': 'Nome da Mensagem',
  'Timer Definition Type': 'Tipo de Definição do Timer',
  'Timer Definition': 'Definição do Timer',
  'Date': 'Data',
  'Duration': 'Duração',
  'Cycle': 'Ciclo',

  // Buttons
  'Add': 'Adicionar',
  'Clear': 'Limpar',
  'Edit': 'Editar',
  'Save': 'Salvar',
  'Cancel': 'Cancelar',
  'Apply': 'Aplicar',

  // Validation messages
  'Must provide a value': 'Deve fornecer um valor',
  'Must be a valid identifier': 'Deve ser um identificador válido',
  'Must not be empty': 'Não pode estar vazio',
  'Must be unique': 'Deve ser único',
  'ID must be unique.': 'ID deve ser único.',

  // Camunda specific
  'Asynchronous Before': 'Assíncrono Antes',
  'Asynchronous After': 'Assíncrono Depois',
  'Exclusive': 'Exclusivo',
  'Retry Time Cycle': 'Ciclo de Tempo de Repetição',
  'Job Type': 'Tipo do Job',
  'Job Retries': 'Repetições do Job',
  'Called Element': 'Elemento Chamado',
  'Called Element Type': 'Tipo do Elemento Chamado',
  'Binding': 'Vinculação',
  'Version': 'Versão',
  'Business Key Expression': 'Expressão da Chave de Negócio'
};

// Função de tradução seguindo o padrão oficial bpmn-js-i18n
export default function customTranslate(template: string, replacements?: { [key: string]: any }): string {
  // Buscar tradução
  let translation = translations[template] || template;
  
  // Aplicar substitutos se existirem
  if (replacements) {
    translation = translation.replace(/\{([^}]+)\}/g, (match, key) => {
      return replacements[key] !== undefined ? replacements[key] : match;
    });
  }
  
  return translation;
}