import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import BpmnModeler from "bpmn-js/lib/Modeler";
import logoIsec from "../../assets/logo-isec-cor.png";
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn.css";
import "@bpmn-io/properties-panel/dist/assets/properties-panel.css";
import "diagram-js-minimap/assets/diagram-js-minimap.css";
import "../../styles/DiagramEditor.css";

// Export to SVG e PDF
import jsPDF from "jspdf";

// Módulos extras
import minimapModule from "diagram-js-minimap";

import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule
} from "bpmn-js-properties-panel";

import camundaModdleDescriptor from "camunda-bpmn-moddle/resources/camunda.json";

import { ImageDown as ImageIcon, Download as PdfIcon, Maximize2 as FitAllIcon } from "lucide-react";

const BpmnModelerComponent: React.FC = () => {
  const modelerRef = useRef<BpmnModeler | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [xml, setXml] = useState<string>("");
  const [minimapMinimized, setMinimapMinimized] = useState<boolean>(false);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [forceRefresh, setForceRefresh] = useState(0);
  const [showExitModal, setShowExitModal] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Adicionar useEffect para forçar refresh quando necessário
  useEffect(() => {
    // Forçar refresh se detectar problemas
    const timer = setTimeout(() => {
      setForceRefresh(prev => prev + 1);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);


  // Interceptar fechamento de aba/janela
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!containerRef.current || !panelRef.current) return;

    // Limpeza prévia total
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }
    if (panelRef.current) {
      panelRef.current.innerHTML = '';
    }

    modelerRef.current = new BpmnModeler({
      container: containerRef.current,
      propertiesPanel: {
        parent: panelRef.current
      },
      additionalModules: [
        BpmnPropertiesPanelModule,
        BpmnPropertiesProviderModule,
        minimapModule
      ]
    });

    const initialDiagram = `<?xml version="1.0" encoding="UTF-8"?>
    <bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
        xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
        xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
        xmlns:camunda="http://camunda.org/schema/1.0/bpmn"
        targetNamespace="http://bpmn.io/schema/bpmn">
        <bpmn:process id="Process_1" isExecutable="false">
            <bpmn:startEvent id="StartEvent_1" />
        </bpmn:process>
        <bpmndi:BPMNDiagram id="BPMNDiagram_1">
            <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
                <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
                    <dc:Bounds x="173" y="102" width="36" height="36" />
                </bpmndi:BPMNShape>
            </bpmndi:BPMNPlane>
        </bpmndi:BPMNDiagram>
    </bpmn:definitions>`;
    
    modelerRef.current.importXML(initialDiagram).catch(console.error);

    // Setup de detecção de mudanças APÓS criação do modeler
    const handleDiagramChange = () => {
      setHasUnsavedChanges(true);
    };

    // Escutar múltiplos eventos de mudança
    modelerRef.current.on('commandStack.changed', handleDiagramChange);
    modelerRef.current.on('elements.changed', handleDiagramChange);
    modelerRef.current.on('shape.added', handleDiagramChange);
    modelerRef.current.on('shape.removed', handleDiagramChange);
    modelerRef.current.on('connection.added', handleDiagramChange);
    modelerRef.current.on('connection.removed', handleDiagramChange);
    modelerRef.current.on('import.done', () => {
      setHasUnsavedChanges(false);
    });

    // Setup minimap toggle functionality
    setupMinimapToggle();

    // TEMPORARIAMENTE DESABILITADO - minimap auto-fit não funcionando como esperado
    // setupMinimapAutoFit();

    return () => {
      // Cleanup agressivo para evitar interferência com outros editores
      if (modelerRef.current) {
        modelerRef.current.destroy();
        modelerRef.current = null;
      }
      
      // Forçar limpeza do DOM
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      if (panelRef.current) {
        panelRef.current.innerHTML = '';
      }
    };
  }, [forceRefresh]);

  // Função para lidar com saída
  const handleExit = () => {
    if (hasUnsavedChanges) {
      setShowExitModal(true);
    } else {
      window.location.href = '/';
    }
  };

  // Função para salvar e sair
  const handleSaveAndExit = async () => {
    await exportDiagram();
    setHasUnsavedChanges(false);
    setTimeout(() => {
      window.location.href = '/';
    }, 500); // Pequeno delay para garantir o download
  };

  // Função para descartar e sair
  const handleDiscardAndExit = () => {
    setHasUnsavedChanges(false);
    window.location.href = '/';
  };

  // Função para cancelar saída
  const handleCancelExit = () => {
    setShowExitModal(false);
  };

  const exportDiagram = async () => {
    if (!modelerRef.current) return;
    try {
      const { xml } = await modelerRef.current!.saveXML({ format: true });
      const xmlString: string = xml ?? ""; // Se for undefined, usa uma string vazia
      setXml(xmlString);
      const blob = new Blob([xmlString], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "diagram.bpmn";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting BPMN XML", err);
    }
  };

  const importDiagram = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !modelerRef.current) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const xml = reader.result as string;
        await modelerRef.current!.importXML(xml);
      } catch (error) {
        console.error("Erro ao importar diagrama:", error);
      }
    };
    reader.readAsText(file);
  };

  const setupMinimapToggle = () => {
    setTimeout(() => {
      const minimap = document.querySelector('.djs-minimap');
      if (minimap) {
        // Force minimap to be open by adding the 'open' class that the module expects
        minimap.classList.add('open');

        // Remove the default toggle element completely
        const defaultToggle = minimap.querySelector('.toggle');
        if (defaultToggle) {
          defaultToggle.remove();
        }

        // Remove existing custom toggle button if any
        const existingToggle = minimap.querySelector('.minimap-toggle');
        if (existingToggle) {
          existingToggle.remove();
        }

        // Create our custom toggle button
        const toggleButton = document.createElement('button');
        toggleButton.className = 'minimap-toggle';
        toggleButton.innerHTML = minimapMinimized ? '+' : '−';
        toggleButton.setAttribute('title', minimapMinimized ? 'Expandir minimap' : 'Minimizar minimap');

        // Add click event for our toggle
        const handleToggle = (e: Event) => {
          e.stopPropagation();
          const currentMinimized = minimap.classList.contains('minimized');
          const newMinimized = !currentMinimized;
          setMinimapMinimized(newMinimized);
          
          if (newMinimized) {
            minimap.classList.add('minimized');
            toggleButton.innerHTML = '+';
            toggleButton.setAttribute('title', 'Expandir minimap');
          } else {
            minimap.classList.remove('minimized');
            // Keep the 'open' class to ensure functionality
            minimap.classList.add('open');
            toggleButton.innerHTML = '−';
            toggleButton.setAttribute('title', 'Minimizar minimap');
          }
        };

        toggleButton.addEventListener('click', handleToggle);

        // Add click event to minimap itself to expand when minimized
        const handleMinimapClick = () => {
          if (minimap.classList.contains('minimized')) {
            setMinimapMinimized(false);
            minimap.classList.remove('minimized');
            minimap.classList.add('open');
            toggleButton.innerHTML = '−';
            toggleButton.setAttribute('title', 'Minimizar minimap');
          }
        };

        minimap.addEventListener('click', handleMinimapClick);

        // Append our toggle button to minimap
        minimap.appendChild(toggleButton);

        // Apply initial state - default is maximized and functional
        if (minimapMinimized) {
          minimap.classList.add('minimized');
        } else {
          // Ensure it's functional by default with 'open' class
          minimap.classList.add('open');
        }
      }
    }, 1000); // Wait for minimap to be rendered
  };

  /* 
   * ========================================================================
   * FUNCIONALIDADE DE AUTO-FIT DO MINIMAP - COMENTADA PARA RELATÓRIO
   * ========================================================================
   * 
   * Esta funcionalidade foi implementada com várias abordagens mas não obteve 
   * os resultados esperados. O minimap do diagram-js/bpmn-js possui controlo 
   * interno que resiste às modificações externas.
   * 
   * TENTATIVAS IMPLEMENTADAS:
   * 1. Manipulação direta do viewBox SVG do minimap
   * 2. CSS Transforms (scale + translate) para zoom visual
   * 3. Reset/toggle do minimap (close/open)
   * 4. Forçar updates internos (_update) e resize events
   * 5. Manipulação de elementos DOM internos do minimap
   * 
   * PROBLEMA: O minimap não mostrava todos os elementos do canvas de forma 
   * consistente, mantendo apenas uma visualização parcial.
   * 
   * ALTERNATIVA IMPLEMENTADA: Botão "Fit All" para ajustar o canvas principal.
   * ========================================================================
   */
  const setupMinimapAutoFit = () => {
    // FUNCIONALIDADE DESABILITADA - MANTIDA APENAS PARA DOCUMENTAÇÃO
    /* 
     * Código original da tentativa de auto-fit do minimap foi removido
     * e substituído por funcionalidade de botão "Fit All" para o canvas.
     * O código original incluía várias abordagens que não funcionaram:
     * - Cálculo de bounds de elementos
     * - Manipulação de viewBox SVG  
     * - CSS Transforms
     * - Toggle e reset do minimap
     * - Eventos de resize
     */
  };

  // Função para ajustar canvas para mostrar todos os elementos (Fit All)
  const handleFitAll = () => {
    if (!modelerRef.current) return;
    
    try {
      const canvas = modelerRef.current.get('canvas') as any;
      canvas.zoom('fit-viewport');
      console.log('✅ Fit All executado - canvas ajustado para mostrar todos os elementos');
    } catch (error) {
      console.error('❌ Erro ao executar Fit All:', error);
    }
  };

  const exportToPDF = async () => {
    if (!modelerRef.current) return;

    try {
      const { svg } = await modelerRef.current.saveSVG();

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();

      img.onload = function () {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);

        const pdf = new jsPDF({
          orientation: img.width > img.height ? "landscape" : "portrait",
          unit: "px",
          format: [img.width, img.height],
        });

        const imgData = canvas.toDataURL("image/png");
        pdf.addImage(imgData, "PNG", 0, 0, img.width, img.height);
        pdf.save("diagram.pdf");

        URL.revokeObjectURL(url);
      };

      img.src = url;
    } catch (err) {
      console.error("Erro ao exportar para PDF", err);
    }
  };

  return (
    <div className="diagram-editor bpmn-modeler">
      <div className="editor-header">
        <div className="header-left">
          <img src={logoIsec} alt="ISEC Logo" className="editor-logo" />
        </div>
        <h1 className="editor-title">Editor BPMN</h1>
        <div className="editor-actions">
          <button className="fit-all-button" onClick={handleFitAll} title="Ajustar zoom para mostrar todos os elementos">
            <FitAllIcon size={24} />
          </button>
          <button className="download-button" onClick={exportToPDF} title="Exportar como PDF">
            <PdfIcon size={24} />
          </button>
          <button className="action-button" onClick={() => fileInputRef.current?.click()}>Importar Diagrama</button>
          <input
            type="file"
            accept=".bpmn,.xml"
            style={{ display: "none" }}
            ref={fileInputRef}
            onChange={importDiagram}
          />
          <button className="action-button" onClick={exportDiagram}>
            Exportar Diagrama
          </button>
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
              <button className="modal-save-button" onClick={handleSaveAndExit}>
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