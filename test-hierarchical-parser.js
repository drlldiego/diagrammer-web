// Teste simples para o parser hierárquico
import { HierarchicalParser } from './src/features/diagram/flow/declarative/hierarchical-parser.ts';

const parser = new HierarchicalParser();

const testInput = `Inicio
Decisao: "Continuar?"
 Condicao: "Sim"
  Processo: "Executar"
  Fim
 Condicao: "Não"
  Fim`;

try {
  console.log('🧪 TESTE DO PARSER HIERÁRQUICO');
  console.log('Input:', testInput);
  
  const result = parser.parse(testInput);
  
  console.log('✅ RESULTADO:');
  console.log('Elementos:', result.elements);
  console.log('Conexões:', result.connections);
  
} catch (error) {
  console.error('❌ ERRO:', error);
}