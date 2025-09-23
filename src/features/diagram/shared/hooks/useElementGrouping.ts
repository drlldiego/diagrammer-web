/**
 * Hook React para agrupamento de elementos ER
 * Encapsula a lógica de agrupamento em um hook reutilizável
 */

import { useCallback, useState } from 'react';
import { ErElement } from '../../er/core';
import { ErElementGroupingService, GroupingOptions, GroupingResult } from '../services/er-element-grouping.service';
import { logger } from '../../../../utils/logger';

export interface UseElementGroupingReturn {
  groupElements: (elements: ErElement[], options?: Partial<GroupingOptions>) => Promise<GroupingResult>;
  isGrouping: boolean;
  lastResult: GroupingResult | null;
  debugGroupInfo: () => void;
}

/**
 * Hook para agrupamento de elementos ER
 */
export const useElementGrouping = (
  modeler: any, 
  notation: 'chen' | 'crowsfoot'
): UseElementGroupingReturn => {
  const [isGrouping, setIsGrouping] = useState(false);
  const [lastResult, setLastResult] = useState<GroupingResult | null>(null);

  const groupElements = useCallback(async (
    elements: ErElement[], 
    options: Partial<GroupingOptions> = {}
  ): Promise<GroupingResult> => {
    if (!modeler) {
      const errorResult: GroupingResult = {
        success: false,
        error: 'Modeler não está disponível'
      };
      setLastResult(errorResult);
      return errorResult;
    }

    setIsGrouping(true);
    
    try {
      const groupingService = new ErElementGroupingService(modeler);
      
      if (!groupingService.isReady()) {
        const errorResult: GroupingResult = {
          success: false,
          error: 'Serviço de agrupamento não está pronto'
        };
        setLastResult(errorResult);
        return errorResult;
      }

      const groupingOptions: GroupingOptions = {
        notation,
        padding: 40,
        timeout: 500,
        ...options
      };

      logger.info(`Iniciando agrupamento de ${elements.length} elementos`, 'useElementGrouping');

      const result = await groupingService.groupElements(elements, groupingOptions);
      
      setLastResult(result);

      if (result.success) {
        logger.info('Agrupamento concluído com sucesso via hook', 'useElementGrouping');
      } else {
        logger.warn(`Agrupamento falhou: ${result.error}`, 'useElementGrouping');
        
        // Mostrar alerta para o usuário
        if (result.error) {
          alert(result.error);
        }
      }

      return result;

    } catch (error) {
      const errorMessage = (error as Error).message;
      logger.error('Erro no hook de agrupamento:', 'useElementGrouping', error as Error);
      
      const errorResult: GroupingResult = {
        success: false,
        error: errorMessage
      };
      
      setLastResult(errorResult);
      alert('Erro ao agrupar elementos. Verifique o console para detalhes.');
      
      return errorResult;
    } finally {
      setIsGrouping(false);
    }
  }, [modeler, notation]);

  const debugGroupInfo = useCallback(() => {
    if (!modeler) {
      logger.warn('Modeler não disponível para debug', 'useElementGrouping');
      return;
    }
    
    const groupingService = new ErElementGroupingService(modeler);
    groupingService.debugGroupInfo();
  }, [modeler]);

  return {
    groupElements,
    isGrouping,
    lastResult,
    debugGroupInfo
  };
};