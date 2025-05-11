// src/components/BpmnModeler.tsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import BpmnModeler from "bpmn-js/lib/Modeler";
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn.css";

const BpmnModelerComponent: React.FC = () => {
  const modelerRef = useRef<BpmnModeler | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [xml, setXml] = useState<string>("");

  useEffect(() => {
    if (!containerRef.current) return;
    if (!containerRef.current) return;

    modelerRef.current = new BpmnModeler({ container: containerRef.current });
    modelerRef.current = new BpmnModeler({ container: containerRef.current });
    const initialDiagram = `<?xml version="1.0" encoding="UTF-8"?>
    <bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
        xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
        xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
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
      const { xml } = await modelerRef.current!.saveXML({ format: true });
      const xmlString: string = xml ?? ""; // Se for undefined, usa uma string vazia
      setXml(xmlString);
      const { xml } = await modelerRef.current!.saveXML({ format: true });
      const xmlString: string = xml ?? ""; // Se for undefined, usa uma string vazia
      setXml(xmlString);
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

  return (
    <div>
      <div ref={containerRef} style={{ width: "98.9%", height: "550px", border: "1px solid #ccc" }}></div>
      <button onClick={exportDiagram}>Download XML</button>
    </div>
  );
};

export default BpmnModelerComponent;