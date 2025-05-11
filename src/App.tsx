import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import HomePage from "./components/HomePage";
import BpmnModelerComponent from "./components/BpmnModeler"
import ErDiagramComponent from "./components/ErDiagram";
import UmlDiagramComponent from "./components/UmlDiagram";
import FlowchartComponent from "./components/Flowchart";
import "./App.css";

const App: React.FC = () => {
  return (
    <div className="app-container">
      <header className="app-header">
        <Link to="/" className="logo-link">
          <h1 className="app-title">Diagrammer</h1>
        </Link>
      </header>
      
      <main className="app-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/editor/bpmn" element={<BpmnModelerComponent />} />
          <Route path="/editor/er" element={<ErDiagramComponent />} />
          <Route path="/editor/uml" element={<UmlDiagramComponent />} />
          <Route path="/editor/flowchart" element={<FlowchartComponent />} />
        </Routes>
      </main>
      
      <footer className="app-footer">
        <p>© 2025 Diagrammer - ISEC</p>
      </footer>
    </div>
  );
};

export default App;