/**
 * ER Statistics Context
 * Manages diagram statistics and analytics
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ErElement, isErEntity, isErAttribute, isErRelationship, isErConnection } from '../../../er/core';
import { useErDiagramContext } from '../../../er/shared/context/ErDiagramContext';

interface ErStatistics {
  elementCounts: {
    entities: number;
    relationships: number;
    attributes: number;
    connections: number;
    total: number;
  };
  complexityMetrics: {
    averageConnectionsPerEntity: number;
    maxConnectionsPerElement: number;
    cyclomaticComplexity: number;
    declarativeElementsRatio: number;
  };
  diagramHealth: {
    orphanedElements: number;
    missingCardinalities: number;
    namingInconsistencies: number;
    score: number; // 0-100
  };
  lastUpdated: number;
}

interface ErStatisticsContextValue {
  statistics: ErStatistics;
  isCalculating: boolean;
  refreshStatistics: () => void;
  getElementsByType: (type: 'Entity' | 'Attribute' | 'Relationship' | 'Connection') => ErElement[];
  getDiagramComplexityLevel: () => 'Simple' | 'Moderate' | 'Complex' | 'Very Complex';
}

const ErStatisticsContext = createContext<ErStatisticsContextValue | null>(null);

interface ErStatisticsProviderProps {
  children: React.ReactNode;
}

export const ErStatisticsProvider: React.FC<ErStatisticsProviderProps> = ({ children }) => {
  const { modeler, services } = useErDiagramContext();
  const [statistics, setStatistics] = useState<ErStatistics>({
    elementCounts: { entities: 0, relationships: 0, attributes: 0, connections: 0, total: 0 },
    complexityMetrics: { averageConnectionsPerEntity: 0, maxConnectionsPerElement: 0, cyclomaticComplexity: 0, declarativeElementsRatio: 0 },
    diagramHealth: { orphanedElements: 0, missingCardinalities: 0, namingInconsistencies: 0, score: 100 },
    lastUpdated: Date.now()
  });
  const [isCalculating, setIsCalculating] = useState(false);

  // Get all elements from the modeler
  const getAllElements = useCallback((): ErElement[] => {
    if (!modeler) return [];
    
    try {
      const elementRegistry = modeler.get('elementRegistry');
      return elementRegistry.getAll().filter((element: any) => 
        element.businessObject?.erType || element.waypoints
      );
    } catch (error) {
      console.warn('Failed to get elements from modeler:', error);
      return [];
    }
  }, [modeler]);

  // Calculate element counts
  const calculateElementCounts = useCallback((elements: ErElement[]) => {
    const counts = {
      entities: 0,
      relationships: 0,
      attributes: 0,
      connections: 0,
      total: elements.length
    };

    elements.forEach(element => {
      if (isErEntity(element)) counts.entities++;
      else if (isErRelationship(element)) counts.relationships++;
      else if (isErAttribute(element)) counts.attributes++;
      else if (isErConnection(element)) counts.connections++;
    });

    return counts;
  }, []);

  // Calculate complexity metrics
  const calculateComplexityMetrics = useCallback((elements: ErElement[]) => {
    const entities = elements.filter(isErEntity);
    const connections = elements.filter(isErConnection);
    const declarativeElements = elements.filter(el => el.businessObject.isDeclarative);

    let totalConnections = 0;
    let maxConnections = 0;

    // Calculate connections per entity
    entities.forEach(entity => {
      const entityConnections = connections.filter(conn => 
        conn.source?.id === entity.id || conn.target?.id === entity.id
      ).length;
      
      totalConnections += entityConnections;
      maxConnections = Math.max(maxConnections, entityConnections);
    });

    const averageConnectionsPerEntity = entities.length > 0 ? totalConnections / entities.length : 0;
    
    // Simple cyclomatic complexity calculation
    const cyclomaticComplexity = Math.max(1, connections.length - entities.length + 1);
    
    // Declarative elements ratio
    const declarativeElementsRatio = elements.length > 0 ? declarativeElements.length / elements.length : 0;

    return {
      averageConnectionsPerEntity,
      maxConnectionsPerElement: maxConnections,
      cyclomaticComplexity,
      declarativeElementsRatio
    };
  }, []);

  // Calculate diagram health
  const calculateDiagramHealth = useCallback((elements: ErElement[]) => {
    let orphanedElements = 0;
    let missingCardinalities = 0;
    let namingInconsistencies = 0;

    const connections = elements.filter(isErConnection);
    const entities = elements.filter(isErEntity);
    const attributes = elements.filter(isErAttribute);

    // Check for orphaned elements (elements without connections)
    [...entities, ...attributes].forEach(element => {
      const hasConnections = connections.some(conn => 
        conn.source?.id === element.id || conn.target?.id === element.id
      );
      if (!hasConnections) orphanedElements++;
    });

    // Check for missing cardinalities in connections
    connections.forEach(conn => {
      if (!conn.businessObject.cardinalitySource && !conn.businessObject.cardinalityTarget) {
        missingCardinalities++;
      }
    });

    // Check for naming inconsistencies (basic check)
    const names = elements.map(el => el.businessObject.name).filter(Boolean);
    const uniqueNames = new Set(names);
    if (names.length !== uniqueNames.size) {
      namingInconsistencies = names.length - uniqueNames.size;
    }

    // Calculate health score (0-100)
    const totalIssues = orphanedElements + missingCardinalities + namingInconsistencies;
    const maxPossibleIssues = elements.length;
    const score = maxPossibleIssues > 0 ? Math.max(0, 100 - (totalIssues / maxPossibleIssues) * 100) : 100;

    return {
      orphanedElements,
      missingCardinalities,
      namingInconsistencies,
      score: Math.round(score)
    };
  }, []);

  // Main statistics calculation function
  const calculateStatistics = useCallback(async () => {
    setIsCalculating(true);
    
    try {
      const elements = getAllElements();
      
      const elementCounts = calculateElementCounts(elements);
      const complexityMetrics = calculateComplexityMetrics(elements);
      const diagramHealth = calculateDiagramHealth(elements);

      setStatistics({
        elementCounts,
        complexityMetrics,
        diagramHealth,
        lastUpdated: Date.now()
      });
    } catch (error) {
      console.error('Failed to calculate statistics:', error);
    } finally {
      setIsCalculating(false);
    }
  }, [getAllElements, calculateElementCounts, calculateComplexityMetrics, calculateDiagramHealth]);

  // Get elements by type
  const getElementsByType = useCallback((type: 'Entity' | 'Attribute' | 'Relationship' | 'Connection'): ErElement[] => {
    const elements = getAllElements();
    
    switch (type) {
      case 'Entity': return elements.filter(isErEntity);
      case 'Attribute': return elements.filter(isErAttribute);
      case 'Relationship': return elements.filter(isErRelationship);
      case 'Connection': return elements.filter(isErConnection);
      default: return [];
    }
  }, [getAllElements]);

  // Get diagram complexity level
  const getDiagramComplexityLevel = useCallback((): 'Simple' | 'Moderate' | 'Complex' | 'Very Complex' => {
    const { total } = statistics.elementCounts;
    const { cyclomaticComplexity } = statistics.complexityMetrics;
    
    if (total <= 5 && cyclomaticComplexity <= 2) return 'Simple';
    if (total <= 15 && cyclomaticComplexity <= 5) return 'Moderate';
    if (total <= 30 && cyclomaticComplexity <= 10) return 'Complex';
    return 'Very Complex';
  }, [statistics]);

  // Auto-refresh statistics when modeler or services change
  useEffect(() => {
    if (modeler && services) {
      calculateStatistics();
    }
  }, [modeler, services, calculateStatistics]);

  // Listen for diagram changes and refresh statistics
  useEffect(() => {
    if (!modeler || !services?.events) return;

    const eventBus = modeler.get?.('eventBus');
    if (!eventBus) return;

    const handleDiagramChange = () => {
      // Debounce statistics calculation
      setTimeout(() => {
        calculateStatistics();
      }, 500);
    };

    // Listen for various change events
    eventBus.on('elements.changed', handleDiagramChange);
    eventBus.on('element.changed', handleDiagramChange);
    eventBus.on('shape.added', handleDiagramChange);
    eventBus.on('shape.removed', handleDiagramChange);
    eventBus.on('connection.added', handleDiagramChange);
    eventBus.on('connection.removed', handleDiagramChange);

    return () => {
      eventBus.off('elements.changed', handleDiagramChange);
      eventBus.off('element.changed', handleDiagramChange);
      eventBus.off('shape.added', handleDiagramChange);
      eventBus.off('shape.removed', handleDiagramChange);
      eventBus.off('connection.added', handleDiagramChange);
      eventBus.off('connection.removed', handleDiagramChange);
    };
  }, [modeler, services, calculateStatistics]);

  const contextValue: ErStatisticsContextValue = {
    statistics,
    isCalculating,
    refreshStatistics: calculateStatistics,
    getElementsByType,
    getDiagramComplexityLevel
  };

  return (
    <ErStatisticsContext.Provider value={contextValue}>
      {children}
    </ErStatisticsContext.Provider>
  );
};

// Hook to use statistics context
export const useErStatistics = (): ErStatisticsContextValue => {
  const context = useContext(ErStatisticsContext);
  if (!context) {
    throw new Error('useErStatistics must be used within an ErStatisticsProvider');
  }
  return context;
};