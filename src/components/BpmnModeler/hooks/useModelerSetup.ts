import { useEffect, useRef, useState, useCallback } from "react";
import BpmnModeler from "bpmn-js/lib/Modeler";
import minimapModule from "diagram-js-minimap";
import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule
} from "bpmn-js-properties-panel";
import BpmnSelectionEnhancer from "../BpmnSelectionEnhancer";

export const useModelerSetup = (
  containerRef: React.RefObject<HTMLDivElement | null>,
  panelRef: React.RefObject<HTMLDivElement | null>,
  onDiagramChange: () => void,
  onImportDone: () => void
) => {
  const modelerRef = useRef<BpmnModeler | null>(null);
  const [forceRefresh, setForceRefresh] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setForceRefresh(prev => prev + 1);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!containerRef.current || !panelRef.current) return;

    // Limpeza prévia total
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }
    if (panelRef.current) {
      panelRef.current.innerHTML = '';
    }

    modelerRef.current = new BpmnModeler({
      container: containerRef.current,
      propertiesPanel: {
        parent: panelRef.current
      },
      additionalModules: [
        BpmnPropertiesPanelModule,
        BpmnPropertiesProviderModule,
        minimapModule,
        {
          bpmnSelectionEnhancer: ['type', BpmnSelectionEnhancer]
        }
      ]
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

    // Setup de detecção de mudanças APÓS criação do modeler
    const handleDiagramChange = () => {
      onDiagramChange();
    };

    const handleImportDone = () => {
      onImportDone();
    };

    // Escutar múltiplos eventos de mudança
    modelerRef.current.on('commandStack.changed', handleDiagramChange);
    modelerRef.current.on('elements.changed', handleDiagramChange);
    modelerRef.current.on('shape.added', handleDiagramChange);
    modelerRef.current.on('shape.removed', handleDiagramChange);
    modelerRef.current.on('connection.added', handleDiagramChange);
    modelerRef.current.on('connection.removed', handleDiagramChange);
    modelerRef.current.on('import.done', handleImportDone);

    return () => {
      // Cleanup agressivo para evitar interferência com outros editores
      if (modelerRef.current) {
        modelerRef.current.destroy();
        modelerRef.current = null;
      }
      
      // Forçar limpeza do DOM
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      if (panelRef.current) {
        panelRef.current.innerHTML = '';
      }
    };
  }, [forceRefresh]);

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

  const handleFitAll = () => {
    if (!modelerRef.current) return;
    
    try {
      const canvas = modelerRef.current.get('canvas') as any;
      canvas.zoom('fit-viewport');
      console.log('✅ Fit All executado - canvas ajustado para mostrar todos os elementos');
    } catch (error) {
      console.error('❌ Erro ao executar Fit All:', error);
    }
  };

  return {
    modelerRef,
    importDiagram,
    handleFitAll
  };
};