/**
 * Provider para desabilitar controles de expansão em containers ER CompositeAttribute
 * Este provider remove especificamente os botões de colapsar/expandir dos SubProcess
 * que são usados como containers compostos no diagrama ER
 */

interface ContextPad {
  getEntries: (element: any) => any;
}

interface Element {
  type: string;
  businessObject?: {
    erType?: string;
    [key: string]: any;
  };
}

export default function ErSubprocessControlProvider(
  this: any,
  contextPad: ContextPad
) {
  // Interceptar e modificar as entradas do context pad
  const originalGetEntries = contextPad.getEntries;
  
  contextPad.getEntries = function(element: Element) {
    const entries = originalGetEntries.call(this, element);
    
    // Verificar se é um SubProcess usado como container ER CompositeAttribute
    if (element.type === 'bpmn:SubProcess' && 
        element.businessObject?.erType === 'CompositeAttribute') {
      
      // Remover todas as ações relacionadas a colapsar/expandir
      delete entries['replace'];
      delete entries['toggle-collapse'];
      delete entries['expand'];
      delete entries['collapse'];
      delete entries['toggle'];
      
      // Também remover ações de modificação que podem revelar controles de expansão
      delete entries['replace-with-expanded-subprocess'];
      delete entries['replace-with-collapsed-subprocess'];
      delete entries['toggle-subprocess-marker'];
    }
    
    return entries;
  };
  
  // Garantir alta prioridade para sobrepor outros providers
  (contextPad.getEntries as any).priority = 2000;
}

ErSubprocessControlProvider.$inject = ['contextPad'];