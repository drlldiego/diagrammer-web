import React from "react";
import { useNavigate } from "react-router-dom";

const UmlDiagramComponent: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="diagram-editor">
      <div className="editor-header">
        <button className="back-button" onClick={() => navigate('/')}>
          ← Voltar
        </button>
        <h1>Editor de Diagrama UML</h1>
      </div>
      <div className="editor-container">
        <p>Componente do editor UML em desenvolvimento</p>
        {/* Aqui será implementado o editor de diagramas UML */}
      </div>
    </div>
  );
};

export default UmlDiagramComponent;