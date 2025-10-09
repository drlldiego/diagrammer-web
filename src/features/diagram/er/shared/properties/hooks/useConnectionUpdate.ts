import { useState, useCallback } from 'react';
import { logger } from '../../../../../../utils/logger';

/**
 * Hook para gerenciar atualizações de propriedades de conexões
 * Extrai a lógica complexa que estava no ErPropertiesPanelContainer
 */
export const useConnectionUpdate = (modeler: any) => {
  const [updateTrigger, setUpdateTrigger] = useState(0);

  const updateConnectionProperty = useCallback(async (
    element: any,
    propertyName: string,
    value: any
  ) => {
    try {
      const modeling = modeler.get('modeling') as any;
      const commandStack = modeler.get('commandStack') as any;
      
      // Método 1: Tentar usar modeling.updateProperties
      try {
        modeling.updateProperties(element, { [propertyName]: value });
      } catch (modelingError) {
        // Método 2: Tentar usar commandStack diretamente
        try {
          commandStack.execute('properties.update', {
            element: element,
            properties: { [propertyName]: value }
          });
        } catch (commandError) {
          // Método 3: Atribuição direta como último recurso
          const currentValue = (element?.businessObject as any)?.[propertyName];
          if (currentValue !== value && element?.businessObject) {
            (element.businessObject as any)[propertyName] = value;
            
            // Também atualiza em $attrs para compatibilidade com BPMN
            const eventBus = modeler.get('eventBus') as any;
            if (eventBus) {
              eventBus.fire('elements.changed', { elements: [element] });
            }
          }
        }
      }

      // Verificação final e atualização forçada, se necessário
      setTimeout(() => {
        const finalValue = (element?.businessObject as any)?.[propertyName];
        
        // Forçar re-renderização
        setUpdateTrigger(prev => prev + 1);
        
        if (finalValue !== value && element?.businessObject) {
          // Forçar atribuição direta
          (element.businessObject as any)[propertyName] = value;

          // Também atualiza em $attrs para compatibilidade com BPMN
          const businessObj = element.businessObject as any;
          if (!businessObj.$attrs) {
            businessObj.$attrs = {};
          }
          businessObj.$attrs[`er:${propertyName}`] = value;
          
          // Trigger eventos para notificar mudanças
          const eventBus = modeler.get('eventBus') as any;
          if (eventBus) {
            eventBus.fire('elements.changed', { elements: [element] });
            eventBus.fire('element.changed', { element });
          }
          
          // Force re-renderização novamente
          setUpdateTrigger(prev => prev + 1);
        }
      }, 100);
      
      // Forçar atualização visual para propriedades específicas, como cardinalidade
      if (propertyName.includes('cardinality')) {
        updateCardinalityVisuals(modeler, element);
      }
    } catch (error) {          
      logger.error('Error ao atualizar propriedade de conexão:', undefined, error as Error);
    }
  }, [modeler]);

  // Função auxiliar para atualizar visuais de cardinalidade
  const updateCardinalityVisuals = useCallback((modeler: any, element: any) => {
    try {
      const renderer = modeler.get('bpmnRenderer') || modeler.get('erBpmnRenderer');
      
      if (renderer && typeof (renderer as any).updateConnectionCardinalities === 'function') {
        // Utiliza método específico do renderizador, se disponível
        (renderer as any).updateConnectionCardinalities(element);
      } else {
        // Fallback: Força re-renderização manual
        const canvas = modeler.get('canvas') as any;
        const elementRegistry = modeler.get('elementRegistry') as any;
        
        if (canvas && elementRegistry && typeof elementRegistry.getGraphics === 'function') {
          const gfx = elementRegistry.getGraphics(element);
          
          if (gfx && typeof canvas.addMarker === 'function') {
            // Limpa elementos visuais existentes
            const existingLabels = gfx.querySelectorAll('.er-cardinality-label, .er-crowsfoot-marker');
            existingLabels.forEach((label: any) => {
              if (label.parentNode) {
                label.parentNode.removeChild(label);
              }
            });
            
            // Trigger re-renderização
            canvas.addMarker(element, 'er-cardinality-updated');
            setTimeout(() => {
              if (typeof canvas.removeMarker === 'function') {
                canvas.removeMarker(element, 'er-cardinality-updated');
              }
            }, 50);
          }
        }
      }
    } catch (renderError) {
      logger.warn('Falha ao atualizar visuais de cardinalidade:', undefined, renderError as Error);
    }
  }, []);

  return {
    updateConnectionProperty,
    updateTrigger
  };
};