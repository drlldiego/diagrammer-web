import { DiagramType } from '../types/DiagramTypes';
import BpmnJS from 'bpmn-js/lib/Modeler';

// Importar os módulos ER
import { ERPaletteProvider } from '../providers/ERPaletteProvider';
import { ERContextPadProvider } from '../providers/ERContextPadProvider';
import { ERRules } from '../rules/ERRules';
import { ERRenderer } from '../renderer/ERRenderer';

// 🔧 MÓDULO ER com configuração completa
export const ERModule = {
  __init__: [
    'erPaletteProvider',
    'erContextPadProvider', 
    'erRules',
    'erRenderer'
  ],
  erPaletteProvider: ['type', ERPaletteProvider],
  erContextPadProvider: ['type', ERContextPadProvider],
  erRules: ['type', ERRules],
  erRenderer: ['type', ERRenderer]
};

export const getModulesForDiagramType = (type: DiagramType): any[] => {
  switch (type) {
    case 'bpmn':
      console.log('📦 Carregando módulos BPMN padrão');
      return [];
    case 'er':
      console.log('📦 Carregando módulos ER customizados');
      return [ERModule];
    default:
      return [];
  }
};

export const configureModeler = async (
  modeler: BpmnJS, 
  type: DiagramType
): Promise<void> => {
  console.log(`🔧 Configurando modeler para tipo: ${type}`);
  
  if (type === 'er') {
    console.log('✅ Modo ER: Configurações especiais aplicadas');
    
    // Verificar se os módulos ER foram carregados
    try {
      // ✅ DEPOIS (linha ~49):
      interface Palette {
        getEntries(): Record<string, any>;
      }
      const palette = modeler.get('palette') as Palette;
      const entries = palette.getEntries();
      const erEntries = Object.keys(entries).filter(key => key.includes('er'));
      console.log('🎨 Entradas ER na palette:', erEntries);
      
      if (erEntries.length === 0) {
        console.warn('⚠️ AVISO: Nenhuma entrada ER encontrada na palette!');
      }
    } catch (error) {
      console.error('❌ Erro ao verificar palette:', error);
    }
  }
};

export const getInitialXMLForType = (type: DiagramType): string => {
  switch (type) {
    case 'bpmn':
      return `<?xml version="1.0" encoding="UTF-8"?>
        <bpmn2:definitions xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL"
                          xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                          targetNamespace="http://activiti.org/bpmn">
          <bpmn2:process id="Process_1" isExecutable="false">
          </bpmn2:process>
          <bpmndi:BPMNDiagram id="BPMNDiagram_1">
            <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
            </bpmndi:BPMNPlane>
          </bpmndi:BPMNDiagram>
        </bpmn2:definitions>`;
    case 'er':
      // XML mais simples para ER - sem validações BPMN rigorosas
      return `<?xml version="1.0" encoding="UTF-8"?>
        <definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
                    targetNamespace="http://diagrammer.io/er">
          <process id="ERDiagram_1">
          </process>
        </definitions>`;
    default:
      return '';
  }
};

export {};