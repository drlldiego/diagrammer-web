/**
 * Componente para o painel de propriedades do diagrama ER.
 * Exibe diferentes vistas com base na seleção atual:
 */
import React from 'react';
import { ErElement } from '../../../core';
import { useErDiagramContext, useErSelection, useErMode, useErNotation } from '../../../../shared/context';
import { useErComposite } from '../../../../shared/hooks/er';
import { useConnectionUpdate } from '../hooks/useConnectionUpdate';
import { ErPropertiesPanelView } from './ErPropertiesPanelView';
import { DiagramPropertiesView } from './views/DiagramPropertiesView';
import { MultiSelectionView } from './views/MultiSelectionView';
import { ConnectionPropertiesContainer } from './connections/ConnectionPropertiesContainer';
import { logger } from '../../../../../../utils/logger';

interface ErPropertiesPanelContainerProps {
  element: ErElement | null;
  modeler: any;
  diagramName?: string;
  onDiagramNameChange?: (name: string) => void;
  onDeclarativeModeChange?: (enabled: boolean) => void;
}

export const ErPropertiesPanelContainer: React.FC<ErPropertiesPanelContainerProps> = ({
  element,
  modeler,
  diagramName,
  onDiagramNameChange,
  onDeclarativeModeChange
}) => {
  // Utiliza contextos e hooks personalizados
  const { actions } = useErDiagramContext();
  const { selectedElements, hasSelection, selectedCount } = useErSelection();
  const { mode, isDeclarativeMode, toggleMode } = useErMode();
  const { notation, setNotation } = useErNotation();
  
  // Hook para atualização de conexões
  const { updateConnectionProperty, updateTrigger } = useConnectionUpdate(modeler);

  // Inicializa o modeler no contexto se ainda não estiver definido
  React.useEffect(() => {
    if (modeler) {
      actions.setModeler(modeler);
    }
  }, [modeler, actions]);

  // Utiliza controle composto para o elemento selecionado
  const elementControl = useErComposite(element, modeler);

  // Trata mudança de modo declarativo/imperativo
  const handleDeclarativeModeChange = React.useCallback((enabled: boolean) => {
    const newMode = enabled ? 'declarative' : 'imperative';
    actions.setMode(newMode);
    onDeclarativeModeChange?.(enabled);
  }, [actions, onDeclarativeModeChange]);

  // Função auxiliar para verificar se o elemento é uma conexão
  const isConnection = (element: any): boolean => {
    return element?.type === 'bpmn:SequenceFlow' || !!element?.waypoints;
  };

  // Determina o tipo de visualização
  const getViewType = (): 'diagram' | 'element' | 'connection' | 'multi-selection' | 'no-selection' => {
    if (selectedCount > 1) return 'multi-selection';
    if (!element && !hasSelection) return 'diagram';
    if (element && isConnection(element)) return 'connection';
    if (element && element.businessObject?.erType) return 'element';
    if (isCanvasElement(element)) return 'diagram';
    return 'no-selection';
  };

  const viewType = getViewType();

  // Renderiza a vista apropriada com base no tipo de visualização
  switch (viewType) {
    case 'diagram':
      return (
        <DiagramPropertiesView
          modeler={modeler}
          notation={notation}
          mode={mode}
          isDeclarativeMode={isDeclarativeMode}
          diagramName={diagramName}
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
      
      // Função simplificada usando o hook useConnectionUpdate
      const handleConnectionUpdate = async (propertyName: string, value: any) => {
        await updateConnectionProperty(element, propertyName, value);
      };
      
      return (
        <ConnectionPropertiesContainer
          element={element}
          modeler={modeler}
          updateProperty={handleConnectionUpdate}
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

// Função auxiliar para determinar se o elemento é o canvas
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