import { useCallback } from 'react';

interface UsePropertyUpdaterReturn {
  updateProperty: (propertyName: string, value: any) => void;
  updateElementSize: (dimension: 'width' | 'height', value: number, element: any, modeler: any) => void;
}

export const usePropertyUpdater = (
  element: any, 
  modeler: any, 
  setProperties: (updateFn: (prev: any) => any) => void
): UsePropertyUpdaterReturn => {

  const updateProperty = useCallback((propertyName: string, value: any) => {
    if (!element || !modeler) return;

    try {
      const modeling = modeler.get('modeling');
      const eventBus = modeler.get('eventBus');
      const businessObject = element.businessObject;

      // Primeiro tentar o método oficial do bpmn-js
      try {
        modeling.updateProperties(element, {
          [propertyName]: value
        });
      } catch (modelingError) {
        console.warn('⚠️ modeling.updateProperties falhou:', modelingError);
      }
      
      // Garantir que a propriedade foi realmente definida diretamente no businessObject
      businessObject[propertyName] = value;
      
      // Debug: verificar se a propriedade foi atualizada
      console.log(`🔧 Propriedade ${propertyName} atualizada para:`, value);
      console.log('💾 BusinessObject após update:', element.businessObject);
      console.log('🔍 Verificação direta da propriedade:', element.businessObject[propertyName]);

      // Atualizar estado local
      setProperties(prev => prev ? { ...prev, [propertyName]: value } : null);

      // 🔥 CORREÇÃO PRINCIPAL: Disparar evento para notificar outros componentes
      if (eventBus) {
        try {
          eventBus.fire('element.changed', {
            element: element,
            properties: { [propertyName]: value }
          });
          console.log('🔔 Evento element.changed disparado para:', propertyName);
        } catch (eventError) {
          console.warn('⚠️ Erro ao disparar evento element.changed:', eventError);
        }
      }

      // Forçar re-renderização do elemento se necessário
      if (propertyName === 'name' || propertyName === 'isWeak' || propertyName === 'isPrimaryKey' || propertyName === 'isForeignKey' || propertyName === 'isRequired' || propertyName === 'isMultivalued' || propertyName === 'isDerived' || propertyName === 'isComposite' || propertyName === 'cardinalitySource' || propertyName === 'cardinalityTarget' || propertyName === 'isIdentifying') {
        try {
          const elementRegistry = modeler.get('elementRegistry');
          const renderer = modeler.get('bpmnRenderer') || modeler.get('erBpmnRenderer');
          
          console.log('🔄 Forçando re-renderização para propriedade:', propertyName);
          
          // Para mudanças de cardinalidade, focar apenas na conexão
          if (propertyName === 'cardinalitySource' || propertyName === 'cardinalityTarget') {
            const isConnection = element.type && (element.type === 'bpmn:SequenceFlow' || element.waypoints);
            
            if (isConnection && renderer && renderer.drawConnection) {
              // Re-renderizar apenas a conexão específica
              const connectionGfx = elementRegistry.getGraphics(element);
              if (connectionGfx) {
                connectionGfx.innerHTML = '';
                renderer.drawConnection(connectionGfx, element);
                console.log('🔗 Re-renderizada conexão específica:', element.id);
              }
            }
          } else {
            // Para outras propriedades, re-renderizar o elemento
            if (renderer && renderer.drawShape) {
              const gfx = elementRegistry.getGraphics(element);
              if (gfx) {
                gfx.innerHTML = '';
                renderer.drawShape(gfx, element);
                console.log('🎨 Re-renderizado elemento:', element.id);
              }
            }
          }
        } catch (renderError) {
          console.error('Erro na re-renderização:', renderError);
        }
      }

    } catch (error) {
      console.error('Erro ao atualizar propriedade:', error);
    }
  }, [element, modeler, setProperties]);

  const updateElementSize = useCallback((dimension: 'width' | 'height', value: number, element: any, modeler: any) => {
    if (!element || !modeler || value < (dimension === 'width' ? 50 : 30)) {
      console.warn(`🚫 Tamanho inválido: ${dimension} deve ser pelo menos ${dimension === 'width' ? 50 : 30}px`);
      return;
    }

    try {
      const modeling = modeler.get('modeling');
      
      // Criar objeto com as novas dimensões
      const newBounds = {
        x: element.x,
        y: element.y,
        width: dimension === 'width' ? value : element.width,
        height: dimension === 'height' ? value : element.height
      };

      // Atualizar elemento usando bpmn-js modeling
      modeling.resizeShape(element, newBounds);
      
      console.log(`📐 Elemento redimensionado: ${dimension}=${value}px`);
      
    } catch (error) {
      console.error(`❌ Erro ao redimensionar elemento (${dimension}):`, error);
    }
  }, []);

  return {
    updateProperty,
    updateElementSize
  };
};