/**
 * Composite hook that combines all ER element management functionality
 * Provides a unified interface replacing the original usePropertyUpdater
 */
import { useCallback } from 'react';
import { ErElement, ErEventType } from '../../../../er/core';
import { useErPropertyManager } from '../management/useErPropertyManager';
import { useErElementState } from '../core/useErElementState';
import { useErEventManager } from '../management/useErEventManager';
import { useErRenderManager } from '../management/useErRenderManager';

interface UseErCompositeReturn {
  // Property management
  updateProperty: (propertyName: string, value: any) => Promise<void>;  
  batchUpdateProperties: (properties: Record<string, any>) => Promise<void>;
  
  // State management
  properties: any;
  setProperties: (updateFn: (prev: any) => any) => void;
  refreshProperties: () => void;
  isLoading: boolean;
  
  // Event management
  subscribeToElementEvents: (callback: (event: ErEventType, data: any) => void) => () => void;
  emitElementEvent: (event: ErEventType, data: any) => void;
  
  // Render management
  forceRerender: (properties?: string[]) => void;
}

/**
 * Unified hook for ER element management
 * Replaces usePropertyUpdater with better separation of concerns
 */
export const useErComposite = (
  element: ErElement | null,
  modeler: any
): UseErCompositeReturn | null => {

  // Early return for null elements while maintaining hook call order
  const hasElement = !!element;
  
  // Initialize specialized hooks - always call to maintain hook order
  const elementState = useErElementState(element);
  const propertyManager = useErPropertyManager(element, modeler, 'chen', elementState.setProperties);
  const eventManager = useErEventManager(element, modeler);
  const renderManager = useErRenderManager(element, modeler);

  // Enhanced update property with automatic re-rendering
  const updateProperty = useCallback(
    async (propertyName: string, value: any) => {
      // Detectar batch update especial
      if (propertyName === 'batchUpdate' && typeof value === 'object') {
        await batchUpdateProperties(value);
        return;
      }
      
      // Update property through service
      await propertyManager.updateProperty(propertyName, value);
      
      // Trigger appropriate re-rendering
      if (propertyName === 'cardinalitySource' || propertyName === 'cardinalityTarget') {
        renderManager.triggerConnectionRerender();
      } else {
        renderManager.forceRerender([propertyName]);
      }
      
      // Emit property change event
      eventManager.emitElementEvent('property.changed', {
        property: propertyName,
        value,
        timestamp: Date.now()
      });
    },
    [propertyManager, renderManager, eventManager]
  );

  // Enhanced batch update with single re-render
  const batchUpdateProperties = useCallback(
    async (properties: Record<string, any>) => {
      await propertyManager.batchUpdateProperties(properties);
      
      // Single re-render for all properties
      const propertyNames = Object.keys(properties);
      renderManager.forceRerender(propertyNames);
      
      // Emit batch update event
      eventManager.emitElementEvent('property.changed', {
        properties,
        batch: true,
        timestamp: Date.now()
      });
    },
    [propertyManager, renderManager, eventManager]
  );

  // Return null if no element, but all hooks have been called
  if (!hasElement) {
    return null;
  }

  return {
    // Property management
    updateProperty,
    batchUpdateProperties,
    
    // State management
    properties: elementState.properties,
    setProperties: elementState.setProperties,
    refreshProperties: elementState.refreshProperties,
    isLoading: elementState.isLoading,
    
    // Event management
    subscribeToElementEvents: eventManager.subscribeToElementEvents,
    emitElementEvent: eventManager.emitElementEvent,
    
    // Render management
    forceRerender: renderManager.forceRerender,
    // Note: Visual markers removed to prevent childNodes errors
  };
};