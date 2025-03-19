import React from "react";
import BpmnModelerComponent from "./components/BpmnModeler";

const App: React.FC = () => {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <h1 style={{ textAlign: "center" }}>Modelador BPMN</h1>
      <BpmnModelerComponent />
    </div>
  );
};

export default App;
