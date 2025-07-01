import { useCallback, useEffect, useState } from 'react';
import BpmnJS from 'bpmn-js/lib/Modeler';
import { DiagramType } from '../types/DiagramTypes';
import { getModulesForDiagramType, getInitialXMLForType } from '../utils/diagramConfig';

export interface DiagramManager {
  diagramType: DiagramType;
  modeler: BpmnJS | null;
  setDiagramType: (type: DiagramType) => void;
  initializeDiagram: (container: HTMLElement) => Promise<void>;
  switchDiagramType: (newType: DiagramType) => Promise<void>;
  isReady: boolean;
  error: string | null;
}

export const useDiagramManager = (): DiagramManager => {
  const [diagramType, setDiagramType] = useState<DiagramType>('bpmn');
  const [modeler, setModeler] = useState<BpmnJS | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeDiagram = useCallback(async (container: HTMLElement) => {
    try {
      setIsReady(false);
      setError(null);
      
      console.log('🚀 Inicializando diagrama tipo:', diagramType);
      
      // Destroy existing modeler if any
      if (modeler) {
        console.log('🗑️ Destruindo modeler anterior...');
        modeler.destroy();
      }
      
      // 🔧 CORREÇÃO: Carregar módulos adequados para o tipo
      const modules = getModulesForDiagramType(diagramType);
      console.log('📦 Carregando módulos:', modules);
      
      // Create new modeler with appropriate modules
      const config: any = {
        container,
        keyboard: { bindTo: window }
      };

      // Adicionar módulos adicionais se for ER
      if (diagramType === 'er' && modules.length > 0) {
        config.additionalModules = modules;
        console.log('✅ Módulos ER adicionados ao config');
      }

      const newModeler = new BpmnJS(config);
      console.log('✅ Modeler criado com sucesso');
      
      // Import initial diagram
      const initialXML = getInitialXMLForType(diagramType);
      console.log('📄 Importando XML inicial...');
      
      await newModeler.importXML(initialXML);
      console.log('✅ XML importado com sucesso');
      
      setModeler(newModeler);
      setIsReady(true);
      
      console.log('🎉 Diagrama inicializado com sucesso!');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao inicializar diagrama';
      console.error('❌ Erro ao inicializar diagrama:', err);
      setError(errorMessage);
      setIsReady(false);
    }
  }, [diagramType, modeler]);

  const switchDiagramType = useCallback(async (newType: DiagramType) => {
    if (newType === diagramType) return;
    
    console.log('🔄 Trocando tipo de diagrama:', diagramType, '->', newType);
    
    try {
      setIsReady(false);
      setError(null);
      setDiagramType(newType);
      
      if (modeler) {
        const container = getContainerFromModeler(modeler);
        
        if (container) {
          // Reinicializar com o novo tipo
          await initializeDiagram(container);
        }
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao trocar tipo de diagrama';
      console.error('❌ Erro ao trocar tipo:', err);
      setError(errorMessage);
      setIsReady(false);
    }
  }, [modeler, diagramType, initializeDiagram]);

  return {
    diagramType,
    modeler,
    setDiagramType,
    initializeDiagram,
    switchDiagramType,
    isReady,
    error
  };
};

// Helper function
function getContainerFromModeler(modeler: BpmnJS): HTMLElement | null {
  try {
    interface Canvas {
        getContainer(): HTMLElement;
    }
    const canvas = modeler.get('canvas') as Canvas;
    const container = canvas.getContainer();
    return container?.parentElement || null;
  } catch (err) {
    console.warn('Could not get container from modeler:', err);
    return null;
  }
}