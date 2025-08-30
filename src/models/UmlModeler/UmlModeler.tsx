import React from "react";
import { useNavigate } from "react-router-dom";
import logoIsec from "../../assets/logo-isec-cor.png";

const UmlDiagramComponent: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="diagram-editor">
      <div className="editor-header">
        <div className="header-left">
          <img src={logoIsec} alt="ISEC Logo" className="editor-logo" />
        </div>
        <h1 className="editor-title">Editor de Diagrama UML</h1>
      </div>
      <div className="editor-container">
        <p>Componente do editor UML em desenvolvimento</p>
        {/* Aqui será implementado o editor de diagramas UML */}
      </div>
    </div>
  );
};

export default UmlDiagramComponent;