// TESTE INTEGRADO: Sintaxe Declarativa → Diagrama Visual
// TODO: Remover após implementação da interface de usuário completa

import BpmnModeler from "bpmn-js/lib/Modeler";
import { UnifiedDeclarativeParser } from './unified-parser';
import { DiagramVisualGenerator } from './diagram-generator';

export async function testIntegratedDeclarativeFlow(modeler: BpmnModeler): Promise<void> {
  console.log('🎯 TESTE INTEGRADO - Sintaxe Declarativa → Diagrama Visual');
  console.log('='.repeat(65));

  // Sintaxe declarativa de exemplo (simples para primeiro teste)
  const declarativeSyntax = `{
    "flowchart": {
      "name": "Fluxo de Login",
      "elements": [
        {
          "type": "start",
          "name": "Iniciar"
        },
        {
          "type": "process",
          "name": "Inserir credenciais"
        },
        {
          "type": "decision",
          "name": "Credenciais válidas?"
        },
        {
          "type": "process",
          "name": "Acessar sistema"
        },
        {
          "type": "end",
          "name": "Logado"
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

  try {
    console.log('📝 ETAPA 1: Processando sintaxe declarativa...');
    const parser = new UnifiedDeclarativeParser();
    const diagram = parser.parse(declarativeSyntax);
    
    console.log(`   ✅ Parser: ${diagram.elements.length} elementos, ${diagram.connections.length} conexões`);
    
    console.log('\n📐 ETAPA 2: Posições calculadas automaticamente:');
    diagram.elements.forEach(el => {
      const pos = el.position;
      console.log(`   - ${el.type}: "${el.name}" → (${pos?.x}, ${pos?.y})`);
    });

    console.log('\n🎨 ETAPA 3: Gerando elementos visuais...');
    const generator = new DiagramVisualGenerator(modeler);
    await generator.generateVisualDiagram(diagram);
    
    console.log('   ✅ Diagrama visual criado com sucesso!');
    
    // DIAGNOSTIC: Inspecionar DOM gerado
    setTimeout(() => {
      console.log('\n🔍 DIAGNÓSTICO DOM:');
      const canvas = document.querySelector('.djs-container');
      if (canvas) {
        const elements = canvas.querySelectorAll('[data-element-id^="element_"]');
        console.log(`   📦 Elementos encontrados no DOM: ${elements.length}`);
        
        elements.forEach((el, index) => {
          const elementId = el.getAttribute('data-element-id');
          const visualChildren = el.querySelector('.djs-visual')?.children;
          const childTypes = Array.from(visualChildren || []).map(child => child.tagName).join(', ');
          console.log(`   ${index + 1}. ${elementId}: ${childTypes || 'NENHUM'}`);
        });
        
        const connections = canvas.querySelectorAll('[data-element-id^="connection_"]');
        console.log(`   🔗 Conexões encontradas no DOM: ${connections.length}`);
      } else {
        console.log('   ❌ Canvas não encontrado no DOM');
      }
    }, 500);
    
    console.log('   📋 Elementos agora devem estar visíveis no canvas');
    console.log('   🎨 Estilos customizados aplicados via DeclarativeElements.scss');

    console.log('\n🔍 ETAPA 4: Informações do resultado:');
    console.log(`   📊 Nome: "${diagram.name}"`);
    console.log(`   📦 Elementos: ${diagram.elements.length} (${diagram.elements.map(el => el.type).join(', ')})`);
    console.log(`   🔗 Conexões: ${diagram.connections.length} (incluindo labels)`);
    
    console.log('\n✅ TESTE INTEGRADO CONCLUÍDO COM SUCESSO!');
    console.log('   🎯 Pipeline completo: Texto → Modelo → Posições → Visual');
    console.log('   👀 Verifique o canvas para ver o diagrama gerado');

  } catch (error) {
    console.error('\n❌ ERRO no teste integrado:');
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`   💥 ${errorMessage}`);
    console.error('\n🔧 Verifique:');
    console.error('   - Se o modeler está inicializado');
    console.error('   - Se a sintaxe JSON está correta');
    console.error('   - Se todos os módulos estão carregados');
  }

  console.log('='.repeat(65));
}