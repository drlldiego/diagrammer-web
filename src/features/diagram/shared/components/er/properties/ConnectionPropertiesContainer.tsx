/**
 * Container component for Connection Properties
 * Handles business logic and state management using new architecture
 */
import React from 'react';
import { ErElement } from '../../../../er/core';
import { useErDiagramContext, useErNotation, useErMode } from '../../../context';
import { useConnectionData } from '../../../hooks/er/useConnectionData';
import { ConnectionPropertiesView } from './ConnectionPropertiesView';

interface ConnectionPropertiesContainerProps {
  element: ErElement;
  modeler: any;
  updateProperty: (property: string, value: any) => void;
}

export const ConnectionPropertiesContainer: React.FC<ConnectionPropertiesContainerProps> = ({
  element,
  modeler,
  updateProperty
}) => {
  // Extract connection data using specialized hook
  const connectionData = useConnectionData(element);
  
  // Use fallback values since context is not available in ErModeler
  const notation: 'crowsfoot' | 'chen' = 'crowsfoot'; // Default notation for this component
  const notationInfo = undefined; // No notation info available
  
  // Get cardinality options with simple fallback
  const cardinalityOptions = React.useMemo(() => {
    // Always use fallback options since context service is not available
    return ['1', 'N', '0..1', '0..N', '1..N'];
  }, [notation]);

  // Determine if fields should be disabled (default to false)
  const isDeclarativeMode = false; // Default to false since context is not available
  const fieldsDisabled = isDeclarativeMode && connectionData.isDeclarative;

  // Props for the view component
  const viewProps = {
    connectionData,
    notation,
    notationInfo,
    cardinalityOptions,
    fieldsDisabled,
    isDeclarativeMode,
    updateProperty
  };

  return <ConnectionPropertiesView {...viewProps} />;
};