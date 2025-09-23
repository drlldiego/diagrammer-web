/**
 * Specialized hook for ER property management
 * Replaces the core property update functionality from usePropertyUpdater
 */
import { useCallback, useMemo } from 'react';
import { ErElement, PropertyManagementService } from '../../../er/core';

interface UseErPropertyManagerReturn {
  updateProperty: (property: string, value: any) => Promise<void>;
  batchUpdateProperties: (properties: Record<string, any>) => Promise<void>;
  updateElementSize: (dimension: "width" | "height", value: number) => Promise<void>;
}

export const useErPropertyManager = (
  element: ErElement | null,
  modeler: any,
  setProperties?: (updateFn: (prev: any) => any) => void
): UseErPropertyManagerReturn => {
  
  // Create property management service instance
  const propertyService = useMemo(() => {
    if (!modeler) return null;
    return new PropertyManagementService(modeler);
  }, [modeler]);

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

  return {
    updateProperty,
    batchUpdateProperties,
    updateElementSize,
  };
};