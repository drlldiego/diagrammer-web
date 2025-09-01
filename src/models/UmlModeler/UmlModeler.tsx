import React from "react";
import { useNavigate } from "react-router-dom";
import EditorHeader from "../../components/common/EditorHeader/EditorHeader";
import "../../styles/ModelerComponents.css";

const UmlDiagramComponent: React.FC = () => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
  };

  const backButton = (
    <button 
      className="back-button" 
      onClick={handleGoHome}
      aria-label="Voltar para página inicial"
    >
      Voltar
    </button>
  );

  return (
    <div className="diagram-editor uml-modeler">
      <EditorHeader 
        title="Editor de Diagrama UML" 
        onLogoClick={handleGoHome}
        actions={backButton}
      />
      <div className="modeler-content">
        <div className="provisional-content">
          <p className="not-ready-message">Este modelo ainda não está pronto para uso.</p>
        </div>
      </div>
      <footer className="provisional-footer">
        <p>© 2025 Diagrammer - 
          <a 
          href="https://isec.pt/PT/Default.aspx" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="provisional-footer-link {"
          >
          ISEC
          </a>
        </p>
      </footer>
    </div>
  );
};

export default UmlDiagramComponent;