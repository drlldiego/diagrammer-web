// Interface de editor declarativo para fluxogramas
// Permite escrever sintaxe JSON/YAML e gerar diagramas

import React, { useState, useRef } from 'react';
import BpmnModeler from "bpmn-js/lib/Modeler";
import { UnifiedDeclarativeParser, SyntaxFormat } from './unified-parser';
import { DiagramVisualGenerator } from './diagram-generator';
import { DiagramSerializer } from './diagram-serializer';
import './DeclarativeEditor.scss';

interface DeclarativeEditorProps {
  modeler: BpmnModeler | null;
  isVisible: boolean;
  onClose: () => void;
}

const EXAMPLE_JSON = `{
  "flowchart": {
    "name": "Exemplo de Fluxograma",
    "elements": [
      {
        "type": "start",
        "name": "Início"
      },
      {
        "type": "process",
        "name": "Processar dados"
      },
      {
        "type": "decision",
        "name": "Dados válidos?"
      },
      {
        "type": "process",
        "name": "Salvar resultado"
      },
      {
        "type": "end",
        "name": "Sucesso"
      },
      {
        "type": "end",
        "name": "Erro"
      }
    ],
    "connections": [
      { "from": 0, "to": 1 },
      { "from": 1, "to": 2 },
      { "from": 2, "to": 3, "label": "Sim" },
      { "from": 3, "to": 4 },
      { "from": 2, "to": 5, "label": "Não" }
    ]
  }
}`;

const EXAMPLE_SYNTAX = `flowchart:
  name: "Fluxo de Login"
  flow: start -> process:"Inserir credenciais" -> decision:"Credenciais válidas?"
  branches:
    - from: "Credenciais válidas?"
      condition: "Sim"
      flow: process:"Acessar sistema" -> end:"Logado"
    - from: "Credenciais válidas?"
      condition: "Não"
      flow: end:"Erro"`;

const DeclarativeEditor: React.FC<DeclarativeEditorProps> = ({ 
  modeler, 
  isVisible, 
  onClose 
}) => {
  const [syntaxInput, setSyntaxInput] = useState<string>(EXAMPLE_SYNTAX);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [lastError, setLastError] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleGenerate = async () => {
    if (!modeler) {
      setLastError('Editor não está inicializado');
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
      
      console.log(`✅ Fluxograma "${diagram.name}" gerado com sucesso`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setLastError(errorMessage);
      console.error('❌ Erro ao gerar fluxograma:', errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExtractFromCanvas = () => {
    if (!modeler) {
      setLastError('Editor não está inicializado');
      return;
    }

    setLastError('');

    try {
      const serializer = new DiagramSerializer(modeler);
      
      if (!serializer.canSerialize()) {
        setLastError('Nenhum conteúdo válido encontrado no canvas para extrair');
        return;
      }
      
      const extractedSyntax = serializer.serializeToDeclarative();
      setSyntaxInput(extractedSyntax);
      
      console.log('✅ Sintaxe extraída do canvas com sucesso');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setLastError(errorMessage);
      console.error('❌ Erro ao extrair sintaxe:', errorMessage);
    }
  };

  const handleLoadExample = () => {
    setSyntaxInput(EXAMPLE_SYNTAX);
    setLastError('');
  };

  const handleClear = () => {
    setSyntaxInput('');
    setLastError('');
    textareaRef.current?.focus();
  };

  if (!isVisible) return null;

  return (
    <div className="declarative-editor">
      <div className="declarative-editor-header">
        <h3>Editor Declarativo</h3>
        <button 
          className="close-button"
          onClick={onClose}
          aria-label="Fechar editor"
        >
          ✕
        </button>
      </div>

      <div className="declarative-editor-content">
        <div className="editor-instructions">
          <p>Escreva a sintaxe YAML ou JSON para gerar o fluxograma automaticamente:</p>
          <p><small>✨ Suporta sintaxe tradicional (detalhada) e simplificada (arrow flow: <code>start {'->'} process {'->'} end</code>)</small></p>
        </div>

        <div className="editor-textarea-container">
          <textarea
            ref={textareaRef}
            className="syntax-textarea"
            value={syntaxInput}
            onChange={(e) => setSyntaxInput(e.target.value)}
            placeholder="Digite a sintaxe YAML ou JSON aqui..."
            spellCheck={false}
          />
        </div>

        {lastError && (
          <div className="error-message">
            <strong>Erro:</strong> {lastError}
          </div>
        )}

        <div className="editor-actions">
          <button
            className="action-button primary"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? 'Gerando...' : '🚀 Gerar Fluxograma'}
          </button>

          <button
            className="action-button secondary extract-button"
            onClick={handleExtractFromCanvas}
            disabled={isGenerating}
          >
            📤 Extrair do Canvas
          </button>

          <button
            className="action-button secondary"
            onClick={handleLoadExample}
            disabled={isGenerating}
          >
            💡 Exemplo
          </button>

          <button
            className="action-button secondary"
            onClick={handleClear}
            disabled={isGenerating}
          >
            🗑️ Limpar
          </button>
        </div>

        <div className="editor-help">
          <details>
            <summary>💡 Ajuda - Sintaxe Arrow Flow</summary>
            <div className="help-content">
              <h4>🎨 Estrutura Básica:</h4>
              <pre><code>flowchart:
  name: "Nome do Fluxograma"
  flow: start {'->'} process:"Ação" {'->'} decision:"Pergunta?"
  branches:
    - from: "Pergunta?"
      condition: "Sim"
      flow: process:"Ação 1" {'->'} end:"Sucesso"
    - from: "Pergunta?"
      condition: "Não"
      flow: end:"Erro"</code></pre>
              
              <h4>🔸 Tipos de Elementos:</h4>
              <ul>
                <li><code>start</code> - Início do fluxograma</li>
                <li><code>process:"Nome"</code> - Processo/ação</li>
                <li><code>decision:"Pergunta?"</code> - Decisão/condição</li>
                <li><code>end:"Resultado"</code> - Fim do fluxograma</li>
              </ul>
              
              <h4>⚡ Características:</h4>
              <ul>
                <li>Use <code>{'->'}</code> para conectar elementos</li>
                <li>Adicione nomes com <code>:"Nome"</code></li>
                <li>Ramificações em <code>branches</code> para decisões</li>
                <li>Suporta YAML e JSON</li>
              </ul>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

export default DeclarativeEditor;