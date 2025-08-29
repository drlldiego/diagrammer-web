import React, { useEffect, useRef } from "react";

import logoIsec from "../../assets/logo-isec-cor.png";
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn.css";
import "@bpmn-io/properties-panel/dist/assets/properties-panel.css";
import "diagram-js-minimap/assets/diagram-js-minimap.css";
import "../../styles/DiagramEditor.css";

import { Download as PdfIcon, Maximize2 as FitAllIcon, Upload, ChevronDown, FileImage, File } from "lucide-react";

// Hooks customizados
import { useModelerSetup } from "./hooks/useModelerSetup";
import { useExportFunctions } from "./hooks/useExportFunctions";
import { useMinimapControl } from "./hooks/useMinimapControl";
import { useUnsavedChanges } from "./hooks/useUnsavedChanges";

const BpmnModelerComponent: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Hooks customizados
  const { setupMinimapToggle } = useMinimapControl();
  
  const {
    hasUnsavedChanges,
    showExitModal,
    handleSaveAndExit,
    handleDiscardAndExit,
    handleCancelExit,
    handleDiagramChange,
    handleImportDone
  } = useUnsavedChanges();

  const { modelerRef, importDiagram, handleFitAll } = useModelerSetup(
    containerRef,
    panelRef,
    handleDiagramChange,
    handleImportDone
  );

  const {
    exportDropdownOpen,
    setExportDropdownOpen,
    exportDiagram,
    toggleExportDropdown,
    handleExportOption
  } = useExportFunctions(modelerRef);

  // Setup minimap toggle functionality
  useEffect(() => {
    setupMinimapToggle();
  }, [setupMinimapToggle]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownOpen && !(event.target as Element).closest('.export-dropdown-container')) {
        setExportDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [exportDropdownOpen, setExportDropdownOpen]);

  return (
    <div className="diagram-editor bpmn-modeler">
      <div className="editor-header">
        <div className="header-left">
          <img src={logoIsec} alt="ISEC Logo" className="editor-logo" />
        </div>
        <h1 className="editor-title">Diagrama BPMN</h1>
        <div className="editor-actions">
          <button className="fit-all-button" onClick={handleFitAll} title="Ajustar visualização para mostrar todos os elementos">
            <FitAllIcon size={24} />
          </button>          
          {/* Dropdown de Exportação */}
          <div className="export-dropdown-container" style={{ position: 'relative', display: 'inline-block' }}>
            <button className="download-button" onClick={toggleExportDropdown} title="Opções de Exportação">
              <PdfIcon size={24} />
              <ChevronDown size={24} style={{ marginLeft: '3px', marginTop: '2px', color: '#eaeaeaff' }} />
            </button>
            {exportDropdownOpen && (
              <div className="export-dropdown" style={{
                position: 'absolute',
                top: '100%',
                right: '0',
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                zIndex: 1000,
                minWidth: '180px',
                marginTop: '4px'
              }}>
                <button 
                  className="dropdown-option" 
                  onClick={() => handleExportOption('pdf')}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '14px',
                    borderRadius: '6px 6px 0 0'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <PdfIcon size={20} style={{ marginRight: '16px', color: '#6e1a1aff' }} />
                  Exportar (PDF)
                </button>
                <button 
                  className="dropdown-option" 
                  onClick={() => handleExportOption('png')}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '14px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <FileImage size={20} style={{ marginRight: '16px', color: '#553996ff' }} />
                  Exportar (PNG)
                </button>
                <button 
                  className="dropdown-option" 
                  onClick={() => handleExportOption('bpmn')}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '14px',
                    borderRadius: '0 0 6px 6px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <File size={20} style={{ marginRight: '16px', color: '#035e6eff' }} />
                  Exportar (.bpmn)
                </button>
              </div>
            )}
          </div>

          {/* Botão de Importação com novo estilo */}
          <button 
            className="upload-button" 
            onClick={() => fileInputRef.current?.click()}
            style={{
              backgroundColor: '#453b3b',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            title="Importar Diagrama"
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#212048ff'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#453b3b'}
          >
            <Upload size={24} />            
          </button>
          <input
            type="file"
            accept=".bpmn,.xml"
            style={{ display: "none" }}
            ref={fileInputRef}
            onChange={importDiagram}
          />
        </div>
      </div>
      <div className="modeler-content">
        <div 
          ref={containerRef} 
          className="modeler-container"
        ></div>
        <div 
          ref={panelRef}
          className="properties-panel-container"
        ></div>
      </div>
      
      {/* Modal de confirmação de saída */}
      {showExitModal && (
        <div className="exit-modal-overlay">
          <div className="exit-modal">
            <h3>Trabalho não salvo</h3>
            <p>Você tem alterações não salvas. O que deseja fazer?</p>
            <div className="exit-modal-buttons">
              <button className="modal-save-button" onClick={() => handleSaveAndExit(exportDiagram)}>
                💾 Salvar e Sair
              </button>
              <button className="modal-discard-button" onClick={handleDiscardAndExit}>
                🗑️ Descartar e Sair
              </button>
              <button className="modal-cancel-button" onClick={handleCancelExit}>
                ❌ Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BpmnModelerComponent;