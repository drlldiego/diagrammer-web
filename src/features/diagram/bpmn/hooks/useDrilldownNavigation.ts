/**
 * Hook for managing drill-down navigation between processes and sub-processes
 * Implements breadcrumb navigation for BPMN drill-down functionality
 */
import { useState, useCallback } from 'react';
import { logger } from '../../../../utils/logger';

interface BreadcrumbItem {
  id: string;
  name: string;
  type: 'process' | 'subprocess';
}

interface DrilldownState {
  breadcrumbs: BreadcrumbItem[];
  currentLevel: number;
}

export const useDrilldownNavigation = (modelerRef: React.RefObject<any>) => {
  const [drilldownState, setDrilldownState] = useState<DrilldownState>({
    breadcrumbs: [],
    currentLevel: 0
  });

  // Initialize breadcrumb with root process
  const initializeBreadcrumb = useCallback(() => {
    if (!modelerRef.current) {
      logger.warn('Modeler not ready for breadcrumb initialization', 'DRILLDOWN');
      return;
    }

    try {
      const canvas = modelerRef.current.get('canvas');
      const rootElement = canvas.getRootElement();
      
      if (rootElement) {
        const processName = rootElement.businessObject?.name || 'Main Process';
        const rootBreadcrumb: BreadcrumbItem = {
          id: rootElement.id,
          name: processName,
          type: 'process'
        };

        setDrilldownState({
          breadcrumbs: [rootBreadcrumb],
          currentLevel: 0
        });

        logger.info(`Breadcrumb navigation initialized: ${processName}`, 'DRILLDOWN');
      }
    } catch (error) {
      logger.error('Failed to initialize breadcrumb navigation', 'DRILLDOWN', error as Error);
    }
  }, [modelerRef]);

  // Detect when root element changes (native drill-down)
  const updateBreadcrumbFromCanvas = useCallback(() => {
    if (!modelerRef.current) return;

    try {
      const canvas = modelerRef.current.get('canvas');
      const currentRoot = canvas.getRootElement();
      
      // Detect if we're in a subprocess
      if (currentRoot.type === 'bpmn:SubProcess') {
        // We're inside a subprocess - find the main process
        const subprocessName = currentRoot.businessObject?.name || 'Sub Process';
        
        // Get the main process ID from definitions
        const definitions = modelerRef.current.getDefinitions();
        const mainProcess = definitions.rootElements.find((el: any) => el.$type === 'bpmn:Process');
        const mainProcessId = mainProcess ? mainProcess.id : 'Process_1';
        const mainProcessName = mainProcess?.name || 'Main Process';
        
        setDrilldownState({
          breadcrumbs: [
            { id: mainProcessId, name: mainProcessName, type: 'process' },
            { id: currentRoot.id, name: subprocessName, type: 'subprocess' }
          ],
          currentLevel: 1
        });
      } else {
        // We're at root level
        const processName = currentRoot.businessObject?.name || 'Main Process';
        
        setDrilldownState({
          breadcrumbs: [{ id: currentRoot.id, name: processName, type: 'process' }],
          currentLevel: 0
        });
      }

    } catch (error) {
      logger.error('Failed to update breadcrumb from canvas', 'DRILLDOWN', error as Error);
    }
  }, [modelerRef]);

  // Navigate into a sub-process (not used anymore - native bpmn.js handles this)
  const drillInto = useCallback((element: any) => {
    // Native bpmn.js already handles drill-down
    // We just need to update breadcrumbs when it happens
    updateBreadcrumbFromCanvas();
    return true;
  }, [updateBreadcrumbFromCanvas]);

  // Navigate back to a specific breadcrumb level
  const navigateToLevel = useCallback((targetItem: BreadcrumbItem, targetIndex: number) => {
    if (!modelerRef.current) return;

    try {
      if (targetItem.type === 'process') {
        // Going back to main process - use simple approach
        const canvas = modelerRef.current.get('canvas');
        const currentRoot = canvas.getRootElement();
        
        // If we're currently in a subprocess, navigate back to main process
        if (currentRoot.type === 'bpmn:SubProcess') {
          const definitions = modelerRef.current.getDefinitions();
          const mainProcess = definitions.rootElements.find((el: any) => el.$type === 'bpmn:Process');
          
          if (mainProcess && definitions.diagrams?.[0]?.plane) {
            // Get the main process plane element
            const plane = definitions.diagrams[0].plane;
            const elementRegistry = modelerRef.current.get('elementRegistry');
            
            // Try to find the main process in element registry
            let mainProcessElement = elementRegistry.get(mainProcess.id);
            
            if (!mainProcessElement) {
              // If not found, look for the plane's bpmn element
              mainProcessElement = elementRegistry.get(plane.bpmnElement?.id || plane.id);
            }
            
            if (!mainProcessElement) {
              // As last resort, get the first process-type element
              const allElements = elementRegistry.getAll();
              mainProcessElement = allElements.find((el: any) => el.type === 'bpmn:Process' || el.businessObject?.$type === 'bpmn:Process');
            }
            
            if (mainProcessElement) {
              canvas.setRootElement(mainProcessElement);
              logger.info('Successfully navigated back to main process', 'DRILLDOWN');
            } else {
              logger.warn('Could not find main process element for navigation', 'DRILLDOWN');
            }
          }
        }
      } else {
        // Going to a subprocess
        const elementRegistry = modelerRef.current.get('elementRegistry');
        const targetElement = elementRegistry.get(targetItem.id);
        
        if (targetElement) {
          const canvas = modelerRef.current.get('canvas');
          canvas.setRootElement(targetElement);
          logger.info(`Navigated to subprocess: ${targetItem.name}`, 'DRILLDOWN');
        } else {
          logger.warn('Subprocess element not found', 'DRILLDOWN');
          return;
        }
      }

      // Update breadcrumb state
      const newBreadcrumbs = drilldownState.breadcrumbs.slice(0, targetIndex + 1);
      setDrilldownState({
        breadcrumbs: newBreadcrumbs,
        currentLevel: targetIndex
      });

      logger.info(`Navigation completed to: ${targetItem.name}`, 'DRILLDOWN');

    } catch (error) {
      logger.error('Failed to navigate to level', 'DRILLDOWN', error as Error);
    }
  }, [modelerRef, drilldownState]);

  // Check if an element can be drilled into
  const canDrillInto = useCallback((element: any) => {
    if (!element) return false;
    
    // Check if it's a sub-process with content
    return element.type === 'bpmn:SubProcess' && 
           element.businessObject.flowElements && 
           element.businessObject.flowElements.length > 0;
  }, []);

  return {
    breadcrumbs: drilldownState.breadcrumbs,
    currentLevel: drilldownState.currentLevel,
    initializeBreadcrumb,
    drillInto,
    navigateToLevel,
    canDrillInto,
    isAtRootLevel: drilldownState.currentLevel === 0,
    updateBreadcrumbFromCanvas // Export for manual calls
  };
};