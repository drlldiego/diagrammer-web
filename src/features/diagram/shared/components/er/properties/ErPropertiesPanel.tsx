/**
 * ER Properties Panel - New Architecture Implementation
 * Uses Context Providers and specialized hooks
 * Replaces the legacy ErPropertiesPanel.legacy.tsx
 */
import React from 'react';
import '../../../styles/er/ErPropertiesPanel.scss';
import { ErContextProvider } from '../../../context';
import { ErPropertiesPanelContainer } from './ErPropertiesPanelContainer';

interface ErPropertiesPanelProps {
  element: any;
  elements?: any[];
  modeler: any;
  diagramName?: string;
  onDiagramNameChange?: (name: string) => void;
  notation?: 'chen' | 'crowsfoot';
  onDeclarativeModeChange?: (enabled: boolean) => void;
}

export const ErPropertiesPanel: React.FC<ErPropertiesPanelProps> = ({ 
  element, 
  elements = [], 
  modeler,
  diagramName,
  onDiagramNameChange,
  notation = 'chen',
  onDeclarativeModeChange
}) => {
  return (
    <ErContextProvider 
      modeler={modeler}
      initialNotation={notation}
      initialMode="imperative"
    >
      <ErPropertiesPanelContainer
        element={element}
        modeler={modeler}
        diagramName={diagramName}
        onDiagramNameChange={onDiagramNameChange}
        onDeclarativeModeChange={onDeclarativeModeChange}
      />
    </ErContextProvider>
  );
};

export default ErPropertiesPanel;