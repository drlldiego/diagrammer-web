/**
 * View component for Multiple Selection
 * Displays information and actions for multiple selected elements
 */
import React from 'react';
import { ErElement } from '../../../../er/core';
import { useElementGrouping } from '../../../hooks';

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
  // Use the grouping hook
  const { groupElements, isGrouping } = useElementGrouping(modeler, notation);

  // Filter ER elements (exclude connections and labels)
  const erElements = selectedElements.filter(el => 
    el.businessObject?.erType && el.type !== 'bpmn:SequenceFlow' && el.type !== 'label'
  );

  const connections = selectedElements.filter(el => 
    el.type === 'bpmn:SequenceFlow'
  );

  // Categorize elements by type
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
    containers: selectedElements.filter(el => 
      (el.businessObject?.erType === 'CompositeAttribute' || 
       (el.businessObject as any)?.type === 'CompositeAttribute' ||
       el.businessObject?.isComposite === true) && el.type !== 'label'
    ),
    connections: connections
  };

  // For Crow's Foot notation, can't group if there are relationships
  const canGroup = notation === 'chen' || elementsByType.relationships.length === 0;

  // Simplified group handler using the hook
  const handleGroupElements = async () => {
    await groupElements(selectedElements);
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
        {/* Selection Summary */}
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
            
            {elementsByType.containers.length > 0 && (
              <div className="element-type-card element-type-card--containers">                  
                <div className="count">
                  {elementsByType.containers.length} Containers
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

        {/* Group Action */}
        {canGroup && erElements.length >= 2 && (
          <div className="property-group grouping-section">
            <h4>Agrupar em Container Composto</h4>
            
            <p>
              {elementsByType.attributes.length >= 2 
                ? `${elementsByType.attributes.length} atributos prontos para agrupamento hierárquico`
                : `Agrupe ${erElements.length} elementos ER em uma estrutura composta`
              }
            </p>
            
            <button 
              type="button"
              onClick={handleGroupElements}
              disabled={isGrouping}
              className="grouping-button"
            >
              {isGrouping 
                ? 'Agrupando...'
                : elementsByType.attributes.length >= 2 
                  ? `Agrupar ${elementsByType.attributes.length} Atributos`
                  : `Criar Container (${erElements.length} elementos)`
              }
            </button>
          </div>
        )}

        {/* Warning for Crow's Foot with relationships */}
        {!canGroup && elementsByType.relationships.length > 0 && (
          <div className="property-group warning-section">
            <h4>Limitação da Notação</h4>
            <p>
              Na notação Crow's Foot, relacionamentos não podem ser agrupados em containers compostos.
            </p>
          </div>
        )}

        {/* Detailed Elements List */}
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
              const isER = el.businessObject?.erType;
              const name = el.businessObject?.name || el.id;
              const type = el.businessObject?.erType || (el.type === 'bpmn:SequenceFlow' ? 'Conexão' : 'Elemento');
              
              let bgColor = '#e2e8f0';
              let textColor = '#64748b';
              
              if (type === 'Entity') { bgColor = '#fef3c7'; textColor = '#92400e'; }
              else if (type === 'Relationship') { bgColor = '#fce7f3'; textColor = '#9d174d'; }
              else if (type === 'Attribute') { bgColor = '#dcfce7'; textColor = '#15803d'; }
              else if (type === 'CompositeAttribute') { bgColor = '#e0e7ff'; textColor = '#4338ca'; }
              else if (type === 'Conexão') { bgColor = '#f1f5f9'; textColor = '#475569'; }
              
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

        {/* Usage Tips */}
        <div className="property-group usage-tips">
          <h4>Dicas de Uso</h4>
          <ul>
            <li>Use <strong>Shift+Click</strong> para adicionar/remover elementos da seleção</li>
            <li>Selecione apenas um elemento para ver propriedades detalhadas</li>
            <li>O agrupamento preserva posições e conexões originais</li>
            {elementsByType.attributes.length >= 2 && (
              <li><strong>Agrupamento recomendado:</strong> Atributos relacionados detectados</li>
            )}
            {notation === 'crowsfoot' && (
              <li><strong>Crow's Foot:</strong> Apenas entidades e atributos podem ser agrupados</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};