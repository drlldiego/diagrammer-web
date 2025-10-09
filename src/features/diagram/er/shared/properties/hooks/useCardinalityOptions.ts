import { useMemo } from 'react';

/**
 * Hook para gerenciar opções de cardinalidade em diagramas ER
 * Consolida a lógica que estava duplicada entre componentes
 */
export const useCardinalityOptions = (
  erRules?: any,
  sourceType?: string,
  targetType?: string
) => {
  const cardinalityOptions = useMemo(() => {
    if (erRules && typeof erRules.getCardinalityOptions === 'function') {
      try {
        return erRules.getCardinalityOptions(
          { businessObject: { erType: sourceType } },
          { businessObject: { erType: targetType } }
        );
      } catch (error) {
        console.warn('Erro ao obter opções de cardinalidade:', error);
      }
    }
    // Fallback para opções padrão
    return ['0..1', '1..1', '0..N', '1..N'];
  }, [erRules, sourceType, targetType]);

  return cardinalityOptions;
};