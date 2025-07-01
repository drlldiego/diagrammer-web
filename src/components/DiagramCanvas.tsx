import React, { useEffect, useRef, useState } from 'react';
import { DiagramType } from '../types/DiagramTypes';
import { useDiagramManager } from '../hooks/useDiagramManager';
import { handleDiagramError } from '../utils/errorHandler';

interface DiagramCanvasProps {
  diagramType: DiagramType;
  onModelerReady?: (modeler: any) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const DiagramCanvas: React.FC<DiagramCanvasProps> = ({
  diagramType,
  onModelerReady,
  className = '',
  style = {}
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  
  const { 
    modeler, 
    initializeDiagram, 
    switchDiagramType, 
    isReady,
    error: managerError
  } = useDiagramManager();

  // Initialize diagram when canvas is ready
  useEffect(() => {
    if (canvasRef.current && !modeler) {
      initializeDiagram(canvasRef.current)
        .catch(err => {
          const errorMessage = handleDiagramError(err, 'inicialização do diagrama');
          setLocalError(errorMessage);
        });
    }
  }, [modeler, initializeDiagram]);

  // Handle diagram type changes
  useEffect(() => {
    if (modeler && isReady) {
      switchDiagramType(diagramType)
        .catch(err => {
          const errorMessage = handleDiagramError(err, 'troca de tipo de diagrama');
          setLocalError(errorMessage);
        });
    }
  }, [diagramType, modeler, isReady, switchDiagramType]);

  // Notify parent when modeler is ready
  useEffect(() => {
    if (modeler && isReady && onModelerReady) {
      try {
        onModelerReady(modeler);
      } catch (err) {
        const errorMessage = handleDiagramError(err, 'callback onModelerReady');
        setLocalError(errorMessage);
      }
    }
  }, [modeler, isReady, onModelerReady]);

  const currentError = localError || managerError;

  if (currentError) {
    return (
      <div className={`diagram-error ${className}`} style={style}>
        <div className="error-content">
          <h3>⚠️ Erro no Diagrama</h3>
          <p>{currentError}</p>
          <button 
            onClick={() => {
              setLocalError(null);
              if (canvasRef.current) {
                initializeDiagram(canvasRef.current);
              }
            }}
            className="retry-button"
          >
            🔄 Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  const defaultStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    position: 'relative',
    ...style
  };

  return (
    <div className={`diagram-wrapper ${className}`} style={defaultStyle}>
      {!isReady && (
        <div className="diagram-loading">
          <div className="loading-content">
            <div className="spinner"></div>
            <p>Carregando diagrama {diagramType.toUpperCase()}...</p>
          </div>
        </div>
      )}
      <div 
        ref={canvasRef} 
        className={`diagram-canvas ${isReady ? 'ready' : 'loading'}`}
        style={{ 
          width: '100%', 
          height: '100%',
          visibility: isReady ? 'visible' : 'hidden'
        }}
      />
    </div>
  );
};