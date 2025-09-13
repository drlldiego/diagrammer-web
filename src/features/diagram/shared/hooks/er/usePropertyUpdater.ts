import { useCallback } from "react";
import { logger } from "../../../../../utils/logger";

interface UsePropertyUpdaterReturn {
  updateProperty: (propertyName: string, value: any) => void;
  updateElementSize: (
    dimension: "width" | "height",
    value: number,
    element: any,
    modeler: any
  ) => void;
}

export const usePropertyUpdater = (
  element: any,
  modeler: any,
  setProperties: (updateFn: (prev: any) => any) => void
): UsePropertyUpdaterReturn => {
  const updateProperty = useCallback(
    (propertyName: string, value: any) => {
      if (!element || !modeler) return;

      try {
        const modeling = modeler.get("modeling");
        const eventBus = modeler.get("eventBus");
        const businessObject = element.businessObject;

        // Log para debug das cardinalidades
        if (propertyName === "cardinalitySource" || propertyName === "cardinalityTarget") {
          logger.info(`Atualizando ${propertyName} para ${value} no elemento ${element.id}`);
          logger.info(`businessObject atual:`, businessObject);
        }

        // Para cardinalidades de conexões, usar método direto
        if (propertyName === "cardinalitySource" || propertyName === "cardinalityTarget") {
          // Atualizar diretamente no businessObject para cardinalidades
          businessObject[propertyName] = value;
          logger.info(`Propriedade ${propertyName} definida diretamente: ${value}`);
          
          // Verificar se realmente foi definida
          logger.info(`Verificação - ${propertyName} agora é: ${businessObject[propertyName]}`);
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
            logger.info(`Propriedade ER customizada ${propertyName} definida diretamente: ${value}`);
          } else {
            // Para propriedades padrão do BPMN (como name), usar o método oficial
            try {
              modeling.updateProperties(element, {
                [propertyName]: value,
              });
              logger.info(`modeling.updateProperties executado com sucesso para ${propertyName}: ${value}`);
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
        
        // Log para confirmar que foi definido
        if (propertyName === "cardinalitySource" || propertyName === "cardinalityTarget") {
          logger.info(`${propertyName} definido no businessObject:`, businessObject[propertyName]);
        }

        // Atualizar estado local
        if (propertyName === "cardinalitySource" || propertyName === "cardinalityTarget") {
          logger.info(`Chamando setProperties para ${propertyName} com valor ${value}`);
        }
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
            logger.info("Evento element.changed disparado para:", propertyName);
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
          "isIdentifying", "dataType", "description", "erType", "cardinality", "nullable", "type"
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
                logger.info(`Atualizando cardinalidades para conexão ${element.id} após mudança de ${propertyName}`);
                
                // Usar método específico para atualizar cardinalidades se disponível
                if (renderer.updateConnectionCardinalities) {
                  renderer.updateConnectionCardinalities(element);
                  logger.info('Cardinalidades atualizadas via método específico');
                } else if (renderer.drawConnection) {
                  // Fallback para re-renderização completa
                  const connectionGfx = elementRegistry.getGraphics(element);
                  if (connectionGfx) {
                    connectionGfx.innerHTML = "";
                    renderer.drawConnection(connectionGfx, element);
                    logger.info('Conexão re-renderizada completamente');
                  } else {
                    logger.warn('ConnectionGfx não encontrado para elemento:', element.id);
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
                        logger.info('Waypoints recalculados para conexão Entity-Entity');
                      }
                    }
                  } catch (dockingError) {
                    logger.warn('Erro ao recalcular waypoints:', String(dockingError));
                  }
                  
                  // Para cardinalidades, forçar atualização visual diretamente
                  if (renderer.updateConnectionCardinalities) {
                    setTimeout(() => {
                      renderer.updateConnectionCardinalities(element);
                    }, 50);
                  }
                }
              } else {
                logger.warn(`Condições para re-renderização não atendidas: isConnection=${isConnection}, hasRenderer=${!!renderer}`);
              }
            } else {
              // Para todas as propriedades visuais, usar método padrão de re-renderização
              if (renderer && renderer.drawShape) {
                const gfx = elementRegistry.getGraphics(element);
                if (gfx) {
                  logger.info(`Re-renderizando elemento ${element.id} após mudança de ${propertyName}`);
                  logger.info(`Propriedade ${propertyName} agora é:`, element.businessObject[propertyName]);
                  logger.info(`BusinessObject completo:`, element.businessObject);
                  logger.info(`Renderer type:`, renderer.constructor.name);
                  
                  // Limpar completamente o gráfico
                  gfx.innerHTML = "";
                  
                  // Para mudanças em isWeak, adicionar log extra
                  if (propertyName === 'isWeak') {
                    logger.info(`ISweak DEBUG: businessObject.isWeak = ${element.businessObject.isWeak}`);
                    logger.info(`ISWEAK DEBUG: businessObject.$attrs = `, element.businessObject.$attrs);
                  }
                  
                  // Tentar re-renderizar
                  const result = renderer.drawShape(gfx, element);
                  logger.info(`drawShape retornou:`, result);
                  logger.info(`Elemento re-renderizado completamente`);
                } else {
                  logger.warn(`Gráfico não encontrado para elemento ${element.id}`);
                }
              } else {
                logger.warn(`Renderer não encontrado ou não tem drawShape`);
              }
              
              // Forçar atualização do canvas para garantir que mudanças sejam visíveis
              try {
                const canvas = modeler.get('canvas');
                const eventBus = modeler.get('eventBus');
                
                // Disparar evento de render para forçar atualização
                eventBus.fire('render.shape', { element: element });
                
                // Para isWeak especificamente, usar uma abordagem mais agressiva de atualização
                if (propertyName === 'isWeak') {
                  logger.info(`Aplicando atualização especial para isWeak no elemento ${element.id}`);
                  
                  // Forçar múltiplos eventos de renderização
                  setTimeout(() => {
                    eventBus.fire('element.changed', { element: element });
                    canvas.addMarker(element, 'er-updating');
                    
                    setTimeout(() => {
                      canvas.removeMarker(element, 'er-updating');
                      canvas.addMarker(element, 'er-updated');
                      
                      setTimeout(() => {
                        canvas.removeMarker(element, 'er-updated');
                        logger.info(`Sequência de atualização completa para isWeak em ${element.id}`);
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
                
                logger.info(`Eventos de renderização disparados para ${propertyName}`);
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

  const updateElementSize = useCallback(
    (
      dimension: "width" | "height",
      value: number,
      element: any,
      modeler: any
    ) => {
      if (!element || !modeler || value < (dimension === "width" ? 50 : 30)) {
        logger.warn(
          `Tamanho inválido: ${dimension} deve ser pelo menos ${
            dimension === "width" ? 50 : 30
          }px`
        );
        return;
      }

      try {
        const modeling = modeler.get("modeling");

        // Criar objeto com as novas dimensões
        const newBounds = {
          x: element.x,
          y: element.y,
          width: dimension === "width" ? value : element.width,
          height: dimension === "height" ? value : element.height,
        };

        // Atualizar elemento usando bpmn-js modeling
        modeling.resizeShape(element, newBounds);
      } catch (error) {
        logger.error(
          `Erro ao redimensionar elemento (${dimension}):`,
          undefined,
          error as Error
        );
      }
    },
    []
  );

  return {
    updateProperty,
    updateElementSize,
  };
};