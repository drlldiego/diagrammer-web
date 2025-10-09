/**
 * Componente para exibir e editar as propriedades do diagrama ER.
 * Permite alterar o nome do diagrama, a notação (Chen ou Crow's Foot)
 * e o modo (Declarativo ou Imperativo).
 */
import React, { useState, useEffect } from 'react';
import { DiagramMode, DiagramNotation } from '../../../../er/core';

interface DiagramPropertiesViewProps {
  modeler: any;
  notation: DiagramNotation;
  mode: DiagramMode;
  isDeclarativeMode: boolean;
  diagramName?: string;
  onDiagramNameChange?: (name: string) => void;
  onNotationChange: (notation: DiagramNotation) => void;
  onModeChange: (enabled: boolean) => void;
}

export const DiagramPropertiesView: React.FC<DiagramPropertiesViewProps> = ({
  modeler,
  notation,
  mode,
  isDeclarativeMode,
  diagramName: externalDiagramName,
  onDiagramNameChange,
  onNotationChange,
  onModeChange
}) => {
  const [diagramName, setDiagramName] = useState<string>('Diagrama ER');

  // Carrega o nome do diagrama do modeler ao montar o componente
  useEffect(() => {
    if (modeler) {
      try {
        const definitions = modeler.getDefinitions();
        const rootElement = definitions?.rootElements?.[0];
        
        if (rootElement?.name) {
          setDiagramName(rootElement.name);
        }
      } catch (error) {
        console.warn('Failed to get diagram name:', error);
      }
    }
  }, [modeler]);

  // Atualiza o nome do diagrama se a prop externa mudar
  useEffect(() => {
    if (externalDiagramName && externalDiagramName !== diagramName) {
      setDiagramName(externalDiagramName);
      
      // Também atualiza no modeler
      if (modeler) {
        try {
          const canvas = modeler.get('canvas');
          const rootElement = canvas.getRootElement();
          const modeling = modeler.get('modeling');
          
          if (rootElement && rootElement.businessObject) {
            modeling.updateProperties(rootElement, { name: externalDiagramName });
          }
        } catch (error) {
          console.warn('Failed to update external diagram name in modeler:', error);
        }
      }
    }
  }, [externalDiagramName, diagramName, modeler]);

  const handleDiagramNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setDiagramName(newName);
    onDiagramNameChange?.(newName);
    
    // Atualiza o nome no modeler
    if (modeler) {
      try {
        const canvas = modeler.get('canvas');
        const rootElement = canvas.getRootElement();
        const modeling = modeler.get('modeling');
        
        if (rootElement && rootElement.businessObject) {
          modeling.updateProperties(rootElement, { name: newName });
        }
      } catch (error) {
        console.warn('Failed to update diagram name in modeler:', error);
      }
    }
  };

  const handleModeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onModeChange(e.target.checked);
  };

  return (
    <div className="er-properties-panel">
      <div className="er-properties-header">
        <h3>Propriedades do Diagrama</h3>
      </div>

      <div className="er-properties-content">
        <div className="property-group diagram-properties-group">
          <h4>Informações Gerais</h4>
          
          <div className="property-field">
            <label>Nome do Diagrama:</label>
            <input 
              type="text" 
              value={diagramName} 
              onChange={handleDiagramNameChange}
              placeholder="Digite o nome do diagrama..."
              className="diagram-name-input"
            />
          </div>          

          <div className="property-field">
            <label>Modo Atual:</label>
            <input 
              type="text" 
              value={mode === 'declarative' ? 'Declarativo' : 'Imperativo'}
              disabled 
              className="readonly"
            />
          </div>

          {/* Checkbox para modo declarativo (apenas Crow's Foot) */}
          {notation === 'crowsfoot' && (
            <div className="property-field checkbox-field">
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={isDeclarativeMode}
                  onChange={handleModeChange}
                  className="checkbox-input"
                />
                <span className="checkbox-text">Modo Interface Declarativa</span>
              </label>           
            </div>
          )}

          {notation === 'chen' && (
            <div className="property-field info-field">
              <small className="field-note">
                Notação Chen: Relacionamentos são elementos explícitos no diagrama
              </small>
            </div>
          )}

          {notation === 'crowsfoot' && (
            <div className="property-field info-field">
              <small className="field-note">
                Notação Crow's Foot: Entidades conectam diretamente, sem relacionamentos explícitos
              </small>
            </div>
          )}
        </div>        
      </div>
    </div>
  );
};