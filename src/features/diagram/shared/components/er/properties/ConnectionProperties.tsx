import React from 'react';

interface ConnectionPropertiesProps {
  properties: any;
  updateProperty: Function;
}

//É PRECISO VERIFICAR AQUI SE A CONEXÃO É ENTRE DUAS ENTIDADES, 
// SE FOR: A DIV QUE ENVOLVE AS CARDINALIDADES DEVE MOSTRAR A CARDINALIDADE SOURCE E A CARDINALIDADE TARGET.

export const ConnectionProperties: React.FC<ConnectionPropertiesProps> = ({ properties, updateProperty }) => {
  
  // Verificar se a conexão é entre duas entidades
  const sourceIsEntity = properties.sourceType === 'Entity';
  const targetIsEntity = properties.targetType === 'Entity';
  const connectsTwoEntities = sourceIsEntity && targetIsEntity;

  return (
    <div className="property-group">
      <h4>Propriedades da Conexão</h4>
      
      <div className="property-field">
        <label>De:</label>
        <input 
          type="text" 
          value={properties.source || ''} 
          disabled
          className="readonly"
        />
      </div>

      <div className="property-field">
        <label>Para:</label>
        <input 
          type="text" 
          value={properties.target || ''} 
          disabled
          className="readonly"
        />
      </div>

      {/* Mostrar cardinalidades apenas se conecta duas entidades */}
      {connectsTwoEntities ? (
        <div className="property-row">
          <div className="property-field">
            <label>Cardinalidade (Origem):</label>
            <select 
              value={properties.cardinalitySource || '1'} 
              onChange={(e) => updateProperty('cardinalitySource', e.target.value)}
            >
              <option value="1">1 (Um)</option>
              <option value="N">N (Muitos)</option>
              <option value="M">M (Múltiplos)</option>
              <option value="0..1">0..1 (Zero ou Um)</option>
              <option value="0..N">0..N (Zero ou Muitos)</option>
              <option value="1..N">1..N (Um ou Muitos)</option>
            </select>
          </div>
          
          <div className="property-field">
            <label>Cardinalidade (Destino):</label>
            <select 
              value={properties.cardinalityTarget || 'N'} 
              onChange={(e) => updateProperty('cardinalityTarget', e.target.value)}
            >
              <option value="1">1 (Um)</option>
              <option value="N">N (Muitos)</option>
              <option value="M">M (Múltiplos)</option>
              <option value="0..1">0..1 (Zero ou Um)</option>
              <option value="0..N">0..N (Zero ou Muitos)</option>
              <option value="1..N">1..N (Um ou Muitos)</option>
            </select>
          </div>
        </div>
      ) : (
        // Para conexões com relacionamentos, mostrar apenas uma cardinalidade
        <div className="property-field">
          <label>Cardinalidade:</label>
          <select 
            value={properties.cardinalitySource || '1'} 
            onChange={(e) => updateProperty('cardinalitySource', e.target.value)}
          >
            <option value="1">1 (Um)</option>
            <option value="N">N (Muitos)</option>
            <option value="M">M (Múltiplos)</option>
            <option value="0..1">0..1 (Zero ou Um)</option>
            <option value="0..N">0..N (Zero ou Muitos)</option>
            <option value="1..N">1..N (Um ou Muitos)</option>
          </select>
        </div>
      )}
    </div>
  );
};