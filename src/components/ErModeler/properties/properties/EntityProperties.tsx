import React from 'react';

interface EntityPropertiesProps {
  properties: any;
  updateProperty: (key: string, value: any) => void;
}

export const EntityProperties: React.FC<EntityPropertiesProps> = ({ properties, updateProperty }) => {
  
  const handleWeakEntityToggle = (isWeak: boolean) => {
    // Atualizar propriedade isWeak
    updateProperty('isWeak', isWeak);
    
    // Se o nome ainda é o padrão, atualizá-lo também
    if (!properties.name || properties.name === 'Entidade' || properties.name === 'Entidade Fraca') {
      const newName = isWeak ? 'Entidade Fraca' : 'Entidade';
      updateProperty('name', newName);
    }
  };
  
  return (
    <div className="property-group">
      <h4>Propriedades da Entidade</h4>
      
      <div className="property-field">
        <label>
          <input 
            type="checkbox" 
            checked={properties.isWeak || false} 
            onChange={(e) => handleWeakEntityToggle(e.target.checked)}
          />
          Entidade Fraca
        </label>
      </div>

      <div className="property-field">
        <label>Descrição:</label>
        <textarea 
          value={properties.description || ''} 
          onChange={(e) => updateProperty('description', e.target.value)}
          placeholder="Descrição da entidade..."
          rows={3}
        />
      </div>
    </div>
  );
};

export default EntityProperties;