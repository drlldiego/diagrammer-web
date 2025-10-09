/**
 * Utilitários para formatação de cardinalidade
 * Consolida a lógica de formatação duplicada entre componentes
 */

export const formatCardinalityText = (option: string): string => {
  const cardinalityLabels: Record<string, string> = {      
    '0..1': '(Zero ou Um)',
    '1..1': '(Exatamente Um)',
    '0..N': '(Zero ou Muitos)',
    '1..N': '(Um ou Muitos)'
  };
  
  return `${option} ${cardinalityLabels[option] || ''}`;
};

/**
 * Valida se uma opção de cardinalidade é válida
 */
export const isValidCardinalityOption = (option: string): boolean => {
  const validOptions = ['0..1', '1..1', '0..N', '1..N'];
  return validOptions.includes(option);
};

/**
 * Obtém o valor padrão de cardinalidade para um tipo específico
 */
export const getDefaultCardinality = (
  elementType: 'source' | 'target',
  connectsTwoEntities: boolean
): string => {
  if (connectsTwoEntities) {
    return elementType === 'source' ? '1..1' : '1..N';
  }
  return '1..1';
};