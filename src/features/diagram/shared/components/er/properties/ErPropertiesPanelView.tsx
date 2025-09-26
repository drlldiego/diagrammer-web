/**
 * View component for ER Properties Panel
 * Handles single element property display and editing
 */
import React from 'react';
import { ErElement, isErConnection } from '../../../../er/core';
import { useSubAttributeCreation } from '../../../hooks';

interface UseErCompositeReturn {
  updateProperty: (propertyName: string, value: any) => Promise<void>;  
  properties: any;
  isLoading: boolean;
}
import { EntityProperties, RelationshipProperties, AttributeProperties, CompositeAttributeProperties } from './index';
import { ConnectionPropertiesContainer } from './ConnectionPropertiesContainer';

interface ErPropertiesPanelViewProps {
  element: ErElement;
  elementControl: UseErCompositeReturn;
  notation: 'chen' | 'crowsfoot';
  isDeclarativeMode: boolean;
  modeler: any;
}

export const ErPropertiesPanelView: React.FC<ErPropertiesPanelViewProps> = ({
  element,
  elementControl,
  notation,
  isDeclarativeMode,
  modeler
}) => {
  const { properties, updateProperty, isLoading } = elementControl;
  
  // Use the sub-attribute creation hook
  const { createSubAttribute, isCreating } = useSubAttributeCreation(modeler);

  if (isLoading) {
    return (
      <div className="er-properties-panel">
        <div className="er-properties-header">
          <h3>Carregando...</h3>
        </div>
      </div>
    );
  }

  const getElementTypeLabel = (erType: string): string => {
    switch (erType) {
      case 'Entity': return 'Entidade';
      case 'Relationship': return 'Relacionamento';
      case 'Attribute': return 'Atributo';
      case 'CompositeAttribute': return 'Container Composto';
      default: return erType || 'Elemento';
    }
  };

  const isConnection = isErConnection(element);
  const elementType = isConnection ? 'Conexão' : getElementTypeLabel(properties?.erType || '');

  const isDeclarativeControlled = isDeclarativeMode && 
    (properties?.isDeclarative || properties?.mermaidCardinality);

  return (
    <div className="er-properties-panel">
      <div className="er-properties-header">
        <h3>Propriedades - {elementType}</h3>
        {isDeclarativeControlled && (
          <div className="declarative-indicator">
            Modo Declarativo
          </div>
        )}
      </div>

      <div className="er-properties-content">
        {/* General Properties */}
        <div className="property-group">
          <h4>Geral</h4>
          
          <div className="property-field">
            <label>ID:</label>
            <input 
              type="text" 
              value={properties?.id || ''} 
              disabled 
              className="readonly"
            />
          </div>

          <div className="property-field">
            <label>Nome:</label>
            <input 
              type="text" 
              value={properties?.name || ''} 
              onChange={(e) => updateProperty('name', e.target.value)}
              placeholder="Digite o nome..."
              disabled={isDeclarativeControlled}
              className={isDeclarativeControlled ? 'readonly' : ''}
              title={isDeclarativeControlled ? 'Este campo é controlado pelo modo declarativo' : 'Nome do elemento'}
            />
            {isDeclarativeControlled && (
              <small className="field-note">
                Controlado por: {properties?.mermaidCardinality || 'modo declarativo'}
              </small>
            )}
          </div>
        </div>

        {/* Type-specific Properties */}
        {renderTypeSpecificProperties()}
      </div>
    </div>
  );

  function renderTypeSpecificProperties() {
    if (isConnection) {
      return (
        <ConnectionPropertiesContainer
          element={element}
          modeler={modeler}
          updateProperty={updateProperty}
        />
      );
    }

    switch (properties?.erType) {
      case 'Entity':
        return (
          <EntityProperties 
            properties={properties} 
            updateProperty={updateProperty} 
          />
        );

      case 'Relationship':
        if (notation === 'chen') {
          return (
            <RelationshipProperties 
              properties={properties} 
              updateProperty={updateProperty} 
            />
          );
        }
        break;

      case 'Attribute':
        return (
          <AttributeProperties 
            properties={properties} 
            updateProperty={updateProperty} 
            element={element}
            modeler={modeler}
            addSubAttribute={async () => {
              await createSubAttribute(element, properties);
            }}
          />
        );

      case 'CompositeAttribute':
        return (
          <CompositeAttributeProperties 
            properties={properties} 
            updateProperty={updateProperty} 
            element={element}
            modeler={modeler}
          />
        );
    }

    return null;
  }
};