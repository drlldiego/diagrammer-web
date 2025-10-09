import { useCallback } from "react";
import { logger } from "../../../../../utils/logger";

interface UsePropertyUpdaterReturn {
  updateProperty: (propertyName: string, value: any) => void;  
}

export const usePropertyUpdater = (
  element: any,
  modeler: any,
  setProperties: (updateFn: (prev: any) => any) => void
): UsePropertyUpdaterReturn => {
  const updateProperty = useCallback(
    (propertyName: string, value: any) => {
      console.log(`[DEBUG] usePropertyUpdater.updateProperty chamado:`, {
        propertyName,
        value,
        elementId: element?.businessObject?.id
      });
      
      if (!element || !modeler) return;

      try {
        const modeling = modeler.get("modeling");
        const eventBus = modeler.get("eventBus");
        const businessObject = element.businessObject;


        // Para cardinalidades de conexões, usar método direto
        if (propertyName === "cardinalitySource" || propertyName === "cardinalityTarget") {
          // Atualizar diretamente no businessObject para cardinalidades
          businessObject[propertyName] = value;
        } else {
          // Lista de propriedades ER customizadas que devem ser definidas diretamente
          const erCustomProperties = [
            'isWeak', 'isPrimaryKey', 'isRequired', 'isMultivalued', 'isDerived', 
            'isComposite', 'isSubAttribute', 'dataType', 'description', 'erType',
            'cardinality', 'isIdentifying', 'nullable', 'type'
          ];
          
          if (erCustomProperties.includes(propertyName)) {
            // Para propriedades ER customizadas, definir diretamente no businessObject
            businessObject[propertyName] = value;
          } else {
            // Para propriedades padrão do BPMN (como name), usar o método oficial
            try {
              modeling.updateProperties(element, {
                [propertyName]: value,
              });
            } catch (modelingError) {
              logger.error(
                "modeling.updateProperties falhou:",
                undefined,
                modelingError as Error
              );
              // Fallback para definição direta
              businessObject[propertyName] = value;
            }
          }
        }
        
        // Atualizar estado local
        setProperties((prev) =>
          prev ? { ...prev, [propertyName]: value } : null
        );

        // Disparar evento element.changed para notificar outros componentes
        if (eventBus) {
          try {
            eventBus.fire("element.changed", {
              element: element,
              properties: { [propertyName]: value },
            });
          } catch (eventError) {
            logger.error(
              "Erro ao disparar evento element.changed:",
              undefined,
              eventError as Error
            );
          }
        }

        // Forçar re-renderização do elemento se necessário
        const visualPropertiesRequiringRerender = [
          "name", "isWeak", "isPrimaryKey", "isRequired", "isMultivalued", 
          "isDerived", "isComposite", "cardinalitySource", "cardinalityTarget", 
          "dataType", "description", "erType", "cardinality", "nullable", "type", "isIdentifying"          
        ];
        
        if (visualPropertiesRequiringRerender.includes(propertyName)) {
          try {
            const elementRegistry = modeler.get("elementRegistry");
            const renderer =
              modeler.get("bpmnRenderer") || modeler.get("erBpmnRenderer");

            // Para mudanças de cardinalidade, focar apenas na conexão
            if (
              propertyName === "cardinalitySource" ||
              propertyName === "cardinalityTarget"
            ) {
              const isConnection =
                element.type &&
                (element.type === "bpmn:SequenceFlow" || element.waypoints);

              if (isConnection && renderer) {
                // Usar método específico para atualizar cardinalidades se disponível
                if (renderer.updateConnectionCardinalities) {
                  renderer.updateConnectionCardinalities(element);
                } else if (renderer.drawConnection) {
                  // Fallback para re-renderização completa
                  const connectionGfx = elementRegistry.getGraphics(element);
                  if (connectionGfx) {
                    connectionGfx.innerHTML = "";
                    renderer.drawConnection(connectionGfx, element);
                  }
                }
                
                // Para Entity-Entity connections, forçar eventos adicionais
                const sourceIsEntity = element.source?.businessObject?.erType === 'Entity';
                const targetIsEntity = element.target?.businessObject?.erType === 'Entity';
                if (sourceIsEntity && targetIsEntity) {
                  // Forçar recálculo de waypoints e layout da conexão
                  try {
                    const connectionDocking = modeler.get("connectionDocking");
                    
                    if (connectionDocking && element.waypoints) {
                      // Recalcular pontos de ancoragem
                      const dockedWaypoints = connectionDocking.getCroppedWaypoints(element);
                      if (dockedWaypoints && dockedWaypoints.length > 0) {
                        element.waypoints = dockedWaypoints;
                      }
                    }
                  } catch (dockingError) {
                    // Waypoint recalculation failed silently
                  }
                  
                  // Para cardinalidades, forçar atualização visual diretamente
                  if (renderer.updateConnectionCardinalities) {
                    setTimeout(() => {
                      renderer.updateConnectionCardinalities(element);
                    }, 50);
                  }
                }
              }
            } else {
              // Para todas as propriedades visuais, usar método padrão de re-renderização
              if (renderer && renderer.drawShape) {
                const gfx = elementRegistry.getGraphics(element);
                if (gfx) {
                  
                  
                  // Limpar completamente o gráfico
                  gfx.innerHTML = "";
                  
                  // Re-renderizar o elemento
                  console.log(`[DEBUG] usePropertyUpdater: Chamando renderer.drawShape para ${propertyName}`);
                  console.log(`[DEBUG] Renderer type:`, renderer.constructor?.name || 'Unknown');
                  renderer.drawShape(gfx, element);
                }
              }
              
              // Forçar atualização do canvas para garantir que mudanças sejam visíveis
              try {
                const canvas = modeler.get('canvas');
                const eventBus = modeler.get('eventBus');
                
                // Disparar evento de render para forçar atualização
                eventBus.fire('render.shape', { element: element });
                
                // Para isWeak especificamente, usar uma abordagem mais agressiva de atualização
                if (propertyName === 'isWeak' || propertyName === 'isIdentifying') {
                  // Forçar múltiplos eventos de renderização
                  setTimeout(() => {
                    eventBus.fire('element.changed', { element: element });
                    canvas.addMarker(element, 'er-updating');
                    
                    setTimeout(() => {
                      canvas.removeMarker(element, 'er-updating');
                      canvas.addMarker(element, 'er-updated');
                      
                      setTimeout(() => {
                        canvas.removeMarker(element, 'er-updated');
                      }, 20);
                    }, 20);
                  }, 50);
                }
                
                // Para outras propriedades que afetam o estilo visual
                if (['isPrimaryKey', 'isRequired', 'isMultivalued', 'isDerived', 'isComposite'].includes(propertyName)) {
                  setTimeout(() => {
                    canvas.addMarker(element, 'er-updated');
                    setTimeout(() => {
                      canvas.removeMarker(element, 'er-updated');
                    }, 10);
                  }, 50);
                }
              } catch (canvasError) {
                logger.warn('Erro ao forçar atualização do canvas:', String(canvasError));
              }
            }
          } catch (renderError) {
            logger.error(
              "Erro na re-renderização:",
              undefined,
              renderError as Error
            );
          }
        }
      } catch (error) {
        logger.error(
          "Erro ao atualizar propriedade:",
          undefined,
          error as Error
        );
      }
    },
    [element, modeler, setProperties]
  );  

  return {
    updateProperty,    
  };
};