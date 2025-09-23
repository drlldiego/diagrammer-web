import React, { useMemo } from "react";

interface ConnectionPropertiesProps {
  properties: any;
  updateProperty: Function;
  notation?: "chen" | "crowsfoot";
  isDeclarativeMode?: boolean;
  erRules?: any; // Instância do ErRules para acessar as regras de notação
}

//É PRECISO VERIFICAR AQUI SE A CONEXÃO É ENTRE DUAS ENTIDADES,
// SE FOR: A DIV QUE ENVOLVE AS CARDINALIDADES DEVE MOSTRAR A CARDINALIDADE SOURCE E A CARDINALIDADE TARGET.

export const ConnectionProperties: React.FC<ConnectionPropertiesProps> = ({
  properties,
  updateProperty,
  notation = "chen",
  isDeclarativeMode = false,
  erRules,
}) => {
  // Obter informações da notação atual usando as novas regras
  const notationInfo = useMemo(() => {
    if (erRules && typeof erRules.getNotationInfo === "function") {
      return erRules.getNotationInfo();
    }
    return {
      notation: "chen",
      canEntityConnectDirectly: false,
      hasRelationshipElements: true,
      canAttributeConnectToRelationship: true,
    };
  }, [erRules]);

  // Verificar se a conexão é entre duas entidades
  const sourceIsEntity = properties.sourceType === "Entity";
  const targetIsEntity = properties.targetType === "Entity";
  const connectsTwoEntities = sourceIsEntity && targetIsEntity;

  // Detectar se a conexão é declarativa
  const isDeclarativeConnection =
    properties.isDeclarative || properties.mermaidCardinality;

  // Determinar se campos devem ser bloqueados
  const fieldsDisabled = isDeclarativeMode && isDeclarativeConnection;

  // Obter opções de cardinalidade usando as novas regras
  const cardinalityOptions = useMemo(() => {
    if (erRules && typeof erRules.getCardinalityOptions === "function") {
      try {
        return erRules.getCardinalityOptions(
          { businessObject: { erType: properties.sourceType } },
          { businessObject: { erType: properties.targetType } }
        );
      } catch (error) {
        console.warn("Erro ao obter opções de cardinalidade:", error);
      }
    }
    // Fallback para opções padrão
    return ["1", "N", "0..1", "0..N", "1..N"];
  }, [erRules, properties.sourceType, properties.targetType]);

  return (
    <div className="property-group">
      <h4>Propriedades da Conexão</h4>

      {/* Mostrar informações da notação atual */}
      <div className="property-field">
        <label>Notação:</label>
        <input
          type="text"
          value={notation === "chen" ? "Chen" : "Crow's Foot"}
          disabled
          className="readonly"
          title={`${
            notation === "crowsfoot"
              ? "Entidades podem se conectar diretamente"
              : "Entidades precisam de relacionamentos"
          }`}
        />
      </div>

      <div className="property-field">
        <label>De:</label>
        <input
          type="text"
          value={properties.source || ""}
          disabled
          className="readonly"
        />
      </div>

      <div className="property-field">
        <label>Para:</label>
        <input
          type="text"
          value={properties.target || ""}
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
              value={properties.cardinalitySource || "1"}
              onChange={(e) =>
                updateProperty("cardinalitySource", e.target.value)
              }
              disabled={fieldsDisabled}
              className={fieldsDisabled ? "readonly" : ""}
              title={
                fieldsDisabled
                  ? "Controlado pelo modo declarativo"
                  : "Cardinalidade da origem"
              }
            >
              {cardinalityOptions.map((option: string) => (
                <option key={option} value={option}>
                  {option}{" "}
                  {option === "1"
                    ? "(Um)"
                    : option === "N"
                    ? "(Muitos)"
                    : option === "0..1"
                    ? "(Zero ou Um)"
                    : option === "0..N"
                    ? "(Zero ou Muitos)"
                    : option === "1..N"
                    ? "(Um ou Muitos)"
                    : ""}
                </option>
              ))}
            </select>
            {fieldsDisabled && (
              <small className="field-note">
                Controlado por modo declarativo
              </small>
            )}
          </div>

          <div className="property-field">
            <label>Cardinalidade (Destino):</label>
            <select
              value={properties.cardinalityTarget || "N"}
              onChange={(e) =>
                updateProperty("cardinalityTarget", e.target.value)
              }
              disabled={fieldsDisabled}
              className={fieldsDisabled ? "readonly" : ""}
              title={
                fieldsDisabled
                  ? "Controlado pelo modo declarativo"
                  : "Cardinalidade do destino"
              }
            >
              {cardinalityOptions.map((option: string) => (
                <option key={option} value={option}>
                  {option}{" "}
                  {option === "1"
                    ? "(Um)"
                    : option === "N"
                    ? "(Muitos)"
                    : option === "0..1"
                    ? "(Zero ou Um)"
                    : option === "0..N"
                    ? "(Zero ou Muitos)"
                    : option === "1..N"
                    ? "(Um ou Muitos)"
                    : ""}
                </option>
              ))}
            </select>
            {fieldsDisabled && (
              <small className="field-note">
                Controlado por modo declarativo
              </small>
            )}
          </div>
        </div>
      ) : (
        // Para conexões com relacionamentos, mostrar apenas uma cardinalidade
        <div className="property-field">
          <label>Cardinalidade:</label>
          <select
            value={properties.cardinalitySource || "1"}
            onChange={(e) =>
              updateProperty("cardinalitySource", e.target.value)
            }
            disabled={fieldsDisabled}
            className={fieldsDisabled ? "readonly" : ""}
            title={
              fieldsDisabled
                ? "Controlado pelo modo declarativo"
                : "Cardinalidade da conexão"
            }
          >
            {cardinalityOptions.map((option: string) => (
              <option key={option} value={option}>
                {option}{" "}
                {option === "1"
                  ? "(Um)"
                  : option === "N"
                  ? "(Muitos)"
                  : option === "0..1"
                  ? "(Zero ou Um)"
                  : option === "0..N"
                  ? "(Zero ou Muitos)"
                  : option === "1..N"
                  ? "(Um ou Muitos)"
                  : ""}
              </option>
            ))}
          </select>
          {fieldsDisabled && (
            <small className="field-note">
              Controlado por modo declarativo
            </small>
          )}
        </div>
      )}
    </div>
  );
};
