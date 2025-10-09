/**
 * Componente para exibir e editar as propriedades de um atributo em um diagrama ER.
 * Inclui campos para tipo de dados, tamanho, chave primária, obrigatório,
 * multivalorado, derivado, composto, valor padrão e descrição.
 * Também permite adicionar sub-atributos se o atributo for composto.
 */
import React from "react";
import "../../styles/AttributeProperties.scss";

interface AttributePropertiesProps {
  properties: any;
  updateProperty: (key: string, value: any) => void;
  element: any;
  modeler: any;
  addSubAttribute: () => void;
}

export const AttributeProperties: React.FC<AttributePropertiesProps> = ({
  properties,
  updateProperty,
  element,
  modeler,
  addSubAttribute,
}) => {

  return (
    <div className="property-group">
      <h4>Propriedades do Atributo</h4>

      <div className="property-field">
        <label>Tipo de Dados:</label>
        <select
          value={properties.dataType || "VARCHAR"}
          onChange={(e) => updateProperty("dataType", e.target.value)}
        >
          <option value="BIGINT">BIGINT</option>
          <option value="VARCHAR">VARCHAR</option>
          <option value="INTEGER">INTEGER</option>
          <option value="DECIMAL">DECIMAL</option>
          <option value="DATE">DATE</option>
          <option value="DATETIME">DATETIME</option>
          <option value="BOOLEAN">BOOLEAN</option>
        </select>
      </div>

      <div className="property-field">
        <label>Tamanho:</label>
        <input
          type="text"
          value={properties.size || ""}
          onChange={(e) => updateProperty("size", e.target.value)}
          placeholder="ex: 50, 10,2"
        />
      </div>

      <div className="property-checkboxes">
        <div className="property-field">
          <label>
            <input
              type="checkbox"
              checked={properties.isPrimaryKey || false}
              onChange={(e) => {
                const isChecked = e.target.checked;
                updateProperty("isPrimaryKey", isChecked);
                // Se marcar chave primária, desmarcar propriedades incompatíveis e forçar obrigatório
                if (isChecked) {
                  if (properties.isMultivalued) {
                    updateProperty("isMultivalued", false);
                  }
                  if (properties.isDerived) {
                    updateProperty("isDerived", false);
                  }
                  if (properties.isComposite) {
                    updateProperty("isComposite", false);
                  }
                  // Campo required sempre deve ser obrigatório
                  updateProperty("isRequired", true);
                }
              }}
            />
            Chave Primária
          </label>
        </div>        

        <div className="property-field">
          <label>
            <input
              type="checkbox"
              checked={
                properties.isRequired !== false || properties.isPrimaryKey
              }
              disabled={properties.isPrimaryKey || false}
              onChange={(e) => updateProperty("isRequired", e.target.checked)}
            />
            Obrigatório (NOT NULL)
          </label>
          {properties.isPrimaryKey && (
            <div className="property-validation-success">
              Obrigatório por ser chave primária
            </div>
          )}
        </div>

        <div className="property-field">
          <label>
            <input
              type="checkbox"
              checked={properties.isMultivalued || false}
              disabled={properties.isPrimaryKey || false}
              onChange={(e) => {
                const isChecked = e.target.checked;
                updateProperty("isMultivalued", isChecked);
                // Se marcar multivalorado, desmarcar chave primária
                if (isChecked && properties.isPrimaryKey) {
                  updateProperty("isPrimaryKey", false);
                }
              }}
            />
            Multivalorado
          </label>
          {properties.isPrimaryKey && (
            <div className="property-validation-error">
              Incompatível com chave primária
            </div>
          )}
        </div>

        <div className="property-field">
          <label>
            <input
              type="checkbox"
              checked={properties.isDerived || false}
              disabled={properties.isPrimaryKey || false}
              onChange={(e) => {
                const isChecked = e.target.checked;
                updateProperty("isDerived", isChecked);
                // Se marcar derivado, desmarcar chave primária
                if (isChecked && properties.isPrimaryKey) {
                  updateProperty("isPrimaryKey", false);
                }
              }}
            />
            Derivado
          </label>
          {properties.isPrimaryKey && (
            <div className="property-validation-error">
              Incompatível com chave primária
            </div>
          )}
        </div>

        <div className="property-field">
          <label>
            <input
              type="checkbox"
              checked={properties.isComposite || false}
              onChange={(e) => {
                const isChecked = e.target.checked;          

                updateProperty("isComposite", isChecked);
                // Se marcar composto, desmarcar chave primária
                if (isChecked && properties.isPrimaryKey) {
                  updateProperty("isPrimaryKey", false);
                }
              }}
              disabled={
                // DESABILITAR checkbox se estiver dentro de container composto OU se for chave primária
                (element?.parent?.type === "bpmn:IntermediateCatchEvent" &&
                  element?.parent?.businessObject?.erType ===
                    "CompositeAttribute" &&
                  properties.isComposite) ||
                properties.isPrimaryKey
              }
            />
            Composto
          </label>

          {/* Indicador de incompatibilidade com chave primária */}
          {properties.isPrimaryKey && (
            <div className="property-validation-error">
              Incompatível com chave primária
            </div>
          )}
        </div>
      </div>

      {/* Botão para adicionar sub-atributos */}
      {(properties.isComposite ||
        properties.erType === "CompositeAttribute") && (
        <div className="property-field">
          <button
            type="button"
            onClick={() => {
              addSubAttribute();
            }}
            className="add-subattribute-button"
          >
            Adicionar Sub-atributo
          </button>
        </div>
      )}

      <div className="property-field">
        <label>Valor Padrão:</label>
        <input
          type="text"
          value={properties.defaultValue || ""}
          onChange={(e) => updateProperty("defaultValue", e.target.value)}
          placeholder="Valor padrão..."
        />
      </div>

      <div className="property-field">
        <label>Descrição:</label>
        <textarea
          value={properties.description || ""}
          onChange={(e) => updateProperty("description", e.target.value)}
          placeholder="Descrição do atributo..."
          rows={2}
        />
      </div>
    </div>
  );
};

export default AttributeProperties;