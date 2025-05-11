import React from "react";
import { useNavigate } from "react-router-dom";

const FlowchartComponent: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="diagram-editor">
      <div className="editor-header">
        <button className="back-button" onClick={() => navigate('/')}>
          ← Voltar
        </button>
        <h1>Editor de Fluxograma</h1>
      </div>
      <div className="editor-container">
        <p>Componente do editor de Fluxograma em desenvolvimento</p>
        {/* Aqui será implementado o editor de fluxogramas */}
      </div>
    </div>
  );
};

export default FlowchartComponent;