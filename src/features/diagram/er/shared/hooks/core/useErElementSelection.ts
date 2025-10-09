/**
 * Hook for managing element selection in ER diagrams
 * Handles single and multiple element selection logic
 */

import { useState, useEffect } from "react";
import { logger } from "../../../../../../utils/logger";

export interface UseErElementSelectionReturn {
  selectedElements: any[];
  isMultipleSelection: boolean;
  getSelection: () => any[];
  hasSelection: boolean;
}

export const useErElementSelection = (
  modeler: any,
  currentElement?: any
): UseErElementSelectionReturn => {
  const [selectedElements, setSelectedElements] = useState<any[]>([]);

  useEffect(() => {
    if (!modeler) {
      setSelectedElements(currentElement ? [currentElement] : []);
      return;
    }

    try {
      const selection = modeler.get("selection");
      const initialSelection = selection.get();
      setSelectedElements(initialSelection);
    } catch (error) {
      setSelectedElements(currentElement ? [currentElement] : []);
    }
  }, [modeler, currentElement]);

  // Set up selection change listeners
  useEffect(() => {
    if (!modeler) return;

    const eventBus = modeler.get("eventBus");
    if (!eventBus) return;

    const handleSelectionChanged = (event: any) => {
      try {
        const selection = modeler.get("selection");
        const newSelectedElements = selection.get();
        setSelectedElements(newSelectedElements);
      } catch (error) {
        logger.error(
          "useErElementSelection: Error processing selection change:",
          "ER_SELECTION",
          error as Error
        );
        setSelectedElements(currentElement ? [currentElement] : []);
      }
    };

    eventBus.on("selection.changed", handleSelectionChanged);

    // Cleanup listener
    return () => {
      eventBus.off("selection.changed", handleSelectionChanged);
    };
  }, [modeler, currentElement]);

  const getSelection = () => selectedElements;
  const isMultipleSelection = selectedElements.length > 1;
  const hasSelection = selectedElements.length > 0;

  return {
    selectedElements,
    isMultipleSelection,
    getSelection,
    hasSelection,
  };
};