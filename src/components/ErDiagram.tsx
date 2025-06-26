import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ErModeler from "../lib/er/ErModeler";
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn.css";
import "../styles/DiagramEditor.css";
import "../styles/ErDiagram.css";

const ErDiagramComponent: React.FC = () => {
  const modelerRef = useRef<ErModeler | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const propertiesPanelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [selectedElement, setSelectedElement] = useState<any>(null);

  useEffect(() => {
    if (!containerRef.current || !propertiesPanelRef.current) return;

    // Cria uma nova instância do ErModeler
    const modeler = new ErModeler({
      container: containerRef.current,
      propertiesPanel: {
        parent: propertiesPanelRef.current
      },
      keyboard: {
        bindTo: window
      }
    });

    modelerRef.current = modeler;

    // Escuta eventos de seleção
    modeler.on('selection.changed', (e: any) => {
      const newSelection = e.newSelection[0];
      setSelectedElement(newSelection);
    });

    // Inicializa com um diagrama vazio
    const emptyDiagram = `<?xml version="1.0" encoding="UTF-8"?>
      <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
        xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
        xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" 
        id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
        <bpmn:process id="Process_1" isExecutable="true">
        </bpmn:process>
        <bpmndi:BPMNDiagram id="BPMNDiagram_1">
          <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
          </bpmndi:BPMNPlane>
        </bpmndi:BPMNDiagram>
      </bpmn:definitions>`;

    modeler.importXML(emptyDiagram).catch((err: any) => {
      console.error('Erro ao importar diagrama:', err);
    });

    // Cleanup ao desmontar
    return () => {
      modeler?.destroy();
    };
  }, []);

  const exportDiagram = async () => {
    if (!modelerRef.current) return;
    
    try {
      const result = await modelerRef.current.saveXML();
      const blob = new Blob([result.xml], { 
        type: "application/json" 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "diagram.er.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao exportar:', err);
    }
  };

  const handlePropertyChange = (property: string, value: string) => {
    if (!modelerRef.current || !selectedElement) return;
    
    const modeling = modelerRef.current.get<any>('modeling');
    modeling.updateProperties(selectedElement, {
      [property]: value
    });
  };

  const zoomIn = () => {
    const canvas = modelerRef.current?.get<any>('canvas');
    const currentZoom = canvas?.zoom() || 1;
    canvas?.zoom(currentZoom * 1.2);
  };

  const zoomOut = () => {
    const canvas = modelerRef.current?.get<any>('canvas');
    const currentZoom = canvas?.zoom() || 1;
    canvas?.zoom(currentZoom * 0.8);
  };

  const zoomReset = () => {
    const canvas = modelerRef.current?.get<any>('canvas');
    canvas?.zoom(1);
  };

  const zoomFit = () => {
    const canvas = modelerRef.current?.get<any>('canvas');
    canvas?.zoom('fit-viewport');
  };

  return (
    <div className="diagram-editor">
      <div className="editor-header">
        <button className="back-button" onClick={() => navigate('/')}>
          ← Voltar para Início
        </button>
        <h1>Editor de Diagrama ER</h1>
        <div className="editor-actions">
          <div className="zoom-controls">
            <button onClick={zoomOut} title="Zoom Out">➖</button>
            <button onClick={zoomReset} title="Reset Zoom">🔄</button>
            <button onClick={zoomIn} title="Zoom In">➕</button>
            <button onClick={zoomFit} title="Fit to Viewport">⬜</button>
          </div>
          <button className="action-button" onClick={exportDiagram}>
            Exportar Diagrama
          </button>
        </div>
      </div>
      
      <div className="editor-content">
        <div className="modeler-container" ref={containerRef} />
        
        <div className="properties-panel" ref={propertiesPanelRef}>
          <h3>Propriedades</h3>
          {selectedElement ? (
            <div className="properties-content">
              <div className="property-group">
                <label>ID:</label>
                <input 
                  type="text" 
                  value={selectedElement.id || ''} 
                  disabled 
                />
              </div>
              <div className="property-group">
                <label>Tipo:</label>
                <input 
                  type="text" 
                  value={selectedElement.type || ''} 
                  disabled 
                />
              </div>
              <div className="property-group">
                <label>Nome:</label>
                <input 
                  type="text" 
                  value={selectedElement.businessObject?.name || ''} 
                  onChange={(e) => handlePropertyChange('name', e.target.value)}
                />
              </div>
              {selectedElement.type === 'er:Attribute' && (
                <div className="property-group">
                  <label>
                    <input 
                      type="checkbox" 
                      checked={selectedElement.businessObject?.isKey || false}
                      onChange={(e) => handlePropertyChange('isKey', e.target.checked.toString())}
                    />
                    Chave Primária
                  </label>
                </div>
              )}
            </div>
          ) : (
            <p className="no-selection">Nenhum elemento selecionado</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErDiagramComponent;