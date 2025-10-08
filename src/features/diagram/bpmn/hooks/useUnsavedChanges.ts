import { useState, useEffect } from "react";

export const useUnsavedChanges = () => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [hasExportedBpmn, setHasExportedBpmn] = useState(false);
  const [isNavigatingViaLogo, setIsNavigatingViaLogo] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  // Função para lidar com saída (via logo)
  const handleLogoClick = () => {
    const shouldShowModal = hasUnsavedChanges && !hasExportedBpmn;
    if (shouldShowModal) {
      setShowExitModal(true);
    } else {
      setIsNavigatingViaLogo(true);
      setTimeout(() => {
        window.location.href = "/";
      }, 50);
    }
  };

  const handleConfirmExit = () => {
    setShowExitModal(false);
    setIsNavigatingViaLogo(true);
    setTimeout(() => {
      window.location.href = "/";
    }, 50);
  };

  const handleCancelExit = () => {
    setShowExitModal(false);
  };

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
