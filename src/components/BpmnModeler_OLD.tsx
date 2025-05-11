import React, { useEffect, useRef, useState } from "react";
import BpmnModeler from "bpmn-js/lib/Modeler";

// Estilos essenciais
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn.css";
import "@bpmn-io/properties-panel/dist/assets/properties-panel.css";

// Export to SVG e PDF
import jsPDF from "jspdf";
import svg2pdf from "svg2pdf.js"; // Não tem types, então podemos ignorar o erro TS usando require se necessário

// Módulos extras
import resizeAllModule from "../lib/resize-all-rules";
// import colorPickerModule from "../lib/color-picker"; // se necessário
import drawModule from "../lib/draw";
import paletteModule from "../lib/palette";

import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule,
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
        parent: panelRef.current,
      },
      additionalModules: [
        BpmnPropertiesPanelModule,
        BpmnPropertiesProviderModule,
        resizeAllModule,
        // colorPickerModule,
        drawModule,
        paletteModule,
      ],
      moddleExtensions: {
        camunda: camundaModdleDescriptor,
      },
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

  const exportToImage = async (format: 'png' | 'jpeg') => {
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
  
        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
        const imageData = canvas.toDataURL(mimeType);
  
        const a = document.createElement("a");
        a.href = imageData;
        a.download = `diagram.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
  
        URL.revokeObjectURL(url);
      };
  
      img.src = url;
  
    } catch (err) {
      console.error(`Erro ao exportar para ${format.toUpperCase()}`, err);
    }
  };
  

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
          overflow: "auto",
        }}
      />

      {/* Botão de exportar */}
      <button
        onClick={exportDiagram}
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 10,
        }}
      >
        Download XML
      </button>

      <div style={{ position: "absolute", top: 10, right: 200, zIndex: 10 }}>
        <button onClick={() => fileInputRef.current?.click()}>
          Importar XML
        </button>
        <input
          type="file"
          accept=".bpmn,.xml"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={importDiagram}
        />
      </div>

    
      <button 
        onClick={exportToPDF}
        style={{
          position: "absolute",
          top: 12,
          left: 50,
          zIndex: 10
        }}
      >
        Exportar para PDF
      </button>

      <button 
        onClick={() => exportToImage('png')}
        style={{
          position: "absolute",
          top: 12,
          left: 200,
          zIndex: 10
        }}
      
      >Exportar para PNG
      </button>

      <button 
        onClick={() => exportToImage('jpeg')}
        style={{
          position: "absolute",
          top: 12,
          left: 350,
          zIndex: 10
        }}
      
      >Exportar para JPEG
      </button>      
    </div>
  );
};

export default BpmnModelerComponent;
