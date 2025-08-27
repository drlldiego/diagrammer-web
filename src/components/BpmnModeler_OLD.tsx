import React, { useEffect, useRef, useState } from "react";
import BpmnModeler from "bpmn-js/lib/Modeler";

// Estilos essenciais
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn.css";
import "@bpmn-io/properties-panel/dist/assets/properties-panel.css";

// Módulos extras
import resizeAllModule from "../lib/resize-all-rules";
// import colorPickerModule from "../lib/color-picker"; // se necessário

import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule
} from "bpmn-js-properties-panel";

import camundaModdleDescriptor from "camunda-bpmn-moddle/resources/camunda.json";

const BpmnModelerComponent: React.FC = () => {
  const modelerRef = useRef<BpmnModeler | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  //const [xml, setXml] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);


  useEffect(() => {
    if (!containerRef.current || !panelRef.current) return;

    modelerRef.current = new BpmnModeler({
      container: containerRef.current,
      propertiesPanel: {
        parent: panelRef.current
      },
      additionalModules: [
        BpmnPropertiesPanelModule,
        BpmnPropertiesProviderModule,
        resizeAllModule
        // colorPickerModule
      ],
      moddleExtensions: {
        camunda: camundaModdleDescriptor
      }
    });

    const initialDiagram = `<?xml version="1.0" encoding="UTF-8"?>
    <bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
        xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
        xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
        xmlns:camunda="http://camunda.org/schema/1.0/bpmn"
        targetNamespace="http://bpmn.io/schema/bpmn">
        <bpmn:process id="Process_1" isExecutable="false">
            <bpmn:startEvent id="StartEvent_1" />
        </bpmn:process>
        <bpmndi:BPMNDiagram id="BPMNDiagram_1">
            <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
                <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
                    <dc:Bounds x="173" y="102" width="36" height="36" />
                </bpmndi:BPMNShape>
            </bpmndi:BPMNPlane>
        </bpmndi:BPMNDiagram>
    </bpmn:definitions>`;

    modelerRef.current.importXML(initialDiagram).catch(console.error);

    return () => {
      modelerRef.current?.destroy();
    };
  }, []);
  
  const exportDiagram = async () => {
    if (!modelerRef.current) return;
    try {
      const { xml } = await modelerRef.current.saveXML({ format: true });
      const xmlString: string = xml ?? "";
      const blob = new Blob([xmlString], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "diagram.bpmn";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting BPMN XML", err);
    }
  };

  const importDiagram = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !modelerRef.current) return;
  
    const reader = new FileReader();
    reader.onload = async (e) => {
      const xml = e.target?.result;
      if (typeof xml === "string") {
        try {
          await modelerRef.current!.importXML(xml);
        } catch (error) {
          console.error("Erro ao importar o diagrama BPMN:", error);
        }
      }
    };
    reader.readAsText(file);
  };
  

  return (
    <div style={{ display: "flex", flexDirection: "row", height: "600px" }}>
      {/* Canvas BPMN */}
      <div
        ref={containerRef}
        style={{ flex: 1, border: "1px solid #ccc", position: "relative" }}
      />

      {/* Painel de propriedades */}
      <div
        ref={panelRef}
        style={{
          width: "400px",
          borderLeft: "1px solid #ccc",
          padding: "10px",
          overflow: "auto"
        }}
      />
      
      {/* Botão de exportar */}
      <button
        onClick={exportDiagram}
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 10
        }}
      >
        Download XML
      </button>
      
      <div style={{ position: "absolute", top: 10, right: 200, zIndex: 10 }}>
        <button onClick={() => fileInputRef.current?.click()}>
          Importar XML
        </button>
        <input type="file" accept=".bpmn,.xml" ref={fileInputRef} style={{ display: "none" }} onChange={importDiagram}/>
      </div>

    </div>
  );
};

export default BpmnModelerComponent;
