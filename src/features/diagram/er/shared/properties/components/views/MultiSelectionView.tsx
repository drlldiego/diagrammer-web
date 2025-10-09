/**
 * Componente de painel de propriedades para múltiplos elementos selecionados em diagramas ER.
 * Exibe um resumo da seleção e uma lista detalhada dos elementos selecionados.
 * Suporta diferentes notações (Chen, Crowsfoot).
 */
import React from 'react';
import { ErElement } from '../../../../../er/core';

interface MultiSelectionViewProps {
  selectedElements: ErElement[];
  notation: 'chen' | 'crowsfoot';
  modeler: any;
}

export const MultiSelectionView: React.FC<MultiSelectionViewProps> = ({
  selectedElements,
  notation,
  modeler
}) => {
  // Filtro de elementos ER (excluir conexões e rótulos)
  const erElements = selectedElements.filter(el => 
    el.businessObject?.erType && el.type !== 'bpmn:SequenceFlow' && el.type !== 'label'
  );

  const connections = selectedElements.filter(el => 
    el.type === 'bpmn:SequenceFlow'
  );

  // Tipo de elementos por categoria
  const elementsByType = {
    entities: selectedElements.filter(el => 
      el.businessObject?.erType === 'Entity' && el.type !== 'label'
    ),
    relationships: selectedElements.filter(el => 
      el.businessObject?.erType === 'Relationship' && el.type !== 'label'
    ),
    attributes: selectedElements.filter(el => 
      el.businessObject?.erType === 'Attribute' && el.type !== 'label'
    ),
    connections: connections
  };

  return (
    <div className="er-properties-panel">
      <div className="er-properties-header er-properties-header--multiple">
        <h3>
          Seleção Múltipla ({erElements.length + connections.length} elementos)
        </h3>
        <p>
          Shift+Click para modificar seleção
        </p>
      </div>

      <div className="er-properties-content er-properties-content--multiple">
        {/* Resumo da Seleção */}
        <div className="property-group selection-summary">
          <h4>Resumo da Seleção</h4>
          
          <div className="element-types-grid">
            {elementsByType.entities.length > 0 && (
              <div className="element-type-card element-type-card--entities">                  
                <div className="count">
                  {elementsByType.entities.length} Entidades
                </div>
              </div>
            )}
            
            {elementsByType.relationships.length > 0 && (
              <div className="element-type-card element-type-card--relationships">                  
                <div className="count">
                  {elementsByType.relationships.length} Relacionamentos
                </div>
              </div>
            )}
            
            {elementsByType.attributes.length > 0 && (
              <div className="element-type-card element-type-card--attributes">                  
                <div className="count">
                  {elementsByType.attributes.length} Atributos
                </div>
              </div>
            )}
                        
            {elementsByType.connections.length > 0 && (
              <div className="element-type-card element-type-card--connections">                  
                <div className="count">
                  {elementsByType.connections.length} Conexões
                </div>
              </div>
            )}
          </div>
        </div>      
     
        {/* Lista de Elementos Detalhada */}
        <div className="property-group selected-elements-list">
          <h4>Elementos na Seleção</h4>
          
          <div className="elements-container">
            {selectedElements
              .filter(el => el.type !== 'label')
              .filter((el, index, arr) => 
                arr.findIndex(other => 
                  el.id && other.id && (other.id === el.id || other.id === el.id.replace('_label', '') || el.id === other.id.replace('_label', ''))
                ) === index
              )
              .map((el, index) => {              
              const name = el.businessObject?.name || el.id;
              const type = el.businessObject?.erType || (el.type === 'bpmn:SequenceFlow' ? 'Conexão' : 'Elemento');
              
              let bgColor = '#e2e8f0';
              let textColor = '#64748b';
              
              if (type === 'Entity') { bgColor = '#fef3c7'; textColor = '#92400e'; }
              else if (type === 'Relationship') { bgColor = '#fce7f3'; textColor = '#9d174d'; }
              else if (type === 'Attribute') { bgColor = '#dcfce7'; textColor = '#15803d'; }                           
              
              return (
                <div 
                  key={el.id} 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 12px',
                    marginBottom: index < selectedElements.length - 1 ? '4px' : 0,
                    background: bgColor,
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: textColor
                  }}
                >
                  <span style={{ fontWeight: '600', flex: 1 }}>{name}</span>
                  <span style={{ fontSize: '10px', opacity: 0.7 }}>{type}</span>
                </div>
              );
            })}
          </div>
        </div>        
      </div>
    </div>
  );
};