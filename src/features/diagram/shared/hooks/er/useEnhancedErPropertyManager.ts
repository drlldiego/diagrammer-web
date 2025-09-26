/**
 * Enhanced ER Property Manager Hook
 * Uses the new Enhanced Property Management Service with rendering strategies
 */
import { useCallback, useMemo } from 'react';
import { ErElement, EnhancedPropertyManagementService, DiagramNotation } from '../../../er/core';

interface UseEnhancedErPropertyManagerReturn {
  updateProperty: (property: string, value: any) => Promise<void>;
  batchUpdateProperties: (properties: Record<string, any>) => Promise<void>;
  manualRerender: () => Promise<void>;
  getElementStyles: () => Record<string, any>;
  updateNotation: (notation: DiagramNotation) => void;
  getRenderingInfo: () => any;
}

export const useEnhancedErPropertyManager = (
  element: ErElement,
  modeler: any,
  notation: DiagramNotation = 'chen',
  setProperties?: (updateFn: (prev: any) => any) => void
): UseEnhancedErPropertyManagerReturn => {
  
  // Create enhanced property management service instance
  const propertyService = useMemo(() => {
    if (!modeler) return null;
    return new EnhancedPropertyManagementService(modeler, notation);
  }, [modeler, notation]);

  // Update notation when it changes
  const updateNotation = useCallback((newNotation: DiagramNotation) => {
    if (propertyService) {
      propertyService.setNotation(newNotation);
    }
  }, [propertyService]);

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
        console.error('Enhanced property update failed:', result.error);
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
        console.error('Enhanced batch update failed:', result.error);
      }
    },
    [element, propertyService, setProperties]
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

  const getRenderingInfo = useCallback(() => {
    if (!propertyService) return null;
    return propertyService.getRenderingStrategyInfo();
  }, [propertyService]);

  return {
    updateProperty,
    batchUpdateProperties,
    manualRerender,
    getElementStyles,
    updateNotation,
    getRenderingInfo,
  };
};