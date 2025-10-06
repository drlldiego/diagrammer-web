// Painel lateral para edição de sintaxe de fluxograma declarativo

import React, { useState, useRef } from 'react';
import BpmnModeler from "bpmn-js/lib/Modeler";
import { FlowParser } from './flow-parser';
import { DiagramVisualGenerator } from './diagram-generator';
import './FlowSyntaxPanel.scss';

interface FlowSyntaxPanelProps {
  modeler: BpmnModeler | null;
  isVisible: boolean;
}

const EXAMPLE_FLOW_SYNTAX = `Inicio
Processo: "Teste Simples"
Fim`;

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
      const parser = new FlowParser();
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
            onClick={handleLoadExample}
            disabled={isGenerating}
            title="Carregar exemplo de sintaxe"
          >
            Exemplo
          </button>

          <button
            className="action-button secondary"
            onClick={() => setSyntaxInput(`Inicio
Entrada: "Acessar Dados"
Decisao: "Dados Válidos?"
 Condicao: "Sim"
  Processo: "Apresentar Dados"
  Fim
 Condicao: "Não"
  Saida: "Dados Inválidos"
  Decisao: "Dados Válidos?"`)}
            disabled={isGenerating}
            title="Exemplo com loop/referência automática"
          >
            Loop
          </button>

          <button
            className="action-button secondary"
            onClick={() => setSyntaxInput(`Inicio
Decisao: "Continuar?"
 Condicao: "Sim"
  Processo: "Executar"
  Fim
 Condicao: "Não"
  Fim`)}
            disabled={isGenerating}
            title="Exemplo simples para testar condições"
          >
            Simples
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
            <summary>Ajuda Sintaxe</summary>
            <div className="help-content">
              <h3>Tipos de Elementos:</h3>
              <ul>
                <li><code>Inicio</code> - Início do fluxo</li>
                <li><code>Entrada: "Nome"</code> - Input/Entrada de dados</li>
                <li><code>Processo: "Nome"</code> - Processo/tarefa</li>
                <li><code>Decisao: "Pergunta?"</code> - Ponto de decisão</li>
                <li><code>Saida: "Nome"</code> - Output/Saída de dados</li>
                <li><code>Fim</code> - Fim do fluxo</li>
              </ul>
              
              <h3>Como Funciona:</h3>
              <ul>
                <li><strong>Quebra de linha</strong> = Conexão automática</li>
                <li><strong>Indentação</strong> = Hierarquia (1 espaço por nível)</li>
                <li><strong>Elemento repetido</strong> = Referência/Loop</li>
              </ul>
              
              <h3>Decisões e Condições:</h3>
              <ul>
                <li><code>Condicao: "Sim"</code> - Ramo da decisão</li>
                <li><code>Condicao: "Não"</code> - Ramo alternativo</li>
                <li>Elementos sob condição ficam identados (+1 espaço)</li>
              </ul>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

export default FlowSyntaxPanel;