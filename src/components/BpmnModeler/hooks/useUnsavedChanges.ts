import { useState, useEffect } from "react";

export const useUnsavedChanges = () => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  // Interceptar fechamento de aba/janela
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && !showExitModal) {
        e.preventDefault();
        // Para fechamento direto da aba/janela, usar texto customizado        
        return 'Você tem alterações não salvas. Tem certeza que deseja sair?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, showExitModal]);

  // Interceptar navegação de volta do browser
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (hasUnsavedChanges && !showExitModal) {
        e.preventDefault();
        window.history.pushState(null, '', window.location.href);
        setShowExitModal(true);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [hasUnsavedChanges, showExitModal]);

  // Função para lidar com saída
  const handleExit = () => {
    if (hasUnsavedChanges) {
      setShowExitModal(true);
    } else {
      window.location.href = '/';
    }
  };

  // Função para salvar e sair (será configurada externamente)
  const handleSaveAndExit = async (exportFn?: () => Promise<void>) => {
    if (exportFn) {
      await exportFn();
    }
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

  const handleDiagramChange = () => {
    setHasUnsavedChanges(true);
  };

  const handleImportDone = () => {
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
    handleImportDone
  };
};