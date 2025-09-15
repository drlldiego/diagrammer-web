import React, { ReactNode } from 'react';
import logo from '../../../assets/logo.png';
import './EditorHeader.scss';

interface EditorHeaderProps {
  title: string;
  actions?: ReactNode;
  onLogoClick?: () => void; // Callback para quando a logo é clicada
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({ title, actions, onLogoClick }) => {
  
  const handleLogoClick = (e: React.MouseEvent) => {
    if (onLogoClick) {
      e.preventDefault(); // Prevenir navegação padrão
      onLogoClick();
    }
    // Se onLogoClick não for fornecido, mantém comportamento padrão (link externo)
  };

  return (
    <div className="editor-header">
      <div className="header-left">
        {onLogoClick ? (
          <button 
            className="logo-button" 
            onClick={handleLogoClick}
            aria-label="Voltar à página inicial"
          >
            <img src={logo} alt="ISEC Logo" className="editor-logo" />
          </button>
        ) : (
          <a href="https://isec.pt/PT/Default.aspx" target='_blank'>
            <img src={logo} alt="ISEC Logo" className="editor-logo" />
          </a>
        )}
      </div>
      <h1 className="editor-title">{title}</h1>
      {actions && (
        <div className="editor-actions">
          {actions}
        </div>
      )}
    </div>
  );
};

export default EditorHeader;