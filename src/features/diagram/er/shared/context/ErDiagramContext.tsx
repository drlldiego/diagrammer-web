/**
 * ER Diagram Context
 * Centralizes global state for ER diagram operations
 */
import React, { createContext, useContext, useReducer, useCallback, useEffect, useMemo } from 'react';
import { 
  ErElement, 
  DiagramMode, 
  DiagramNotation, 
  NotationService,
  ErEventService,
  ErServiceFactory 
} from '../../core';

// Context state interface
interface ErDiagramContextState {
  mode: DiagramMode;
  notation: DiagramNotation;
  selectedElements: ErElement[];
  isDeclarativeMode: boolean;
  modeler: any;
  services: {
    notation: NotationService;
    events: ErEventService;
  } | null;
  config: {
    allowDirectEntityConnections: boolean;
    showCardinalities: boolean;
    showElementTypes: boolean;
  };
  statistics: {
    totalElements: number;
    entitiesCount: number;
    relationshipsCount: number;
    attributesCount: number;
    connectionsCount: number;
  };
}

// Action types for state reducer
type ErDiagramAction =
  | { type: 'SET_MODE'; payload: DiagramMode }
  | { type: 'SET_NOTATION'; payload: DiagramNotation }
  | { type: 'SET_SELECTED_ELEMENTS'; payload: ErElement[] }
  | { type: 'ADD_SELECTED_ELEMENT'; payload: ErElement }
  | { type: 'REMOVE_SELECTED_ELEMENT'; payload: string }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_MODELER'; payload: any }
  | { type: 'UPDATE_STATISTICS'; payload: Partial<ErDiagramContextState['statistics']> }
  | { type: 'SET_CONFIG'; payload: Partial<ErDiagramContextState['config']> }
  | { type: 'INITIALIZE_SERVICES'; payload: ErDiagramContextState['services'] };

// Context value interface
interface ErDiagramContextValue extends ErDiagramContextState {
  actions: {
    setMode: (mode: DiagramMode) => void;
    setNotation: (notation: DiagramNotation) => void;
    setSelectedElements: (elements: ErElement[]) => void;
    addSelectedElement: (element: ErElement) => void;
    removeSelectedElement: (elementId: string) => void;
    clearSelection: () => void;
    setModeler: (modeler: any) => void;
    updateStatistics: (stats: Partial<ErDiagramContextState['statistics']>) => void;
    updateConfig: (config: Partial<ErDiagramContextState['config']>) => void;
    toggleDeclarativeMode: () => void;
  };
}

// Initial state
const initialState: ErDiagramContextState = {
  mode: 'imperative',
  notation: 'chen',
  selectedElements: [],
  isDeclarativeMode: false,
  modeler: null,
  services: null,
  config: {
    allowDirectEntityConnections: false,
    showCardinalities: true,
    showElementTypes: true,
  },
  statistics: {
    totalElements: 0,
    entitiesCount: 0,
    relationshipsCount: 0,
    attributesCount: 0,
    connectionsCount: 0,
  },
};

// State reducer
function erDiagramReducer(state: ErDiagramContextState, action: ErDiagramAction): ErDiagramContextState {
  switch (action.type) {
    case 'SET_MODE':
      return {
        ...state,
        mode: action.payload,
        isDeclarativeMode: action.payload === 'declarative',
      };
      
    case 'SET_NOTATION':
      return {
        ...state,
        notation: action.payload,
        config: {
          ...state.config,
          allowDirectEntityConnections: action.payload === 'crowsfoot',
        },
      };
      
    case 'SET_SELECTED_ELEMENTS':
      return {
        ...state,
        selectedElements: action.payload,
      };
      
    case 'ADD_SELECTED_ELEMENT':
      if (state.selectedElements.find(el => el.id === action.payload.id)) {
        return state; // Element already selected
      }
      return {
        ...state,
        selectedElements: [...state.selectedElements, action.payload],
      };
      
    case 'REMOVE_SELECTED_ELEMENT':
      return {
        ...state,
        selectedElements: state.selectedElements.filter(el => el.id !== action.payload),
      };
      
    case 'CLEAR_SELECTION':
      return {
        ...state,
        selectedElements: [],
      };
      
    case 'SET_MODELER':
      return {
        ...state,
        modeler: action.payload,
      };
      
    case 'UPDATE_STATISTICS':
      return {
        ...state,
        statistics: {
          ...state.statistics,
          ...action.payload,
        },
      };
      
    case 'SET_CONFIG':
      return {
        ...state,
        config: {
          ...state.config,
          ...action.payload,
        },
      };
      
    case 'INITIALIZE_SERVICES':
      return {
        ...state,
        services: action.payload,
      };
      
    default:
      return state;
  }
}

// Create context
const ErDiagramContext = createContext<ErDiagramContextValue | null>(null);

// Provider component
interface ErDiagramProviderProps {
  children: React.ReactNode;
  initialMode?: DiagramMode;
  initialNotation?: DiagramNotation;
  modeler?: any;
}

export const ErDiagramProvider: React.FC<ErDiagramProviderProps> = ({
  children,
  initialMode = 'imperative',
  initialNotation = 'chen',
  modeler: initialModeler,
}) => {
  const [state, dispatch] = useReducer(erDiagramReducer, {
    ...initialState,
    mode: initialMode,
    notation: initialNotation,
    isDeclarativeMode: initialMode === 'declarative',
    modeler: initialModeler,
  });

  // Initialize services when modeler changes
  useEffect(() => {
    if (state.modeler) {
      const services = ErServiceFactory.createServicesBundle(state.modeler, state.notation);
      dispatch({ type: 'INITIALIZE_SERVICES', payload: services });
    }
  }, [state.modeler, state.notation]);

  // Update notation service when notation changes
  useEffect(() => {
    if (state.services?.notation) {
      state.services.notation.setStrategy(state.notation);
    }
  }, [state.notation, state.services]);

  // Listen for modeler selection changes
  useEffect(() => {
    if (!state.modeler || !state.services?.events) return;

    const eventBus = state.modeler.get?.('eventBus');
    if (!eventBus) return;

    const handleSelectionChanged = (event: any) => {
      const newSelection = event.newSelection || [];
      dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: newSelection });
    };

    eventBus.on('selection.changed', handleSelectionChanged);

    return () => {
      eventBus.off('selection.changed', handleSelectionChanged);
    };
  }, [state.modeler, state.services]);

  // Actions
  const actions = useMemo(() => ({
    setMode: (mode: DiagramMode) => {
      dispatch({ type: 'SET_MODE', payload: mode });
      state.services?.events.emit('diagram.mode.changed', { mode, timestamp: Date.now() });
    },
    
    setNotation: (notation: DiagramNotation) => {
      dispatch({ type: 'SET_NOTATION', payload: notation });
      state.services?.events.emit('diagram.notation.changed', { notation, timestamp: Date.now() });
    },
    
    setSelectedElements: (elements: ErElement[]) => {
      dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: elements });
    },
    
    addSelectedElement: (element: ErElement) => {
      dispatch({ type: 'ADD_SELECTED_ELEMENT', payload: element });
    },
    
    removeSelectedElement: (elementId: string) => {
      dispatch({ type: 'REMOVE_SELECTED_ELEMENT', payload: elementId });
    },
    
    clearSelection: () => {
      dispatch({ type: 'CLEAR_SELECTION' });
    },
    
    setModeler: (modeler: any) => {
      dispatch({ type: 'SET_MODELER', payload: modeler });
    },
    
    updateStatistics: (stats: Partial<ErDiagramContextState['statistics']>) => {
      dispatch({ type: 'UPDATE_STATISTICS', payload: stats });
    },
    
    updateConfig: (config: Partial<ErDiagramContextState['config']>) => {
      dispatch({ type: 'SET_CONFIG', payload: config });
    },
    
    toggleDeclarativeMode: () => {
      const newMode: DiagramMode = state.mode === 'declarative' ? 'imperative' : 'declarative';
      dispatch({ type: 'SET_MODE', payload: newMode });
      state.services?.events.emit('diagram.mode.changed', { mode: newMode, timestamp: Date.now() });
    },
  }), [state.mode, state.services]);

  const contextValue: ErDiagramContextValue = {
    ...state,
    actions,
  };

  return (
    <ErDiagramContext.Provider value={contextValue}>
      {children}
    </ErDiagramContext.Provider>
  );
};

// Hook to use the context
export const useErDiagramContext = (): ErDiagramContextValue => {
  const context = useContext(ErDiagramContext);
  if (!context) {
    throw new Error('useErDiagramContext must be used within an ErDiagramProvider');
  }
  return context;
};

// Specialized hooks for common operations
export const useErSelection = () => {
  const { selectedElements, actions } = useErDiagramContext();
  
  return {
    selectedElements,
    setSelection: actions.setSelectedElements,
    addToSelection: actions.addSelectedElement,
    removeFromSelection: actions.removeSelectedElement,
    clearSelection: actions.clearSelection,
    hasSelection: selectedElements.length > 0,
    selectedCount: selectedElements.length,
  };
};

export const useErMode = () => {
  const { mode, isDeclarativeMode, actions } = useErDiagramContext();
  
  return {
    mode,
    isDeclarativeMode,
    isImperativeMode: !isDeclarativeMode,
    setMode: actions.setMode,
    toggleMode: actions.toggleDeclarativeMode,
  };
};

export const useErNotation = () => {
  const { notation, config, services, actions } = useErDiagramContext();
  
  return {
    notation,
    notationInfo: services?.notation.getNotationInfo(),
    allowDirectEntityConnections: config.allowDirectEntityConnections,
    setNotation: actions.setNotation,
    getCardinalityOptions: services?.notation.getCardinalityOptions,
    validateConnection: services?.notation.validateConnection,
  };
};

export const useErServices = () => {
  const { services } = useErDiagramContext();
  
  if (!services) {
    throw new Error('ER services not initialized. Make sure modeler is set in ErDiagramProvider');
  }
  
  return services;
};