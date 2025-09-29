/**
 * Hook for managing ER element rendering and visual updates
 * Handles re-rendering strategies and visual state management
 */
import { useCallback, useMemo, useRef } from 'react';
import { ErElement } from '../../../er/core';
import { logger } from '../../../../../utils/logger';

interface UseErRenderManagerReturn {
  forceRerender: (properties?: string[]) => void;
  triggerConnectionRerender: () => void;
  triggerShapeRerender: () => void;
  addVisualMarker: (marker: string, duration?: number) => void;
  removeVisualMarker: (marker: string) => void;
}

export const useErRenderManager = (
  element: ErElement | null,
  modeler: any
): UseErRenderManagerReturn => {

  // Get required services
  const services = useMemo(() => {
    if (!modeler) return null;
    
    try {
      return {
        elementRegistry: modeler.get('elementRegistry'),
        canvas: modeler.get('canvas'),
        eventBus: modeler.get('eventBus'),
        renderer: modeler.get('bpmnRenderer') || modeler.get('erBpmnRenderer')
      };
    } catch (error) {
      logger.warn('Failed to get modeler services', 'useErRenderManager', error as Error);
      return null;
    }
  }, [modeler]);

  // Determine if property requires re-rendering
  const requiresRerender = useCallback((property: string): boolean => {
    const visualProperties = [
      'name', 'isWeak', 'isIdentifying', 'isPrimaryKey', 'isRequired', 'isMultivalued',
      'isDerived', 'isComposite', 'cardinalitySource', 'cardinalityTarget',
      'dataType', 'description', 'erType', 'cardinality',
      'nullable', 'type'
    ];
    
    return visualProperties.includes(property);
  }, []);

  // Trigger connection-specific re-rendering
  const triggerConnectionRerender = useCallback(() => {
    if (!element || !services || !element.waypoints) return;

    try {
      const { elementRegistry, renderer } = services;

      if (renderer?.updateConnectionCardinalities) {
        renderer.updateConnectionCardinalities(element);
      } else if (renderer?.drawConnection) {
        const connectionGfx = elementRegistry.getGraphics(element);
        if (connectionGfx) {
          // Remover apenas elementos visuais, preservando defs e markers
          const elementsToRemove = connectionGfx.querySelectorAll('path:not([id*="marker"]), text, g.er-cardinality-label, g.er-crowsfoot-marker');
          elementsToRemove.forEach((el: any) => {
            if (el.parentNode) {
              el.parentNode.removeChild(el);
            }
          });
          renderer.drawConnection(connectionGfx, element);
        }
      }

      // Handle Entity-Entity connections specially
      const sourceIsEntity = element.source?.businessObject?.erType === 'Entity';
      const targetIsEntity = element.target?.businessObject?.erType === 'Entity';
      
      if (sourceIsEntity && targetIsEntity) {
        // Force additional updates for entity connections
        setTimeout(() => {
          if (renderer?.updateConnectionCardinalities) {
            renderer.updateConnectionCardinalities(element);
          }
        }, 50);
      }

    } catch (error) {
      logger.error('Connection rerender failed', 'useErRenderManager', error as Error);
    }
  }, [element, services]);

  // Trigger shape-specific re-rendering
  const triggerShapeRerender = useCallback(() => {
    if (!element || !services || element.waypoints) return;

    try {
      const { elementRegistry, renderer } = services;

      if (renderer?.drawShape) {
        const gfx = elementRegistry.getGraphics(element);
        if (gfx) {
          // Remover apenas elementos visuais, preservando defs, markers e outline
          const elementsToRemove = gfx.querySelectorAll('rect:not(.djs-outline), polygon:not(.djs-outline), ellipse:not(.djs-outline), text:not(.djs-outline), path:not([id*="marker"]):not(.djs-outline), circle:not(.djs-outline), line:not(.djs-outline), g:not([class*="djs-"]):not([class*="er-outline-"])');
          elementsToRemove.forEach((el: any) => {
            if (el.parentNode) {
              el.parentNode.removeChild(el);
            }
          });
          renderer.drawShape(gfx, element);
        }
      }

      // Force canvas update
      services.eventBus?.fire('render.shape', { element });

    } catch (error) {
      logger.error('Shape rerender failed', 'useErRenderManager', error as Error);
    }
  }, [element, services]);

  //Add visual marker to element
  const addVisualMarker = useCallback(
    (marker: string, duration?: number) => {
      if (!element || !services?.canvas) return;

      try {
        services.canvas.addMarker(element, marker);

        if (duration) {
          setTimeout(() => {
            removeVisualMarker(marker);
          }, duration);
        }
      } catch (error) {
        logger.warn(`Failed to add marker ${marker}`, 'useErRenderManager', error as Error);
      }
    },
    [element, services]
  );

  //Remove visual marker from element
  const removeVisualMarker = useCallback(
    (marker: string) => {
      if (!element || !services?.canvas) return;

      try {
        services.canvas.removeMarker(element, marker);
      } catch (error) {
        logger.warn(`Failed to remove marker ${marker}`, 'useErRenderManager', error as Error);
      }
    },
    [element, services]
  );

  // Force re-render of element
  const forceRerender = useCallback(
    (properties?: string[]) => {
      if (!element || !services) {
        return;
      }

      try {
        // Check if any property requires re-rendering
        if (properties && !properties.some(requiresRerender)) {
          return; // No visual properties changed
        }                
        if (properties && properties.includes('isIdentifying') && element.businessObject?.erType === 'Relationship') {          
          return;
        }
        
        // Para elementos com waypoints (conexões), usar triggerConnectionRerender
        if (element.waypoints) {
          triggerConnectionRerender();
        } else {
          // Para shapes, usar triggerShapeRerender diretamente
          triggerShapeRerender();
        }
        
        // Também emitir evento como backup
        services.eventBus?.fire('render.shape', { element });

      } catch (error) {
        logger.error('Force rerender failed', 'useErRenderManager', error as Error);
      }
    },
    [element, services, requiresRerender, triggerConnectionRerender, triggerShapeRerender]
  );

  return {
    forceRerender,
    triggerConnectionRerender,
    triggerShapeRerender,
    addVisualMarker,
    removeVisualMarker,
  };
};