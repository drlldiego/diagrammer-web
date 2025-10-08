import React, { useEffect, useRef, useState } from "react";
import EditorHeader from "../../../components/common/EditorHeader/EditorHeader";
import { FitButton, ExportButton, ImportButton, Minimap, ExportOptions, ExitConfirmationModal } from "../../../components/common";
import { BreadcrumbNavigation } from "./components/BreadcrumbNavigation";
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn.css";
import "@bpmn-io/properties-panel/dist/assets/properties-panel.css";
import "bpmn-js-color-picker/colors/color-picker.css";
import "diagram-js-minimap/assets/diagram-js-minimap.css";
import "../../../styles/DiagramEditor.scss";
import "../../../styles/ModelerComponents.scss";
// Hooks customizados
import { useModelerSetup } from "./hooks/useModelerSetup";
import { useExportFunctions } from "./hooks/useExportFunctions";
import { useUnsavedChanges } from "./hooks/useUnsavedChanges";
import { useDrilldownNavigation } from "./hooks/useDrilldownNavigation";
import { logger } from "../../../utils/logger";

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
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const [diagramName, setDiagramName] = useState<string>('Diagrama BPMN');

  // Hooks customizados
  
  const {
    hasUnsavedChanges,
    hasExportedBpmn,
    showExitModal,
    handleLogoClick,
    handleConfirmExit,
    handleCancelExit,
    handleDiagramChange,
    handleImportDone,
    markBpmnExported
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
    toggleExportDropdown,
    handleExportOption
  } = useExportFunctions(modelerRef, markBpmnExported, diagramName);

  // Hook de navegação por drilldown
  const {
    breadcrumbs,
    initializeBreadcrumb,
    drillInto,
    navigateToLevel,
    canDrillInto,    
    updateBreadcrumbFromCanvas
  } = useDrilldownNavigation(modelerRef);


  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownOpen && !(event.target as Element).closest('.export-dropdown-container')) {
        setExportDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [exportDropdownOpen, setExportDropdownOpen]);

  // Escuta mudanças de seleção e atualizações de propriedades
  useEffect(() => {
    if (modelerRef.current) {
      const modeler = modelerRef.current;
      
      const handleSelectionChanged = (e: any) => {
        const element = e.newSelection[0];
        setSelectedElement(element);
      };

      const handleElementChanged = () => {
        // Capturar mudanças no nome do processo
        try {
          const canvas = modeler.get('canvas') as any;
          const rootElement = canvas.getRootElement();
          if (rootElement && rootElement.businessObject && rootElement.businessObject.name) {
            setDiagramName(rootElement.businessObject.name);
          }
        } catch (error) {
          logger.error("Erro ao capturar nome do diagrama:", undefined, error as Error);
        }
      };

      // Trata double-click para navegação por drill-down
      const handleElementDoubleClick = (e: any) => {
        const element = e.element;
        
        if (canDrillInto(element)) {
          const success = drillInto(element);
          if (success) {
            logger.info(`Successfully drilled into: ${element.businessObject?.name || element.type}`, 'DRILLDOWN');
          }
        } else {
          logger.debug(`Element ${element.type} is not drillable`, 'DRILLDOWN');
        }
      };

      modeler.on('selection.changed', handleSelectionChanged);
      modeler.on('element.changed', handleElementChanged);
      modeler.on('commandStack.changed', handleElementChanged);
      modeler.on('element.dblclick', handleElementDoubleClick);

      // Escuta mudanças no root do canvas (navegação nativa por drill-down)
      const handleCanvasRootChanged = () => {
        setTimeout(() => {
          updateBreadcrumbFromCanvas();
        }, 50);
      };

      // Inicializa navegação por breadcrumb
      initializeBreadcrumb();

      // Escuta por mudanças no canvas
      modeler.on('canvas.viewbox.changed', handleCanvasRootChanged);
      modeler.on('canvas.resized', handleCanvasRootChanged);
      
      return () => {
        modeler.off('selection.changed', handleSelectionChanged);
        modeler.off('element.changed', handleElementChanged);
        modeler.off('commandStack.changed', handleElementChanged);
        modeler.off('element.dblclick', handleElementDoubleClick);
        modeler.off('canvas.viewbox.changed', handleCanvasRootChanged);
        modeler.off('canvas.resized', handleCanvasRootChanged);
      };
    }
  }, []);


  return (
    <div className="diagram-editor bpmn-modeler">
      <EditorHeader 
        title="Diagrama BPMN"
        onLogoClick={handleLogoClick}
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
            
      <BreadcrumbNavigation
        items={breadcrumbs}
        onNavigate={navigateToLevel}
        className="bpmn-breadcrumb"
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
        <Minimap setupDelay={1000} initialMinimized={false} isDeclarativeMode={false} />
      </div>
            
      <ExitConfirmationModal
        isOpen={showExitModal}
        onConfirm={handleConfirmExit}
        onCancel={handleCancelExit}
        hasUnsavedChanges={hasUnsavedChanges && !hasExportedBpmn}
        modelType="BPMN"
      />
    </div>
  );
};

export default BpmnModelerComponent;