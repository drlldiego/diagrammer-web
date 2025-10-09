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
import { ErPropertiesPanel } from "./shared/properties/components";
import { useErExportFunctions, useErUnsavedChanges } from "../shared/hooks/er";
import ErSyntaxPanel from "./declarative/ErSyntaxPanel";

/**
 * Utilitários para processamento de propriedades ER em elementos do diagrama
 * Inclui leitura de atributos XML, aplicação ao businessObject e sincronização reversa
 */
const ErPropertyUtils = {
  PROPERTIES: {
    Entity: ["isWeak"],
    Attribute: [
      "isPrimaryKey",
      "isRequired",
      "isMultivalued",
      "isDerived",
      "isComposite",
      "dataType",
    ],
    Relationship: ["isIdentifying"],
    Connection: ["cardinalitySource", "isParentChild"],
  },

  /**
   * Lê propriedade ER dos atributos XML ($attrs)
   * Suporta namespaces "er:" e "ns0:"
   */
  readFromAttrs(element: any, propName: string): string | undefined {
    return (
      element.businessObject?.$attrs?.[`er:${propName}`] ||
      element.businessObject?.$attrs?.[`ns0:${propName}`]
    );
  },

  /**
   * Aplica propriedades ER ao businessObject com base no tipo ER
   * Converte valores "true"/"false" para booleanos, mantém outros valores como strings
   */
  applyToBusinessObject(element: any, erType: string) {
    const properties =
      ErPropertyUtils.PROPERTIES[
        erType as keyof typeof ErPropertyUtils.PROPERTIES
      ] || [];

    properties.forEach((prop) => {
      const value = ErPropertyUtils.readFromAttrs(element, prop);
      if (value !== undefined) {
        if (prop === "dataType") {
          element.businessObject[prop] = value;
        } else {
          element.businessObject[prop] = value === "true";
        }
      }
    });
  },

  /**
   * Sincroniza propriedades do businessObject para $attrs
   * Garante que todas as propriedades ER sejam refletidas nos atributos XML
   * Inclui propriedades específicas de conexões
   */
  syncToAttrs(element: any) {
    const businessObject = element.businessObject;
    if (!businessObject?.erType) return;

    if (!businessObject.$attrs) {
      businessObject.$attrs = {};
    }

    businessObject.$attrs["er:erType"] = businessObject.erType;
    businessObject.$attrs["er:type"] = businessObject.erType.toLowerCase();

    if (businessObject.name) {
      businessObject.$attrs["name"] = businessObject.name;
    }

    const properties =
      ErPropertyUtils.PROPERTIES[
        businessObject.erType as keyof typeof ErPropertyUtils.PROPERTIES
      ] || [];
    properties.forEach((prop) => {
      if (businessObject.hasOwnProperty(prop)) {
        if (prop === "dataType") {
          businessObject.$attrs[`er:${prop}`] = businessObject[prop];
        } else {
          businessObject.$attrs[`er:${prop}`] = businessObject[prop]
            ? "true"
            : "false";
        }
      }
    });
  },
};

/**
 * Props do componente ErModeler
 * Inclui notação, título, nome inicial do diagrama, opções de exportação e configuração do minimap
 */
interface ErModelerProps {
  notation: "chen" | "crowsfoot";
  title?: string;
  initialDiagramName?: string;
  exportOptions?: ExportOptions;
  minimap?: {
    setupDelay?: number;
    initialMinimized?: boolean;
  };
}

/**
 * Opções de exportação padrão para diagramas ER
 * Inclui PDF, PNG e BPMN com nomes de arquivo e rótulos padrão
 */
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

/**
 * Títulos padrão por notação ER
 * Usados se nenhum título personalizado for fornecido via props
 */
const DEFAULT_TITLES: Record<string, string> = {
  chen: "Diagrama ER - Chen",
  crowsfoot: "Diagrama ER Crow's Foot",
};

/**
 * Componente principal do modelador ER
 * Gerencia a criação e edição de diagramas Entidade-Relacionamento
 * Suporta notações Chen e Crow's Foot com modo declarativo
 * Inclui funcionalidades de importação, exportação, painel de propriedades e minimap
 * Gerencia estado do diagrama, seleção de elementos e alterações não salvas
 * Renderiza a interface do utilizador com cabeçalho, botões de ação e painel de propriedades
 */
const ErModeler: React.FC<ErModelerProps> = ({
  notation,
  title,
  initialDiagramName = "Diagrama ER",
  exportOptions = defaultErExportOptions,
  minimap = { setupDelay: 1000, initialMinimized: false },
}) => {
  const notationConfig: NotationConfig = NOTATION_CONFIGS[notation];
  const erModdle = notation === "chen" ? erChenModdle : erCFModdle;
  const headerTitle = title || DEFAULT_TITLES[notation];
  const canvasRef = useRef<HTMLDivElement>(null);
  const modelerRef = useRef<BpmnModeler | null>(null);
  const navigate = useNavigate();
  const initializationRef = useRef<boolean>(false);
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const [selectedElements, setSelectedElements] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [status, setStatus] = useState<string>("Inicializando...");
  const [isNavigatingViaLogo, setIsNavigatingViaLogo] = useState(false);
  const [diagramName, setDiagramName] = useState<string>(initialDiagramName);
  const [isDeclarativeMode, setIsDeclarativeMode] = useState<boolean>(false);

  const {
    hasUnsavedChanges,
    showExitModal,
    handleExit,
    handleDiscardAndExit,
    handleDiagramChange,
    handleImportDone,
    handleCancelExit: handleCancelExitFromHook,
  } = useErUnsavedChanges(navigate);

  const [hasExportedBpmn, setHasExportedBpmn] = useState(false);

  const {
    exportDropdownOpen,
    setExportDropdownOpen,
    exportDiagram,
    toggleExportDropdown,
    handleExportOption,
  } = useErExportFunctions(modelerRef, diagramName);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isNavigatingViaLogo || hasExportedBpmn) {
        return;
      }

      if (hasUnsavedChanges && !showExitModal) {
        e.preventDefault();
        return "Você tem alterações não salvas. Tem certeza que deseja sair?";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges, showExitModal, isNavigatingViaLogo, hasExportedBpmn]);

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

    initializationRef.current = true;

    setStatus("Criando modeler...");

    const initializeModeler = async () => {
      try {
        const ErModule = createErModule(notationConfig);
        (window as any).currentErNotation = notation;
        const modeler = new BpmnModeler({
          container: canvasRef.current!,
          additionalModules: [ErModule, resizeAllModule, minimapModule],
          moddleExtensions: {
            er: erModdle,
          },
        });

        modelerRef.current = modeler;
        setStatus("Aguardando Canvas...");

        const initializeCanvasNaturally = async () => {
          try {
            const canvas = modeler.get("canvas");
            if (!canvas) {
              throw new Error(
                "Canvas service não disponível após inicialização"
              );
            }

            if (!canvasRef.current) {
              throw new Error("Container DOM ER não disponível");
            }

            await new Promise((resolve) => setTimeout(resolve, 100));

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

            try {
              await modeler.importXML(minimalDiagram);
              logger.info(
                "Canvas ER inicializado com diagrama mínimo",
                "ER_SETUP"
              );
            } catch (importError) {
              logger.warn(
                "Aviso: Falha ao importar diagrama mínimo, mas canvas deve funcionar",
                "ER_SETUP",
                importError as Error
              );
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
          const minimap = modeler.get("minimap", false) as any;
        }

        const elementRegistry = modeler.get("elementRegistry") as any;
        const modeling = modeler.get("modeling") as any;
        const graphicsFactory = modeler.get("graphicsFactory") as any;
        const allElements = elementRegistry.getAll();

        const canvas = modeler.get("canvas") as any;
        if (canvas) {
          logger.debug("Canvas ER obtido com sucesso", "ER_SETUP");
          const minimap = modeler.get("minimap", false) as any;
          if (minimap) {
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

        const eventBus = modeler.get("eventBus") as any;
        if (eventBus) {
          eventBus.on("selection.changed", (event: any) => {
            const element = event?.newSelection?.[0] || null;
            const elements = event?.newSelection || [];
            setSelectedElement(element);
            setSelectedElements(elements);

            const contextPad = modeler.get("contextPad") as any;
            if (elements.length > 1) {
              try {
                contextPad.close();

                if ((contextPad as any)._multiSelectBlock) {
                  clearTimeout((contextPad as any)._multiSelectBlock);
                }

                if (!(contextPad as any)._originalOpen) {
                  (contextPad as any)._originalOpen = contextPad.open;
                }

                contextPad.open = () => {};

                (contextPad as any)._multiSelectBlock = setTimeout(() => {},
                10000);
              } catch (error) {
                logger.error(
                  "Erro ao bloquear contextPad para seleção múltipla",
                  "ER_SETUP",
                  error as Error
                );
              }
            } else if (elements.length <= 1) {
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

          eventBus.on("elements.changed", (event: any) => {
            if (event?.elements?.length) {
              event.elements.forEach((element: any) => {
                if (
                  element.waypoints &&
                  (element.businessObject?.cardinalitySource ||
                    element.businessObject?.cardinalityTarget)
                ) {
                  try {
                    const renderer =
                      modeler.get("bpmnRenderer") ||
                      modeler.get("erBpmnRenderer");

                    if (
                      renderer &&
                      typeof (renderer as any).updateConnectionCardinalities ===
                        "function"
                    ) {
                      (renderer as any).updateConnectionCardinalities(element);
                    } else {
                      const canvas = modeler.get("canvas") as any;
                      const elementRegistry = modeler.get(
                        "elementRegistry"
                      ) as any;

                      if (
                        canvas &&
                        elementRegistry &&
                        typeof elementRegistry.getGraphics === "function"
                      ) {
                        const gfx = elementRegistry.getGraphics(element);

                        if (gfx && typeof canvas.addMarker === "function") {
                          const existingLabels = gfx.querySelectorAll(
                            ".er-cardinality-label, .er-crowsfoot-marker"
                          );
                          existingLabels.forEach((label: any) =>
                            label.remove()
                          );

                          canvas.addMarker(element, "er-cardinality-update");
                          setTimeout(() => {
                            if (typeof canvas.removeMarker === "function") {
                              canvas.removeMarker(
                                element,
                                "er-cardinality-update"
                              );
                            }
                          }, 50);
                        }
                      }
                    }
                  } catch (error) {
                    logger.warn(
                      "Failed to update connection visuals",
                      "ErModeler",
                      error as Error
                    );
                  }
                }
              });
            }
          });

          eventBus.on("commandStack.changed", (event: any) => {
            handleDiagramChange();
          });
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

    return () => {
      if (modelerRef.current) {
        try {
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
      if (canvasRef.current) {
        canvasRef.current.innerHTML = "";
      }
      initializationRef.current = false;
    };
  }, [notation]);

  /**
   * Processa elementos ER após importação de diagrama
   * Configura propriedades ER a partir dos atributos XML
   */
  const processErElementsAfterImport = () => {
    if (!modelerRef.current) return;

    const elementRegistry = modelerRef.current.get("elementRegistry") as any;
    const modeling = modelerRef.current.get("modeling") as any;
    const graphicsFactory = modelerRef.current.get("graphicsFactory") as any;

    const allElements = elementRegistry.getAll();

    allElements.forEach((element: any) => {
      if (element.type === "bpmn:UserTask") {
        logger.warn(
          "Elemento UserTask detectado (pode ser atributo com erro de import):",
          element.id
        );
      }

      if (!element.businessObject?.$attrs) return;

      const erTypeAttr = ErPropertyUtils.readFromAttrs(element, "erType");
      const isConnection =
        element.type === "bpmn:SequenceFlow" || element.waypoints;

      if (erTypeAttr) {
        element.businessObject.erType = erTypeAttr;
        ErPropertyUtils.applyToBusinessObject(element, erTypeAttr);
      }

      if (isConnection) {
        ErPropertyUtils.applyToBusinessObject(element, "Connection");
      }

      if (erTypeAttr || isConnection) {
        try {
          const gfx = elementRegistry.getGraphics(element);
          if (gfx) {
            if (isConnection) {
              graphicsFactory.update("connection", element, gfx);
            } else {
              graphicsFactory.update("shape", element, gfx);
            }
          }

          const updateProps: any = {
            name:
              element.businessObject.name ||
              (erTypeAttr ? "Elemento ER" : "Conexão"),
          };
          if (erTypeAttr) updateProps.erType = erTypeAttr;

          modeling.updateProperties(element, updateProps);
        } catch (renderError) {
          logger.error(
            "Erro ao re-renderizar elemento após importação ER",
            "ER_IMPORT",
            renderError as Error
          );
        }
      }
    });

    logger.info("IMPORT: Pós-processamento concluído");
  };

  /**
   * Importa diagrama ER de arquivo
   * @param event - Evento de seleção de arquivo
   */
  const importDiagram = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !modelerRef.current) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const xml = reader.result as string;
        await modelerRef.current!.importXML(xml);

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

  /**
   * Sincroniza propriedades ER para atributos XML antes da exportação
   * Garante que todas as propriedades ER sejam mantidas no XML exportado
   */
  const syncErPropertiesToAttrs = () => {
    if (!modelerRef.current) return;

    const elementRegistry = modelerRef.current.get("elementRegistry") as any;
    const allElements = elementRegistry.getAll();

    allElements.forEach((element: any) => {
      ErPropertyUtils.syncToAttrs(element);

      // Processar conexões separadamente
      if (element.type === "bpmn:SequenceFlow") {
        const businessObject = element.businessObject;
        if (!businessObject.$attrs) businessObject.$attrs = {};

        if (businessObject.cardinalitySource) {
          businessObject.$attrs["er:cardinalitySource"] =
            businessObject.cardinalitySource;
        }
        if (businessObject.hasOwnProperty("isParentChild")) {
          businessObject.$attrs["er:isParentChild"] =
            businessObject.isParentChild ? "true" : "false";
        }
      }
    });

    logger.info("Sincronização de propriedades ER concluída", "ER_EXPORT");
  };

  /**
   * Exporta diagrama ER em formato BPMN
   * Inclui sincronização de propriedades ER antes da exportação
   */
  const handleBpmnExport = async () => {
    if (!modelerRef.current) return;

    try {
      syncErPropertiesToAttrs();
      await exportDiagram();
      setHasExportedBpmn(true);
    } catch (err) {
      logger.error("Erro ao exportar ER XML", "ER_EXPORT", err as Error);
      notifications.error("Erro ao exportar diagrama ER. Tente novamente.");
    }
  };

  /**
   * Ajusta a visualização do canvas para mostrar todos os elementos
   */
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
            canvas.zoom(1.0);
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

  /**
   * Lida com clique no logo para navegação
   * Verifica se há alterações não salvas antes de navegar
   */
  const handleLogoClick = () => {
    const shouldShowModal = hasUnsavedChanges && !hasExportedBpmn;
    if (shouldShowModal) {
      handleExit();
    } else {
      setIsNavigatingViaLogo(true);
      setTimeout(() => {
        window.location.href = "/";
      }, 50);
    }
  };

  /**
   * Lida com ações de saída do diagrama
   */
  const handleExitAction = {
    confirm: () => {
      setIsNavigatingViaLogo(true);
      handleDiscardAndExit();
    },
    cancel: () => handleCancelExitFromHook(),
  };

  /**
   * Altera o modo declarativo do diagrama
   * @param enabled - Se o modo declarativo deve ser ativado
   */
  const handleDeclarativeModeChange = (enabled: boolean) => {
    setIsDeclarativeMode(enabled);

    const erRules = (window as any).erRules;
    if (erRules && typeof erRules.setNotation === "function") {
      const targetNotation = enabled ? "crowsfoot" : notation;
      erRules.setNotation(targetNotation);
    } else {
      console.warn("⚠️ ErRules não disponível para alterar notação");
    }
  };

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

  return (
    <div
      className={`diagram-editor er-modeler ${
        isDeclarativeMode ? "declarative-mode" : ""
      }`}
    >
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
        {notation === "crowsfoot" && (
          <ErSyntaxPanel
            modeler={modelerRef.current}
            isVisible={isDeclarativeMode}
            onDiagramNameChange={setDiagramName}
          />
        )}

        <div
          ref={canvasRef}
          className={`modeler-container ${
            isDeclarativeMode ? "with-syntax-panel" : ""
          }`}
        ></div>
        <div className="properties-panel-container">
          <ErPropertiesPanel
            element={selectedElement}
            elements={selectedElements}
            modeler={modelerRef.current}
            diagramName={diagramName}
            onDiagramNameChange={setDiagramName}
            notation={notation}
            onDeclarativeModeChange={handleDeclarativeModeChange}
          />
        </div>

        <Minimap
          setupDelay={minimap.setupDelay}
          initialMinimized={minimap.initialMinimized}
          isDeclarativeMode={isDeclarativeMode}
        />

        {loading && (
          <div className="loading-overlay">
            <div className="loading-text">{status}</div>
          </div>
        )}
      </div>

      <ExitConfirmationModal
        isOpen={showExitModal}
        onConfirm={handleExitAction.confirm}
        onCancel={handleExitAction.cancel}
        hasUnsavedChanges={hasUnsavedChanges && !hasExportedBpmn}
        modelType="ER"
      />
    </div>
  );
};

export default ErModeler;
