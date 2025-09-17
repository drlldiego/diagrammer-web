import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import BpmnModeler from "bpmn-js/lib/Modeler";
import EditorHeader from "../../../components/common/EditorHeader/EditorHeader";
import flowModdle from "../schemas/flow-moddle.json";
import FlowModule from "./custom/index";
// import DeclarativeEditor from "./declarative/DeclarativeEditor"; // COMENTADO: Interface declarativa desabilitada para fluxograma
import BpmnColorPickerModule from "bpmn-js-color-picker";
import resizeAllModule from "../shared/providers";
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn.css";
import "../../../styles/DiagramEditor.scss";
import "../../../styles/ModelerComponents.scss";
import "./styles/Flowchart.scss";
import "./styles/FlowPalette.scss";
// import "./styles/DeclarativeElements.scss"; // COMENTADO: Interface declarativa desabilitada

const FlowchartComponent: React.FC = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const modelerRef = useRef<BpmnModeler | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [status, setStatus] = useState<string>("Inicializando...");
  // const [showDeclarativeEditor, setShowDeclarativeEditor] = useState<boolean>(false); // COMENTADO: Interface declarativa desabilitada

  const handleGoHome = () => {
    navigate('/');
  };

  // const handleToggleEditor = () => {
  //   setShowDeclarativeEditor(!showDeclarativeEditor);
  // }; // COMENTADO: Interface declarativa desabilitada

  const backButton = (
    <button 
      className="back-button" 
      onClick={handleGoHome}
      aria-label="Voltar para página inicial"
    >
      ← Voltar
    </button>
  );

  // const editorButton = (
  //   <button 
  //     className="back-button editor-button"
  //     onClick={handleToggleEditor}
  //     aria-label="Abrir/fechar editor declarativo"
  //   >
  //     📝 Editor Declarativo
  //   </button>
  // ); // COMENTADO: Interface declarativa desabilitada

  // Inicializar o modeler de fluxograma
  useEffect(() => {
    if (!containerRef.current || modelerRef.current) return;

    try {
      setStatus("Carregando editor de fluxograma...");
      
      modelerRef.current = new BpmnModeler({
        container: containerRef.current,
        moddleExtensions: {
          flow: flowModdle
        },
        additionalModules: [
          FlowModule,
          BpmnColorPickerModule,
          resizeAllModule
        ]
      });

      // Diagrama inicial simples para fluxograma
      const initialFlowchartDiagram = `<?xml version="1.0" encoding="UTF-8"?>
      <bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
          xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
          xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
          xmlns:flow="http://flowchart.com/schema/1.0/flow"
          targetNamespace="http://flowchart.com/schema/bpmn">
          <bpmn:process id="FlowchartProcess_1" name="Fluxograma" isExecutable="false">
              <bpmn:startEvent id="StartEvent_1" name="Início" />
          </bpmn:process>
          <bpmndi:BPMNDiagram id="BPMNDiagram_1">
              <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="FlowchartProcess_1">
                  <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
                      <dc:Bounds x="173" y="102" width="36" height="36" />
                      <bpmndi:BPMNLabel>
                        <dc:Bounds x="177" y="145" width="28" height="14" />
                      </bpmndi:BPMNLabel>
                  </bpmndi:BPMNShape>
              </bpmndi:BPMNPlane>
          </bpmndi:BPMNDiagram>
      </bpmn:definitions>`;

      modelerRef.current.importXML(initialFlowchartDiagram).then(() => {
        setLoading(false);
        setStatus("Editor de fluxograma carregado");
      }).catch((err: any) => {
        console.error('Erro ao carregar diagrama inicial:', err);
        setLoading(false);
        setStatus("Erro ao carregar editor");
      });

    } catch (error) {
      console.error('Erro ao inicializar modeler:', error);
      setLoading(false);
      setStatus("Erro ao inicializar editor");
    }

    return () => {
      if (modelerRef.current) {
        modelerRef.current.destroy();
        modelerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="diagram-editor flow-modeler">
      <EditorHeader 
        title="Editor de Fluxograma" 
        onLogoClick={handleGoHome}
        actions={<>{backButton}{/* {editorButton} - COMENTADO: Interface declarativa desabilitada */}</>}
      />
      <div className="modeler-content">
        <div 
          ref={containerRef} 
          className="modeler-container flow-modeler-container"
        >
          {loading && (
            <div className="flow-loading-overlay">
              <div className="flow-loading-content">
                <div className="flow-loading-spinner"></div>
                <p>{status}</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* COMENTADO: Interface declarativa desabilitada para fluxograma
      <DeclarativeEditor
        modeler={modelerRef.current}
        isVisible={showDeclarativeEditor}
        onClose={() => setShowDeclarativeEditor(false)}
      />
      */}
    </div>
  );
};

export default FlowchartComponent;