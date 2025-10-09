/**
 * Componente para o painel de propriedades do diagrama ER.
 * Exibe diferentes vistas com base na seleção atual:
 */
import React from 'react';
import { ErElement } from '../../../../er/core';
import { useErDiagramContext, useErSelection, useErMode, useErNotation } from '../../../context';
import { useErComposite } from '../../../hooks/er';
import { ErPropertiesPanelView } from './ErPropertiesPanelView';
import { DiagramPropertiesView } from './DiagramPropertiesView';
import { MultiSelectionView } from './MultiSelectionView';
import { ConnectionPropertiesContainer } from './ConnectionPropertiesContainer';
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
  // Força re-renderização quando necessário
  const [updateTrigger, setUpdateTrigger] = React.useState(0);
  
  // Utiliza contextos e hooks personalizados
  const { actions } = useErDiagramContext();
  const { selectedElements, hasSelection, selectedCount } = useErSelection();
  const { mode, isDeclarativeMode, toggleMode } = useErMode();
  const { notation, setNotation } = useErNotation();

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
      
      // Melhoria na função de atualização de propriedades da conexão
      const updateConnectionProperty = async (propertyName: string, value: any) => {
        try {
          const modeling = modeler.get('modeling') as any;
          const commandStack = modeler.get('commandStack') as any;
          
          // Método 1: Tentar usar modeling.updateProperties
          try {
            modeling.updateProperties(element, { [propertyName]: value });
          } catch (modelingError) {
            // Método 2: Tentar usar commandStack diretamente com o nome de comando correto
            try {
              commandStack.execute('properties.update', {
                element: element,
                properties: { [propertyName]: value }
              });
            } catch (commandError) {
              // Método 3: Atribuição direta como último recurso
              const currentValue = (element?.businessObject as any)?.[propertyName];
              if (currentValue !== value && element?.businessObject) {
                (element.businessObject as any)[propertyName] = value;
                
                // Também atualiza em $attrs para compatibilidade com BPMN
                const eventBus = modeler.get('eventBus') as any;
                if (eventBus) {
                  eventBus.fire('elements.changed', { elements: [element] });
                }
              }
            }
          }

          // Verificação final e atualização forçada, se necessário
          setTimeout(() => {
            const finalValue = (element?.businessObject as any)?.[propertyName];
            
            // Forçar re-renderização
            setUpdateTrigger(prev => prev + 1);
            
            if (finalValue !== value && element?.businessObject) {
              // Forçar atribuição direta
              (element.businessObject as any)[propertyName] = value;

              // Também atualiza em $attrs para compatibilidade com BPMN
              const businessObj = element.businessObject as any;
              if (!businessObj.$attrs) {
                businessObj.$attrs = {};
              }
              businessObj.$attrs[`er:${propertyName}`] = value;
              
              // Trigger eventos para notificar mudanças
              const eventBus = modeler.get('eventBus') as any;
              if (eventBus) {
                eventBus.fire('elements.changed', { elements: [element] });
                eventBus.fire('element.changed', { element });
              }
              
              // Force re-renderização novamente
              setUpdateTrigger(prev => prev + 1);
            }
          }, 100);
          
          // Forçar atualização visual para propriedades específicas, como cardinalidade
          if (propertyName.includes('cardinality')) {
            try {
              const renderer = modeler.get('bpmnRenderer') || modeler.get('erBpmnRenderer');
              
              if (renderer && typeof (renderer as any).updateConnectionCardinalities === 'function') {
                // Utiliza método específico do renderizador, se disponível
                (renderer as any).updateConnectionCardinalities(element);
              } else {
                // Fallback: Força re-renderização manual
                const canvas = modeler.get('canvas') as any;
                const elementRegistry = modeler.get('elementRegistry') as any;
                
                if (canvas && elementRegistry && typeof elementRegistry.getGraphics === 'function') {
                  const gfx = elementRegistry.getGraphics(element);
                  
                  if (gfx && typeof canvas.addMarker === 'function') {
                    // Limpa elementos visuais existentes
                    const existingLabels = gfx.querySelectorAll('.er-cardinality-label, .er-crowsfoot-marker');
                    existingLabels.forEach((label: any) => {
                      if (label.parentNode) {
                        label.parentNode.removeChild(label);
                      }
                    });
                    
                    // Trigger re-renderização
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
              logger.warn('Falha ao atualizar visuais de cardinalidade:', undefined, renderError as Error);
            }
          }
        } catch (error) {          
          logger.error('Error ao atualizar propriedade de conexão:', undefined, error as Error);
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