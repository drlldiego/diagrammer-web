import React from "react";
import "./AttributeProperties.css";

interface AttributePropertiesProps {
  properties: any;
  updateProperty: (key: string, value: any) => void;
  element: any;
  modeler: any;
  addSubAttribute: () => void;
}

/**
 * Verificar se um elemento é um sub-atributo
 * Sub-atributos são identificados por:
 * 1. Propriedade isSubAttribute no businessObject
 * 2. Conexões pai-filho com atributos compostos
 */
const isSubAttribute = (element: any, modeler: any): boolean => {
  if (!element || !modeler) {
    return false;
  }

  try {
    // Verificar primeiro se tem a propriedade isSubAttribute diretamente
    if (element.businessObject?.isSubAttribute === true) {
      return true;
    }

    // Fallback: verificar por conexões pai-filho (método antigo)
    const elementRegistry = modeler.get("elementRegistry");
    const allElements = elementRegistry.getAll();

    // Procurar por conexões que terminam neste elemento
    const incomingConnections = allElements.filter((conn: any) => {
      return (
        conn.type === "bpmn:SequenceFlow" &&
        conn.target?.id === element.id &&
        conn.businessObject?.isParentChild === true
      );
    });

    if (incomingConnections.length > 0) {
      return true;
    }

    return false;
  } catch (error) {
    return false;
  }
};

export const AttributeProperties: React.FC<AttributePropertiesProps> = ({
  properties,
  updateProperty,
  element,
  modeler,
  addSubAttribute,
}) => {
  const isSubAttr = isSubAttribute(element, modeler);

  // Verificar se elemento está dentro de container composto
  const isInsideCompositeContainer =
    element?.parent?.type === "bpmn:SubProcess" &&
    element?.parent?.businessObject?.erType === "CompositeAttribute";

  // Se é sub-atributo OU está dentro de container composto, só mostrar campo de nome
  if (isSubAttr || isInsideCompositeContainer) {
    return (
      <div className="property-group">
        <h4>
          {isInsideCompositeContainer
            ? "Atributo em Container"
            : "Propriedades do Sub-atributo"}
        </h4>
        <p className="attribute-properties-description">
          {isInsideCompositeContainer
            ? "Atributos dentro de containers compostos só permitem edição do nome."
            : "Sub-atributos só permitem edição do nome."}
        </p>
        {/* Apenas o campo nome está disponível para sub-atributos */}
      </div>
    );
  }

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

                // NOVA VALIDAÇÃO: Verificar se elemento está dentro de container composto
                const isInsideCompositeContainer =
                  element?.parent?.type === "bpmn:SubProcess" &&
                  element?.parent?.businessObject?.erType ===
                    "CompositeAttribute";

                if (isInsideCompositeContainer && !isChecked) {
                  alert(
                    'Não é possível desmarcar "Composto" enquanto o atributo estiver dentro de um container composto.\n\nPara tornar o atributo simples, mova-o para fora do container primeiro.'
                  );
                  return; // Impedir a mudança
                }

                updateProperty("isComposite", isChecked);
                // Se marcar composto, desmarcar chave primária
                if (isChecked && properties.isPrimaryKey) {
                  updateProperty("isPrimaryKey", false);
                }
              }}
              disabled={
                // DESABILITAR checkbox se estiver dentro de container composto OU se for chave primária
                (element?.parent?.type === "bpmn:SubProcess" &&
                  element?.parent?.businessObject?.erType ===
                    "CompositeAttribute" &&
                  properties.isComposite) ||
                properties.isPrimaryKey
              }
            />
            Composto
          </label>

          {/* Indicador visual quando está dentro de container */}
          {element?.parent?.type === "bpmn:SubProcess" &&
            element?.parent?.businessObject?.erType ===
              "CompositeAttribute" && (
              <div className="property-container-info">
                Obrigatório enquanto estiver dentro do container composto
              </div>
            )}

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
