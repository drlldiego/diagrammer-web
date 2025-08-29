import { useState, useEffect } from 'react';

interface ElementProperties {
  id: string;
  name: string;
  type: string;
  [key: string]: any;
}

interface UseElementPropertiesReturn {
  properties: ElementProperties | null;
  isER: boolean;
  selectedElements: any[];
  localWidth: number;
  localHeight: number;
  setLocalWidth: (width: number) => void;
  setLocalHeight: (height: number) => void;
  loadElementProperties: () => void;
}

export const useElementProperties = (element: any, modeler: any): UseElementPropertiesReturn => {
  const [properties, setProperties] = useState<ElementProperties | null>(null);
  const [isER, setIsER] = useState(false);
  const [selectedElements, setSelectedElements] = useState<any[]>([]);
  
  // Estados locais para dimensões editáveis
  const [localWidth, setLocalWidth] = useState<number>(0);
  const [localHeight, setLocalHeight] = useState<number>(0);

  // ✨ Função para carregar propriedades do elemento
  const loadElementProperties = () => {
    if (!element) {
      setProperties(null);
      setIsER(false);
      setLocalWidth(0);
      setLocalHeight(0);
      setSelectedElements([]);
      return;
    }

    // ✨ NOVO: Detectar seleção múltipla
    if (modeler) {
      try {
        const selection = modeler.get('selection');
        const allSelected = selection.get();
        setSelectedElements(allSelected);
      } catch (error) {
        console.warn('⚠️ Erro ao obter seleção:', error);
        setSelectedElements([element]);
      }
    } else {
      setSelectedElements([element]);
    }

    // Verificar se é conexão
    const isConnection = element.type && (element.type === 'bpmn:SequenceFlow' || element.waypoints);
    
    // Verificar se é elemento ER pelos nossos tipos customizados  
    const isErElement = element.businessObject && element.businessObject.erType;
    
    setIsER(isErElement || isConnection);

    if (isErElement) {
      const loadedProperties = {
        id: element.businessObject.id || element.id,
        name: element.businessObject.name || '',
        type: element.type,
        ...element.businessObject
      };
      
      setProperties(loadedProperties);
      
      // Sincronizar dimensões locais
      setLocalWidth(element.width || 120);
      setLocalHeight(element.height || 80);
    } else if (isConnection) {
      // Propriedades para conexões
      const connectionProperties = {
        id: element.id,
        name: 'Conexão ER',
        type: element.type,
        cardinalitySource: element.businessObject?.cardinalitySource || '1',
        cardinalityTarget: element.businessObject?.cardinalityTarget || 'N',
        isConnection: true,
        source: element.source?.businessObject?.name || element.source?.id || 'Origem',
        target: element.target?.businessObject?.name || element.target?.id || 'Destino'
      };
      
      setProperties(connectionProperties);
      setLocalWidth(0);
      setLocalHeight(0);
    } else {
      setProperties(null);
      setLocalWidth(0);
      setLocalHeight(0);
    }
  };

  useEffect(() => {
    loadElementProperties();
  }, [element]);

  // ✨ useEffect para configurar listeners de eventos do modeler
  useEffect(() => {
    if (!modeler) return;

    const eventBus = modeler.get('eventBus');
    
    const handleCompositeChanged = (event: any) => {
      if (event.element && element && event.element.id === element.id) {
        loadElementProperties();
      }
    };
    
    const handleElementChanged = (event: any) => {
      if (event.element && element && event.element.id === element.id) {
        loadElementProperties();
      }
    };
    
    const handleElementsChanged = (event: any) => {
      if (event.elements && element && event.elements.some((el: any) => el.id === element.id)) {
        loadElementProperties();
      }
    };

    // NOVO: Listener para mudanças na seleção - atualiza lista de elementos selecionados
    const handleSelectionChanged = (event: any) => {
      try {
        const selection = modeler.get('selection');
        const newSelectedElements = selection.get();
        
        setSelectedElements(newSelectedElements);
        
        // Se ainda há um elemento principal selecionado, recarregar suas propriedades
        if (element && newSelectedElements.some((el: any) => el.id === element.id)) {
          loadElementProperties();
        }
      } catch (error) {
        console.warn('⚠️ useElementProperties: Erro ao processar mudança de seleção:', error);
      }
    };
    
    eventBus.on('element.compositeChanged', handleCompositeChanged);
    eventBus.on('element.changed', handleElementChanged);
    eventBus.on('elements.changed', handleElementsChanged);
    eventBus.on('selection.changed', handleSelectionChanged);
    
    // Cleanup listeners
    return () => {
      eventBus.off('element.compositeChanged', handleCompositeChanged);
      eventBus.off('element.changed', handleElementChanged);
      eventBus.off('elements.changed', handleElementsChanged);
      eventBus.off('selection.changed', handleSelectionChanged);
    };
  }, [element, modeler]);

  return {
    properties,
    isER,
    selectedElements,
    localWidth,
    localHeight,
    setLocalWidth,
    setLocalHeight,
    loadElementProperties
  };
};