/**
 * Componente de controles para agrupamento visual
 */

import React, { useState, useEffect } from 'react';
import { useVisualGrouping } from '../hooks/useVisualGrouping';
import '../styles/visual-groups.scss';

interface VisualGroupingControlsProps {
  modeler: any;
  className?: string;
}

export const VisualGroupingControls: React.FC<VisualGroupingControlsProps> = ({
  modeler,
  className = ''
}) => {
  const {
    groups,
    selectedElements,
    canCreateGroup,
    createGroup,
    removeGroup,
    clearAllGroups,
    saveGroupsToXML,
    loadGroupsFromXML,
    addGroupsToSVG,
    removeGroupsFromSVG
  } = useVisualGrouping(modeler);

  const [showGroupsList, setShowGroupsList] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  // Escutar eventos de carregamento, salvamento e exportação de grupos
  useEffect(() => {
    const handleLoadGroups = () => {
      loadGroupsFromXML();
    };

    const handleSaveGroups = () => {
      saveGroupsToXML();
    };

    const handleAddGroupsToSVG = () => {
      addGroupsToSVG();
    };

    const handleRemoveGroupsFromSVG = () => {
      removeGroupsFromSVG();
    };

    document.addEventListener('loadVisualGroups', handleLoadGroups);
    document.addEventListener('saveVisualGroups', handleSaveGroups);
    document.addEventListener('addGroupsToSVG', handleAddGroupsToSVG);
    document.addEventListener('removeGroupsFromSVG', handleRemoveGroupsFromSVG);
    
    return () => {
      document.removeEventListener('loadVisualGroups', handleLoadGroups);
      document.removeEventListener('saveVisualGroups', handleSaveGroups);
      document.removeEventListener('addGroupsToSVG', handleAddGroupsToSVG);
      document.removeEventListener('removeGroupsFromSVG', handleRemoveGroupsFromSVG);
    };
  }, [loadGroupsFromXML, saveGroupsToXML, addGroupsToSVG, removeGroupsFromSVG]);

  const handleCreateGroup = () => {
    const name = newGroupName.trim() || undefined;
    createGroup(name);
    setNewGroupName('');
    // Salvar automaticamente no XML
    setTimeout(() => saveGroupsToXML(), 100);
  };

  const handleRemoveGroup = (groupId: string) => {
    if (window.confirm('Tem certeza que deseja remover este grupo?')) {
      removeGroup(groupId);
      // Salvar automaticamente no XML
      setTimeout(() => saveGroupsToXML(), 100);
    }
  };

  const handleClearAll = () => {
    if (groups.length > 0 && window.confirm('Tem certeza que deseja remover todos os grupos?')) {
      clearAllGroups();
      // Salvar automaticamente no XML
      setTimeout(() => saveGroupsToXML(), 100);
    }
  };

  return (
    <div className={`grouping-controls ${className}`}>
      
      {/* Botão para criar grupo */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Nome do grupo"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          style={{
            padding: '6px 8px',
            border: '1px solid #e5e7eb',
            borderRadius: '4px',
            fontSize: '12px',
            width: '140px'
          }}
        />
        
        <button
          className="group-button"
          onClick={handleCreateGroup}
          disabled={!canCreateGroup}
          title={canCreateGroup ? 'Criar grupo com elementos selecionados' : 'Selecione pelo menos 2 elementos'}
        >
           Agrupar
        </button>
      </div>

      {/* Informações de seleção */}
      <div className="group-info">
        {selectedElements.length > 0 ? (
          <>
            {selectedElements.length} elemento{selectedElements.length !== 1 ? 's' : ''} selecionado{selectedElements.length !== 1 ? 's' : ''}
          </>
        ) : (
          'Nenhum elemento selecionado'
        )}
      </div>

      {/* Botão para mostrar/ocultar lista de grupos */}
      {groups.length > 0 && (
        <>
          <button
            className="group-button"
            onClick={() => setShowGroupsList(!showGroupsList)}
            style={{ background: '#6b7280' }}
          >
            Grupos ({groups.length})
          </button>

          <button
            className="group-button danger"
            onClick={handleClearAll}
            title="Remover todos os grupos"
          >
            Limpar
          </button>
        </>
      )}

      {/* Lista de grupos (expandível) */}
      {showGroupsList && groups.length > 0 && (
        <div className="groups-list" style={{ marginTop: '8px', minWidth: '250px' }}>
          {groups.map(group => (
            <div key={group.id} className="group-item">
              <div>
                <div className="group-name" title={group.name}>
                  {group.name}
                </div>
                <div className="group-count">
                  {group.elements.length} elemento{group.elements.length !== 1 ? 's' : ''}
                </div>
              </div>
              
              <div className="group-actions">
                <button
                  onClick={() => handleRemoveGroup(group.id)}
                  title="Remover grupo"
                  style={{ color: '#ef4444' }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Instruções de uso */}
      {groups.length === 0 && selectedElements.length === 0 && (
        <div style={{ 
          fontSize: '11px', 
          color: '#6b7280', 
          marginTop: '4px',
          maxWidth: '200px',
          lineHeight: '1.3'
        }}>
           Selecione elementos e clique em "Agrupar" para criar grupos visuais
        </div>
      )}
    </div>
  );
};