/**
 * Specialized hook for ER property management
 * Replaces the core property update functionality from usePropertyUpdater
 */
import { useCallback, useMemo } from 'react';
import { ErElement, PropertyManagementService, DiagramNotation } from '../../../../er/core';

interface UseErPropertyManagerReturn {
  updateProperty: (property: string, value: any) => Promise<void>;
  batchUpdateProperties: (properties: Record<string, any>) => Promise<void>;
  updateElementSize: (dimension: "width" | "height", value: number) => Promise<void>;
  manualRerender?: () => Promise<void>;
  getElementStyles?: () => Record<string, any>;
  updateNotation?: (notation: DiagramNotation) => void;
  getRenderingInfo?: () => any;
}

export const useErPropertyManager = (
  element: ErElement | null,
  modeler: any,
  notation: DiagramNotation = 'chen',
  setProperties?: (updateFn: (prev: any) => any) => void
): UseErPropertyManagerReturn => {
  
  // Create property management service instance with notation
  const propertyService = useMemo(() => {
    if (!modeler) return null;
    return new PropertyManagementService(modeler, notation);
  }, [modeler, notation]);

  const updateProperty = useCallback(
    async (property: string, value: any) => {
      if (!element || !propertyService) return;

      const result = await propertyService.updateProperty(element, property as any, value);
      
      if (result.success) {
        // Update local state if provided
        setProperties?.((prev) =>
          prev ? { ...prev, [property]: value } : null
        );
      } else {
        console.error('Property update failed:', result.error);
      }
    },
    [element, propertyService, setProperties]
  );

  const batchUpdateProperties = useCallback(
    async (properties: Record<string, any>) => {
      if (!element || !propertyService) return;

      const result = await propertyService.batchUpdateProperties(element, properties);
      
      if (result.success) {
        // Update local state with all properties
        setProperties?.((prev) =>
          prev ? { ...prev, ...properties } : null
        );
      } else {
        console.error('Batch update failed:', result.error);
      }
    },
    [element, propertyService, setProperties]
  );

  const updateElementSize = useCallback(
    async (dimension: "width" | "height", value: number) => {
      if (!element || !propertyService) return;

      const dimensions = { [dimension]: value };
      const result = await propertyService.updateElementSize(element, dimensions);
      
      if (!result.success) {
        console.error('Element resize failed:', result.error);
      }
    },
    [element, propertyService]
  );

  const manualRerender = useCallback(
    async () => {
      if (!element || !propertyService) return;
      await propertyService.manualRerender(element);
    },
    [element, propertyService]
  );

  const getElementStyles = useCallback(() => {
    if (!element || !propertyService) return {};
    return propertyService.getElementStyles(element);
  }, [element, propertyService]);

  const updateNotation = useCallback((notation: DiagramNotation) => {
    if (propertyService) {
      propertyService.setNotation(notation);
    }
  }, [propertyService]);

  const getRenderingInfo = useCallback(() => {
    if (!propertyService) return null;
    return propertyService.getRenderingStrategyInfo();
  }, [propertyService]);

  return {
    updateProperty,
    batchUpdateProperties,
    updateElementSize,
    manualRerender,
    getElementStyles,
    updateNotation,
    getRenderingInfo,
  };
};