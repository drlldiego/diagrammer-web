/**
 * ER Diagram types for diagram-level operations
 */
import { ErElement, DiagramMode, DiagramNotation } from './er-element.types';

/**
 * ER diagram configuration interface
 */
export interface ErDiagramConfig {
  mode: DiagramMode;
  notation: DiagramNotation;
  allowDirectEntityConnections: boolean;
  enableDeclarativeMode: boolean;
  showCardinalities: boolean;
  showElementTypes: boolean;
}

/**
 * ER diagram metadata interface
 */
export interface ErDiagramMetadata {
  type: 'ER';
  version: string;
  created: string;
  modified?: string;
  mode: DiagramMode;
  notation: DiagramNotation;
  author?: string;
  description?: string;
}

/**
 * Complete ER diagram interface
 */
export interface ErDiagram {
  xml: string;
  elements: ErElement[];
  metadata: ErDiagramMetadata;
  config: ErDiagramConfig;
}

/**
 * Diagram validation result interface
 */
export interface ErDiagramValidationResult {
  isValid: boolean;
  errors: ErDiagramValidationError[];
  warnings: ErDiagramValidationWarning[];
}

export interface ErDiagramValidationError {
  elementId: string;
  type: 'missing_connection' | 'invalid_cardinality' | 'orphaned_element' | 'duplicate_name';
  message: string;
  severity: 'error' | 'warning';
}

export interface ErDiagramValidationWarning {
  elementId: string;
  type: 'style_inconsistency' | 'naming_convention' | 'performance_concern';
  message: string;
  suggestion?: string;
}

/**
 * Export format options
 */
export type ErExportFormat = 'xml' | 'json' | 'mermaid' | 'sql' | 'png' | 'svg';

export interface ErExportOptions {
  format: ErExportFormat;
  includeMetadata: boolean;
  includeStyling: boolean;
  compression?: 'none' | 'gzip';
}

/**
 * Statistics interface for diagram analysis
 */
export interface ErDiagramStatistics {
  elementCounts: {
    entities: number;
    relationships: number;
    attributes: number;
    connections: number;
  };
  complexityMetrics: {
    averageConnectionsPerEntity: number;
    maxConnectionsPerElement: number;
    cyclomaticComplexity: number;
  };
  declarativeElements: number;
  imperativeElements: number;
}