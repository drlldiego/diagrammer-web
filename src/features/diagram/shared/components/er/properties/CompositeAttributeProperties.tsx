import React from 'react';

interface CompositeAttributePropertiesProps {
  properties: any;
  updateProperty: Function;
  element: any;
  modeler: any;
}

export const CompositeAttributeProperties: React.FC<CompositeAttributePropertiesProps> = ({ properties, updateProperty, element, modeler }) => {
  
  // Proteção inicial - se não há elemento ou modeler, não renderizar
  if (!element || !modeler) {
    return <div>Aguardando seleção...</div>;
  }
  
  // REMOVIDO - Funcionalidade de desagrupamento desabilitada
  // const ungroupContainer = () => { ... };

  const childElementsCount = modeler && element && element.id ? 
    modeler.get('elementRegistry').getAll().filter((el: any) => 
      el && el.parent && el.parent.id && el.parent.id === element.id && el.type !== 'bpmn:SequenceFlow' && el.type !== 'label'
    ).length : 0;

  return (
    <div className="property-group">
      <h4>Propriedades do Container Composto</h4>
      
      <div className="property-field">
        <label className="composite-grouped-elements-label">
          Elementos no container:
        </label>
        <div className="composite-grouped-elements-display">
          {childElementsCount} elementos
        </div>
      </div>

      <div className="property-field">
        <label>Descrição:</label>
        <textarea 
          value={properties.description || ''} 
          onChange={(e) => updateProperty('description', e.target.value)}
          placeholder="Descrição do container..."
          rows={2}
        />
      </div>

      {/* REMOVIDO - Seção de desagrupamento desabilitada */}
      {/* <div className="property-field composite-ungroup-section">
        <button 
          type="button"
          onClick={ungroupContainer}
          className="composite-ungroup-button"
        >
          🔓 Desfazer Agrupamento ({childElementsCount} elementos)
        </button>
        
        <div className="composite-ungroup-warning">
          Atenção: Esta ação remove o container e move os elementos para fora, preservando suas posições relativas.
        </div>
      </div> */}
    </div>
  );
};