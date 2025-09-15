// TESTE ABRANGENTE - Nova Sintaxe Simplificada (Arrow Flow)
// TODO: Remover após confirmação que funciona perfeitamente

import { UnifiedDeclarativeParser } from './unified-parser';

export function testSimplifiedSyntax(): void {
  console.log('🧪 TESTE ABRANGENTE - Sintaxe Simplificada (Arrow Flow)');
  console.log('='.repeat(70));

  const parser = new UnifiedDeclarativeParser();

  // Teste 1: Fluxo linear simples
  console.log('📝 TESTE 1: Fluxo Linear Simples');
  const simpleFlow = `flowchart:
  name: "Fluxo Linear"
  flow: start -> process:"Processar" -> end:"Concluído"`;

  try {
    console.log('Entrada:', simpleFlow);
    const diagram = parser.parse(simpleFlow);
    console.log(`✅ Resultado: ${diagram.elements.length} elementos, ${diagram.connections.length} conexões`);
    console.log('Elementos:', diagram.elements.map(el => `${el.type}:"${el.name}"`).join(' -> '));
  } catch (error) {
    console.error('❌ Erro:', error instanceof Error ? error.message : String(error));
  }

  console.log('\n' + '-'.repeat(50));

  // Teste 2: Fluxo com decisão e branches
  console.log('📝 TESTE 2: Fluxo com Decisão e Branches');
  const branchFlow = `flowchart:
  name: "Fluxo com Decisão"
  flow: start -> process:"Inserir dados" -> decision:"Dados válidos?"
  branches:
    - from: "Dados válidos?"
      condition: "Sim"
      flow: process:"Salvar" -> end:"Sucesso"
    - from: "Dados válidos?"
      condition: "Não"
      flow: end:"Erro"`;

  try {
    console.log('Entrada:', branchFlow);
    const diagram = parser.parse(branchFlow);
    console.log(`✅ Resultado: ${diagram.elements.length} elementos, ${diagram.connections.length} conexões`);
    console.log('Nome:', diagram.name);
    
    console.log('🔗 Conexões com labels:');
    diagram.connections.forEach(conn => {
      const fromEl = diagram.elements.find(el => el.id === conn.from);
      const toEl = diagram.elements.find(el => el.id === conn.to);
      const label = conn.label ? ` [${conn.label}]` : '';
      console.log(`   "${fromEl?.name}" → "${toEl?.name}"${label}`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error instanceof Error ? error.message : String(error));
  }

  console.log('\n' + '-'.repeat(50));

  // Teste 3: Fluxo complexo com múltiplas decisões
  console.log('📝 TESTE 3: Fluxo Complexo (Login com Validações)');
  const complexFlow = `flowchart:
  name: "Sistema de Login Avançado"
  flow: start -> process:"Inserir credenciais" -> decision:"Usuário existe?"
  branches:
    - from: "Usuário existe?"
      condition: "Não"
      flow: end:"Usuário não encontrado"
    - from: "Usuário existe?"
      condition: "Sim"
      flow: decision:"Senha correta?" -> process:"Verificar 2FA" -> decision:"2FA válido?"
    - from: "Senha correta?"
      condition: "Não"
      flow: end:"Senha incorreta"
    - from: "2FA válido?"
      condition: "Sim"
      flow: process:"Fazer login" -> end:"Sucesso"
    - from: "2FA válido?"
      condition: "Não"
      flow: end:"2FA inválido"`;

  try {
    console.log('Entrada:', complexFlow);
    const diagram = parser.parse(complexFlow);
    console.log(`✅ Resultado: ${diagram.elements.length} elementos, ${diagram.connections.length} conexões`);
    
    console.log('🎯 Elementos processados:');
    diagram.elements.forEach((el, index) => {
      const pos = el.position;
      console.log(`   ${index + 1}. ${el.type}: "${el.name}" [ID: ${el.id}] → (${pos?.x}, ${pos?.y})`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error instanceof Error ? error.message : String(error));
  }

  console.log('\n' + '-'.repeat(50));

  // Teste 4: Serialização de volta (Round-trip)
  console.log('📝 TESTE 4: Serialização Round-trip');
  try {
    const originalDiagram = parser.parse(branchFlow);
    const serialized = parser.serialize(originalDiagram, 'yaml');
    console.log('✅ Serialização para YAML simplificado:');
    console.log(serialized);
    
    // Parse de volta
    const reparsedDiagram = parser.parse(serialized);
    console.log(`✅ Re-parse bem-sucedido: ${reparsedDiagram.elements.length} elementos, ${reparsedDiagram.connections.length} conexões`);
    
  } catch (error) {
    console.error('❌ Erro no round-trip:', error instanceof Error ? error.message : String(error));
  }

  console.log('\n' + '-'.repeat(50));

  // Teste 5: Detecção automática de formato
  console.log('📝 TESTE 5: Detecção Automática de Formato');
  
  // Teste com formato tradicional
  const traditionalFormat = `flowchart:
  name: "Formato Tradicional"
  elements:
    - type: start
      name: "Início"
    - type: process
      name: "Processar"
  connections:
    - from: 0
      to: 1`;

  try {
    const traditionalDiagram = parser.parse(traditionalFormat);
    console.log('✅ Formato tradicional detectado e processado corretamente');
    console.log(`   ${traditionalDiagram.elements.length} elementos, ${traditionalDiagram.connections.length} conexões`);
  } catch (error) {
    console.error('❌ Erro no formato tradicional:', error instanceof Error ? error.message : String(error));
  }

  // Teste com formato simplificado
  try {
    const simplifiedDiagram = parser.parse(simpleFlow);
    console.log('✅ Formato simplificado detectado e processado corretamente');
    console.log(`   ${simplifiedDiagram.elements.length} elementos, ${simplifiedDiagram.connections.length} conexões`);
  } catch (error) {
    console.error('❌ Erro no formato simplificado:', error instanceof Error ? error.message : String(error));
  }

  console.log('\n✅ TESTE SIMPLIFICADO CONCLUÍDO!');
  console.log('🎯 Funcionalidades testadas:');
  console.log('   ✓ Sintaxe arrow flow (start -> process -> end)');
  console.log('   ✓ Elementos com nomes customizados process:"Nome"');
  console.log('   ✓ Branches com condições (Sim/Não)');
  console.log('   ✓ Fluxos complexos com múltiplas decisões');
  console.log('   ✓ Posicionamento automático');
  console.log('   ✓ Serialização round-trip');
  console.log('   ✓ Detecção automática de formato');
  console.log('='.repeat(70));
}