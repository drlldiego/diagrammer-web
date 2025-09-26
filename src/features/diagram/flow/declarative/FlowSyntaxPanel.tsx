// Painel lateral para edição de sintaxe de fluxograma declarativo

import React, { useState, useRef } from 'react';
import BpmnModeler from "bpmn-js/lib/Modeler";
import { UnifiedDeclarativeParser } from './unified-parser';
import { DiagramVisualGenerator } from './diagram-generator';
import { DiagramSerializer } from './diagram-serializer';
import './FlowSyntaxPanel.scss';

interface FlowSyntaxPanelProps {
  modeler: BpmnModeler | null;
  isVisible: boolean;
}

const EXAMPLE_FLOW_SYNTAX = `flowchart:
  name: "Processo de Login"
  flow: start -> process:"Inserir credenciais" -> decision:"Credenciais válidas?"
  branches:
    - from: "Credenciais válidas?"
      condition: "Sim"
      flow: process:"Acessar sistema" -> end:"Logado"
    - from: "Credenciais válidas?"
      condition: "Não"
      flow: end:"Erro de login"`;

const FlowSyntaxPanel: React.FC<FlowSyntaxPanelProps> = ({ 
  modeler, 
  isVisible 
}) => {
  const [syntaxInput, setSyntaxInput] = useState<string>(EXAMPLE_FLOW_SYNTAX);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [lastError, setLastError] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleGenerate = async () => {
    if (!modeler) {
      setLastError('Editor de fluxograma não está inicializado');
      return;
    }

    if (!syntaxInput.trim()) {
      setLastError('Sintaxe não pode estar vazia');
      return;
    }

    setIsGenerating(true);
    setLastError('');

    try {      
      const parser = new UnifiedDeclarativeParser();
      const diagram = parser.parse(syntaxInput);            
      const generator = new DiagramVisualGenerator(modeler);
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
      setLastError('Editor de fluxograma não está inicializado');
      return;
    }

    setLastError('');

    try {
      const serializer = new DiagramSerializer(modeler);
      
      if (!serializer.canSerialize()) {
        setLastError('Nenhum conteúdo válido de fluxograma encontrado no canvas para extrair');
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
    setSyntaxInput(EXAMPLE_FLOW_SYNTAX);
    setLastError('');
  };

  const handleClear = () => {
    setSyntaxInput('');
    setLastError('');
    textareaRef.current?.focus();
  };

  if (!isVisible) return null;

  return (
    <div className="flow-syntax-panel">
      <div className="flow-syntax-panel-header">
        <h3>Interface Declarativa</h3>        
      </div>

      <div className="flow-syntax-panel-content">
        <div className="syntax-textarea-container">
          <textarea
            ref={textareaRef}
            className="syntax-textarea"
            value={syntaxInput}
            onChange={(e) => setSyntaxInput(e.target.value)}
            placeholder="Digite o código da sintaxe de fluxograma aqui..."
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
            title="Gerar fluxograma a partir da sintaxe"
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
              <h4>Estrutura Básica:</h4>
              <ul>
                <li><code>flowchart:</code> - Define o início do fluxograma</li>
                <li><code>name:</code> - Nome do fluxograma</li>
                <li><code>flow:</code> - Sequência principal de elementos</li>
                <li><code>branches:</code> - Ramificações de decisões</li>
              </ul>
              
              <h4>Tipos de Elementos:</h4>
              <ul>
                <li><code>start</code> - Início do fluxo</li>
                <li><code>process:"Nome"</code> - Processo/tarefa</li>
                <li><code>decision:"Pergunta?"</code> - Decisão</li>
                <li><code>end:"Resultado"</code> - Fim do fluxo</li>
              </ul>
              
              <h4>Conexões:</h4>
              <ul>
                <li><code>{'->'}</code> - Conecta elementos em sequência</li>
                <li><code>from:</code> - Elemento de origem da ramificação</li>
                <li><code>condition:</code> - Condição da ramificação (Sim/Não)</li>
              </ul>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

export default FlowSyntaxPanel;