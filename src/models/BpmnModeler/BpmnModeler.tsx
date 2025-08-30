import React, { useEffect, useRef } from "react";
import EditorHeader from "../BpmnModeler/../../components/common/EditorHeader/EditorHeader";
import { FitButton, ExportButton, ImportButton, ExportOptions } from "../BpmnModeler/../../components/common";
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn.css";
import "@bpmn-io/properties-panel/dist/assets/properties-panel.css";
import "diagram-js-minimap/assets/diagram-js-minimap.css";
import "../../styles/DiagramEditor.css";
import "../../styles/ModelerComponents.css"; // CSS compartilhado para componentes modeler
// Icons são agora importados nos componentes individuais
// Hooks customizados
import { useModelerSetup } from "./hooks/useModelerSetup";
import { useExportFunctions } from "./hooks/useExportFunctions";
import { useMinimapControl } from "./hooks/useMinimapControl";
import { useUnsavedChanges } from "./hooks/useUnsavedChanges";

// Opções de exportação para BPMN
const bpmnExportOptions: ExportOptions = {
  pdf: {
    enabled: true,
    filename: "diagrama-bpmn.pdf",
    label: "Exportar (PDF)"
  },
  png: {
    enabled: true,
    filename: "diagrama-bpmn.png", 
    label: "Exportar (PNG)"
  },
  bpmn: {
    enabled: true,
    filename: "diagram.bpmn",
    label: "Exportar (.bpmn)",
    extension: "bpmn"
  }
};

const BpmnModelerComponent: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

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
      <EditorHeader 
        title="Diagrama BPMN"
        actions={
          <>
            <FitButton onClick={handleFitAll} />
            <ExportButton 
              isOpen={exportDropdownOpen}
              onToggle={toggleExportDropdown}
              onExport={handleExportOption}
              options={bpmnExportOptions}
              openOnHover={true}
            />
            <ImportButton 
              onImport={importDiagram}
              accept=".bpmn,.xml"
            />
          </>
        }
      />
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
    </div>
  );
};

export default BpmnModelerComponent;