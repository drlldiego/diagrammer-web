/**
 * Container component for ER Properties Panel
 * Uses new architecture with context providers and specialized hooks
 */
import React from 'react';
import { ErElement } from '../../../../er/core';
import { useErDiagramContext, useErSelection, useErMode, useErNotation } from '../../../context';
import { useErComposite } from '../../../hooks/er';
import { ErPropertiesPanelView } from './ErPropertiesPanelView';
import { DiagramPropertiesView } from './DiagramPropertiesView';
import { MultiSelectionView } from './MultiSelectionView';
import { ConnectionPropertiesContainer } from './ConnectionPropertiesContainer';

interface ErPropertiesPanelContainerProps {
  element: ErElement | null;
  modeler: any;
  onDiagramNameChange?: (name: string) => void;
  onDeclarativeModeChange?: (enabled: boolean) => void;
}

export const ErPropertiesPanelContainer: React.FC<ErPropertiesPanelContainerProps> = ({
  element,
  modeler,
  onDiagramNameChange,
  onDeclarativeModeChange
}) => {
  // Force re-render state for property updates
  const [updateTrigger, setUpdateTrigger] = React.useState(0);
  
  // Use context hooks for global state
  const { actions } = useErDiagramContext();
  const { selectedElements, hasSelection, selectedCount } = useErSelection();
  const { mode, isDeclarativeMode, toggleMode } = useErMode();
  const { notation, setNotation } = useErNotation();

  // Initialize modeler in context if not already set
  React.useEffect(() => {
    if (modeler) {
      actions.setModeler(modeler);
    }
  }, [modeler, actions]);

  // Use composite hook for element management - always call hook to follow React Rules
  const elementControl = useErComposite(element, modeler);

  // Handle declarative mode changes
  const handleDeclarativeModeChange = React.useCallback((enabled: boolean) => {
    const newMode = enabled ? 'declarative' : 'imperative';
    actions.setMode(newMode);
    onDeclarativeModeChange?.(enabled);
  }, [actions, onDeclarativeModeChange]);

  // Helper function to check if element is a connection
  const isConnection = (element: any): boolean => {
    return element?.type === 'bpmn:SequenceFlow' || !!element?.waypoints;
  };

  // Determine view type
  const getViewType = (): 'diagram' | 'element' | 'connection' | 'multi-selection' | 'no-selection' => {
    if (selectedCount > 1) return 'multi-selection';
    if (!element && !hasSelection) return 'diagram';
    if (element && isConnection(element)) return 'connection';
    if (element && element.businessObject?.erType) return 'element';
    if (isCanvasElement(element)) return 'diagram';
    return 'no-selection';
  };

  const viewType = getViewType();

  // Render appropriate view based on selection state
  switch (viewType) {
    case 'diagram':
      return (
        <DiagramPropertiesView
          modeler={modeler}
          notation={notation}
          mode={mode}
          isDeclarativeMode={isDeclarativeMode}
          onDiagramNameChange={onDiagramNameChange}
          onNotationChange={setNotation}
          onModeChange={handleDeclarativeModeChange}
        />
      );

    case 'multi-selection':
      return (
        <MultiSelectionView
          selectedElements={selectedElements}
          notation={notation}
          modeler={modeler}
        />
      );

    case 'connection':
      if (!element) return null;
      
      // Enhanced property updater for connections with visual update
      const updateConnectionProperty = async (propertyName: string, value: any) => {
        try {
          const modeling = modeler.get('modeling') as any;
          const commandStack = modeler.get('commandStack') as any;
          
          // Method 1: Use modeling.updateProperties (correct bpmn-js approach)
          try {
            modeling.updateProperties(element, { [propertyName]: value });
          } catch (modelingError) {
            // Method 2: Try direct commandStack with correct command name
            try {
              commandStack.execute('properties.update', {
                element: element,
                properties: { [propertyName]: value }
              });
            } catch (commandError) {
              // Method 3: Direct businessObject assignment + event trigger (last resort)
              const currentValue = (element?.businessObject as any)?.[propertyName];
              if (currentValue !== value && element?.businessObject) {
                (element.businessObject as any)[propertyName] = value;
                
                // Trigger events manually
                const eventBus = modeler.get('eventBus') as any;
                if (eventBus) {
                  eventBus.fire('elements.changed', { elements: [element] });
                }
              }
            }
          }
          
          // Final check and force update if needed
          setTimeout(() => {
            const finalValue = (element?.businessObject as any)?.[propertyName];
            
            // Force React re-render
            setUpdateTrigger(prev => prev + 1);
            
            if (finalValue !== value && element?.businessObject) {
              // Force direct assignment
              (element.businessObject as any)[propertyName] = value;
              
              // Also update in $attrs for BPMN compatibility
              const businessObj = element.businessObject as any;
              if (!businessObj.$attrs) {
                businessObj.$attrs = {};
              }
              businessObj.$attrs[`er:${propertyName}`] = value;
              
              // Trigger multiple events to ensure update
              const eventBus = modeler.get('eventBus') as any;
              if (eventBus) {
                eventBus.fire('elements.changed', { elements: [element] });
                eventBus.fire('element.changed', { element });
              }
              
              // Force React re-render
              setUpdateTrigger(prev => prev + 1);
            }
          }, 100);
          
          // Force visual update for cardinality changes
          if (propertyName.includes('cardinality')) {
            try {
              const renderer = modeler.get('bpmnRenderer') || modeler.get('erBpmnRenderer');
              
              if (renderer && typeof (renderer as any).updateConnectionCardinalities === 'function') {
                // Use the specific renderer method for updating cardinalities
                (renderer as any).updateConnectionCardinalities(element);
              } else {
                // Fallback: Force complete re-render of the connection
                const canvas = modeler.get('canvas') as any;
                const elementRegistry = modeler.get('elementRegistry') as any;
                
                if (canvas && elementRegistry && typeof elementRegistry.getGraphics === 'function') {
                  const gfx = elementRegistry.getGraphics(element);
                  
                  if (gfx && typeof canvas.addMarker === 'function') {
                    // Clear existing visual elements
                    const existingLabels = gfx.querySelectorAll('.er-cardinality-label, .er-crowsfoot-marker');
                    existingLabels.forEach((label: any) => label.remove());
                    
                    // Trigger re-render
                    canvas.addMarker(element, 'er-cardinality-updated');
                    setTimeout(() => {
                      if (typeof canvas.removeMarker === 'function') {
                        canvas.removeMarker(element, 'er-cardinality-updated');
                      }
                    }, 50);
                  }
                }
              }
            } catch (renderError) {
              console.warn('Failed to update cardinality visuals:', renderError);
            }
          }
        } catch (error) {
          console.error('Error updating connection property:', error);
        }
      };
      
      return (
        <ConnectionPropertiesContainer
          element={element}
          modeler={modeler}
          updateProperty={updateConnectionProperty}
        />
      );

    case 'element':
      if (!element || !elementControl) return null;
      
      return (
        <ErPropertiesPanelView
          element={element}
          elementControl={elementControl}
          notation={notation}
          isDeclarativeMode={isDeclarativeMode}
          modeler={modeler}
        />
      );

    default:
      return (
        <div className="er-properties-panel">
          <div className="er-properties-header">
            <h3>Propriedades</h3>
          </div>
          <div className="er-properties-content">
            <p className="no-selection">
              Selecione um elemento ER para editar propriedades
            </p>
          </div>
        </div>
      );
  }
};

// Helper function to check if element is canvas/root
function isCanvasElement(element: any): boolean {
  if (!element) return false;
  
  return (
    !element.businessObject?.erType && 
    (element.type === 'bpmn:Process' || 
     element.type === 'bpmn:Collaboration' || 
     element.id?.includes('Process') ||
     !element.businessObject?.$type)
  );
}