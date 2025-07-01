import React, { useState, useEffect } from 'react';
import { ValidationError, DiagramValidator } from '../utils/diagramValidator';
import { DiagramType } from '../types/DiagramTypes';
import BpmnJS from 'bpmn-js/lib/Modeler';

interface ElementRegistry {
  get(id: string): any;
}

interface Selection {
  select(element: any): void;
}

interface ValidationPanelProps {
  modeler: BpmnJS | null;
  diagramType: DiagramType;
  isVisible: boolean;
  onToggle: () => void;
}

export const ValidationPanel: React.FC<ValidationPanelProps> = ({
  modeler,
  diagramType,
  isVisible,
  onToggle
}) => {
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  const validateDiagram = async () => {
    if (!modeler) return;

    setIsValidating(true);
    try {
      let validationErrors: ValidationError[] = [];
      
      switch (diagramType) {
        case 'er':
          validationErrors = DiagramValidator.validateERDiagram(modeler);
          break;
        case 'bpmn':
          validationErrors = DiagramValidator.validateBPMNDiagram(modeler);
          break;
        default:
          validationErrors = [];
      }
      
      setErrors(validationErrors);
    } catch (error) {
      console.error('Validation error:', error);
      setErrors([{
        elementId: 'system',
        message: 'Erro durante a validação',
        severity: 'error'
      }]);
    } finally {
      setIsValidating(false);
    }
  };

  useEffect(() => {
    if (isVisible && modeler) {
      validateDiagram();
    }
  }, [isVisible, modeler, diagramType]);

const highlightElement = (elementId: string) => {
    if (!modeler || elementId === 'process' || elementId === 'system') return;
    
    try {
        const elementRegistry = modeler.get('elementRegistry') as ElementRegistry;
        const element = elementRegistry.get(elementId);
        
        if (element) {
        const selection = modeler.get('selection') as Selection;
        selection.select(element);
        }
    } catch (error) {
        console.warn('Error highlighting element:', elementId, error);
    }
};

  const getSeverityIcon = (severity: ValidationError['severity']) => {
    switch (severity) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '🔍';
    }
  };

  const getSeverityColor = (severity: ValidationError['severity']) => {
    switch (severity) {
      case 'error':
        return '#e74c3c';
      case 'warning':
        return '#f39c12';
      case 'info':
        return '#3498db';
      default:
        return '#95a5a6';
    }
  };

  const errorCount = errors.filter(e => e.severity === 'error').length;
  const warningCount = errors.filter(e => e.severity === 'warning').length;

  return (
    <div className={`validation-panel ${isVisible ? 'visible' : 'hidden'}`}>
      <div className="validation-header">
        <h3>Validação do Diagrama</h3>
        <div className="validation-summary">
          {errorCount > 0 && (
            <span className="error-count" style={{ color: '#e74c3c' }}>
              {errorCount} erro{errorCount !== 1 ? 's' : ''}
            </span>
          )}
          {warningCount > 0 && (
            <span className="warning-count" style={{ color: '#f39c12' }}>
              {warningCount} aviso{warningCount !== 1 ? 's' : ''}
            </span>
          )}
          {errors.length === 0 && !isValidating && (
            <span className="success-count" style={{ color: '#27ae60' }}>
              ✅ Sem problemas
            </span>
          )}
        </div>
        <button onClick={onToggle} className="close-button">×</button>
      </div>
      
      <div className="validation-content">
        <div className="validation-actions">
          <button 
            onClick={validateDiagram}
            disabled={isValidating || !modeler}
            className="btn btn-primary btn-small"
          >
            {isValidating ? 'Validando...' : 'Revalidar'}
          </button>
        </div>
        
        {isValidating && (
          <div className="validation-loading">
            <div className="loading-spinner-small">Validando diagrama...</div>
          </div>
        )}
        
        {!isValidating && (
          <div className="validation-results">
            {errors.length === 0 ? (
              <div className="no-errors">
                <p>✅ Diagrama válido!</p>
                <p>Não foram encontrados problemas.</p>
              </div>
            ) : (
              <ul className="error-list">
                {errors.map((error, index) => (
                  <li 
                    key={index} 
                    className={`error-item ${error.severity}`}
                    onClick={() => highlightElement(error.elementId)}
                    style={{ borderLeftColor: getSeverityColor(error.severity) }}
                  >
                    <div className="error-icon">
                      {getSeverityIcon(error.severity)}
                    </div>
                    <div className="error-content">
                      <div className="error-message">{error.message}</div>
                      {error.elementId !== 'process' && error.elementId !== 'system' && (
                        <div className="error-element">
                          Elemento: {error.elementId}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Additional CSS for validation panel
const validationPanelCSS = `
.validation-panel {
  position: fixed;
  right: 0;
  top: 0;
  width: 350px;
  height: 100vh;
  background: white;
  border-left: 1px solid #ccc;
  box-shadow: -2px 0 5px rgba(0,0,0,0.1);
  transform: translateX(100%);
  transition: transform 0.3s ease;
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.validation-panel.visible {
  transform: translateX(0);
}

.validation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #eee;
  background: #f8f9fa;
}

.validation-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.1rem;
}

.validation-summary {
  display: flex;
  gap: 1rem;
  font-size: 0.85rem;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.close-button:hover {
  background: #f0f0f0;
}

.validation-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.validation-actions {
  margin-bottom: 1rem;
}

.btn-small {
  padding: 0.375rem 0.75rem;
  font-size: 0.85rem;
}

.validation-loading {
  text-align: center;
  padding: 2rem;
}

.loading-spinner-small {
  font-size: 0.9rem;
  color: #666;
}

.no-errors {
  text-align: center;
  padding: 2rem;
  color: #27ae60;
}

.error-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.error-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  border-radius: 4px;
  border-left: 4px solid;
  background: #f8f9fa;
  cursor: pointer;
  transition: background 0.2s ease;
}

.error-item:hover {
  background: #e9ecef;
}

.error-item.error {
  background: #fdf2f2;
}

.error-item.warning {
  background: #fefbf3;
}

.error-item.info {
  background: #f2f8fd;
}

.error-icon {
  font-size: 1rem;
  line-height: 1;
}

.error-content {
  flex: 1;
}

.error-message {
  font-weight: 500;
  margin-bottom: 0.25rem;
  font-size: 0.9rem;
}

.error-element {
  font-size: 0.8rem;
  color: #666;
  font-family: monospace;
}

@media (max-width: 768px) {
  .validation-panel {
    width: 100%;
  }
}
`;

export { validationPanelCSS };