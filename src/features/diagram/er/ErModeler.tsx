import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import BpmnModeler from "bpmn-js/lib/Modeler";
import EditorHeader from "../../../components/common/EditorHeader/EditorHeader";
import {
  FitButton,
  ExportButton,
  ImportButton,
  Minimap,
  ExportOptions,
  ExitConfirmationModal,
} from "../../../components/common";
import erChenModdle from "../schemas/er-chen-moddle.json";
import erCFModdle from "../schemas/er-cf-moddle.json";
import { logger } from "../../../utils/logger";
import { ErrorType, safeOperation } from "../../../utils/errorHandler";
import { notifications } from "../../../utils/notifications";
import { createErModule } from "../shared/providers/er";
import { NOTATION_CONFIGS, NotationConfig } from "../shared/config/er";
import resizeAllModule from "../shared/providers";
import minimapModule from "diagram-js-minimap";
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn.css";
import "@bpmn-io/properties-panel/dist/assets/properties-panel.css";
import "diagram-js-minimap/assets/diagram-js-minimap.css";
import "../../../styles/DiagramEditor.scss";
import "../../../styles/ModelerComponents.scss";
import "../shared/styles/er/ErPalette.scss";
import "../shared/styles/er/ErModeler.scss";
import "../shared/styles/er/ErModelerErrors.scss";
// Icons são agora importados nos componentes individuais
import { ErPropertiesPanel } from "../shared/components/er/properties";
import { useErExportFunctions, useErUnsavedChanges } from "../shared/hooks/er";
import ErSyntaxPanel from "./declarative/ErSyntaxPanel";

// Interface para props do componente
interface ErModelerProps {
  notation: 'chen' | 'crowsfoot';
  title?: string;
  initialDiagramName?: string;
  exportOptions?: ExportOptions;
  minimap?: {
    setupDelay?: number;
    initialMinimized?: boolean;
  };
}

// Opções de exportação padrão para ER
const defaultErExportOptions: ExportOptions = {
  pdf: {
    enabled: true,
    filename: "diagrama-er.pdf",
    label: "Exportar (PDF)",
  },
  png: {
    enabled: true,
    filename: "diagrama-er.png",
    label: "Exportar (PNG)",
  },
  bpmn: {
    enabled: true,
    filename: "er-diagram.bpmn",
    label: "Exportar (.bpmn)",
    extension: "bpmn",
  },
};

// Mapeamento de títulos padrão por notação
const DEFAULT_TITLES: Record<string, string> = {
  chen: "Diagrama ER - Chen",
  crowsfoot: "Diagrama ER Crow's Foot"
};

const ErModeler: React.FC<ErModelerProps> = ({
  notation,
  title,
  initialDiagramName = 'Diagrama ER',
  exportOptions = defaultErExportOptions,
  minimap = { setupDelay: 1000, initialMinimized: false }
}) => {
  // Configuração baseada na notação
  const notationConfig: NotationConfig = NOTATION_CONFIGS[notation];
  const erModdle = notation === 'chen' ? erChenModdle : erCFModdle;
  const headerTitle = title || DEFAULT_TITLES[notation];
  const canvasRef = useRef<HTMLDivElement>(null);
  const modelerRef = useRef<BpmnModeler | null>(null);
  const navigate = useNavigate();
  const initializationRef = useRef<boolean>(false); // Flag para evitar reinicializações
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const [selectedElements, setSelectedElements] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [status, setStatus] = useState<string>("Inicializando...");
  const [isNavigatingViaLogo, setIsNavigatingViaLogo] = useState(false); // Flag para navegação via logo
  const [diagramName, setDiagramName] = useState<string>(initialDiagramName);
  const [isDeclarativeMode, setIsDeclarativeMode] = useState<boolean>(false);

  // Use the new ER hooks for better state management
  const { 
    hasUnsavedChanges, 
    showExitModal, 
    handleExit,
    handleDiscardAndExit,
    handleDiagramChange, 
    handleImportDone,
    handleCancelExit: handleCancelExitFromHook
  } = useErUnsavedChanges(navigate);
  
  // Additional state for BPMN export tracking
  const [hasExportedBpmn, setHasExportedBpmn] = useState(false);

  // Hook de exportação ER
  const {
    exportDropdownOpen,
    setExportDropdownOpen,
    exportDiagram,
    toggleExportDropdown,
    handleExportOption,
  } = useErExportFunctions(modelerRef, diagramName);

  // Interceptar fechamento de aba/janela (mas não quando navegando via logo)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Não mostrar aviso se estamos navegando via logo OU se já exportou .bpmn
      if (isNavigatingViaLogo || hasExportedBpmn) {
        return; // Permitir navegação sem aviso
      }

      if (hasUnsavedChanges && !showExitModal) {
        e.preventDefault();
        return "Você tem alterações não salvas. Tem certeza que deseja sair?";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges, showExitModal, isNavigatingViaLogo, hasExportedBpmn]);

  // The useErUnsavedChanges hook already handles popstate events internally
  // No need to duplicate that logic here

  useEffect(() => {
    if (!canvasRef.current) {
      logger.error("Container ER DOM não encontrado", "ER_SETUP");
      setError("Container do canvas não encontrado");
      setLoading(false);
      return;
    }

    if (initializationRef.current) {
      logger.warn(
        "ErModeler: Inicialização já em progresso (React StrictMode detectado), ignorando duplicata",
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
        // Criar módulo ER baseado na configuração da notação
        const ErModule = createErModule(notationConfig);
        
        // Definir configuração global para o renderer (fallback para injeção de dependência)
        (window as any).currentErNotation = notation;

        // Criar instância do modeler
        const modeler = new BpmnModeler({
          container: canvasRef.current!,
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

        modelerRef.current = modeler;
        setStatus("Aguardando Canvas...");

        const initializeCanvasNaturally = async () => {
          try {
            // Basic Canvas service check
            const canvas = modeler.get("canvas");
            if (!canvas) {
              throw new Error(
                "Canvas service não disponível após inicialização"
              );
            }

            // Verificar container DOM
            if (!canvasRef.current) {
              throw new Error("Container DOM ER não disponível");
            }

            // Wait for canvas to be fully ready
            await new Promise(resolve => setTimeout(resolve, 100));

            // Create minimal BPMN diagram to initialize canvas layers properly
            const minimalDiagram = `<?xml version="1.0" encoding="UTF-8"?>
            <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
                             xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
                             xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" 
                             xmlns:er="http://custom.er.namespace" 
                             id="Definitions_1" 
                             targetNamespace="http://bpmn.io/schema/bpmn">
              <bpmn:process id="Process_1" isExecutable="false">
              </bpmn:process>
              <bpmndi:BPMNDiagram id="BPMNDiagram_1">
                <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
                </bpmndi:BPMNPlane>
              </bpmndi:BPMNDiagram>
            </bpmn:definitions>`;

            // Import minimal diagram to properly initialize canvas layers
            try {
              await modeler.importXML(minimalDiagram);
              logger.info("Canvas ER inicializado com diagrama mínimo", "ER_SETUP");
            } catch (importError) {
              // If import fails, we'll continue anyway since the canvas basic structure is in place
              logger.warn("Aviso: Falha ao importar diagrama mínimo, mas canvas deve funcionar", "ER_SETUP", importError as Error);
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
          // Configurar minimap básico (sem zoom automático)
          const minimap = modeler.get("minimap", false) as any;
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
            }, minimap.setupDelay || 1000);
          } else {
            logger.warn("Minimap não detectado", "ER_SETUP");
          }
        }

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

          eventBus.on("import.done", (event: any) => {
            handleImportDone();
          });

          // Handle property changes and visual updates
          eventBus.on("elements.changed", (event: any) => {
            if (event?.elements?.length) {
              event.elements.forEach((element: any) => {
                // Force visual update for connections with cardinality changes
                if (element.waypoints && (element.businessObject?.cardinalitySource || element.businessObject?.cardinalityTarget)) {
                  try {
                    const renderer = modeler.get('bpmnRenderer') || modeler.get('erBpmnRenderer');
                    
                    if (renderer && typeof (renderer as any).updateConnectionCardinalities === 'function') {
                      // Use the specific renderer method for updating cardinalities
                      (renderer as any).updateConnectionCardinalities(element);
                    } else {
                      // Fallback method
                      const canvas = modeler.get('canvas') as any;
                      const elementRegistry = modeler.get('elementRegistry') as any;
                      
                      if (canvas && elementRegistry && typeof elementRegistry.getGraphics === 'function') {
                        const gfx = elementRegistry.getGraphics(element);
                        
                        if (gfx && typeof canvas.addMarker === 'function') {
                          // Clear existing cardinality visuals
                          const existingLabels = gfx.querySelectorAll('.er-cardinality-label, .er-crowsfoot-marker');
                          existingLabels.forEach((label: any) => label.remove());
                          
                          // Force re-render
                          canvas.addMarker(element, 'er-cardinality-update');
                          setTimeout(() => {
                            if (typeof canvas.removeMarker === 'function') {
                              canvas.removeMarker(element, 'er-cardinality-update');
                            }
                          }, 50);
                        }
                      }
                    }
                  } catch (error) {
                    logger.warn('Failed to update connection visuals', 'ErModeler', error as Error);
                  }
                }
              });
            }
          });

          eventBus.on("commandStack.changed", (event: any) => {
            // Trigger diagram change handler for unsaved changes tracking
            handleDiagramChange();
          });

          // The useErUnsavedChanges hook now handles change detection automatically
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
  }, [notation]); // Dependência da notação para reinicializar quando muda

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
        // const cardinalityTarget =
        //   element.businessObject.$attrs["er:cardinalityTarget"] ||
        //   element.businessObject.$attrs["ns0:cardinalityTarget"];
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
            (cardinalitySource || isParentChild)
          ) {
            if (cardinalitySource) {
              element.businessObject.cardinalitySource = cardinalitySource;
            }
            // if (cardinalityTarget) {
            //   element.businessObject.cardinalityTarget = cardinalityTarget;
            // }
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
            // if (cardinalityTarget)
            //   updateProps.cardinalityTarget = cardinalityTarget;

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
        handleImportDone();
        
        
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
        // if (businessObject.cardinalityTarget) {
        //   businessObject.$attrs["er:cardinalityTarget"] =
        //     businessObject.cardinalityTarget;
        // }
        if (businessObject.hasOwnProperty("isParentChild")) {
          businessObject.$attrs["er:isParentChild"] =
            businessObject.isParentChild ? "true" : "false";
        }
      }
    });

    logger.info("Sincronização de propriedades ER concluída", "ER_EXPORT");
  };

  // Função personalizada para exportação BPMN com lógica ER-específica
  const handleBpmnExport = async () => {
    if (!modelerRef.current) return;

    try {
      // SINCRONIZAR PROPRIEDADES ANTES DA EXPORTAÇÃO
      syncErPropertiesToAttrs();


      // Chamar função de exportação do hook
      await exportDiagram();

      // Marcar que houve exportação .bpmn (salva o estado)
      setHasExportedBpmn(true);
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
  }, [exportDropdownOpen, setExportDropdownOpen]);

  // Função para lidar com saída (via logo)
  const handleLogoClick = () => {
    const shouldShowModal = hasUnsavedChanges && !hasExportedBpmn;
    if (shouldShowModal) {
      // Use hook's method to handle exit logic
      handleExit();
    } else {
      // Marcar que estamos navegando via logo (evita beforeunload)
      setIsNavigatingViaLogo(true);
      // Se não há mudanças não salvas OU já foi exportado, ir direto
      setTimeout(() => {
        window.location.href = "/";
      }, 50); // Pequeno delay para garantir que a flag seja definida
    }
  };

  // Função para confirmar saída (do modal)
  const handleConfirmExit = () => {
    // Marcar que estamos navegando via logo (evita beforeunload)
    setIsNavigatingViaLogo(true);
    handleDiscardAndExit();
  };

  // Função para cancelar saída (do modal) - use hook's method
  const handleCancelExit = () => {
    handleCancelExitFromHook();
  };

  // Função para lidar com mudança do modo declarativo
  const handleDeclarativeModeChange = (enabled: boolean) => {
    setIsDeclarativeMode(enabled);
    
    // Alterar notação do ErRules quando entrar/sair do modo declarativo
    const erRules = (window as any).erRules;
    if (erRules && typeof erRules.setNotation === 'function') {
      // No modo declarativo, sempre usar Crow's Foot (permite conexões diretas entity-entity)
      // No modo visual normal, usar a notação especificada no props
      const targetNotation = enabled ? 'crowsfoot' : notation;
      erRules.setNotation(targetNotation);
      // Notação alterada
    } else {
      console.warn('⚠️ ErRules não disponível para alterar notação');
    }
  };


  // Interface de erro
  if (error) {
    return (
      <div className="er-modeler-error-container">
        <h2 className="er-modeler-error-title">Erro no ErModeler</h2>
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
    <div className={`diagram-editor er-modeler ${isDeclarativeMode ? 'declarative-mode' : ''}`}>
      <EditorHeader
        title={headerTitle}
        onLogoClick={handleLogoClick}
        actions={
          <>
            <FitButton onClick={handleFitAll} />
            <ExportButton
              isOpen={exportDropdownOpen}
              onToggle={toggleExportDropdown}
              onExport={(option: string) => {
                // Para exportação BPMN, executar lógica ER-específica
                if (option === "bpmn") {
                  handleBpmnExport();
                } else {
                  handleExportOption(option as "pdf" | "png" | "bpmn");
                }
              }}
              options={exportOptions}
              openOnHover={true}
            />
            <ImportButton onImport={importDiagram} accept=".bpmn,.xml" />
          </>
        }
      />
      <div className="modeler-content">
        {/* Painel lateral de sintaxe ER (apenas Crow's Foot) */}
        {notation === 'crowsfoot' && (
          <ErSyntaxPanel
            modeler={modelerRef.current}
            isVisible={isDeclarativeMode}
          />
        )}
        
        <div ref={canvasRef} className={`modeler-container ${isDeclarativeMode ? 'with-syntax-panel' : ''}`}></div>
        <div className="properties-panel-container">
          <ErPropertiesPanel
            element={selectedElement}
            elements={selectedElements}
            modeler={modelerRef.current}
            onDiagramNameChange={setDiagramName}
            notation={notation}
            onDeclarativeModeChange={handleDeclarativeModeChange}
          />
        </div>
        <Minimap 
          setupDelay={minimap.setupDelay} 
          initialMinimized={minimap.initialMinimized} 
        />
        
        
        {loading && (
          <div className="loading-overlay">
            <div className="loading-text">{status}</div>
          </div>
        )}
      </div>

      {/* Modal de confirmação de saída */}
      <ExitConfirmationModal
        isOpen={showExitModal}
        onConfirm={handleConfirmExit}
        onCancel={handleCancelExit}
        hasUnsavedChanges={hasUnsavedChanges && !hasExportedBpmn}
        modelType="ER"
      />
    </div>
  );
};

export default ErModeler;