/**
 * Core ER module exports
 * Central access point for core ER functionality
 */

// Export all types
export * from './types';

// Export all services
export * from './services';

// Core entities and utilities
export { ErServiceFactory } from './services';

// Constants and configurations
export const ER_CORE_VERSION = '1.0.0';
export const SUPPORTED_NOTATIONS = ['chen', 'crowsfoot'] as const;
export const DEFAULT_NOTATION = 'chen';

// Default element dimensions
export const DEFAULT_DIMENSIONS = {
  entity: { width: 120, height: 60 },
  attribute: { width: 80, height: 40 },
  relationship: { width: 100, height: 50 }
} as const;

// Default cardinalities
export const DEFAULT_CARDINALITIES = {
  chen: ['1', 'N', '0..1', '0..N', '1..N'],
  crowsfoot: ['1', '0..1', '1..*', '0..*']
} as const;