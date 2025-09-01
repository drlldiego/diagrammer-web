import React from 'react';
import './ExitConfirmationModal.css';

interface ExitConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  hasUnsavedChanges: boolean;
  modelType: string; // "ER" ou "BPMN"
}

export const ExitConfirmationModal: React.FC<ExitConfirmationModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  hasUnsavedChanges,
  modelType
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div className="exit-modal-backdrop" onClick={handleBackdropClick}>
      <div className="exit-modal-content">
        <div className="exit-modal-header">
          <h2>Sair do {modelType === 'ER' ? 'Diagrama ER' : 'Diagrama BPMN'}?</h2>
          <button 
            className="exit-modal-close-button"
            onClick={onCancel}
            aria-label="Fechar modal"
          >
            ×
          </button>
        </div>
        
        <div className="exit-modal-body">
          {hasUnsavedChanges ? (
            <>
              <div className="exit-modal-warning">
                <div className="warning-icon">⚠️</div>
                <div className="warning-content">
                  <h3>Alterações não salvas detectadas</h3>
                  <p>
                    Foram realizadas alterações no diagrama. 
                    Se sair agora, todas as alterações serão perdidas.
                  </p>
                </div>
              </div>
              
              <div className="exit-modal-recommendation">
                <h4>💡 Recomendação:</h4>
                <p>
                  Antes de sair, considere exportar o diagrama no formato <strong>.bpmn </strong>
                  para salvar as suas alterações.
                </p>
              </div>
            </>
          ) : (
            <div className="exit-modal-safe">
              <div className="safe-icon">✅</div>
              <p>Todas as alterações foram salvas. É seguro sair.</p>
            </div>
          )}
        </div>
        
        <div className="exit-modal-footer">
          <button 
            className="exit-modal-button exit-modal-cancel"
            onClick={onCancel}
          >
            Continuar a edição
          </button>
          <button 
            className="exit-modal-button exit-modal-confirm"
            onClick={onConfirm}
          >
            {hasUnsavedChanges ? 'Sair sem salvar' : 'Voltar à página inicial'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExitConfirmationModal;