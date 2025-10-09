/**
 * Hook for managing ER element local state
 * Handles element state synchronization and updates
 */
import { useState, useEffect, useCallback } from 'react';
import { ErElement } from '../../../../er/core';

interface UseErElementStateReturn {
  properties: any;
  setProperties: (updateFn: (prev: any) => any) => void;
  refreshProperties: () => void;
  isLoading: boolean;
}

export const useErElementState = (element: ErElement | null): UseErElementStateReturn => {
  const [properties, setPropertiesState] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Extract properties from element business object
  const extractProperties = useCallback((element: ErElement | null) => {
    if (!element?.businessObject) return null;

    const bo = element.businessObject;
    return {
      id: bo.id,
      name: bo.name,
      erType: bo.erType,
      
      // Entity properties
      isWeak: bo.isWeak,
      
      // Attribute properties
      isPrimaryKey: bo.isPrimaryKey,
      isRequired: bo.isRequired,
      isMultivalued: bo.isMultivalued,
      isDerived: bo.isDerived,
      isComposite: bo.isComposite,
      isSubAttribute: bo.isSubAttribute,
      dataType: bo.dataType,
      
      // Relationship properties
      isIdentifying: bo.isIdentifying,
      
      // Connection properties
      cardinalitySource: bo.cardinalitySource,
      cardinalityTarget: bo.cardinalityTarget,
      source: element.source?.businessObject?.name,
      target: element.target?.businessObject?.name,
      sourceType: element.source?.businessObject?.erType,
      targetType: element.target?.businessObject?.erType,
      
      // Declarative mode properties
      isDeclarative: bo.isDeclarative,
      mermaidCardinality: bo.mermaidCardinality,
      
      // Common properties
      description: bo.description,
      nullable: bo.nullable,
      type: bo.type,
      
      // Dimensions
      width: element.width,
      height: element.height,
      x: element.x,
      y: element.y
    };
  }, []);

  // Initialize properties from element
  useEffect(() => {
    if (element) {
      setIsLoading(true);
      const initialProperties = extractProperties(element);
      setPropertiesState(initialProperties);
      setIsLoading(false);
    }
  }, [element, extractProperties]);

  // Wrapper for setting properties with validation
  const setProperties = useCallback((updateFn: (prev: any) => any) => {
    setPropertiesState((prev: any) => {
      const updated = updateFn(prev);
      return updated;
    });
  }, []);

  // Refresh properties from current element state
  const refreshProperties = useCallback(() => {
    if (element) {
      const refreshedProperties = extractProperties(element);
      setPropertiesState(refreshedProperties);
    }
  }, [element, extractProperties]);

  return {
    properties,
    setProperties,
    refreshProperties,
    isLoading,
  };
};