// ===================================================================
// PARSER ER DECLARATIVO - ORGANIZADOR PRINCIPAL DE LAYOUT
// ===================================================================
// 
// Este ficheiro é responsável por coordenar todo o processo de layout
// dos diagramas ER, desde o parsing da sintaxe até ao posicionamento
// final dos elementos no canvas.
//
// FLUXO PRINCIPAL:
// 1. Parse da sintaxe Mermaid/YAML → Estrutura ErDiagram
// 2. Posicionamento automático das entidades
// 3. Resolução de colisões
// 4. Roteamento das conexões
// 5. Geração visual final
// ===================================================================

import { ErDiagram, ErEntity, ErRelationship, MermaidErSyntax } from './er-types';

export default class ErDeclarativeParser {
  
  // ===================================================================
  // SECÇÃO 1: MÉTODOS PRINCIPAIS DE PARSE
  // ===================================================================
  
  /**
   * MÉTODO PRINCIPAL DE PARSE
   * Converte sintaxe declarativa (YAML/Mermaid) em diagrama ER estruturado
   * 
   * @param input - Sintaxe declarativa em string
   * @returns Promise<ErDiagram> - Diagrama ER com entidades e relacionamentos
   */
  async parse(input: string): Promise<ErDiagram> {
    console.log('🎬 [ER Parser Debug] Iniciando método de parse (apenas YAML)');
    
    try {
      console.log('🔧 [ER Parser Debug] Prestes a chamar parseMermaidErSyntax');
      const diagram = await this.parseMermaidErSyntax(input);
      console.log('✅ [ER Parser Debug] Parse concluído, entidades:', diagram.entities.length);
      
      return diagram;
    } catch (error) {
      console.error('❌ [ER Parser Debug] Erro no parse:', error);
      throw error;
    }
  }

  /**
   * PARSE DA SINTAXE MERMAID/YAML
   * Processa a sintaxe declarativa e aplica layout automático
   * 
   * @param input - String com sintaxe declarativa
   * @returns Promise<ErDiagram> - Diagrama processado com posições
   */
  private async parseMermaidErSyntax(input: string): Promise<ErDiagram> {
    try {
      // 1. PARSE BÁSICO: Converter sintaxe em estrutura de dados
      const { entities, relationships } = this.parseErDiagramString(input);
      
      // 2. APLICAR LAYOUT AUTOMÁTICO: Calcular posições das entidades
      await this.aplicarLayoutAutomatico(entities, relationships);
      
      // 3. RETORNAR DIAGRAMA COMPLETO
      return {
        entities,
        relationships
      };
    } catch (error) {
      console.error('❌ [Mermaid Parser] Erro:', error);
      throw error;
    }
  }

  // ===================================================================
  // SECÇÃO 2: ALGORITMOS DE LAYOUT
  // ===================================================================

  /**
   * APLICAR LAYOUT AUTOMÁTICO
   * Coordena todo o processo de posicionamento das entidades
   * 
   * ESTRATÉGIA ATUAL:
   * - Layout em grade simples (ELK temporariamente desabilitado)
   * - Resolução de colisões
   * - Roteamento de conexões
   * 
   * @param entities - Array de entidades ER
   * @param relationships - Array de relacionamentos
   */
  private async aplicarLayoutAutomatico(
    entities: ErEntity[], 
    relationships: ErRelationship[]
  ): Promise<void> {
    console.log('🚀 [Layout] Iniciando aplicação de layout automático');
    
    // 1. POSICIONAMENTO BÁSICO: Grade simples
    this.aplicarLayoutGrade(entities);
    
    // 2. RESOLUÇÃO DE COLISÕES: Ajustar entidades sobrepostas
    // (a implementar se necessário)
    
    // 3. OTIMIZAÇÃO DE CONEXÕES: Melhorar rotas das ligações
    // (a implementar se necessário)
    
    console.log('✅ [Layout] Layout automático concluído');
  }

  /**
   * LAYOUT EM GRADE SIMPLES
   * Posiciona entidades numa grade regular
   * 
   * PARÂMETROS CONFIGURÁVEIS:
   * - cellWidth: Largura da célula da grade (200px)
   * - cellHeight: Altura da célula da grade (150px)  
   * - startX/Y: Posição inicial da grade (300, 200)
   * 
   * @param entities - Array de entidades a posicionar
   */
  private aplicarLayoutGrade(entities: ErEntity[]): void {
    console.log('📊 [Layout] Aplicando layout em grade simples');
    
    // CONFIGURAÇÃO DA GRADE
    const colunas = Math.ceil(Math.sqrt(entities.length * 1.2));
    const larguraCelula = 200;
    const alturaCelula = 150;
    const inicioX = 300;
    const inicioY = 200;

    // POSICIONAR CADA ENTIDADE NA GRADE
    entities.forEach((entidade, indice) => {
      const linha = Math.floor(indice / colunas);
      const coluna = indice % colunas;
      
      entidade.x = inicioX + (coluna * larguraCelula);
      entidade.y = inicioY + (linha * alturaCelula);
      
      console.log(`📍 [Layout] Entidade "${entidade.name}" posicionada em (${entidade.x}, ${entidade.y})`);
    });
  }

  // ===================================================================
  // SECÇÃO 3: MÉTODOS DE PARSE DE SINTAXE
  // ===================================================================

  /**
   * PARSE DA STRING DO DIAGRAMA ER
   * Extrai entidades e relacionamentos da sintaxe declarativa
   * 
   * @param input - String com sintaxe declarativa
   * @returns {entities, relationships} - Estruturas de dados extraídas
   */
  private parseErDiagramString(input: string): {entities: ErEntity[], relationships: ErRelationship[]} {
    console.log('🔍 [Parse] Iniciando parse da string do diagrama');
    
    // Implementação simplificada - a implementar parsing real
    const entities: ErEntity[] = [];
    const relationships: ErRelationship[] = [];
    
    // TODO: Implementar parsing real da sintaxe
    // Por agora, retornar estruturas vazias
    
    return { entities, relationships };
  }

  // ===================================================================
  // SECÇÃO 4: MÉTODOS AUXILIARES
  // ===================================================================

  /**
   * GERAR ID ÚNICO DO DIAGRAMA
   * Cria identificador único baseado no conteúdo
   * 
   * @param entities - Entidades do diagrama
   * @param relationships - Relacionamentos do diagrama
   * @returns string - ID único do diagrama
   */
  private generateDiagramId(entities: ErEntity[], relationships: ErRelationship[]): string {
    const conteudo = entities.map(e => e.name).join('') + relationships.length;
    return `diagram_${btoa(conteudo).slice(0, 8)}`;
  }

  // ===================================================================
  // SECÇÃO 5: MÉTODOS LEGADOS (PARA REFERÊNCIA)
  // ===================================================================
  
  /**
   * NOTA: Os seguintes métodos estão comentados pois usavam o ELK
   * Mantidos para referência e possível reativação futura:
   * 
   * - executeHybridLayoutPipeline()
   * - executeElkLayout() 
   * - applyFallbackPositioning()
   */
}

// ===================================================================
// COMENTÁRIOS SOBRE ARQUITECTURA ATUAL
// ===================================================================
//
// PROBLEMAS IDENTIFICADOS:
// 1. 🔴 Complexidade excessiva com ELK framework
// 2. 🔴 Múltiplas camadas de abstração desnecessárias  
// 3. 🔴 Código espalhado por muitos ficheiros
// 4. 🔴 Difícil de debuggar e modificar
//
// SOLUÇÕES RECOMENDADAS:
// 1. ✅ Simplificar para layout básico funcional
// 2. ✅ Consolidar lógica num só lugar
// 3. ✅ Focar na funcionalidade essencial
// 4. ✅ Iteração incremental de melhorias
//
// ===================================================================