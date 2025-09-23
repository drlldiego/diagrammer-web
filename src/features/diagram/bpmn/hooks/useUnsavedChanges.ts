import { useState, useEffect } from "react";

export const useUnsavedChanges = () => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [hasExportedBpmn, setHasExportedBpmn] = useState(false);
  const [isNavigatingViaLogo, setIsNavigatingViaLogo] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  // Interceptar fechamento de aba/janela - REMOVIDO para evitar modal nativo do browser

  // Interceptar navegação de volta do browser - REMOVIDO para evitar modal indesejado

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
