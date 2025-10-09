/**
 * Refactored hook for ER element properties management
 * Now uses useErElementState and useErElementSelection for better separation of concerns
 */

import { useState, useEffect } from "react";
import { useErElementState } from "./useErElementState";
import { useErElementSelection } from "./useErElementSelection";

export interface ElementProperties {
  id: string;
  name: string;
  type: string;
  [key: string]: any;
}

export interface UseElementPropertiesReturn {
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
  // Use the specialized hooks for state and selection management
  const elementState = useErElementState(element);
  const selection = useErElementSelection(modeler, element);

  // Local state for editable dimensions
  const [localWidth, setLocalWidth] = useState<number>(0);
  const [localHeight, setLocalHeight] = useState<number>(0);
  const [isER, setIsER] = useState(false);

  // Load element properties using the state hook and add additional ER-specific logic
  const loadElementProperties = () => {
    if (!element) {
      setIsER(false);
      setLocalWidth(0);
      setLocalHeight(0);
      return;
    }

    // Check if it's a connection
    const isConnection =
      element.type &&
      (element.type === "bpmn:SequenceFlow" || element.waypoints);

    // Check if it's an ER element using our types (including $attrs for imported elements)
    const isErElement =
      element.businessObject &&
      (element.businessObject.erType ||
        (element.businessObject.$attrs &&
          (element.businessObject.$attrs["er:erType"] ||
            element.businessObject.$attrs["ns0:erType"])));

    setIsER(isErElement || isConnection);

    // Sync local dimensions
    setLocalWidth(element.width || 120);
    setLocalHeight(element.height || 80);
  };

  // Set up element change listeners
  useEffect(() => {
    if (!modeler || !element) return;

    const eventBus = modeler.get("eventBus");

    const handleElementChanged = (event: any) => {
      if (event.element && event.element.id === element.id) {
        loadElementProperties();
      }
    };

    const handleElementsChanged = (event: any) => {
      if (
        event.elements &&
        event.elements.some((el: any) => el.id === element.id)
      ) {
        loadElementProperties();
      }
    };

    eventBus.on("element.changed", handleElementChanged);
    eventBus.on("elements.changed", handleElementsChanged);

    // Cleanup listeners
    return () => {
      eventBus.off("element.changed", handleElementChanged);
      eventBus.off("elements.changed", handleElementsChanged);
    };
  }, [element, modeler]);

  // Load properties on element change
  useEffect(() => {
    loadElementProperties();
  }, [element]);

  // Create properties object from the state hook with additional processing for connections
  const properties = elementState.properties
    ? {
        ...elementState.properties,
        // Add connection-specific properties if it's a connection
        ...(element?.waypoints ? {
          isConnection: true,
          source:
            element.source?.businessObject?.name ||
            element.source?.id ||
            "Origin",
          target:
            element.target?.businessObject?.name ||
            element.target?.id ||
            "Target",
          sourceType:
            element.source?.businessObject?.erType ||
            (element.source?.businessObject?.$attrs &&
              (element.source.businessObject.$attrs["er:erType"] ||
                element.source.businessObject.$attrs["ns0:erType"])) ||
            "Unknown",
          targetType:
            element.target?.businessObject?.erType ||
            (element.target?.businessObject?.$attrs &&
              (element.target.businessObject.$attrs["er:erType"] ||
                element.target.businessObject.$attrs["ns0:erType"])) ||
            "Unknown",
        } : {}),
      }
    : null;

  return {
    properties,
    isER,
    selectedElements: selection.selectedElements,
    localWidth,
    localHeight,
    setLocalWidth,
    setLocalHeight,
    loadElementProperties,
  };
};