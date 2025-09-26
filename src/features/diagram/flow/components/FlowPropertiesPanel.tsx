import React, { useState, useEffect } from 'react';
import './FlowPropertiesPanel.scss';

interface FlowPropertiesPanelProps {
  element?: any;
  elements?: any[];
  modeler: any;
  onDiagramNameChange?: (name: string) => void;
}

export const FlowPropertiesPanel: React.FC<FlowPropertiesPanelProps> = ({ 
  element,
  elements = [],
  modeler, 
  onDiagramNameChange 
}) => {
  const [diagramName, setDiagramName] = useState<string>('Fluxograma');
  const [elementName, setElementName] = useState<string>('');
  const [elementType, setElementType] = useState<string>('');

  // Atualizar informações quando elemento selecionado muda
  useEffect(() => {
    if (element && element.businessObject) {
      setElementName(element.businessObject.name || '');
      setElementType(element.type || '');
    } else {
      setElementName('');
      setElementType('');
    }
  }, [element]);

  // Obter nome do diagrama do XML
  useEffect(() => {
    if (modeler) {
      try {
        modeler.saveXML({ format: false }).then(({ xml }: { xml: string }) => {
          const nameMatch = xml.match(/<bpmn:process[^>]*name="([^"]*)"[^>]*>/);
          if (nameMatch && nameMatch[1]) {
            setDiagramName(nameMatch[1]);
          }
        }).catch(() => {
          // Se não conseguir obter, manter nome padrão
        });
      } catch (error) {
        // Se não conseguir obter, manter nome padrão
      }
    }
  }, [modeler]);

  const handleDiagramNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setDiagramName(newName);
    
    // Notificar componente pai sobre mudança de nome
    if (onDiagramNameChange) {
      onDiagramNameChange(newName);
    }
    
    // Atualizar o nome no XML do diagrama
    if (modeler) {
      try {
        const elementRegistry = modeler.get('elementRegistry');
        const rootElement = modeler.get('canvas').getRootElement();
        const modeling = modeler.get('modeling');
        
        if (rootElement && rootElement.businessObject) {
          modeling.updateProperties(rootElement, { name: newName });
        }
      } catch (error) {
        console.warn('Não foi possível atualizar nome no modelo Flow:', error);
      }
    }
  };

  const handleElementNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setElementName(newName);
    
    // Atualizar nome do elemento selecionado
    if (element && modeler) {
      try {
        const modeling = modeler.get('modeling');
        modeling.updateProperties(element, { name: newName });
      } catch (error) {
        console.warn('Não foi possível atualizar nome do elemento:', error);
      }
    }
  };

  const hasSelection = element || elements.length > 0;
  const hasMultipleSelection = elements.length > 1;

  return (
    <div className="flow-properties-container">
      <div className="flow-properties-header">
        <h3 className="flow-properties-title">
          Propriedades
        </h3>
      </div>

      {/* Propriedades do Diagrama */}
      <div className="flow-section">
        <h4 className="flow-section-title">
          Diagrama
        </h4>
        
        <div className="flow-field">
          <label className="flow-field-label">
            Nome:
          </label>
          <input 
            type="text" 
            value={diagramName} 
            onChange={handleDiagramNameChange}
            placeholder="Nome do fluxograma..."
            className="flow-input"
          />
        </div>

        <div className="flow-field">
          <label className="flow-field-label">
            Tipo:
          </label>
          <input 
            type="text" 
            value="Fluxograma" 
            disabled 
            className="flow-input flow-input-disabled"
          />
        </div>
      </div>

      {/* Propriedades do Elemento Selecionado */}
      {hasSelection && (
        <div className="flow-section">
          <h4 className="flow-section-title">
            {hasMultipleSelection ? `Seleção (${elements.length} elementos)` : 'Elemento'}
          </h4>
          
          {!hasMultipleSelection ? (
            <>
              <div className="flow-field">
                <label className="flow-field-label">
                  Nome:
                </label>
                <input 
                  type="text" 
                  value={elementName} 
                  onChange={handleElementNameChange}
                  placeholder="Nome do elemento..."
                  className="flow-input"
                />
              </div>

              <div className="flow-field">
                <label className="flow-field-label">
                  Tipo:
                </label>
                <input 
                  type="text" 
                  value={elementType} 
                  disabled 
                  className="flow-input flow-input-disabled"
                />
              </div>

              <div className="flow-field">
                <label className="flow-field-label">
                  ID:
                </label>
                <input 
                  type="text" 
                  value={element?.id || ''} 
                  disabled 
                  className="flow-input flow-input-disabled flow-input-small"
                />
              </div>
            </>
          ) : (
            <div className="flow-field">
              <p className="flow-multi-selection-info">
                Múltiplos elementos selecionados. Clique em um elemento para ver suas propriedades.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Informações de Exportação */}
      <div className="flow-section">
        <h4 className="flow-section-title">
          Exportação
        </h4>
        <p className="flow-export-info">
          Arquivos exportados usarão o nome: <br />
          <strong>"{diagramName || 'Fluxograma'}"</strong>
        </p>
      </div>
    </div>
  );
};

export default FlowPropertiesPanel;