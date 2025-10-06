// ===================================================================
// SERVIÇO ELK LAYOUT - VERSÃO LEGADA (DOCUMENTADA)
// ===================================================================
// 
// Este ficheiro contém a implementação complexa do layout usando ELK.
// ESTADO: Temporariamente desabilitado por ser demasiado complexo.
// 
// PROBLEMAS IDENTIFICADOS:
// 1. 🔴 Mais de 1400 linhas de código complexo
// 2. 🔴 Múltiplas camadas de abstração desnecessárias
// 3. 🔴 Difícil de debuggar e modificar
// 4. 🔴 Muitas funcionalidades que não funcionam bem
// 5. 🔴 Performance questionável
// 6. 🔴 Manutenção custosa
//
// DECISÃO: Substituído por LayoutSimplesService
// ===================================================================

import { ErEntity, ErRelationship } from '../../er/declarative/er-types';

/**
 * SERVIÇO ELK LAYOUT - VERSÃO COMPLEXA
 * 
 * Este serviço tentava implementar layouts inteligentes usando
 * o framework ELK (Eclipse Layout Kernel).
 * 
 * FUNCIONALIDADES QUE TENTAVA IMPLEMENTAR:
 * - Layout radial adaptativo
 * - Análise de padrões de conectividade  
 * - Posicionamento baseado em hubs
 * - Resolução de colisões avançada
 * - Otimização de conexões
 * 
 * RAZÕES PARA DESABILITAÇÃO:
 * 1. Complexidade excessiva para o benefício obtido
 * 2. Bugs difíceis de resolver
 * 3. Código difícil de manter
 * 4. Resultados inconsistentes
 * 5. Performance não justifica complexidade
 */
export class ElkLayoutLegadoService {
  
  // ===================================================================
  // ANÁLISE DO CÓDIGO LEGADO
  // ===================================================================
  
  /**
   * MÉTODO PRINCIPAL DO ELK (DESABILITADO)
   * 
   * Este método era o ponto de entrada principal para o layout ELK.
   * Implementava um pipeline complexo com múltiplas fases.
   * 
   * FASES DO PIPELINE:
   * 1. Análise de conectividade
   * 2. Selecção de estratégia
   * 3. Layout radial/força/hierarchical
   * 4. Resolução de colisões
   * 5. Otimização de posições
   * 6. Validação de bounds
   * 
   * PROBLEMA: Demasiadas fases, cada uma com seus próprios bugs
   */
  async applyLayout_DESABILITADO(
    entities: ErEntity[], 
    relationships: ErRelationship[], 
    options: any
  ): Promise<any> {
    console.log('⚠️ [ELK Legado] Este método está desabilitado');
    console.log('💡 [ELK Legado] Use LayoutSimplesService em vez deste');
    
    return {
      success: false,
      reason: 'ELK desabilitado por complexidade excessiva',
      nodes: new Map()
    };
  }

  /**
   * ANÁLISE DE CONECTIVIDADE (COMPLEXA DEMAIS)
   * 
   * Tentava analisar padrões de conexões para decidir layout:
   * - Identificar hubs (entidades muito conectadas)
   * - Encontrar cadeias lineares  
   * - Detectar clusters densos
   * - Isolar elementos órfãos
   * 
   * PROBLEMA: Lógica complexa que raramente funcionava bem
   * SOLUÇÃO: Layout simples que funciona sempre
   */
  private analyzeConnectivityPatterns_COMPLEXO_DEMAIS(
    entities: ErEntity[], 
    relationships: ErRelationship[]
  ): any {
    console.log('🔴 [ELK Legado] Análise de conectividade era demasiado complexa');
    
    // Esta função tinha 200+ linhas de lógica complexa
    // que tentava ser "inteligente" mas criava mais problemas
    
    return {
      hubs: [],
      chains: [],
      clusters: [],
      isolated: [],
      overallPattern: 'unknown',
      recommendedStrategy: 'simple-grid' // A única que funciona bem
    };
  }

  /**
   * LAYOUT RADIAL ADAPTATIVO (MUITOS BUGS)
   * 
   * Tentava posicionar elementos em círculos concêntricos
   * baseado na análise de conectividade.
   * 
   * BUGS CONHECIDOS:
   * - Entidades sobrepostas
   * - Posições negativas
   * - Elementos fora do canvas
   * - Cálculos de ângulos incorretos
   * - Colisões não resolvidas
   * 
   * TEMPO GASTO A DEBUGGAR: Muitas horas sem sucesso
   */
  private applyAdaptiveRadialLayout_COM_BUGS(
    entities: ErEntity[], 
    relationships: ErRelationship[], 
    analysis: any
  ): any {
    console.log('🐛 [ELK Legado] Layout radial tinha muitos bugs');
    
    // Mais de 400 linhas de código que tentava ser inteligente
    // mas criava problemas de sobreposição e posicionamento
    
    return {
      success: false,
      reason: 'Layout radial com bugs de sobreposição',
      nodes: new Map()
    };
  }

  /**
   * RESOLUÇÃO DE COLISÕES (INEFICAZ)
   * 
   * Tentava resolver sobreposições de entidades através de:
   * - Detecção de bounding boxes
   * - Cálculo de forças de repulsão
   * - Iterações de ajuste posicional
   * 
   * PROBLEMAS:
   * - Convergência lenta ou inexistente
   * - Criava novas colisões ao resolver outras
   * - Lógica de stopping criteria inadequada
   * - Performance questionável
   */
  private resolveCollisions_INEFICAZ(
    positionsMap: Map<string, any>, 
    iterations: number
  ): any {
    console.log('🔄 [ELK Legado] Resolução de colisões era ineficaz');
    
    // 150+ linhas de física simulada que raramente convergia
    // para uma solução satisfatória
    
    return {
      totalCollisions: 999,
      resolvedCollisions: 0,
      iterations: iterations,
      converged: false
    };
  }

  // ===================================================================
  // LIÇÕES APRENDIDAS
  // ===================================================================
  
  /**
   * O QUE APRENDEMOS COM O ELK:
   * 
   * ❌ ABORDAGENS QUE NÃO FUNCIONARAM:
   * 1. Tentar ser demasiado "inteligente"
   * 2. Múltiplas camadas de abstração
   * 3. Algoritmos complexos sem benefício claro
   * 4. Premature optimization
   * 5. Código monolítico difícil de debuggar
   * 
   * ✅ O QUE FUNCIONA MELHOR:
   * 1. Algoritmos simples e previsíveis
   * 2. Código fácil de entender e modificar
   * 3. Resultados consistentes
   * 4. Performance adequada sem complexidade
   * 5. Iteração incremental de melhorias
   */

  /**
   * RECOMENDAÇÕES PARA O FUTURO:
   * 
   * 1. 🎯 FOCO NA SIMPLICIDADE
   *    - Layout em grade simples funciona para 90% dos casos
   *    - Adicionar complexidade apenas quando necessário
   * 
   * 2. 🔧 MELHORIA INCREMENTAL  
   *    - Começar com o básico que funciona
   *    - Adicionar funcionalidades uma de cada vez
   *    - Testar cada melhoria isoladamente
   * 
   * 3. 📊 MÉTRICAS CLARAS
   *    - Definir o que constitui "sucesso" no layout
   *    - Medir melhorias objectivamente
   *    - Não adicionar funcionalidades sem benefício provado
   * 
   * 4. 🛠️ MANUTENIBILIDADE
   *    - Código que qualquer programador pode entender
   *    - Comentários claros sobre decisões de design
   *    - Arquitectura modular e testável
   */
}

// ===================================================================
// ESTATÍSTICAS DO CÓDIGO ELK LEGADO
// ===================================================================
//
// 📊 COMPLEXIDADE:
// - Linhas de código: ~1400
// - Métodos privados: ~25
// - Níveis de aninhamento: até 6
// - Dependências: múltiplas
//
// ⏱️ TEMPO DE DESENVOLVIMENTO:
// - Desenvolvimento inicial: muitas horas
// - Debugging: ainda mais horas  
// - Manutenção: tempo contínuo
// - Resultado: funcionalidade instável
//
// 🎯 LIÇÃO PRINCIPAL:
// Simplicidade > Complexidade
// Funcionalidade > Inteligência artificial
// Manutenibilidade > Performance prematura
//
// ===================================================================