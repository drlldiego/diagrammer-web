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

        // Primeiro tentar o método oficial do bpmn-js
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
        }

        // Garantir que a propriedade foi realmente definida diretamente no businessObject
        businessObject[propertyName] = value;

        // Atualizar estado local
        setProperties((prev) =>
          prev ? { ...prev, [propertyName]: value } : null
        );

        // Disparar evento para notificar outros componentes
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

        // Forçar re-renderização do elemento se necessário
        if (
          propertyName === "name" ||
          propertyName === "isWeak" ||
          propertyName === "isPrimaryKey" ||
          propertyName === "isForeignKey" ||
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

              if (isConnection && renderer && renderer.drawConnection) {
                // Re-renderizar apenas a conexão específica
                const connectionGfx = elementRegistry.getGraphics(element);
                if (connectionGfx) {
                  connectionGfx.innerHTML = "";
                  renderer.drawConnection(connectionGfx, element);
                }
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
