/**
 * Componente de propriedades específicas para relacionamentos em diagramas ER.
 * Permite editar propriedades como se é um relacionamento identificador e descrição.
 */
import React from 'react';

interface RelationshipPropertiesProps {
  properties: any;
  updateProperty: (key: string, value: any) => void;
}

export const RelationshipProperties: React.FC<RelationshipPropertiesProps> = ({ properties, updateProperty }) => {
  return (
    <div className="property-group">
      <h4>Propriedades do Relacionamento</h4>
      
      <div className="property-field">
        <label>
          <input 
            type="checkbox" 
            checked={properties.isIdentifying || false} 
            onChange={(e) => {              
              updateProperty('isIdentifying', e.target.checked);
            }}
          />
          Relacionamento Identificador
        </label>
      </div>

      <div className="property-field">
        <label>Descrição:</label>
        <textarea 
          value={properties.description || ''} 
          onChange={(e) => updateProperty('description', e.target.value)}
          placeholder="Descrição do relacionamento..."
          rows={3}
        />
      </div>
    </div>
  );
};

export default RelationshipProperties;