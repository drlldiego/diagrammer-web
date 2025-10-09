/**
 * Hook React para criação de sub-atributos ER
 * Encapsula a lógica de criação de sub-atributos em um hook reutilizável
 */

import { useCallback, useState } from 'react';
import { ErElement } from '../../../../er/core';
import { ErSubAttributeService, SubAttributeOptions, SubAttributeResult } from '../../services/er-sub-attribute.service';
import { logger } from '../../../../../../utils/logger';

export interface UseSubAttributeCreationReturn {
  createSubAttribute: (
    parentElement: ErElement, 
    properties: any, 
    options?: SubAttributeOptions
  ) => Promise<SubAttributeResult>;
  isCreating: boolean;
  lastResult: SubAttributeResult | null;
}

/**
 * Hook para criação de sub-atributos ER
 */
export const useSubAttributeCreation = (modeler: any): UseSubAttributeCreationReturn => {
  const [isCreating, setIsCreating] = useState(false);
  const [lastResult, setLastResult] = useState<SubAttributeResult | null>(null);

  const createSubAttribute = useCallback(async (
    parentElement: ErElement, 
    properties: any, 
    options: SubAttributeOptions = {}
  ): Promise<SubAttributeResult> => {
    if (!modeler) {
      const errorResult: SubAttributeResult = {
        success: false,
        error: 'Modeler não está disponível'
      };
      setLastResult(errorResult);
      return errorResult;
    }

    if (!parentElement) {
      const errorResult: SubAttributeResult = {
        success: false,
        error: 'Elemento pai não fornecido'
      };
      setLastResult(errorResult);
      return errorResult;
    }

    setIsCreating(true);
    
    try {
      const subAttributeService = new ErSubAttributeService(modeler);
      
      if (!subAttributeService.isReady()) {
        const errorResult: SubAttributeResult = {
          success: false,
          error: 'Serviço de sub-atributos não está pronto'
        };
        setLastResult(errorResult);
        return errorResult;
      }

      const subAttributeOptions: SubAttributeOptions = {
        dataType: 'VARCHAR',
        isRequired: true,
        isPrimaryKey: false,
        isMultivalued: false,
        isDerived: false,
        timeout: 400,
        ...options
      };

      logger.info(`Iniciando criação de sub-atributo para elemento ${parentElement.id}`, 'useSubAttributeCreation');

      const result = await subAttributeService.createSubAttribute(
        parentElement, 
        properties, 
        subAttributeOptions
      );
      
      setLastResult(result);

      if (result.success) {
        logger.info('Sub-atributo criado com sucesso via hook', 'useSubAttributeCreation');
      } else {
        logger.warn(`Criação de sub-atributo falhou: ${result.error}`, 'useSubAttributeCreation');
        
        // Mostrar alerta para o usuário
        if (result.error) {
          alert(result.error);
        }
      }

      return result;

    } catch (error) {
      const errorMessage = (error as Error).message;
      logger.error('Erro no hook de criação de sub-atributo:', 'useSubAttributeCreation', error as Error);
      
      const errorResult: SubAttributeResult = {
        success: false,
        error: errorMessage
      };
      
      setLastResult(errorResult);
      alert('Erro ao criar sub-atributo. Verifique o console para detalhes.');
      
      return errorResult;
    } finally {
      setIsCreating(false);
    }
  }, [modeler]);

  return {
    createSubAttribute,
    isCreating,
    lastResult
  };
};