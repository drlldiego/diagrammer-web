import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import BpmnModeler from "bpmn-js/lib/Modeler";
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn.css";
import "../styles/DiagramEditor.css";

// Export to SVG e PDF
import jsPDF from "jspdf";
import svg2pdf from "svg2pdf.js";

import { ImageDown as ImageIcon, Download as PdfIcon } from "lucide-react";

const BpmnModelerComponent: React.FC = () => {
  const modelerRef = useRef<BpmnModeler | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [xml, setXml] = useState<string>("");
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

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

  const importDiagram = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !modelerRef.current) return;

        const reader = new FileReader();
        reader.onload = async () => {
            try {
            const xml = reader.result as string;
            await modelerRef.current!.importXML(xml);
            } catch (error) {
            console.error("Erro ao importar diagrama:", error);
            }
        };
        reader.readAsText(file);
  };

  const exportToPDF = async () => {
    if (!modelerRef.current) return;

    try {
      const { svg } = await modelerRef.current.saveSVG();

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();

      img.onload = function () {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);

        const pdf = new jsPDF({
          orientation: img.width > img.height ? "landscape" : "portrait",
          unit: "px",
          format: [img.width, img.height],
        });

        const imgData = canvas.toDataURL("image/png");
        pdf.addImage(imgData, "PNG", 0, 0, img.width, img.height);
        pdf.save("diagram.pdf");

        URL.revokeObjectURL(url);
      };

      img.src = url;
    } catch (err) {
      console.error("Erro ao exportar para PDF", err);
    }
  };

  return (
    <div className="diagram-editor">
      <div className="editor-header">
        <button className="back-button" onClick={() => navigate('/')}>
          ← Voltar para Início
        </button>
        <h1>Editor BPMN</h1>
        <div className="editor-actions">
          <button className="download-button" onClick={exportToPDF} title="Exportar como PDF">
            <PdfIcon size={24} />
          </button>
          <button className="action-button" onClick={() => fileInputRef.current?.click()}>Importar Diagrama</button>
            <input
                type="file"
                accept=".bpmn,.xml"
                style={{ display: "none" }}
                ref={fileInputRef}
                onChange={importDiagram}
            />
          <button className="action-button" onClick={exportDiagram}>
            Exportar Diagrama
          </button>
        </div>
      </div>
      <div 
        ref={containerRef} 
        className="modeler-container"
      ></div>
    </div>
  );
};

export default BpmnModelerComponent;