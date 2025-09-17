// Painel lateral para edição de sintaxe ER declarativa

import React, { useState, useRef } from 'react';
import BpmnModeler from "bpmn-js/lib/Modeler";
import { MermaidErParser } from './er-parser';
import { ErDiagramGenerator } from './er-diagram-generator';
import { ErDiagramSerializer } from './er-diagram-serializer';
import './ErSyntaxPanel.scss';

interface ErSyntaxPanelProps {
  modeler: BpmnModeler | null;
  isVisible: boolean;
}

const EXAMPLE_ER_SYNTAX = `title: "Sistema de E-commerce"
erDiagram: |
  CUSTOMER }|..|{ DELIVERY-ADDRESS : has
  CUSTOMER ||--o{ ORDER : places
  CUSTOMER ||--o{ INVOICE : "liable for"
  DELIVERY-ADDRESS ||--o{ ORDER : receives
  INVOICE ||--|{ ORDER : covers
  ORDER ||--|{ ORDER-ITEM : includes
  PRODUCT-CATEGORY ||--|{ PRODUCT : contains
  PRODUCT ||--o{ ORDER-ITEM : "ordered in"`;

const ErSyntaxPanel: React.FC<ErSyntaxPanelProps> = ({ 
  modeler, 
  isVisible 
}) => {
  const [syntaxInput, setSyntaxInput] = useState<string>(EXAMPLE_ER_SYNTAX);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [lastError, setLastError] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleGenerate = async () => {
    if (!modeler) {
      setLastError('Editor ER não está inicializado');
      return;
    }

    if (!syntaxInput.trim()) {
      setLastError('Sintaxe não pode estar vazia');
      return;
    }

    setIsGenerating(true);
    setLastError('');

    try {      
      const parser = new MermaidErParser();
      const diagram = parser.parse(syntaxInput);            
      const generator = new ErDiagramGenerator(modeler);
      await generator.generateVisualDiagram(diagram);            
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);      
      setLastError(errorMessage);
    } finally {
      setIsGenerating(false);      
    }
  };

  const handleExtractFromCanvas = () => {
    if (!modeler) {
      setLastError('Editor ER não está inicializado');
      return;
    }

    setLastError('');

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
  };

  const handleClear = () => {
    setSyntaxInput('');
    setLastError('');
    textareaRef.current?.focus();
  };

  if (!isVisible) return null;

  return (
    <div className="er-syntax-panel">
      <div className="er-syntax-panel-header">
        <h3>Sintaxe ER</h3>
        <span className="er-syntax-panel-subtitle">Crow's Foot</span>
      </div>

      <div className="er-syntax-panel-content">
        <div className="syntax-textarea-container">
          <textarea
            ref={textareaRef}
            className="syntax-textarea"
            value={syntaxInput}
            onChange={(e) => setSyntaxInput(e.target.value)}
            placeholder="Digite a sintaxe Mermaid ER aqui..."
            spellCheck={false}
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
              <h4>Cardinalidades:</h4>
              <ul>
                <li><code>||--||</code> - Um para um</li>
                <li><code>||--o{'{'}</code> - Um para muitos</li>
                <li><code>{'}'}o--||</code> - Muitos para um</li>
                <li><code>{'}'}o--o{'{'}</code> - Muitos para muitos</li>
              </ul>
              
              <h4>Atributos:</h4>
              <ul>
                <li><code>PK</code> - Primary Key</li>
                <li><code>FK</code> - Foreign Key</li>
                <li><code>NN</code> - Not Null</li>
              </ul>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

export default ErSyntaxPanel;