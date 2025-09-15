import React, { Suspense } from "react";
import { Routes, Route, Link } from "react-router-dom";
import HomePage from "./features/home/HomePage"
import "./App.scss";

// Lazy load dos editores
const BpmnModelerComponent = React.lazy(() => import("./features/diagram/bpmn/BpmnModeler"));
const ErModelerComponent = React.lazy(() => import("./features/diagram/er/ErModeler"));
const FlowModelerComponent = React.lazy(() => import("./features/diagram/flow/FlowModeler"));


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
          <Route path="/editor/erchen" element={
            <Suspense fallback={<div>Carregando Editor ER Chen...</div>}>
              <ErModelerComponent notation="chen" />
            </Suspense>
          } />
          <Route path="/editor/ercrow" element={
            <Suspense fallback={<div>Carregando Editor ER Crow's Foot...</div>}>
              <ErModelerComponent notation="crowsfoot" />
            </Suspense>
          } />
          <Route path="/editor/flowchart" element={
            <Suspense fallback={<div>Carregando Editor de Fluxogramas...</div>}>
              <FlowModelerComponent />
            </Suspense>
          } />          
        </Routes>
      </main>
    </div>
  );
};

export default App;