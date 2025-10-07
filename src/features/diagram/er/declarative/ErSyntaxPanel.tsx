// Painel lateral para edição de sintaxe ER declarativa

import React, { useState, useRef, useEffect, useCallback } from 'react';
import BpmnModeler from "bpmn-js/lib/Modeler";
import { MermaidErParser } from './er-parser';
import { ErDiagramGenerator } from './er-diagram-generator';
import { ErDiagramSerializer } from './er-diagram-serializer';
import { ErrorLocation } from './er-types';
import './ErSyntaxPanel.scss';

interface ErSyntaxPanelProps {
  modeler: BpmnModeler | null;
  isVisible: boolean;
  onDiagramNameChange?: (name: string) => void;
}

// Utility function to extract error location from error message
const extractErrorLocation = (errorMessage: string, textContent: string): ErrorLocation | null => {
  const lineMatch = errorMessage.match(/\(Linha (\d+)\)/);
  if (!lineMatch) return null;

  const lineNumber = parseInt(lineMatch[1], 10);
  const lines = textContent.split('\n');
  
  if (lineNumber > 0 && lineNumber <= lines.length) {
    return {
      line: lineNumber,
      message: errorMessage.replace(/\s*\(Linha \d+\)/, '')
    };
  }
  
  return null;
};

// Error highlighting overlay component
interface ErrorHighlightProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  errorLocation: ErrorLocation | null;
  textContent: string;
}

const ErrorHighlight: React.FC<ErrorHighlightProps> = ({ 
  textareaRef, 
  errorLocation, 
  textContent 
}) => {
  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!errorLocation || !textareaRef.current) {
      setHighlightStyle({ display: 'none' });
      return;
    }

    const textarea = textareaRef.current;
    const lines = textContent.split('\n');
    const errorLineIndex = errorLocation.line - 1;
    
    if (errorLineIndex < 0 || errorLineIndex >= lines.length) {
      setHighlightStyle({ display: 'none' });
      return;
    }

    // Calculate position of the error line
    const textBeforeErrorLine = lines.slice(0, errorLineIndex).join('\n') + (errorLineIndex > 0 ? '\n' : '');
    const errorLine = lines[errorLineIndex];
    
    // Create a temporary span to measure text dimensions
    const measureSpan = document.createElement('span');
    measureSpan.style.cssText = `
      font: ${window.getComputedStyle(textarea).font};
      position: absolute;
      visibility: hidden;
      white-space: pre;
    `;
    document.body.appendChild(measureSpan);
    
    try {
      // Measure line height
      measureSpan.textContent = 'M';
      const lineHeight = measureSpan.offsetHeight;
      
      // Calculate the Y position of the error line
      const linesBeforeError = errorLineIndex;
      const topOffset = linesBeforeError * lineHeight;
      
      // Position the error highlight
      const textareaRect = textarea.getBoundingClientRect();
      const textareaStyles = window.getComputedStyle(textarea);
      
      setHighlightStyle({
        position: 'absolute',
        left: `${parseInt(textareaStyles.paddingLeft) + 2}px`,
        top: `${topOffset + parseInt(textareaStyles.paddingTop) + lineHeight - 2}px`,
        width: `calc(100% - ${parseInt(textareaStyles.paddingLeft) + parseInt(textareaStyles.paddingRight) + 4}px)`,
        height: '2px',
        backgroundColor: '#ff4444',
        borderRadius: '1px',
        pointerEvents: 'none',
        zIndex: 10,
        display: 'block'
      });
    } finally {
      document.body.removeChild(measureSpan);
    }
  }, [errorLocation, textContent, textareaRef]);

  if (!errorLocation) return null;

  return <div className="error-highlight" style={highlightStyle}></div>;
};

const EXAMPLE_ER_SYNTAX = `Titulo: "Sistema de E-commerce"
CLIENTE }|--|{ ENDERECO-ENTREGA: possui
CLIENTE ||--|{ PEDIDO: realiza  
CLIENTE ||--o{ FATURA: "responsável por"
ENDERECO-ENTREGA }o--o{ PEDIDO: recebe
FATURA ||--|| PEDIDO: cobre
PEDIDO }|--o{ ITEM-PEDIDO: inclui
CATEGORIA-PRODUTO ||--|{ PRODUTO: contém
PRODUTO ||--|{ ITEM-PEDIDO: "pedido em"`;

const ErSyntaxPanel: React.FC<ErSyntaxPanelProps> = ({ 
  modeler, 
  isVisible,
  onDiagramNameChange
}) => {
  const [syntaxInput, setSyntaxInput] = useState<string>(EXAMPLE_ER_SYNTAX);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [lastError, setLastError] = useState<string>('');
  const [errorLocation, setErrorLocation] = useState<ErrorLocation | null>(null);
  const [isLivePreviewEnabled, setIsLivePreviewEnabled] = useState<boolean>(false);
  const [isLiveGenerating, setIsLiveGenerating] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Função para gerar diagram com controle de estado compartilhado
  const generateDiagram = useCallback(async (input: string, isLiveMode: boolean = false) => {
    if (!modeler) {
      setLastError('Editor ER não está inicializado');
      return;
    }

    if (!input.trim()) {
      if (!isLiveMode) {
        setLastError('Sintaxe não pode estar vazia');
      }
      return;
    }

    if (isLiveMode) {
      setIsLiveGenerating(true);
    } else {
      setIsGenerating(true);
    }
    
    setLastError('');
    setErrorLocation(null);

    try {      
      const parser = new MermaidErParser();
      const diagram = await parser.parse(input);            
      const generator = new ErDiagramGenerator(modeler);
      await generator.generateVisualDiagram(diagram);
      
      // Atualizar o nome do diagrama se fornecido
      if (diagram.title && onDiagramNameChange) {
        onDiagramNameChange(diagram.title);
      }
      
    } catch (error) {
      // Em modo live, só mostrar erros se não for um erro de sintaxe simples
      if (!isLiveMode || (error instanceof Error && !error.message.includes('syntax') && !error.message.includes('parse'))) {
        const errorMessage = error instanceof Error ? error.message : String(error);      
        setLastError(errorMessage);
        
        // Extract error location for visual highlighting
        const location = extractErrorLocation(errorMessage, input);
        setErrorLocation(location);
      }
    } finally {
      if (isLiveMode) {
        setIsLiveGenerating(false);
      } else {
        setIsGenerating(false);
      }      
    }
  }, [modeler]);

  // Live preview com debounce
  const handleLivePreview = useCallback((input: string) => {
    if (!isLivePreviewEnabled || !modeler) return;

    // Limpar timeout anterior
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Configurar novo timeout
    debounceRef.current = setTimeout(() => {
      generateDiagram(input, true);
    }, 800); // 800ms de debounce
  }, [isLivePreviewEnabled, modeler, generateDiagram]);

  // Effect para live preview
  useEffect(() => {
    if (isLivePreviewEnabled) {
      handleLivePreview(syntaxInput);
    }

    // Cleanup no unmount
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [syntaxInput, handleLivePreview, isLivePreviewEnabled]);

  const handleGenerate = async () => {
    await generateDiagram(syntaxInput, false);
  };

  const handleExtractFromCanvas = () => {
    if (!modeler) {
      setLastError('Editor ER não está inicializado');
      setErrorLocation(null);
      return;
    }

    setLastError('');
    setErrorLocation(null);

    try {
      const serializer = new ErDiagramSerializer(modeler);
      
      if (!serializer.canSerialize()) {
        setLastError('Nenhum conteúdo válido de ER encontrado no canvas para extrair');
        return;
      }
      
      const extractedSyntax = serializer.serializeToDeclarative();
      setSyntaxInput(extractedSyntax);          
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setLastError(errorMessage);      
    }
  };

  const handleLoadExample = () => {
    setSyntaxInput(EXAMPLE_ER_SYNTAX);
    setLastError('');
    setErrorLocation(null);
  };

  const handleClear = () => {
    setSyntaxInput('');
    setLastError('');
    setErrorLocation(null);
    textareaRef.current?.focus();
  };

  if (!isVisible) return null;

  return (
    <div className="er-syntax-panel">
      <div className="er-syntax-panel-header">
        <h3>Interface Declarativa</h3>
        <div className="live-preview-toggle">
          <label className="toggle-container">
            <input
              type="checkbox"
              checked={isLivePreviewEnabled}
              onChange={(e) => setIsLivePreviewEnabled(e.target.checked)}
              disabled={isGenerating}
            />
            <span className="toggle-slider"></span>
            <span className="toggle-label">
              Preview Automático {isLiveGenerating && <span className="live-indicator">●</span>}
            </span>
          </label>
        </div>        
      </div>

      <div className="er-syntax-panel-content">
        <div className="syntax-textarea-container">
          <textarea
            ref={textareaRef}
            className="syntax-textarea"
            value={syntaxInput}
            onChange={(e) => setSyntaxInput(e.target.value)}
            placeholder="Digite a sintaxe ER aqui... Exemplo:
Titulo: &quot;Meu Diagrama&quot;
CLIENTE |o--o{ PEDIDO: realiza
PEDIDO ||--|| FATURA: possui"
            spellCheck={false}
          />
          <ErrorHighlight
            textareaRef={textareaRef}
            errorLocation={errorLocation}
            textContent={syntaxInput}
          />
        </div>

        {lastError && (
          <div className="error-message">
            <strong>Erro:</strong> {lastError}
          </div>
        )}

        <div className="syntax-actions">
          <button
            className="action-button primary"
            onClick={handleGenerate}
            disabled={isGenerating}
            title="Gerar diagrama a partir da sintaxe"
          >
            {isGenerating ? 'Gerando...' : 'Gerar'}
          </button>

          <button
            className="action-button secondary"
            onClick={handleExtractFromCanvas}
            disabled={isGenerating}
            title="Extrair sintaxe do canvas atual"
          >
            Extrair
          </button>

          <button
            className="action-button secondary"
            onClick={handleLoadExample}
            disabled={isGenerating}
            title="Carregar exemplo de sintaxe"
          >
            Exemplo
          </button>

          <button
            className="action-button secondary"
            onClick={handleClear}
            disabled={isGenerating}
            title="Limpar editor"
          >
            Limpar
          </button>
        </div>

        <div className="syntax-help">
          <details>
            <summary>Ajuda Rápida</summary>
            <div className="help-content">
              <h4>Sintaxe:</h4>
              <pre><code>ENTIDADE {'}'}|--o{'{'} ENTIDADE2: "Relacionamento"</code></pre>
              
              <h4>Cardinalidades:</h4>
              <ul>
                <li><code>||--||</code> - um para um</li>
                <li><code>||--o|</code> - um para zero/um</li>
                <li><code>||--|{'{'}</code> - um para muitos</li>
                <li><code>|o--||</code> - zero/um para um</li>
                <li><code>{'}'}o--||</code> - muitos para um</li>
                <li><code>{'}'}o--o{'{'}</code> - muitos para muitos</li>
              </ul>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

export default ErSyntaxPanel;