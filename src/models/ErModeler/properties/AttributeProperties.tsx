import React from 'react';

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
      console.log('🔍 Sub-atributo detectado via propriedade isSubAttribute:', element.id);
      return true;
    }
    
    // Fallback: verificar por conexões pai-filho (método antigo)
    const elementRegistry = modeler.get('elementRegistry');
    const allElements = elementRegistry.getAll();
    
    // Procurar por conexões que terminam neste elemento
    const incomingConnections = allElements.filter((conn: any) => {
      return conn.type === 'bpmn:SequenceFlow' &&
             conn.target?.id === element.id &&
             conn.businessObject?.isParentChild === true;
    });
    
    if (incomingConnections.length > 0) {
      console.log('🔍 Sub-atributo detectado via conexão pai-filho:', element.id);
      return true;
    }
    
    return false;
  } catch (error) {
    console.warn('Erro ao detectar sub-atributo:', error);
    return false;
  }
};

export const AttributeProperties: React.FC<AttributePropertiesProps> = ({ properties, updateProperty, element, modeler, addSubAttribute }) => {
  const isSubAttr = isSubAttribute(element, modeler);
  
  // Verificar se elemento está dentro de container composto
  const isInsideCompositeContainer = element?.parent?.type === 'bpmn:SubProcess' && 
                                    element?.parent?.businessObject?.erType === 'CompositeAttribute';
  
  console.log('🔸 AttributeProperties: isSubAttribute =', isSubAttr, 'isInsideCompositeContainer =', isInsideCompositeContainer, 'para elemento:', element?.id);
  
  // Se é sub-atributo OU está dentro de container composto, só mostrar campo de nome
  if (isSubAttr || isInsideCompositeContainer) {
    return (
      <div className="property-group">
        <h4>{isInsideCompositeContainer ? 'Atributo em Container' : 'Propriedades do Sub-atributo'}</h4>
        <p style={{ fontSize: '12px', color: '#666', margin: '0 0 10px 0' }}>
          {isInsideCompositeContainer 
            ? 'Atributos dentro de containers compostos só permitem edição do nome.'
            : 'Sub-atributos só permitem edição do nome.'
          }
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
          value={properties.dataType || 'VARCHAR'} 
          onChange={(e) => updateProperty('dataType', e.target.value)}
        >
          <option value="VARCHAR">VARCHAR</option>
          <option value="INTEGER">INTEGER</option>
          <option value="DECIMAL">DECIMAL</option>
          <option value="DATE">DATE</option>
          <option value="DATETIME">DATETIME</option>
          <option value="BOOLEAN">BOOLEAN</option>
          <option value="TEXT">TEXT</option>
          <option value="BLOB">BLOB</option>
        </select>
      </div>

      <div className="property-field">
        <label>Tamanho:</label>
        <input 
          type="text" 
          value={properties.size || ''} 
          onChange={(e) => updateProperty('size', e.target.value)}
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
                updateProperty('isPrimaryKey', isChecked);
                // Se marcar chave primária, desmarcar chave estrangeira
                if (isChecked && properties.isForeignKey) {
                  updateProperty('isForeignKey', false);
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
              checked={properties.isForeignKey || false} 
              onChange={(e) => {
                const isChecked = e.target.checked;
                updateProperty('isForeignKey', isChecked);
                // Se marcar chave estrangeira, desmarcar chave primária
                if (isChecked && properties.isPrimaryKey) {
                  updateProperty('isPrimaryKey', false);
                }
              }}
            />
            Chave Estrangeira
          </label>
        </div>

        <div className="property-field">
          <label>
            <input 
              type="checkbox" 
              checked={properties.isRequired !== false} 
              onChange={(e) => updateProperty('isRequired', e.target.checked)}
            />
            Obrigatório (NOT NULL)
          </label>
        </div>

        <div className="property-field">
          <label>
            <input 
              type="checkbox" 
              checked={properties.isMultivalued || false} 
              onChange={(e) => updateProperty('isMultivalued', e.target.checked)}
            />
            Multivalorado
          </label>
        </div>

        <div className="property-field">
          <label>
            <input 
              type="checkbox" 
              checked={properties.isDerived || false} 
              onChange={(e) => updateProperty('isDerived', e.target.checked)}
            />
            Derivado
          </label>
        </div>

        <div className="property-field">
          <label>
            <input 
              type="checkbox" 
              checked={properties.isComposite || false} 
              onChange={(e) => {
                const isChecked = e.target.checked;
                
                // NOVA VALIDAÇÃO: Verificar se elemento está dentro de container composto
                const isInsideCompositeContainer = element?.parent?.type === 'bpmn:SubProcess' && 
                                                  element?.parent?.businessObject?.erType === 'CompositeAttribute';
                
                if (isInsideCompositeContainer && !isChecked) {
                  console.warn('🚫 ErPropertiesPanel: Não é possível desmarcar "Composto" - elemento está dentro de container composto');
                  alert('⚠️ Não é possível desmarcar "Composto" enquanto o atributo estiver dentro de um container composto.\n\nPara tornar o atributo simples, mova-o para fora do container primeiro.');
                  return; // Impedir a mudança
                }
                
                updateProperty('isComposite', isChecked);
              }}
              disabled={
                // DESABILITAR checkbox se estiver dentro de container composto e for para desmarcar
                element?.parent?.type === 'bpmn:SubProcess' && 
                element?.parent?.businessObject?.erType === 'CompositeAttribute' &&
                properties.isComposite
              }
            />
            Composto
          </label>
          
          {/* Indicador visual quando está dentro de container */}
          {element?.parent?.type === 'bpmn:SubProcess' && 
           element?.parent?.businessObject?.erType === 'CompositeAttribute' && (
            <div style={{ 
              fontSize: '11px', 
              color: '#666', 
              marginTop: '4px',
              fontStyle: 'italic',
              paddingLeft: '20px'
            }}>
              Obrigatório enquanto estiver dentro do container composto
            </div>
          )}
        </div>
      </div>

      {/* Botão para adicionar sub-atributos */}
      {(properties.isComposite || properties.erType === 'CompositeAttribute') && (
        <div className="property-field">
          <button 
            type="button"
            onClick={() => {
              addSubAttribute();
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#10B981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            Adicionar Sub-atributo
          </button>
        </div>
      )}

      <div className="property-field">
        <label>Valor Padrão:</label>
        <input 
          type="text" 
          value={properties.defaultValue || ''} 
          onChange={(e) => updateProperty('defaultValue', e.target.value)}
          placeholder="Valor padrão..."
        />
      </div>

      <div className="property-field">
        <label>Descrição:</label>
        <textarea 
          value={properties.description || ''} 
          onChange={(e) => updateProperty('description', e.target.value)}
          placeholder="Descrição do atributo..."
          rows={2}
        />
      </div>
    </div>
  );
};

export default AttributeProperties;