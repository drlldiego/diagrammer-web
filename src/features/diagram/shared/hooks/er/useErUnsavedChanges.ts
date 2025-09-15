import { useState, useEffect } from "react";
import { logger } from "../../../../../utils/logger";

export const useErUnsavedChanges = () => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  // Interceptar fechamento de aba/janela
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && !showExitModal) {
        e.preventDefault();
        logger.info(
          "Usuário tentou sair com mudanças ER não salvas",
          "ER_UNSAVED_CHANGES"
        );
        return "Você tem alterações ER não salvas. Tem certeza que deseja sair?";
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
        logger.info(
          "Navegação bloqueada devido a mudanças ER não salvas",
          "ER_UNSAVED_CHANGES"
        );
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [hasUnsavedChanges, showExitModal]);

  // Função para lidar com saída
  const handleExit = () => {
    if (hasUnsavedChanges) {
      setShowExitModal(true);
      logger.info("Modal de saída ER exibido", "ER_UNSAVED_CHANGES");
    } else {
      logger.info("Saindo do ER Editor sem mudanças", "ER_UNSAVED_CHANGES");
      window.location.href = "/";
    }
  };

  // Função para salvar e sair (será configurada externamente)
  const handleSaveAndExit = async (exportFn?: () => Promise<void>) => {
    logger.info("Salvando ER e saindo", "ER_UNSAVED_CHANGES");
    if (exportFn) {
      await exportFn();
    }
    setHasUnsavedChanges(false);
    setTimeout(() => {
      window.location.href = "/";
    }, 500); // Pequeno delay para garantir o download
  };

  // Função para descartar e sair
  const handleDiscardAndExit = () => {
    logger.info("Descartando mudanças ER e saindo", "ER_UNSAVED_CHANGES");
    setHasUnsavedChanges(false);
    window.location.href = "/";
  };

  // Função para cancelar saída
  const handleCancelExit = () => {
    logger.debug("Cancelando saída do ER Editor", "ER_UNSAVED_CHANGES");
    setShowExitModal(false);
  };

  const handleDiagramChange = () => {
    if (!hasUnsavedChanges) {
      logger.debug("Primeira mudança ER detectada", "ER_UNSAVED_CHANGES");
    }
    setHasUnsavedChanges(true);
  };

  const handleImportDone = () => {
    logger.debug(
      "Import ER concluído - resetando estado de mudanças",
      "ER_UNSAVED_CHANGES"
    );
    setHasUnsavedChanges(false);
  };

  return {
    hasUnsavedChanges,
    showExitModal,
    handleExit,
    handleSaveAndExit,
    handleDiscardAndExit,
    handleCancelExit,
    handleDiagramChange,
    handleImportDone,
  };
};