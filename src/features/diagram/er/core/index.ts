/**
 * Exportações do módulo central ER
 */

// Exportar todos os tipos
export * from './types';

// Exportar todos os serviços
export * from './services';

// Constantes e configurações
export const ER_CORE_VERSION = '1.0.0';
export const SUPPORTED_NOTATIONS = ['chen', 'crowsfoot'] as const;
export const DEFAULT_NOTATION = 'chen';

// Dimensões padrão dos elementos
export const DEFAULT_DIMENSIONS = {
  entity: { width: 120, height: 60 },
  attribute: { width: 80, height: 40 },
  relationship: { width: 100, height: 50 }
} as const;

// Cardinalidades padrão
export const DEFAULT_CARDINALITIES = {
  chen: ['0..1', '1..1', '0..N', '1..N'],
  crowsfoot: ['0..1', '1..1', '0..N', '1..N']
} as const;