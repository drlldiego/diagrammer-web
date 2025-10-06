import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import BpmnModeler from "bpmn-js/lib/Modeler";
import EditorHeader from "../../../components/common/EditorHeader/EditorHeader";
import { FitButton, ExportButton, ImportButton, Minimap, ExportOptions } from "../../../components/common";
import flowModdle from "../schemas/flow-moddle.json";
import FlowModule from "./custom/index";
import FlowSyntaxPanel from "./declarative/FlowSyntaxPanel";
import FlowPropertiesPanel from "./components/FlowPropertiesPanel";
import BpmnColorPickerModule from "bpmn-js-color-picker";
import resizeAllModule from "../shared/providers";
import { logger } from "../../../utils/logger";
import { notifications } from "../../../utils/notifications";
import minimapModule from "diagram-js-minimap";
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn.css";
import "diagram-js-minimap/assets/diagram-js-minimap.css";
import "../../../styles/DiagramEditor.scss";
import "../../../styles/ModelerComponents.scss";
import "./styles/Flowchart.scss";

// Opções de exportação para Flow
const flowExportOptions: ExportOptions = {
  pdf: {
    enabled: true,
    filename: "fluxograma.pdf",
    label: "Exportar (PDF)"
  },
  png: {
    enabled: true,
    filename: "fluxograma.png", 
    label: "Exportar (PNG)"
  },
  bpmn: {
    enabled: true,
    filename: "flowchart.bpmn",
    label: "Exportar (.bpmn)",
    extension: "bpmn"
  }
};

const FlowchartComponent: React.FC = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const modelerRef = useRef<BpmnModeler | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [status, setStatus] = useState<string>("Inicializando...");
  const [exportDropdownOpen, setExportDropdownOpen] = useState<boolean>(false);
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const [selectedElements, setSelectedElements] = useState<any[]>([]);
  const [diagramName, setDiagramName] = useState<string>('Fluxograma');

  const handleLogoClick = () => {
    navigate('/');
  };

  const handleFitAll = () => {
    if (!modelerRef.current) return;
    
    try {
      const canvas = modelerRef.current.get("canvas") as any;
      canvas.zoom("fit-viewport");
      logger.info("Fit All executado - canvas ajustado", "FLOW_CANVAS_OPERATION");
      notifications.info("Visualização ajustada para mostrar todos os elementos");
    } catch (error) {
      logger.error("Erro ao ajustar visualização do fluxograma", "FLOW_CANVAS_OPERATION", error as Error);
      notifications.error("Erro ao ajustar visualização. Tente fazer zoom manualmente.");
    }
  };

  const toggleExportDropdown = () => {
    setExportDropdownOpen(!exportDropdownOpen);
  };

  const exportToPDF = async () => {
    if (!modelerRef.current) return;

    logger.info('Iniciando exportação PDF Flow com qualidade máxima', 'FLOW_PDF_EXPORT');
    
    try {
      const { svg } = await modelerRef.current.saveSVG();

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      if (!ctx) {
        throw new Error('Não foi possível obter contexto do canvas');
      }

      // Obter viewport atual
      const canvasElement = modelerRef.current.get("canvas") as any;
      const viewport = canvasElement.viewbox();
      const canvasSize = { width: viewport.outer.width, height: viewport.outer.height };
      
      // Fator de escala ALTO para qualidade máxima (5x = 500 DPI)
      const scaleFactor = 5;
      
      const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();

      img.onload = function () {
        const originalWidth = img.width;
        const originalHeight = img.height;
        
        // Verificar se os elementos cabem no tamanho do canvas
        const elementsFitInCanvas = originalWidth <= canvasSize.width && originalHeight <= canvasSize.height;
        
        // Se elementos cabem no canvas, usar tamanho do canvas; senão, usar tamanho ajustado
        const finalWidth = elementsFitInCanvas ? canvasSize.width : originalWidth;
        const finalHeight = elementsFitInCanvas ? canvasSize.height : originalHeight;
        
        const highResWidth = finalWidth * scaleFactor;
        const highResHeight = finalHeight * scaleFactor;
        
        // Configurar canvas para resolução máxima
        canvas.width = highResWidth;
        canvas.height = highResHeight;                
        
        // CONFIGURAÇÕES PARA QUALIDADE MÁXIMA
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // GARANTIR FUNDO BRANCO SÓLIDO
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, highResWidth, highResHeight);        
        
        // Escalar contexto APÓS pintar o fundo
        ctx.scale(scaleFactor, scaleFactor);
        
        // Se usando tamanho do canvas, centralizar o diagrama
        if (elementsFitInCanvas) {
          const offsetX = (finalWidth - originalWidth) / 2;
          const offsetY = (finalHeight - originalHeight) / 2;
          ctx.drawImage(img, offsetX, offsetY);
        } else {
          ctx.drawImage(img, 0, 0);
        }

        // Criar PDF com dimensões em milímetros para precisão
        const mmWidth = finalWidth * 0.264583;
        const mmHeight = finalHeight * 0.264583;
        
        // Importar jsPDF dinâmicamente
        import('jspdf').then(jsPDFModule => {
          const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default;
          
          const pdf = new jsPDF({
            orientation: mmWidth > mmHeight ? "landscape" : "portrait",
            unit: "mm",
            format: [mmWidth, mmHeight],
          });

          // USAR PNG SEM COMPRESSÃO para máxima qualidade
          const imgData = canvas.toDataURL("image/png", 1.0);
          pdf.addImage(imgData, "PNG", 0, 0, mmWidth, mmHeight, undefined, 'SLOW');
          
          logger.info('PDF Flow gerado com sucesso', 'FLOW_PDF_EXPORT');
          pdf.save(flowExportOptions.pdf!.filename);
          notifications.success('PDF do fluxograma exportado com sucesso!');

          URL.revokeObjectURL(url);
        }).catch(() => {
          // Fallback: export as SVG
          const link = document.createElement('a');
          const blob = new Blob([svg], { type: 'image/svg+xml' });
          link.href = URL.createObjectURL(blob);
          link.download = 'fluxograma-fallback.svg';
          link.click();
          notifications.warning('Exportado como SVG devido a erro no PDF');
        });
      };

      img.onerror = function() {
        logger.error('Erro ao carregar SVG como imagem para PDF Flow', 'FLOW_PDF_EXPORT');
        notifications.error('Erro ao processar SVG do fluxograma');
      };

      img.src = url;
    } catch (error) {
      logger.error('Erro ao exportar PDF Flow', 'FLOW_PDF_EXPORT', error as Error);
      notifications.error('Erro ao exportar PDF. Tente usar outro formato.');
    }
  };

  const exportToPNG = async () => {
    if (!modelerRef.current) return;

    try {          
      const { svg } = await modelerRef.current.saveSVG();

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      if (!ctx) {
        throw new Error('Não foi possível obter contexto do canvas');
      }

      // Obter viewport atual
      const canvasElement = modelerRef.current.get("canvas") as any;
      const viewport = canvasElement.viewbox();
      const canvasSize = { width: viewport.outer.width, height: viewport.outer.height };

      const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();

      img.onload = function () {
        const originalWidth = img.width;
        const originalHeight = img.height;
        
        // Verificar se os elementos cabem no tamanho do canvas
        const elementsFitInCanvas = originalWidth <= canvasSize.width && originalHeight <= canvasSize.height;
        
        // Se elementos cabem no canvas, usar tamanho do canvas; senão, usar tamanho ajustado
        const finalWidth = elementsFitInCanvas ? canvasSize.width : originalWidth;
        const finalHeight = elementsFitInCanvas ? canvasSize.height : originalHeight;
        
        // Fator de escala ALTO para qualidade máxima (5x = 500 DPI)
        const scaleFactor = 5;
        const highResWidth = finalWidth * scaleFactor;
        const highResHeight = finalHeight * scaleFactor;
        
        canvas.width = highResWidth;
        canvas.height = highResHeight;                
        
        // CONFIGURAÇÕES PARA QUALIDADE MÁXIMA
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // GARANTIR FUNDO BRANCO SÓLIDO
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, highResWidth, highResHeight);        
        
        // Escalar contexto APÓS pintar o fundo
        ctx.scale(scaleFactor, scaleFactor);
        
        // Se usando tamanho do canvas, centralizar o diagrama
        if (elementsFitInCanvas) {
          const offsetX = (finalWidth - originalWidth) / 2;
          const offsetY = (finalHeight - originalHeight) / 2;
          ctx.drawImage(img, offsetX, offsetY);
        } else {
          ctx.drawImage(img, 0, 0);
        }

        // Criar PNG com máxima qualidade
        canvas.toBlob((blob) => {
          if (blob) {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = flowExportOptions.png!.filename;
            link.click();
            notifications.success('PNG do fluxograma exportado com sucesso!');
          }
        }, 'image/png', 1.0);

        URL.revokeObjectURL(url);
      };

      img.onerror = function() {
        logger.error('Erro ao carregar SVG para PNG Flow', 'FLOW_PNG_EXPORT');
        notifications.error('Erro ao processar imagem do fluxograma');
      };

      img.src = url;
      
    } catch (error) {
      logger.error('Erro ao exportar PNG Flow', 'FLOW_PNG_EXPORT', error as Error);
      notifications.error('Erro ao exportar PNG. Tente novamente.');
    }
  };

  const exportToBPMN = async () => {
    if (!modelerRef.current) return;
    
    logger.info('Iniciando exportação BPMN Flow XML', 'FLOW_BPMN_EXPORT');
    
    try {
      const { xml } = await modelerRef.current.saveXML({ format: true });
      const xmlString: string = xml ?? "";
      
      if (xmlString) {
        const blob = new Blob([xmlString], { type: "application/xml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = flowExportOptions.bpmn!.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        notifications.success('Fluxograma BPMN exportado com sucesso!');
        logger.info('BPMN Flow XML exportado com sucesso', 'FLOW_BPMN_EXPORT');
      }
    } catch (error) {
      logger.error('Erro ao exportar BPMN Flow', 'FLOW_BPMN_EXPORT', error as Error);
      notifications.error('Erro ao exportar BPMN. Tente novamente.');
      
      // Fallback: tentar exportar sem formatação
      try {
        const { xml } = await modelerRef.current.saveXML({ format: false });
        if (xml) {
          const blob = new Blob([xml], { type: "application/xml" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "flowchart-fallback.bpmn";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          notifications.warning('Fluxograma exportado em formato básico devido a erro');
        }
      } catch (fallbackError) {
        notifications.error('Não foi possível exportar o fluxograma');
      }
    }
  };

  const handleExportOption = async (option: "pdf" | "png" | "bpmn") => {
    setExportDropdownOpen(false);
    
    switch (option) {
      case 'pdf':
        exportToPDF();
        break;
      case 'png':
        exportToPNG();
        break;
      case 'bpmn':
        exportToBPMN();
        break;
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
        notifications.success("Fluxograma importado com sucesso!");
        logger.info("Fluxograma importado e processado", "FLOW_IMPORT");
      } catch (error) {
        logger.error("Erro ao importar fluxograma", "FLOW_IMPORT", error as Error);
        notifications.error("Erro ao importar fluxograma. Verifique se o arquivo é válido.");
      }
    };
    reader.readAsText(file);
  };

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownOpen && !(event.target as Element).closest('.export-dropdown-container')) {
        setExportDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [exportDropdownOpen]);

  // Inicializar o modeler de fluxograma
  useEffect(() => {
    if (!containerRef.current || modelerRef.current) return;

    const initializeModeler = async () => {
      try {
        setStatus("Criando modeler de fluxograma...");
        
        modelerRef.current = new BpmnModeler({
          container: containerRef.current!,
          moddleExtensions: {
            flow: flowModdle
          },
          additionalModules: [
            FlowModule,
            BpmnColorPickerModule,
            resizeAllModule,
            minimapModule
          ]
        });

        setStatus("Aguardando Canvas...");

        // Aguardar o canvas estar completamente pronto
        const initializeCanvasNaturally = async () => {
          try {
            // Verificar se o canvas está disponível
            const canvas = modelerRef.current!.get("canvas");
            if (!canvas) {
              throw new Error("Canvas service não disponível após inicialização");
            }

            // Verificar container DOM
            if (!containerRef.current) {
              throw new Error("Container DOM não disponível");
            }

            // Aguardar canvas estar completamente inicializado
            await new Promise(resolve => setTimeout(resolve, 150));

            setStatus("Carregando diagrama inicial...");

            // Diagrama inicial vazio para fluxograma
            const initialFlowchartDiagram = `<?xml version="1.0" encoding="UTF-8"?>
            <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
                             xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
                             xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" 
                             xmlns:flow="http://flowchart.com/schema/1.0/flow" 
                             id="Definitions_1" 
                             targetNamespace="http://flowchart.com/schema/bpmn">
              <bpmn:process id="FlowchartProcess_1" name="Fluxograma" isExecutable="false">
              </bpmn:process>
              <bpmndi:BPMNDiagram id="BPMNDiagram_1">
                <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="FlowchartProcess_1">
                </bpmndi:BPMNPlane>
              </bpmndi:BPMNDiagram>
            </bpmn:definitions>`;

            // Importar diagrama inicial
            try {
              await modelerRef.current!.importXML(initialFlowchartDiagram);
              logger.info("Canvas Flow inicializado vazio", "FLOW_SETUP");
            } catch (importError) {
              // Se falhar, continuar sem diagrama inicial
              logger.warn("Aviso: Falha ao importar diagrama vazio, mas canvas deve funcionar", "FLOW_SETUP", importError as Error);
            }

            setStatus("Editor de fluxograma pronto para uso");
            return true;
          } catch (canvasError) {
            logger.error("Erro na verificação do Canvas Flow", "FLOW_SETUP", canvasError as Error);
            throw canvasError;
          }
        };

        const result = await initializeCanvasNaturally();
        if (result) {
          // Configurar eventos
          const eventBus = modelerRef.current!.get("eventBus") as any;
          if (eventBus) {
            eventBus.on("selection.changed", (event: any) => {
              const element = event?.newSelection?.[0] || null;
              const elements = event?.newSelection || [];
              setSelectedElement(element);
              setSelectedElements(elements);
            });

            eventBus.on("commandStack.changed", (event: any) => {
              // Trigger diagram change handler for potential unsaved changes tracking
              // Aqui podemos adicionar no futuro
            });

            // Listen for element changes to update diagram name
            eventBus.on("element.changed", () => {
              try {
                const canvas = modelerRef.current!.get('canvas') as any;
                const rootElement = canvas.getRootElement();
                if (rootElement && rootElement.businessObject && rootElement.businessObject.name) {
                  setDiagramName(rootElement.businessObject.name);
                }
              } catch (error) {
                logger.error("Erro ao capturar nome do diagrama Flow:", "FLOW_SETUP", error as Error);
              }
            });
          }

          // Configurar minimap
          const minimap = modelerRef.current!.get("minimap", false) as any;
          if (minimap) {
            setTimeout(() => {
              try {
                if (typeof minimap.open === "function") {
                  minimap.open();
                }
              } catch (e) {
                logger.error("Erro ao abrir minimap Flow", "FLOW_SETUP", e as Error);
              }
            }, 1000);
          }

          setLoading(false);
          setStatus("Pronto para modelagem Flow");
          logger.info("FlowModeler inicializado com sucesso", "FLOW_SETUP");
        }

      } catch (err: unknown) {
        const error = err as Error;
        logger.error("Erro crítico na inicialização do Flow Modeler", "FLOW_SETUP", error);
        const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
        setStatus(`Erro: ${errorMessage}`);
        setLoading(false);
        notifications.error("Falha ao inicializar editor de fluxograma. Recarregue a página.");
      }
    };

    initializeModeler();

    return () => {
      if (modelerRef.current) {
        try {
          if (typeof modelerRef.current.destroy === "function") {
            modelerRef.current.destroy();
          }
          modelerRef.current = null;
        } catch (cleanupError) {
          logger.error("Erro no cleanup do FlowModeler:", "FLOW_CLEANUP", cleanupError as Error);
        }
      }
      // Limpar container DOM se existir
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, []);

  return (
    <div className="diagram-editor flow-modeler declarative-mode">
      <EditorHeader 
        title="Editor de Fluxograma" 
        onLogoClick={handleLogoClick}
        actions={
          <>
            <FitButton onClick={handleFitAll} />
            <ExportButton 
              isOpen={exportDropdownOpen}
              onToggle={toggleExportDropdown}
              onExport={handleExportOption}
              options={flowExportOptions}
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
        <FlowSyntaxPanel
          modeler={modelerRef.current}
          isVisible={true}
        />
        <div 
          ref={containerRef} 
          className="modeler-container flow-modeler-container with-syntax-panel"
        >
          {loading && (
            <div className="flow-loading-overlay">
              <div className="flow-loading-content">
                <div className="flow-loading-spinner"></div>
                <p>{status}</p>
              </div>
            </div>
          )}
        </div>
        <div className="properties-panel-container">
          <FlowPropertiesPanel
            element={selectedElement}
            elements={selectedElements}
            modeler={modelerRef.current}
            onDiagramNameChange={setDiagramName}
          />
        </div>
        <Minimap setupDelay={1000} initialMinimized={false} />
      </div>
    </div>
  );
};

export default FlowchartComponent;