import { useState, useEffect } from "react";

export const useUnsavedChanges = () => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [hasExportedBpmn, setHasExportedBpmn] = useState(false);
  const [isNavigatingViaLogo, setIsNavigatingViaLogo] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  // Interceptar fechamento de aba/janela (mas não quando navegando via logo)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Não mostrar aviso se estamos navegando via logo OU se já exportou .bpmn
      if (isNavigatingViaLogo || hasExportedBpmn) {
        return; // Permitir navegação sem aviso
      }

      if (hasUnsavedChanges && !showExitModal) {
        e.preventDefault();
        // Para fechamento direto da aba/janela, usar texto customizado
        return "Você tem alterações não salvas. Tem certeza que deseja sair?";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges, showExitModal, isNavigatingViaLogo, hasExportedBpmn]);

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

  // Função para lidar com saída (via logo)
  const handleLogoClick = () => {
    const shouldShowModal = hasUnsavedChanges && !hasExportedBpmn;
    if (shouldShowModal) {
      setShowExitModal(true);
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
    setShowExitModal(false);
    // Marcar que estamos navegando via logo (evita beforeunload)
    setIsNavigatingViaLogo(true);
    setTimeout(() => {
      window.location.href = "/";
    }, 50);
  };

  // Função para cancelar saída (do modal)
  const handleCancelExit = () => {
    setShowExitModal(false);
  };

  // Função para marcar exportação .bpmn
  const markBpmnExported = () => {
    setHasExportedBpmn(true);
  };

  const handleDiagramChange = () => {
    setHasUnsavedChanges(true);
  };

  const handleImportDone = () => {
    setHasUnsavedChanges(false);
  };

  return {
    hasUnsavedChanges,
    hasExportedBpmn,
    isNavigatingViaLogo,
    showExitModal,
    handleLogoClick,
    handleConfirmExit,
    handleCancelExit,
    handleDiagramChange,
    handleImportDone,
    markBpmnExported,
  };
};
