/**
 * Hook for managing ER element events
 * Handles event subscription and element-specific event management
 */
import { useEffect, useCallback, useMemo } from 'react';
import { ErElement, ErEventService, ErEventType } from '../../../er/core';

interface UseErEventManagerReturn {
  subscribeToElementEvents: (callback: (event: ErEventType, data: any) => void) => () => void;
  emitElementEvent: (event: ErEventType, data: any) => void;
  subscribeToPropertyChanges: (callback: (property: string, value: any) => void) => () => void;
}

export const useErEventManager = (
  element: ErElement | null,
  modeler: any
): UseErEventManagerReturn => {
  
  // Create event service instance
  const eventService = useMemo(() => {
    if (!modeler) return null;
    const eventBus = modeler.get?.('eventBus');
    return new ErEventService(eventBus);
  }, [modeler]);

  // Subscribe to element-specific events
  const subscribeToElementEvents = useCallback(
    (callback: (event: ErEventType, data: any) => void) => {
      if (!eventService || !element) {
        return () => {}; // Return empty unsubscribe function
      }

      const elementSpecificCallback = (event: ErEventType, data: any) => {
        // Only call callback if event is related to this element
        if (data?.element?.id === element.id || data?.elementId === element.id) {
          callback(event, data);
        }
      };

      const result = eventService.subscribeGlobal(elementSpecificCallback);
      
      if (result.success && result.data) {
        return result.data; // Return unsubscribe function
      }
      
      return () => {}; // Return empty unsubscribe function on failure
    },
    [eventService, element]
  );

  // Emit element-specific event
  const emitElementEvent = useCallback(
    (event: ErEventType, data: any) => {
      if (!eventService || !element) return;

      const elementData = {
        ...data,
        element,
        elementId: element.id,
        timestamp: Date.now()
      };

      eventService.emit(event, elementData);
    },
    [eventService, element]
  );

  // Subscribe specifically to property change events for this element
  const subscribeToPropertyChanges = useCallback(
    (callback: (property: string, value: any) => void) => {
      if (!eventService || !element) {
        return () => {};
      }

      const propertyChangeCallback = (event: ErEventType, data: any) => {
        if (event === 'property.changed' && data?.element?.id === element.id) {
          callback(data.property, data.newValue);
        }
      };

      const result = eventService.subscribe('property.changed', propertyChangeCallback);
      
      if (result.success && result.data) {
        return result.data;
      }
      
      return () => {};
    },
    [eventService, element]
  );

  // Listen for external BPMN events and convert to ER events
  useEffect(() => {
    if (!modeler || !eventService) return;

    const eventBus = modeler.get?.('eventBus');
    if (!eventBus) return;

    const handleElementChanged = (bpmnEvent: any) => {
      if (bpmnEvent.element?.id === element?.id) {
        eventService.emit('element.updated', {
          element: bpmnEvent.element,
          properties: bpmnEvent.properties,
          source: 'bpmn'
        });
      }
    };

    const handleElementSelected = (bpmnEvent: any) => {
      if (bpmnEvent.element?.id === element?.id) {
        eventService.emit('element.selected', {
          element: bpmnEvent.element,
          source: 'bpmn'
        });
      }
    };

    // Subscribe to BPMN events
    eventBus.on('element.changed', handleElementChanged);
    eventBus.on('selection.changed', handleElementSelected);

    // Cleanup
    return () => {
      eventBus.off('element.changed', handleElementChanged);
      eventBus.off('selection.changed', handleElementSelected);
    };
  }, [modeler, eventService, element]);

  // Cleanup event service on unmount
  useEffect(() => {
    return () => {
      eventService?.dispose();
    };
  }, [eventService]);

  return {
    subscribeToElementEvents,
    emitElementEvent,
    subscribeToPropertyChanges,
  };
};