/**
 * Hook for extracting and managing connection data
 * Centralizes connection-specific business logic
 */
import { useMemo } from 'react';
import { ErElement, isErEntity } from '../../../er/core';

export interface ConnectionData {
  source: ErElement | null;
  target: ErElement | null;
  sourceType: string | null;
  targetType: string | null;
  sourceName: string;
  targetName: string;
  connectionName: string;
  connectsTwoEntities: boolean;
  cardinalitySource: string | null;
  cardinalityTarget: string | null;
  isDeclarative: boolean;
  connectionType: 'entity-entity' | 'entity-relationship' | 'attribute-entity' | 'other';
}

export const useConnectionData = (element: ErElement): ConnectionData => {
  // Add element properties as dependencies to force re-render when they change
  const cardinalitySourceDep = element?.businessObject?.cardinalitySource;
  const cardinalityTargetDep = element?.businessObject?.cardinalityTarget;
  const connectionNameDep = element?.businessObject?.name;
  
  return useMemo(() => {
    if (!element || !element.source || !element.target) {
      return {
        source: null,
        target: null,
        sourceType: null,
        targetType: null,
        sourceName: '',
        targetName: '',
        connectionName: '',
        connectsTwoEntities: false,
        cardinalitySource: null,
        cardinalityTarget: null,
        isDeclarative: false,
        connectionType: 'other'
      };
    }

    const source = element.source;
    const target = element.target;
    const sourceType = source.businessObject?.erType || null;
    const targetType = target.businessObject?.erType || null;
    const sourceName = source.businessObject?.name || 'Unnamed';
    const targetName = target.businessObject?.name || 'Unnamed';
    const connectionName = element.businessObject?.name || '';
    
    // Check if connection is between two entities
    const sourceIsEntity = isErEntity(source);
    const targetIsEntity = isErEntity(target);
    const connectsTwoEntities = sourceIsEntity && targetIsEntity;
    
    // Get cardinalities - force defaults if missing for ER connections
    let cardinalitySource = element.businessObject?.cardinalitySource || null;
    let cardinalityTarget = element.businessObject?.cardinalityTarget || null;
    
    // If this is a connection between two entities but has no cardinalities, provide defaults
    if (connectsTwoEntities && !cardinalitySource && !cardinalityTarget) {
      cardinalitySource = '1..1';
      cardinalityTarget = '1..N';
    }
    
    // Check if connection is declarative
    const isDeclarative = Boolean(
      element.businessObject?.isDeclarative || 
      element.businessObject?.mermaidCardinality
    );
    
    // Determine connection type
    let connectionType: ConnectionData['connectionType'] = 'other';
    if (sourceIsEntity && targetIsEntity) {
      connectionType = 'entity-entity';
    } else if ((sourceIsEntity && targetType === 'Relationship') || 
               (sourceType === 'Relationship' && targetIsEntity)) {
      connectionType = 'entity-relationship';
    } else if ((sourceType === 'Attribute' && targetIsEntity) || 
               (sourceIsEntity && targetType === 'Attribute')) {
      connectionType = 'attribute-entity';
    }

    return {
      source,
      target,
      sourceType,
      targetType,
      sourceName,
      targetName,
      connectionName,
      connectsTwoEntities,
      cardinalitySource,
      cardinalityTarget,
      isDeclarative,
      connectionType
    };
  }, [element, cardinalitySourceDep, cardinalityTargetDep, connectionNameDep]);
};