import { useEffect, useRef, useState, useCallback } from "react";
import BpmnModeler from "bpmn-js/lib/Modeler";
import minimapModule from "diagram-js-minimap";
import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule,
} from "bpmn-js-properties-panel";
import BpmnColorPickerModule from "bpmn-js-color-picker";
import customTranslateModule from "../i18n/translation-module";
import resizeAllModule from "../../shared/ResizeAllRules";
import { logger } from "../../../../utils/logger";
import {
  ErrorHandler,
  ErrorType,
  safeAsyncOperation,
  safeOperation,
} from "../../../../utils/errorHandler";
import { notifications } from "../../../../utils/notifications";

export const useModelerSetup = (
  containerRef: React.RefObject<HTMLDivElement | null>,
  panelRef: React.RefObject<HTMLDivElement | null>,
  onDiagramChange: () => void,
  onImportDone: () => void
) => {
  const modelerRef = useRef<BpmnModeler | null>(null);

  useEffect(() => {
    if (!containerRef.current || !panelRef.current) {
      logger.warn(
        "Containers DOM não estão disponíveis, aguardando...",
        "BPMN_SETUP"
      );
      return;
    }

    if (modelerRef.current) {
      logger.debug("Modeler já inicializado, ignorando setup duplicado", "BPMN_SETUP");
      return;
    }

    logger.info("Iniciando setup do BPMN Modeler", "BPMN_SETUP");

    // Limpeza prévia total
    if (containerRef.current) {
      containerRef.current.innerHTML = "";
    }
    if (panelRef.current) {
      panelRef.current.innerHTML = "";
    }

    try {
      modelerRef.current = new BpmnModeler({
        container: containerRef.current,
        propertiesPanel: {
          parent: panelRef.current,
        },
        additionalModules: [
          BpmnPropertiesPanelModule,
          BpmnPropertiesProviderModule,
          BpmnColorPickerModule,
          resizeAllModule,
          minimapModule,
          customTranslateModule, 
        ],
      });
      logger.info("BPMN Modeler criado com sucesso", "BPMN_SETUP");
    } catch (modelerError) {
      logger.error(
        "Falha crítica ao criar BPMN Modeler",
        "BPMN_SETUP",
        modelerError as Error
      );
      return; // Não continuar se o modeler não foi criado
    }

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

    // Aguardar que o modeler esteja completamente inicializado antes de importar
    const initializeWithDelay = async () => {
      // Aguardar o próximo tick para garantir que o modeler esteja pronto
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verificar se o modeler e seus componentes estão prontos
      if (!modelerRef.current) {
        logger.error("Modeler não está disponível após criação", "BPMN_SETUP");
        throw new Error("Modeler não inicializado");
      }

      // Verificar se o canvas está acessível
      try {
        const canvas = modelerRef.current.get("canvas");
        if (!canvas) {
          throw new Error("Canvas não disponível");
        }
        logger.debug("Modeler e canvas prontos para importação", "BPMN_SETUP");
      } catch (canvasError) {
        throw new Error(`Canvas não acessível: ${canvasError}`);
      }

      await safeAsyncOperation(
        () => modelerRef.current!.importXML(initialDiagram),
        {
          type: ErrorType.BPMN_SETUP,
          operation: "Importar diagrama inicial",
          userMessage:
            "Erro ao carregar diagrama inicial. A funcionalidade pode estar limitada.",
          showNotification: false, // Não mostrar notificação para o diagrama inicial
          fallback: () => {
            logger.warn(
              "Diagrama inicial não pôde ser carregado, continuando sem ele",
              "BPMN_SETUP"
            );
            // Tentar criar um diagrama mínimo como fallback
            setTimeout(async () => {
              try {
                if (modelerRef.current) {
                  // Tentar importar um diagrama ainda mais simples
                  const minimalDiagram = `<?xml version="1.0" encoding="UTF-8"?>
                    <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
                                      targetNamespace="http://bpmn.io/schema/bpmn">
                      <bpmn:process id="Process_1" isExecutable="false" />
                    </bpmn:definitions>`;

                  await modelerRef.current.importXML(minimalDiagram);
                  logger.info(
                    "Diagrama mínimo carregado como fallback",
                    "BPMN_SETUP"
                  );
                }
              } catch (fallbackError) {
                logger.error(
                  "Todos os fallbacks falharam",
                  "BPMN_SETUP",
                  fallbackError as Error
                );
                // Como último recurso, deixar o editor vazio
                logger.info(
                  "Editor continuará vazio - funcionalidade limitada mas utilizável",
                  "BPMN_SETUP"
                );
              }
            }, 300);
          },
        }
      );
    };

    initializeWithDelay();

    // Setup de detecção de mudanças APÓS criação do modeler
    const handleDiagramChange = () => {
      onDiagramChange();
    };

    const handleImportDone = () => {
      onImportDone();
      logger.info(
        "BPMN importação concluída - tradução português ativa",
        "BPMN_SETUP"
      );
    };

    // Escutar múltiplos eventos de mudança
    modelerRef.current.on("commandStack.changed", handleDiagramChange);
    modelerRef.current.on("elements.changed", handleDiagramChange);
    modelerRef.current.on("shape.added", handleDiagramChange);
    modelerRef.current.on("shape.removed", handleDiagramChange);
    modelerRef.current.on("connection.added", handleDiagramChange);
    modelerRef.current.on("connection.removed", handleDiagramChange);
    modelerRef.current.on("import.done", handleImportDone);

    return () => {
      // Limpeza para evitar interferência com outros editores
      if (modelerRef.current) {
        modelerRef.current.destroy();
        modelerRef.current = null;
      }

      // Forçar limpeza do DOM
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
      if (panelRef.current) {
        panelRef.current.innerHTML = "";
      }
    };
  }, []); // Remover dependências que causam re-renders

  const importDiagram = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !modelerRef.current) return;

    logger.info(`Iniciando importação do arquivo: ${file.name}`, "BPMN_IMPORT");

    const reader = new FileReader();
    reader.onload = async () => {
      await safeAsyncOperation(
        async () => {
          const xml = reader.result as string;
          await modelerRef.current!.importXML(xml);
          notifications.success(
            `Diagrama "${file.name}" importado com sucesso!`
          );
          logger.info(
            `Diagrama importado com sucesso: ${file.name}`,
            "BPMN_IMPORT"
          );
        },
        {
          type: ErrorType.BPMN_IMPORT,
          operation: `Importar diagrama: ${file.name}`,
          userMessage: `Erro ao importar "${file.name}". Verifique se é um arquivo BPMN válido.`,
          fallback: () => {
            logger.warn(
              `Fallback: Limpando input de arquivo após falha na importação`,
              "BPMN_IMPORT"
            );
            event.target.value = ""; // Limpar input para permitir nova tentativa
          },
        }
      );
    };

    reader.onerror = () => {
      ErrorHandler.handle({
        type: ErrorType.FILE_OPERATION,
        operation: `Ler arquivo: ${file.name}`,
        userMessage: `Erro ao ler o arquivo "${file.name}". Tente novamente.`,
        fallback: () => {
          event.target.value = ""; // Limpar input
        },
      });
    };

    reader.readAsText(file);
  };

  const handleFitAll = () => {
    if (!modelerRef.current) return;

    safeOperation(
      () => {
        const canvas = modelerRef.current!.get("canvas") as any;
        canvas.zoom("fit-viewport");
        logger.info(
          "Fit All executado - canvas ajustado",
          "CANVAS_OPERATION"
        );
        notifications.info(
          "Visualização ajustada"
        );
      },
      {
        type: ErrorType.CANVAS_OPERATION,
        operation: "Ajustar visualização (Fit All)",
        userMessage:
          "Erro ao ajustar visualização. Tente fazer zoom manualmente.",
        fallback: () => {
          logger.warn(
            "Fallback: Tentando zoom alternativo",
            "CANVAS_OPERATION"
          );
          try {
            const canvas = modelerRef.current!.get("canvas") as any;
            canvas.zoom(1.0); // Zoom padrão como fallback
          } catch (fallbackError) {
            logger.error(
              "Fallback também falhou para Fit All",
              "CANVAS_OPERATION",
              fallbackError as Error
            );
          }
        },
      }
    );
  };

  return {
    modelerRef,
    importDiagram,
    handleFitAll,
  };
};
