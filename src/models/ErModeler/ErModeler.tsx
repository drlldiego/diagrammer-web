import React, { useEffect, useRef, useState } from "react";
import BpmnModeler from "bpmn-js/lib/Modeler";
import EditorHeader from "../../components/common/EditorHeader/EditorHeader";
import { FitButton, ExportButton, ImportButton, ExportOptions } from "../../components/common";
import erModdle from "../../schemas/er-moddle.json";
import jsPDF from "jspdf";
import { logger } from "../../utils/logger";
import {
  ErrorHandler,
  ErrorType,
  safeAsyncOperation,
  safeOperation,
} from "../../utils/errorHandler";
import { notifications } from "../../utils/notifications";
import ErModule from "./custom";
import resizeAllModule from "./rules";
import minimapModule from "diagram-js-minimap";
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn.css";
import "@bpmn-io/properties-panel/dist/assets/properties-panel.css";
import "diagram-js-minimap/assets/diagram-js-minimap.css";
import "../../styles/DiagramEditor.css";
import "../../styles/ModelerComponents.css"; 
import "./styles/ErPalette.css"; 
import "./styles/ErModeler.css"; 
import "./styles/ErModelerErrors.css"; 
// Icons são agora importados nos componentes individuais
import ErPropertiesPanel from "./propertiesPanel/ErPropertiesPanel";

// Opções de exportação para ER
const erExportOptions: ExportOptions = {
  pdf: {
    enabled: true,
    filename: "diagrama-er.pdf",
    label: "Exportar (PDF)"
  },
  png: {
    enabled: true,
    filename: "diagrama-er.png", 
    label: "Exportar (PNG)"
  },
  bpmn: {
    enabled: true,
    filename: "er-diagram.bpmn",
    label: "Exportar (.bpmn)",
    extension: "bpmn"
  }
};

const ErModelerComponent: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const modelerRef = useRef<BpmnModeler | null>(null);
  const initializationRef = useRef<boolean>(false); // Prevent React StrictMode double execution
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const [selectedElements, setSelectedElements] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [status, setStatus] = useState<string>("Inicializando...");
  const [xml, setXml] = useState<string>("");
  const [showExitModal, setShowExitModal] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [minimapMinimized, setMinimapMinimized] = useState<boolean>(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState<boolean>(false);

  // Interceptar fechamento de aba/janela
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && !showExitModal) {
        e.preventDefault();
        return "Você tem alterações não salvas. Tem certeza que deseja sair?";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges, showExitModal]);

  // Interceptar navegação de volta do browser
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (hasUnsavedChanges && !showExitModal) {
        e.preventDefault();
        window.history.pushState(null, "", window.location.href);
        setShowExitModal(true);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [hasUnsavedChanges, showExitModal]);

  useEffect(() => {
    if (!canvasRef.current) {
      logger.error("Container ER DOM não encontrado", "ER_SETUP");
      setError("Container do canvas não encontrado");
      setLoading(false);
      return;
    }
    
    if (initializationRef.current) {
      logger.warn(
        "ErModelerComponent: Inicialização já em progresso (React StrictMode detectado), ignorando duplicata",
        "ER_SETUP"
      );
      setLoading(false);
      setStatus("ER Modeler já inicializado");
      return;
    }

    // Mark initialization as started before any async operations
    initializationRef.current = true;

    setStatus("Criando modeler...");

    const initializeModeler = async () => {
      try {
        // Criar instância do modeler
        const modeler = new BpmnModeler({
          container: canvasRef.current!,
          // Remover keyboard.bindTo (deprecado - agora é automático)
          // Adicionar módulos customizados ER em ordem específica
          additionalModules: [
            ErModule, // ER module primeiro (palette e funcionalidades)
            resizeAllModule, // Rules de resize
            minimapModule, // Minimap por último
          ],
          // Registrar tipos ER como extensão do moddle
          moddleExtensions: {
            er: erModdle,
          },
        });

        logger.info("ER Modeler criado com sucesso", "ER_SETUP");
        modelerRef.current = modeler;

        logger.info(
          "Aguardando inicialização natural do Canvas...",
          "ER_SETUP"
        );
        setStatus("Aguardando Canvas...");
        
        const initializeCanvasNaturally = async () => {          
          //await new Promise((resolve) => setTimeout(resolve, 1000));

          try {
            // Basic Canvas service check
            const canvas = modeler.get("canvas");
            if (!canvas) {
              throw new Error("Canvas service não disponível após inicialização");
            }            

            // Verificar container DOM
            if (!canvasRef.current) {
              throw new Error("Container DOM ER não disponível");
            }            
            
            const initialErXml = `<?xml version="1.0" encoding="UTF-8"?>
                                  <bpmn2:definitions 
                                    xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL"
                                    xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                                    xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                                    xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                                    xmlns:er="http://er.schema/1.0"
                                    id="er-inicial"
                                    targetNamespace="http://bpmn.io/schema/bpmn">
                                    <bpmn2:process id="Modelo_Inicial" isExecutable="false">
                                      <bpmn2:task id="Entity" er:erType="Entity" er:isWeak="false" name="Entidade"/>                
                                    </bpmn2:process>
                                    <bpmndi:BPMNDiagram id="BpmnDiagram_1">
                                      <bpmndi:BPMNPlane id="BpmnPlane_1" bpmnElement="Modelo_Inicial">
                                        <bpmndi:BPMNShape id="Entity_di" bpmnElement="Entity">
                                          <dc:Bounds x="150" y="180" width="120" height="80" />
                                        </bpmndi:BPMNShape>      
                                      </bpmndi:BPMNPlane>
                                    </bpmndi:BPMNDiagram>
                                  </bpmn2:definitions>`;

            try {
              await modeler.importXML(initialErXml);
              logger.info("Diagrama ER inicial carregado com sucesso", "ER_SETUP");
              
              // IMPORTANTE: Processar elementos ER após importação do XML inicial
              const elementRegistry = modeler.get("elementRegistry") as any;
              const allElements = elementRegistry.getAll();
              
              allElements.forEach((element: any) => {
                if (element.businessObject && element.businessObject.$attrs) {
                  const erTypeAttr = element.businessObject.$attrs["er:erType"] || element.businessObject.$attrs["ns0:erType"];
                  
                  if (erTypeAttr) {
                    // Definir erType no businessObject
                    element.businessObject.erType = erTypeAttr;
                    
                    // Para entidades, adicionar propriedades necessárias
                    if (erTypeAttr === "Entity") {
                      const isWeakAttr = element.businessObject.$attrs["er:isWeak"] || element.businessObject.$attrs["ns0:isWeak"];
                      if (isWeakAttr !== undefined) {
                        element.businessObject.isWeak = isWeakAttr === "true";
                      }
                    }
                    
                    logger.info(`Elemento ER processado: ${element.id} - tipo: ${erTypeAttr}`, "ER_SETUP");
                  }
                }
              });
              
              logger.info("Elementos ER do XML inicial processados", "ER_SETUP");
            } catch (xmlImportError) {
              logger.warn("Diagrama ER inicial não pôde ser carregado, mas Canvas está funcional", "ER_SETUP", xmlImportError as Error);
              // Continue without initial diagram - user can create from palette
            }

            setStatus("ER Modeler pronto para uso");
            return true;
          } catch (canvasError) {
            logger.error(
              "Erro na verificação do Canvas ER",
              "ER_SETUP",
              canvasError as Error
            );
            throw canvasError;
          }
        };

        const result = await initializeCanvasNaturally();
        if (result) {
          logger.info("ER Modeler inicializado com sucesso", "ER_SETUP");

          // Configurar minimap básico (sem zoom automático)
          const minimap = modeler.get("minimap", false) as any;
          if (minimap) {
            logger.info("Minimap ER detectado e configurado", "ER_SETUP");
          }
        }

        // Configurar businessObject.erType para elementos importados do XML e forçar re-render
        const elementRegistry = modeler.get("elementRegistry") as any;
        const modeling = modeler.get("modeling") as any;
        const graphicsFactory = modeler.get("graphicsFactory") as any;
        const allElements = elementRegistry.getAll();

        // Configurar canvas (sem fazer zoom ainda)
        const canvas = modeler.get("canvas") as any;
        if (canvas) {
          logger.debug("Canvas ER obtido com sucesso", "ER_SETUP");
          // Verificar se minimap está presente
          const minimap = modeler.get("minimap", false) as any;
          if (minimap) {
            // Tentar forçar atualização do minimap
            setTimeout(() => {
              try {
                if (typeof minimap.open === "function") {
                  minimap.open();
                }
              } catch (e) {
                logger.error(
                  "Erro ao abrir minimap ER",
                  "ER_SETUP",
                  e as Error
                );
              }
            }, 1000);
          } else {
            logger.warn("Minimap não detectado", "ER_SETUP");
          }
        }

        setupMinimapToggle();
        // Configurar eventos
        const eventBus = modeler.get("eventBus") as any;
        if (eventBus) {
          eventBus.on("selection.changed", (event: any) => {
            const element = event?.newSelection?.[0] || null;
            const elements = event?.newSelection || [];
            setSelectedElement(element);
            setSelectedElements(elements);

            // Desabilitar contextPad para seleção múltipla
            const contextPad = modeler.get("contextPad") as any;
            if (elements.length > 1) {
              try {
                // Fechar imediatamente qualquer contextPad aberto
                contextPad.close();

                // Bloquear abertura usando timer que persiste
                if ((contextPad as any)._multiSelectBlock) {
                  clearTimeout((contextPad as any)._multiSelectBlock);
                }

                // Substituir método open temporariamente
                if (!(contextPad as any)._originalOpen) {
                  (contextPad as any)._originalOpen = contextPad.open;
                }

                contextPad.open = () => {
                  // Bloquear abertura do contextPad
                };

                // Configurar timer para manter bloqueio
                (contextPad as any)._multiSelectBlock = setTimeout(() => {
                  // Não restaurar automaticamente - só restaurar quando seleção única
                }, 10000);
              } catch (error) {
                logger.error(
                  "Erro ao bloquear contextPad para seleção múltipla",
                  "ER_SETUP",
                  error as Error
                );
              }
            } else if (elements.length <= 1) {
              // Restaurar contextPad para seleção única
              if ((contextPad as any)._originalOpen) {
                contextPad.open = (contextPad as any)._originalOpen;

                if ((contextPad as any)._multiSelectBlock) {
                  clearTimeout((contextPad as any)._multiSelectBlock);
                  delete (contextPad as any)._multiSelectBlock;
                }
              }
            }
          });

          eventBus.on("element.added", (event: any) => {
            logger.info("Elemento adicionado:", event.element);
          });

          eventBus.on("import.done", (event: any) => {
            logger.info("Import concluído:", event);
            setHasUnsavedChanges(false);
          });

          // Setup de detecção de mudanças
          const handleDiagramChange = () => {
            setHasUnsavedChanges(true);
          };

          // Escutar múltiplos eventos de mudança
          eventBus.on("commandStack.changed", handleDiagramChange);
          eventBus.on("elements.changed", handleDiagramChange);
          eventBus.on("shape.added", handleDiagramChange);
          eventBus.on("shape.removed", handleDiagramChange);
          eventBus.on("connection.added", handleDiagramChange);
          eventBus.on("connection.removed", handleDiagramChange);
        }

        setLoading(false);
        setError(null);
        setStatus("Pronto para modelagem ER");
      } catch (err: unknown) {
        const error = err as Error;
        logger.error(
          "Erro crítico na inicialização do ER Modeler",
          "ER_SETUP",
          error
        );
        const errorMessage =
          err instanceof Error ? err.message : "Erro desconhecido";
        setError(`Erro: ${errorMessage}`);
        setStatus("Erro ao inicializar");
        setLoading(false);
        notifications.error(
          "Falha ao inicializar editor ER. Recarregue a página."
        );
      }
    };

    initializeModeler();

    // Cleanup
    return () => {
      if (modelerRef.current) {
        try {
          // Verificar se o modeler ainda existe e tem o método destroy
          if (typeof modelerRef.current.destroy === "function") {
            modelerRef.current.destroy();
          }
          modelerRef.current = null;
        } catch (cleanupError) {
          logger.error(
            "Erro no cleanup do ErModeler:",
            "ER_CLEANUP",
            cleanupError as Error
          );
        }
      }
      // Limpar container DOM se existir
      if (canvasRef.current) {
        canvasRef.current.innerHTML = "";
      }
      // ✅ Reset initialization flag on cleanup (allows re-initialization)
      initializationRef.current = false;
    };
  }, []); // Array de dependências vazio e constante

  // Função para exportar PDF com máxima qualidade e fundo branco
  const exportToPDF = async () => {
    if (!modelerRef.current) return;

    logger.info(
      "Iniciando exportação PDF ER com qualidade máxima",
      "ER_PDF_EXPORT"
    );

    await safeAsyncOperation(
      async () => {
        const { svg } = await modelerRef.current!.saveSVG();

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          throw new Error("Não foi possível obter contexto do canvas");
        }

        // Fator de escala ALTO para qualidade máxima (5x = 500 DPI)
        const scaleFactor = 5;

        const svgBlob = new Blob([svg], {
          type: "image/svg+xml;charset=utf-8",
        });
        const url = URL.createObjectURL(svgBlob);
        const img = new Image();

        img.onload = function () {
          const originalWidth = img.width;
          const originalHeight = img.height;
          const highResWidth = originalWidth * scaleFactor;
          const highResHeight = originalHeight * scaleFactor;

          // Configurar canvas para resolução máxima
          canvas.width = highResWidth;
          canvas.height = highResHeight;

          // CONFIGURAÇÕES PARA QUALIDADE MÁXIMA
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";

          // ✅ GARANTIR FUNDO BRANCO SÓLIDO
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, highResWidth, highResHeight);

          // Escalar contexto APÓS pintar o fundo
          ctx.scale(scaleFactor, scaleFactor);

          // Desenhar SVG escalado sobre fundo branco
          ctx.drawImage(img, 0, 0);

          // Criar PDF com dimensões em milímetros para precisão
          const mmWidth = originalWidth * 0.264583; // px para mm (1px = 0.264583mm)
          const mmHeight = originalHeight * 0.264583;

          const pdf = new jsPDF({
            orientation: mmWidth > mmHeight ? "landscape" : "portrait",
            unit: "mm",
            format: [mmWidth, mmHeight],
          });

          // ✅ USAR PNG SEM COMPRESSÃO para máxima qualidade
          const imgData = canvas.toDataURL("image/png", 1.0); // PNG sem compressão
          pdf.addImage(
            imgData,
            "PNG",
            0,
            0,
            mmWidth,
            mmHeight,
            undefined,
            "SLOW"
          ); // SLOW = máxima qualidade
          pdf.save("diagrama-er.pdf");
          notifications.success("PDF ER exportado com sucesso!");
          logger.info("PDF ER salvo com sucesso", "ER_PDF_EXPORT");

          URL.revokeObjectURL(url);
        };

        img.onerror = function () {
          logger.error(
            "Erro ao carregar SVG ER como imagem para PDF",
            "ER_PDF_EXPORT"
          );
          notifications.error("Erro ao processar SVG ER para PDF");
        };

        img.src = url;
      },
      {
        type: ErrorType.ER_PDF_EXPORT,
        operation: "Exportar PDF ER",
        userMessage: "Erro ao exportar PDF ER. Tente outro formato.",
        fallback: () => {
          logger.warn(
            "Fallback: Exportando ER como SVG devido a erro no PDF",
            "ER_PDF_EXPORT"
          );
          modelerRef.current
            ?.saveSVG()
            .then(({ svg }) => {
              const link = document.createElement("a");
              const blob = new Blob([svg], { type: "image/svg+xml" });
              link.href = URL.createObjectURL(blob);
              link.download = "diagrama-er-fallback.svg";
              link.click();
              notifications.warning(
                "Exportado como SVG devido a erro no PDF ER"
              );
            })
            .catch(() => {
              notifications.error(
                "Não foi possível exportar nem em PDF nem em SVG"
              );
            });
        },
      }
    );
  };

  // Função para processar elementos ER após import
  const processErElementsAfterImport = () => {
    if (!modelerRef.current) return;

    const elementRegistry = modelerRef.current.get("elementRegistry") as any;
    const modeling = modelerRef.current.get("modeling") as any;
    const graphicsFactory = modelerRef.current.get("graphicsFactory") as any;

    const allElements = elementRegistry.getAll();

    allElements.forEach((element: any) => {
      // ESPECIAL: Log para detectar UserTasks que são atributos
      if (element.type === "bpmn:UserTask") {
        logger.warn(
          "Elemento UserTask detectado (pode ser atributo com erro de import):",
          element.id,
          element
        );
      }

      if (element.businessObject && element.businessObject.$attrs) {
        // Verificar namespace er: ou ns0:
        const erTypeAttr =
          element.businessObject.$attrs["er:erType"] ||
          element.businessObject.$attrs["ns0:erType"];

        // TAMBÉM processar conexões (SequenceFlow) para cardinalidades e conexões pai-filho
        const isConnection =
          element.type === "bpmn:SequenceFlow" || element.waypoints;
        const cardinalitySource =
          element.businessObject.$attrs["er:cardinalitySource"] ||
          element.businessObject.$attrs["ns0:cardinalitySource"];
        const cardinalityTarget =
          element.businessObject.$attrs["er:cardinalityTarget"] ||
          element.businessObject.$attrs["ns0:cardinalityTarget"];
        const isParentChild =
          element.businessObject.$attrs["er:isParentChild"] ||
          element.businessObject.$attrs["ns0:isParentChild"];

        if (erTypeAttr || isConnection) {
          if (erTypeAttr) {
            // Definir erType no businessObject para que o renderer aplique o estilo correto
            element.businessObject.erType = erTypeAttr;

            // Para entidades, adicionar propriedades necessárias igual à palette
            const isWeakAttr =
              element.businessObject.$attrs["er:isWeak"] ||
              element.businessObject.$attrs["ns0:isWeak"];
            if (erTypeAttr === "Entity" && isWeakAttr !== undefined) {
              element.businessObject.isWeak = isWeakAttr === "true";
            }

            // Para atributos, adicionar propriedades de chave
            if (erTypeAttr === "Attribute") {
              const isPrimaryKey =
                element.businessObject.$attrs["er:isPrimaryKey"] ||
                element.businessObject.$attrs["ns0:isPrimaryKey"];
              const isForeignKey =
                element.businessObject.$attrs["er:isForeignKey"] ||
                element.businessObject.$attrs["ns0:isForeignKey"];
              const isRequired =
                element.businessObject.$attrs["er:isRequired"] ||
                element.businessObject.$attrs["ns0:isRequired"];
              const isMultivalued =
                element.businessObject.$attrs["er:isMultivalued"] ||
                element.businessObject.$attrs["ns0:isMultivalued"];
              const isDerived =
                element.businessObject.$attrs["er:isDerived"] ||
                element.businessObject.$attrs["ns0:isDerived"];
              const isComposite =
                element.businessObject.$attrs["er:isComposite"] ||
                element.businessObject.$attrs["ns0:isComposite"];

              if (isPrimaryKey !== undefined) {
                element.businessObject.isPrimaryKey = isPrimaryKey === "true";
              }
              if (isForeignKey !== undefined) {
                element.businessObject.isForeignKey = isForeignKey === "true";
              }
              if (isRequired !== undefined) {
                element.businessObject.isRequired = isRequired === "true";
              }
              if (isMultivalued !== undefined) {
                element.businessObject.isMultivalued = isMultivalued === "true";
              }
              if (isDerived !== undefined) {
                element.businessObject.isDerived = isDerived === "true";
              }
              if (isComposite !== undefined) {
                element.businessObject.isComposite = isComposite === "true";
              }
            }

            // Para relacionamentos, adicionar propriedade de identificação
            if (erTypeAttr === "Relationship") {
              const isIdentifying =
                element.businessObject.$attrs["er:isIdentifying"] ||
                element.businessObject.$attrs["ns0:isIdentifying"];
              if (isIdentifying !== undefined) {
                element.businessObject.isIdentifying = isIdentifying === "true";
              }
            }
          }

          // Processar cardinalidades e conexões pai-filho para conexões
          if (
            isConnection &&
            (cardinalitySource || cardinalityTarget || isParentChild)
          ) {
            if (cardinalitySource) {
              element.businessObject.cardinalitySource = cardinalitySource;
            }
            if (cardinalityTarget) {
              element.businessObject.cardinalityTarget = cardinalityTarget;
            }
            if (isParentChild !== undefined) {
              element.businessObject.isParentChild = isParentChild === "true";
            }
          }

          // Forçar re-renderização do elemento
          try {
            // Estratégia 1: graphicsFactory.update
            const gfx = elementRegistry.getGraphics(element);
            if (gfx) {
              logger.info(
                "IMPORT: Estratégia 1: graphicsFactory.update",
                "ER_IMPORT"
              );
              if (isConnection) {
                graphicsFactory.update("connection", element, gfx);
              } else {
                graphicsFactory.update("shape", element, gfx);
              }
            }

            // Estratégia 2: modeling.updateProperties (força evento de mudança)
            logger.info(
              "IMPORT: Estratégia 2: modeling.updateProperties",
              "ER_IMPORT"
            );
            const updateProps: any = {
              name:
                element.businessObject.name ||
                (erTypeAttr ? "Elemento ER" : "Conexão"),
            };
            if (erTypeAttr) updateProps.erType = erTypeAttr;
            if (cardinalitySource)
              updateProps.cardinalitySource = cardinalitySource;
            if (cardinalityTarget)
              updateProps.cardinalityTarget = cardinalityTarget;

            modeling.updateProperties(element, updateProps);
          } catch (renderError) {
            logger.error(
              "Erro ao re-renderizar elemento após importação ER",
              "ER_IMPORT",
              renderError as Error
            );
          }
        } else {
          logger.warn(
            "IMPORT: erType e cardinalidades NÃO encontrados para elemento:",
            element.id
          );
        }
      } else {
        logger.warn(
          "IMPORT: businessObject ou $attrs não encontrado para elemento:",
          element.id
        );
      }
    });

    logger.info("IMPORT: Pós-processamento concluído");
  };

  // Função para importar diagrama (copiada do BpmnModeler)
  const importDiagram = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !modelerRef.current) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const xml = reader.result as string;
        await modelerRef.current!.importXML(xml);

        // IMPORTANTE: Aplicar pós-processamento ER após import
        processErElementsAfterImport();
        notifications.success("Diagrama ER importado com sucesso!");
        logger.info("Diagrama ER importado e processado", "ER_IMPORT");
      } catch (error) {
        logger.error(
          "Erro ao importar diagrama ER",
          "ER_IMPORT",
          error as Error
        );
        notifications.error(
          "Erro ao importar diagrama ER. Verifique se o arquivo é válido."
        );
      }
    };
    reader.readAsText(file);
  };

  // Função para exportar PNG com máxima qualidade e fundo branco
  const exportToPNG = async () => {
    if (!modelerRef.current) return;

    try {
      const { svg } = await modelerRef.current!.saveSVG();

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Não foi possível obter contexto do canvas");
      }

      const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();

      img.onload = function () {
        // Fator de escala ALTO para qualidade máxima (5x = 500 DPI)
        const scaleFactor = 5;
        const highResWidth = img.width * scaleFactor;
        const highResHeight = img.height * scaleFactor;

        canvas.width = highResWidth;
        canvas.height = highResHeight;

        // CONFIGURAÇÕES PARA QUALIDADE MÁXIMA
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // ✅ GARANTIR FUNDO BRANCO SÓLIDO
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, highResWidth, highResHeight);
        // Escalar contexto APÓS pintar o fundo
        ctx.scale(scaleFactor, scaleFactor);

        // Desenhar SVG escalado sobre fundo branco
        ctx.drawImage(img, 0, 0);
        // Converter canvas para PNG com qualidade máxima
        canvas.toBlob(
          (blob) => {
            if (blob) {
              logger.info(
                "PNG ER ALTA QUALIDADE gerado com sucesso",
                "ER_PNG_EXPORT"
              );
              notifications.success(
                "PNG ER de alta qualidade exportado com sucesso!"
              );
              const pngUrl = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = pngUrl;
              a.download = "diagrama-er.png";
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(pngUrl);
            } else {
              logger.error("Erro ao criar blob PNG ER", "ER_PNG_EXPORT");
            }
          },
          "image/png",
          1.0
        ); // Qualidade máxima PNG

        URL.revokeObjectURL(url);
      };

      img.onerror = function () {
        logger.error(
          "Erro ao carregar SVG ER como imagem para PNG",
          "ER_PNG_EXPORT"
        );
        notifications.error("Erro ao processar SVG ER para PNG");
      };

      img.src = url;
    } catch (err) {
      logger.error(
        "Erro crítico na exportação PNG ER",
        "ER_PNG_EXPORT",
        err as Error
      );
      notifications.error(`Erro na exportação PNG ER: ${err}`);
    }
  };

  // Funções para controlar o dropdown de exportação
  const toggleExportDropdown = () => {
    setExportDropdownOpen(!exportDropdownOpen);
  };

  const handleExportOption = (option: string) => {
    setExportDropdownOpen(false);
    switch (option) {
      case "pdf":
        exportToPDF();
        break;
      case "png":
        exportToPNG();
        break;
      case "bpmn":
        exportDiagram();
        break;
      default:
        break;
    }
  };

  // Função para sincronizar propriedades ER antes da exportação
  const syncErPropertiesToAttrs = () => {
    if (!modelerRef.current) return;

    const elementRegistry = modelerRef.current.get("elementRegistry") as any;
    const allElements = elementRegistry.getAll();

    allElements.forEach((element: any) => {
      const businessObject = element.businessObject;
      if (!businessObject) return;

      // Garantir que $attrs existe
      if (!businessObject.$attrs) {
        businessObject.$attrs = {};
      }

      // ✅ SINCRONIZAR PROPRIEDADES PARA TODAS AS ENTIDADES ER
      if (businessObject.erType) {
        // Propriedade base para todos os tipos ER
        businessObject.$attrs["er:erType"] = businessObject.erType;
        businessObject.$attrs["er:type"] = businessObject.erType.toLowerCase();

        if (businessObject.name) {
          businessObject.$attrs["name"] = businessObject.name;
        }

        // ✅ PROPRIEDADES ESPECÍFICAS DE ENTIDADES
        if (businessObject.erType === "Entity") {
          if (businessObject.hasOwnProperty("isWeak")) {
            businessObject.$attrs["er:isWeak"] = businessObject.isWeak
              ? "true"
              : "false";
          }
        }

        // ✅ PROPRIEDADES ESPECÍFICAS DE ATRIBUTOS (PK, FK, etc.)
        if (businessObject.erType === "Attribute") {
          const attrProps = [
            "isPrimaryKey",
            "isForeignKey",
            "isRequired",
            "isMultivalued",
            "isDerived",
            "isComposite",
          ];

          attrProps.forEach((prop) => {
            if (businessObject.hasOwnProperty(prop)) {
              businessObject.$attrs[`er:${prop}`] = businessObject[prop]
                ? "true"
                : "false";
            }
          });

          // Tipo de dados
          if (businessObject.dataType) {
            businessObject.$attrs["er:dataType"] = businessObject.dataType;
          }
        }

        // PROPRIEDADES ESPECÍFICAS DE RELACIONAMENTOS
        if (businessObject.erType === "Relationship") {
          if (businessObject.hasOwnProperty("isIdentifying")) {
            businessObject.$attrs["er:isIdentifying"] =
              businessObject.isIdentifying ? "true" : "false";
          }
        }
      }

      // PROPRIEDADES DE CONEXÕES (cardinalidades, pai-filho)
      if (element.type === "bpmn:SequenceFlow") {
        if (businessObject.cardinalitySource) {
          businessObject.$attrs["er:cardinalitySource"] =
            businessObject.cardinalitySource;
        }
        if (businessObject.cardinalityTarget) {
          businessObject.$attrs["er:cardinalityTarget"] =
            businessObject.cardinalityTarget;
        }
        if (businessObject.hasOwnProperty("isParentChild")) {
          businessObject.$attrs["er:isParentChild"] =
            businessObject.isParentChild ? "true" : "false";
        }
      }
    });

    logger.info("Sincronização de propriedades ER concluída", "ER_EXPORT");
  };

  // Função para exportar diagrama com propriedades ER preservadas
  const exportDiagram = async () => {
    if (!modelerRef.current) return;
    try {
      // SINCRONIZAR PROPRIEDADES ANTES DA EXPORTAÇÃO
      syncErPropertiesToAttrs();

      // DEBUG: Verificar elementos após sincronização
      const elementRegistry = modelerRef.current.get("elementRegistry") as any;
      const allElements = elementRegistry.getAll();
      allElements.forEach((element: any) => {
        if (
          element.businessObject?.erType ||
          element.type === "bpmn:SequenceFlow"
        ) {
          logger.info(
            `EXPORT: ${element.id} - tipo: ${element.type} - erType: ${element.businessObject?.erType}`,
            "ER_EXPORT"
          );
          logger.info(
            `EXPORT: $attrs: ${element.businessObject?.$attrs}`,
            "ER_EXPORT"
          );
        }
      });

      const { xml } = await modelerRef.current!.saveXML({ format: true });
      const xmlString: string = xml ?? "";

      setXml(xmlString);
      const blob = new Blob([xmlString], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "diagrama-er.bpmn";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      notifications.success("Diagrama ER exportado com sucesso!");
      logger.info("ER XML exportado com sucesso", "ER_EXPORT");
    } catch (err) {
      logger.error("Erro ao exportar ER XML", "ER_EXPORT", err as Error);
      notifications.error("Erro ao exportar diagrama ER. Tente novamente.");
    }
  };

  // Função Fit All - ajusta canvas para mostrar todos os elementos
  const handleFitAll = () => {
    if (!modelerRef.current) return;

    safeOperation(
      () => {
        const canvas = modelerRef.current!.get("canvas") as any;
        canvas.zoom("fit-viewport");
        logger.info(
          "Fit All ER executado - canvas ajustado",
          "ER_CANVAS_OPERATION"
        );
        notifications.info(
          "Visualização ER ajustada para mostrar todos os elementos"
        );
      },
      {
        type: ErrorType.ER_CANVAS_OPERATION,
        operation: "Ajustar visualização ER (Fit All)",
        userMessage:
          "Erro ao ajustar visualização ER. Tente fazer zoom manualmente.",
        fallback: () => {
          logger.warn(
            "Fallback: Tentando zoom ER alternativo",
            "ER_CANVAS_OPERATION"
          );
          try {
            const canvas = modelerRef.current!.get("canvas") as any;
            canvas.zoom(1.0); // Zoom padrão como fallback
          } catch (fallbackError) {
            logger.error(
              "Fallback também falhou para Fit All ER",
              "ER_CANVAS_OPERATION",
              fallbackError as Error
            );
          }
        },
      }
    );
  };

  // Fechar dropdown quando clicar fora dele
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (exportDropdownOpen && !target.closest(".export-dropdown-container")) {
        setExportDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [exportDropdownOpen]);

  const setupMinimapToggle = () => {
    setTimeout(() => {
      const minimap = document.querySelector(".djs-minimap");
      if (minimap) {
        // Force minimap to be open by adding the 'open' class that the module expects
        minimap.classList.add("open");

        // Remove the default toggle element completely
        const defaultToggle = minimap.querySelector(".toggle");
        if (defaultToggle) {
          defaultToggle.remove();
        }

        // Remove existing custom toggle button if any
        const existingToggle = minimap.querySelector(".minimap-toggle");
        if (existingToggle) {
          existingToggle.remove();
        }

        // Create our custom toggle button
        const toggleButton = document.createElement("button");
        toggleButton.className = "minimap-toggle";
        toggleButton.innerHTML = minimapMinimized ? "+" : "−";
        toggleButton.setAttribute(
          "title",
          minimapMinimized ? "Expandir minimap" : "Minimizar minimap"
        );

        // Add click event for our toggle
        const handleToggle = (e: Event) => {
          e.stopPropagation();
          const currentMinimized = minimap.classList.contains("minimized");
          const newMinimized = !currentMinimized;
          setMinimapMinimized(newMinimized);

          if (newMinimized) {
            minimap.classList.add("minimized");
            toggleButton.innerHTML = "+";
            toggleButton.setAttribute("title", "Expandir minimap");
          } else {
            minimap.classList.remove("minimized");
            // Keep the 'open' class to ensure functionality
            minimap.classList.add("open");
            toggleButton.innerHTML = "−";
            toggleButton.setAttribute("title", "Minimizar minimap");
          }
        };

        toggleButton.addEventListener("click", handleToggle);

        // Add click event to minimap itself to expand when minimized
        const handleMinimapClick = () => {
          if (minimap.classList.contains("minimized")) {
            setMinimapMinimized(false);
            minimap.classList.remove("minimized");
            minimap.classList.add("open");
            toggleButton.innerHTML = "−";
            toggleButton.setAttribute("title", "Minimizar minimap");
          }
        };

        minimap.addEventListener("click", handleMinimapClick);

        // Append our toggle button to minimap
        minimap.appendChild(toggleButton);

        // Apply initial state - default is maximized and functional
        if (minimapMinimized) {
          minimap.classList.add("minimized");
        } else {
          // Ensure it's functional by default with 'open' class
          minimap.classList.add("open");
        }
      }
    }, 1000); // Wait for minimap to be rendered
  };

  // Função para lidar com saída
  const handleExit = () => {
    if (hasUnsavedChanges) {
      setShowExitModal(true);
    } else {
      window.location.href = "/";
    }
  };

  // Função para salvar e sair
  const handleSaveAndExit = async () => {
    await exportDiagram();
    setHasUnsavedChanges(false);
    setTimeout(() => {
      window.location.href = "/";
    }, 500); // Pequeno delay para garantir o download
  };

  // Função para descartar e sair
  const handleDiscardAndExit = () => {
    setHasUnsavedChanges(false);
    window.location.href = "/";
  };

  // Função para cancelar saída
  const handleCancelExit = () => {
    setShowExitModal(false);
  };

  // Interface de erro
  if (error) {
    return (
      <div className="er-modeler-error-container">
        <h2 className="er-modeler-error-title">
          Erro no ErModelerComponent
        </h2>
        <div className="er-modeler-error-box">
          <p className="er-modeler-error-message">
            <strong>Erro:</strong> {error}
          </p>
          <p className="er-modeler-error-status">Status: {status}</p>
        </div>

        <div className="er-modeler-error-actions">
          <button
            onClick={() => window.location.reload()}
            className="er-modeler-error-button reload"
          >
            Recarregar Página
          </button>
        </div>
      </div>
    );
  }

  // Interface principal
  return (
    <div className="diagram-editor er-modeler">
      <EditorHeader 
        title="Diagrama Entidade Relacionamento"
        actions={
          <>
            <FitButton onClick={handleFitAll} />
            <ExportButton 
              isOpen={exportDropdownOpen}
              onToggle={toggleExportDropdown}
              onExport={handleExportOption}
              options={erExportOptions}
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
        <div ref={canvasRef} className="modeler-container"></div>
        <div className="properties-panel-container">
          <ErPropertiesPanel
            element={selectedElement}
            elements={selectedElements}
            modeler={modelerRef.current}
          />
        </div>
        {loading && (
          <div className="loading-overlay">
            <div className="loading-text">{status}</div>
          </div>
        )}
      </div>            
    </div>
  );
};

export default ErModelerComponent;
