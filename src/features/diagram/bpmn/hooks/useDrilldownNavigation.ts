/**
 * Hook para gerenciar a navegação de drill-down entre processos e sub-processos
 * Implementa a navegação breadcrumb para funcionalidade de drill-down BPMN
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

  // Inicializa o breadcrumb com o processo raiz
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

  // Detecta quando o elemento raiz muda (drill-down nativo)
  const updateBreadcrumbFromCanvas = useCallback(() => {
    if (!modelerRef.current) return;

    try {
      const canvas = modelerRef.current.get('canvas');
      const currentRoot = canvas.getRootElement();
      
      // Detecta se é um subprocess
      if (currentRoot.type === 'bpmn:SubProcess') {
        // Dentro do subprocess - encontrar o processo principal
        const subprocessName = currentRoot.businessObject?.name || 'Sub Process';

        // Obter o ID do processo principal a partir das definições
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
        // Estamos no nível raiz
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

  // Navegar para um sub-processo (não é mais usado - o nativo bpmn.js lida com isso)
  const drillInto = useCallback((element: any) => {
    // O nativo bpmn.js já lida com o drill-down
    // Só precisamos atualizar os breadcrumbs quando isso acontece
    updateBreadcrumbFromCanvas();
    return true;
  }, [updateBreadcrumbFromCanvas]);

  // Navegar de volta para um nível específico do breadcrumb
  const navigateToLevel = useCallback((targetItem: BreadcrumbItem, targetIndex: number) => {
    if (!modelerRef.current) return;

    try {
      if (targetItem.type === 'process') {
        // Indo de volta para o processo principal - usar abordagem simples
        const canvas = modelerRef.current.get('canvas');
        const currentRoot = canvas.getRootElement();

        // Se estamos atualmente em um subprocesso, navegar de volta para o processo principal
        if (currentRoot.type === 'bpmn:SubProcess') {
          const definitions = modelerRef.current.getDefinitions();
          const mainProcess = definitions.rootElements.find((el: any) => el.$type === 'bpmn:Process');
          
          if (mainProcess && definitions.diagrams?.[0]?.plane) {
            // Obter o elemento do plano do processo principal
            const plane = definitions.diagrams[0].plane;
            const elementRegistry = modelerRef.current.get('elementRegistry');

            // Tentar encontrar o processo principal no registro de elementos
            let mainProcessElement = elementRegistry.get(mainProcess.id);
            
            if (!mainProcessElement) {
              // Se não encontrado, procurar o elemento bpmn do plano
              mainProcessElement = elementRegistry.get(plane.bpmnElement?.id || plane.id);
            }
            
            if (!mainProcessElement) {
              // Como último recurso, obter o primeiro elemento do tipo processo
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
        // Indo para um subprocesso
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

      // Atualizar o estado do breadcrumb
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

  // Verificar se um elemento pode ser acessado
  const canDrillInto = useCallback((element: any) => {
    if (!element) return false;
    
    // Verificar se é um subprocesso com elementos filhos
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
    updateBreadcrumbFromCanvas // Exportar para chamadas manuais
  };
};