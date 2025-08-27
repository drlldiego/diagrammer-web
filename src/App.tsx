import React, { Suspense } from "react";
import { Routes, Route, Link } from "react-router-dom";
import HomePage from "./components/HomePage/HomePage"
import UmlDiagramComponent from "./components/UmlDiagram";
import FlowchartComponent from "./components/Flowchart";
import "./App.css";

// Lazy load de ambos os editores para isolamento completo
const BpmnModelerComponent = React.lazy(() => import("./components/BpmnModeler/BpmnModeler"));
const ErModelerComponent = React.lazy(() => import("./components/ErModeler/ErModeler"));


const App: React.FC = () => {
  return (
    <div className="app-container">
      <main className="app-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/editor/bpmn" element={
            <Suspense fallback={<div>Carregando Editor BPMN...</div>}>
              <BpmnModelerComponent />
            </Suspense>
          } />
          <Route path="/editor/er" element={
            <Suspense fallback={<div>Carregando Editor ER...</div>}>
              <ErModelerComponent />
            </Suspense>
          } />
          <Route path="/editor/uml" element={<UmlDiagramComponent />} />
          <Route path="/editor/flowchart" element={<FlowchartComponent />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;