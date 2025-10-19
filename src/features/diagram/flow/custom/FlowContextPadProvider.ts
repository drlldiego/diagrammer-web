/**
 * FlowContextPadProvider - Desabilita o ContextPad para Flowchart
 * Como o Flowchart está sempre em modo declarativo, o ContextPad deve estar sempre desabilitado
 */

// Interface específica para o ContextPad
interface ContextPad {
  registerProvider: (provider: any) => void;
  open?: (element: any, force?: boolean) => void;
}

export default function FlowContextPadProvider(
  this: any,
  contextPad: ContextPad
) {
  
  // ABORDAGEM 1: Interceptar o método open do ContextPad
  const originalOpen = contextPad.open?.bind(contextPad);
  if (originalOpen && contextPad.open) {
    contextPad.open = function(element: any, force?: boolean) {
      // NÃO abrir o ContextPad - sempre bloquear para Flow
      return;
    };
  }
  
  // ABORDAGEM 2: Limpar providers existentes e garantir que apenas o nosso seja usado
  if ((contextPad as any)._providers) {
    (contextPad as any)._providers = [];
  }
  
  // Registrar nosso provider com prioridade máxima
  contextPad.registerProvider(this);

  /**
   * Retorna sempre vazio para desabilitar o ContextPad
   * Flowchart está sempre em modo declarativo
   */
  this.getContextPadEntries = function(this: any, element: any): any {
    // SEMPRE retornar vazio - Flowchart é sempre declarativo
    return {};
  };

  // Definir prioridade máxima para sobrepor providers padrão
  this.getContextPadEntries.priority = 9999;
  
  // ABORDAGEM 3: Interceptar o trigger do ContextPad se existir
  if ((contextPad as any).trigger) {
    const originalTrigger = (contextPad as any).trigger.bind(contextPad);
    (contextPad as any).trigger = function(event: any, context?: any) {
      // Não chamar o trigger original - sempre bloquear
      return;
    };
  }
}

FlowContextPadProvider.$inject = [
  'contextPad'
];