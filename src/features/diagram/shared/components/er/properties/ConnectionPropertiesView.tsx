/**
 * Pure view component for Connection Properties
 * Focuses only on UI rendering without business logic
 */
import React from 'react';
import { ConnectionData } from '../../../hooks/er/useConnectionData';

interface ConnectionPropertiesViewProps {
  connectionData: ConnectionData;
  notation: 'chen' | 'crowsfoot';
  notationInfo?: {
    notation: string;
    allowDirectEntityConnections: boolean;
    hasRelationshipElements: boolean;
    canAttributeConnectToRelationship: boolean;
  };
  cardinalityOptions: string[];
  fieldsDisabled: boolean;
  isDeclarativeMode: boolean;
  updateProperty: (property: string, value: any) => void;
}

export const ConnectionPropertiesView: React.FC<ConnectionPropertiesViewProps> = ({
  connectionData,
  notation,
  notationInfo,
  cardinalityOptions,
  fieldsDisabled,
  isDeclarativeMode,
  updateProperty
}) => {
  // Helper function to format cardinality display text
  const formatCardinalityText = (option: string): string => {
    const cardinalityLabels: Record<string, string> = {
      '1': '(Um)',
      'N': '(Muitos)',      
      '0..1': '(Zero ou Um)',
      '0..N': '(Zero ou Muitos)',
      '1..N': '(Um ou Muitos)'
    };
    
    return `${option} ${cardinalityLabels[option] || ''}`;
  };

  // Helper function to render cardinality select
  const renderCardinalitySelect = (
    label: string,
    value: string | null,
    property: string,
    defaultValue: string
  ) => (
    <div className="property-field">
      <label>{label}:</label>
      <select 
        value={value || defaultValue}
        onChange={(e) => updateProperty(property, e.target.value)}
        disabled={fieldsDisabled}
        className={fieldsDisabled ? 'readonly' : ''}
        title={fieldsDisabled ? 'Controlado pelo modo declarativo' : `${label} da conexão`}
      >
        {cardinalityOptions.map((option: string) => (
          <option key={option} value={option}>
            {formatCardinalityText(option)}
          </option>
        ))}
      </select>
      {fieldsDisabled && (
        <small className="field-note">Controlado por modo declarativo</small>
      )}
    </div>
  );

  return (
    <div className="property-group">
      <h4>Propriedades da Conexão</h4>

      {/* Notation Information */}
      <div className="property-field">
        <label>Notação:</label>
        <input 
          type="text" 
          value={notation === 'chen' ? 'Chen' : "Crow's Foot"} 
          disabled
          className="readonly"
          title={notationInfo?.allowDirectEntityConnections 
            ? 'Entidades podem se conectar diretamente' 
            : 'Entidades precisam de relacionamentos'
          }
        />
      </div>

      {/* Connection Type Information */}
      <div className="property-field">
        <label>Tipo de Conexão:</label>
        <input 
          type="text" 
          value={connectionData.connectionType.replace('-', ' → ').toUpperCase()} 
          disabled
          className="readonly"
          title={`Conexão entre ${connectionData.sourceType} e ${connectionData.targetType}`}
        />
      </div>
      
      {/* Source and Target Information */}
      <div className="property-field">
        <label>De:</label>
        <input 
          type="text" 
          value={`${connectionData.sourceName} (${connectionData.sourceType})`} 
          disabled
          className="readonly"
        />
      </div>

      <div className="property-field">
        <label>Para:</label>
        <input 
          type="text" 
          value={`${connectionData.targetName} (${connectionData.targetType})`} 
          disabled
          className="readonly"
        />
      </div>

      {/* Campo para editar nome/label da conexão (apenas para Crow's Foot e conexões entre entidades) */}
      {connectionData.connectsTwoEntities && notation === "crowsfoot" && (
        <div className="property-field">
          <label>Nome da Relação:</label>
          <input
            type="text"
            value={connectionData.connectionName}
            onChange={(e) => updateProperty("name", e.target.value)}
            placeholder="Digite o nome da relação..."
            disabled={fieldsDisabled}
            className={fieldsDisabled ? "readonly" : ""}
            title={
              fieldsDisabled
                ? "Controlado pelo modo declarativo"
                : "Nome que aparece como label da conexão"
            }
          />
          {fieldsDisabled && (
            <small className="field-note">
              Controlado por modo declarativo
            </small>
          )}
          {!fieldsDisabled && (
            <small className="field-note">
              Ex: "possui", "pertence a", "gerencia", etc.
            </small>
          )}
        </div>
      )}

      {/* Cardinality Configuration */}
      {connectionData.connectsTwoEntities ? (
        <div className="property-row">          
          
          {renderCardinalitySelect(
            'Cardinalidade (Origem)',
            connectionData.cardinalitySource,
            'cardinalitySource',
            '1'
          )}
          
          {renderCardinalitySelect(
            'Cardinalidade (Destino)',
            connectionData.cardinalityTarget,
            'cardinalityTarget',
            'N'
          )}
        </div>
      ) : (
        <div className="property-row">                    
          {renderCardinalitySelect(
            'Cardinalidade',
            connectionData.cardinalitySource,
            'cardinalitySource',
            '1'
          )}
        </div>
      )}

      {/* Declarative Mode Information */}
      {isDeclarativeMode && (
        <div className="property-field">
          <label>Modo Declarativo:</label>
          <div className="declarative-status">
            <span className={connectionData.isDeclarative ? 'status-declarative' : 'status-imperative'}>
              {connectionData.isDeclarative ? 'Controlado por código' : 'Editável manualmente'}
            </span>
            {connectionData.isDeclarative && (
              <small className="field-note">
                Esta conexão foi criada pelo modo declarativo e suas propriedades são controladas pelo código.
              </small>
            )}
          </div>
        </div>
      )}
    </div>
  );
};