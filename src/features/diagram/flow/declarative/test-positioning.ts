// FUNÇÃO PROVISÓRIA PARA TESTE DO PARSER DECLARATIVO
// TODO: Remover após implementação completa da interface de usuário

import { UnifiedDeclarativeParser } from './unified-parser';

export function testDeclarativeParser(): void {
  console.log('🧪 TESTE PROVISÓRIO - Parser Declarativo + Posicionamento');
  console.log('='.repeat(60));

  // Sintaxe declarativa em JSON (equivalente ao YAML planejado)
  const declarativeSyntax = `{
    "flowchart": {
      "name": "Exemplo de Validação de Dados",
      "elements": [
        {
          "type": "start",
          "name": "Início"
        },
        {
          "type": "process",
          "name": "Receber dados"
        },
        {
          "type": "process", 
          "name": "Validar formato"
        },
        {
          "type": "decision",
          "name": "Dados corretos?"
        },
        {
          "type": "process",
          "name": "Processar"
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
        { "from": 2, "to": 3 },
        { "from": 3, "to": 4, "label": "Sim" },
        { "from": 4, "to": 5 },
        { "from": 3, "to": 6, "label": "Não" }
      ]
    }
  }`;

  console.log('📝 SINTAXE DECLARATIVA DE ENTRADA:');
  console.log(declarativeSyntax);

  try {
    // Testar o parser completo
    console.log('\n⚙️ Executando parser...');
    const parser = new UnifiedDeclarativeParser();
    const diagram = parser.parse(declarativeSyntax);

    console.log('\n📋 RESULTADO - Fluxograma processado:');
    console.log(`Nome: ${diagram.name}`);
    console.log(`Elementos: ${diagram.elements.length}`);
    console.log(`Conexões: ${diagram.connections.length}`);

    console.log('\n📐 ELEMENTOS COM POSIÇÕES AUTOMÁTICAS:');
    diagram.elements.forEach(el => {
      const pos = el.position;
      if (pos) {
        console.log(`  - ${el.type}: "${el.name}" → (x: ${pos.x}, y: ${pos.y}) [ID: ${el.id}]`);
      } else {
        console.log(`  - ${el.type}: "${el.name}" → SEM POSIÇÃO! [ID: ${el.id}]`);
      }
    });

    console.log('\n🔗 CONEXÕES PROCESSADAS:');
    diagram.connections.forEach(conn => {
      const fromEl = diagram.elements.find(el => el.id === conn.from);
      const toEl = diagram.elements.find(el => el.id === conn.to);
      const label = conn.label ? ` [${conn.label}]` : '';
      console.log(`  - "${fromEl?.name}" → "${toEl?.name}"${label} [ID: ${conn.id}]`);
    });

    // Testar serialização (conversão de volta)
    console.log('\n🔄 TESTE DE SERIALIZAÇÃO (conversão de volta):');
    const serialized = parser.serialize(diagram, 'yaml');
    console.log(serialized);

    console.log('\n✅ Teste do parser completo - SUCESSO!');
    
  } catch (error) {
    console.error('\n❌ ERRO no parser:');
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(errorMessage);
  }

  console.log('='.repeat(60));
}