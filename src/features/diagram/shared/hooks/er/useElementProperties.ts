import { useState, useEffect } from "react";
import { logger } from "../../../../../utils/logger";

interface ElementProperties {
  id: string;
  name: string;
  type: string;
  [key: string]: any;
}

interface UseElementPropertiesReturn {
  properties: ElementProperties | null;
  isER: boolean;
  selectedElements: any[];
  localWidth: number;
  localHeight: number;
  setLocalWidth: (width: number) => void;
  setLocalHeight: (height: number) => void;
  loadElementProperties: () => void;
}

export const useElementProperties = (
  element: any,
  modeler: any
): UseElementPropertiesReturn => {
  const [properties, setProperties] = useState<ElementProperties | null>(null);
  const [isER, setIsER] = useState(false);
  const [selectedElements, setSelectedElements] = useState<any[]>([]);

  // Estados locais para dimensões editáveis
  const [localWidth, setLocalWidth] = useState<number>(0);
  const [localHeight, setLocalHeight] = useState<number>(0);

  // Função para carregar propriedades do elemento
  const loadElementProperties = () => {
    if (!element) {
      setProperties(null);
      setIsER(false);
      setLocalWidth(0);
      setLocalHeight(0);
      setSelectedElements([]);
      return;
    }

    // NOVO: Detectar seleção múltipla
    if (modeler) {
      try {
        const selection = modeler.get("selection");
        const allSelected = selection.get();
        setSelectedElements(allSelected);
      } catch (error) {        
        setSelectedElements([element]);
      }
    } else {
      setSelectedElements([element]);
    }

    // Verificar se é conexão
    const isConnection =
      element.type &&
      (element.type === "bpmn:SequenceFlow" || element.waypoints);

    // Verificar se é elemento ER pelos nossos tipos customizados (incluindo $attrs para elementos importados)
    const isErElement =
      element.businessObject &&
      (element.businessObject.erType ||
        (element.businessObject.$attrs &&
          (element.businessObject.$attrs["er:erType"] ||
            element.businessObject.$attrs["ns0:erType"])));

    setIsER(isErElement || isConnection);

    if (isErElement) {
      // Extrair erType tanto do businessObject quanto dos $attrs
      const erType =
        element.businessObject.erType ||
        (element.businessObject.$attrs &&
          (element.businessObject.$attrs["er:erType"] ||
            element.businessObject.$attrs["ns0:erType"]));

      const loadedProperties = {
        id: element.businessObject.id || element.id,
        name: element.businessObject.name || "",
        type: element.type,
        erType: erType, // Garantir que erType está sempre disponível
        ...element.businessObject,
      };

      setProperties(loadedProperties);

      // Sincronizar dimensões locais
      setLocalWidth(element.width || 120);
      setLocalHeight(element.height || 80);
    } else if (isConnection) {
      // Log para debug de cardinalidades na conexão
      logger.info(`Carregando propriedades de conexão ${element.id}:`);
      logger.info(`cardinalitySource: ${element.businessObject?.cardinalitySource}`);
      logger.info(`cardinalityTarget: ${element.businessObject?.cardinalityTarget}`);
      
      // Propriedades para conexões
      const actualCardinalitySource = element.businessObject?.cardinalitySource;
      const actualCardinalityTarget = element.businessObject?.cardinalityTarget;
      
      logger.info(`Carregando propriedades - cardinalitySource real: ${actualCardinalitySource}`);
      logger.info(`Carregando propriedades - cardinalityTarget real: ${actualCardinalityTarget}`);
      
      const connectionProperties = {
        id: element.id,
        name: "Conexão ER",
        type: element.type,
        cardinalitySource: actualCardinalitySource || "1",
        cardinalityTarget: actualCardinalityTarget || "N",
        isConnection: true,
        source:
          element.source?.businessObject?.name ||
          element.source?.id ||
          "Origem",
        target:
          element.target?.businessObject?.name ||
          element.target?.id ||
          "Destino",
        // Adicionar tipos dos elementos conectados
        sourceType: 
          element.source?.businessObject?.erType || 
          (element.source?.businessObject?.$attrs && (
            element.source.businessObject.$attrs["er:erType"] ||
            element.source.businessObject.$attrs["ns0:erType"]
          )) || "Unknown",
        targetType: 
          element.target?.businessObject?.erType || 
          (element.target?.businessObject?.$attrs && (
            element.target.businessObject.$attrs["er:erType"] ||
            element.target.businessObject.$attrs["ns0:erType"]
          )) || "Unknown",
      };

      setProperties(connectionProperties);
      setLocalWidth(0);
      setLocalHeight(0);
    } else {
      setProperties(null);
      setLocalWidth(0);
      setLocalHeight(0);
    }
  };

  useEffect(() => {
    loadElementProperties();
  }, [element]);

  // useEffect para configurar listeners de eventos do modeler
  useEffect(() => {
    if (!modeler) return;

    const eventBus = modeler.get("eventBus");

    const handleCompositeChanged = (event: any) => {
      if (event.element && element && event.element.id === element.id) {
        loadElementProperties();
      }
    };

    const handleElementChanged = (event: any) => {
      if (event.element && element && event.element.id === element.id) {
        // Log para debug de mudanças de cardinalidade
        if (event.properties && (event.properties.cardinalitySource || event.properties.cardinalityTarget)) {
          logger.info('Recarregando propriedades devido a mudança de cardinalidade:', event.properties);
          logger.info('Elemento atual:', element.id);
          logger.info('BusinessObject atual:', element.businessObject);
        }
        loadElementProperties();
      }
    };

    const handleElementsChanged = (event: any) => {
      if (
        event.elements &&
        element &&
        event.elements.some((el: any) => el.id === element.id)
      ) {
        loadElementProperties();
      }
    };

    // NOVO: Listener para mudanças na seleção - atualiza lista de elementos selecionados
    const handleSelectionChanged = (event: any) => {
      try {
        const selection = modeler.get("selection");
        const newSelectedElements = selection.get();

        setSelectedElements(newSelectedElements);

        // Se ainda há um elemento principal selecionado, recarregar suas propriedades
        if (
          element &&
          newSelectedElements.some((el: any) => el.id === element.id)
        ) {
          loadElementProperties();
        }
      } catch (error) {
        logger.error(
          "useElementProperties: Erro ao processar mudança de seleção:",
          undefined,
          error as Error
        );
      }
    };

    eventBus.on("element.compositeChanged", handleCompositeChanged);
    eventBus.on("element.changed", handleElementChanged);
    eventBus.on("elements.changed", handleElementsChanged);
    eventBus.on("selection.changed", handleSelectionChanged);

    // Cleanup listeners
    return () => {
      eventBus.off("element.compositeChanged", handleCompositeChanged);
      eventBus.off("element.changed", handleElementChanged);
      eventBus.off("elements.changed", handleElementsChanged);
      eventBus.off("selection.changed", handleSelectionChanged);
    };
  }, [element, modeler]);

  return {
    properties,
    isER,
    selectedElements,
    localWidth,
    localHeight,
    setLocalWidth,
    setLocalHeight,
    loadElementProperties,
  };
};