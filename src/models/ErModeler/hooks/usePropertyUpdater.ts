import { useCallback } from "react";
import { logger } from "../../../utils/logger";

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
          // Para outras propriedades, usar o método oficial do bpmn-js
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

        // Para cardinalidades, não disparar eventos automáticos (evita loops)
        if (propertyName !== "cardinalitySource" && propertyName !== "cardinalityTarget") {
          // Disparar evento para notificar outros componentes apenas para propriedades não-cardinalidade
          if (eventBus) {
            try {
              eventBus.fire("element.changed", {
                element: element,
                properties: { [propertyName]: value },
              });
              logger.warn("Evento element.changed disparado para:", propertyName);
            } catch (eventError) {
              logger.error(
                "Erro ao disparar evento element.changed:",
                undefined,
                eventError as Error
              );
            }
          }
        } else {
          logger.info("Evento element.changed NÃO disparado para cardinalidade (evita loops)");
        }

        // Forçar re-renderização do elemento se necessário
        if (
          propertyName === "name" ||
          propertyName === "isWeak" ||
          propertyName === "isPrimaryKey" ||          
          propertyName === "isRequired" ||
          propertyName === "isMultivalued" ||
          propertyName === "isDerived" ||
          propertyName === "isComposite" ||
          propertyName === "cardinalitySource" ||
          propertyName === "cardinalityTarget" ||
          propertyName === "isIdentifying"
        ) {
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
              // Para outras propriedades, re-renderizar o elemento
              if (renderer && renderer.drawShape) {
                const gfx = elementRegistry.getGraphics(element);
                if (gfx) {
                  gfx.innerHTML = "";
                  renderer.drawShape(gfx, element);
                }
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
