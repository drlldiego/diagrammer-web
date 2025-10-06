// ===================================================================
// SERVIÇO DE LAYOUT SIMPLES - SUBSTITUIÇÃO DO ELK
// ===================================================================
// 
// Este serviço fornece algoritmos de layout simples e eficazes
// para substituir a complexidade do framework ELK
//
// PRINCÍPIOS:
// 1. Simplicidade sobre complexidade
// 2. Previsibilidade sobre "inteligência"
// 3. Facilidade de manutenção
// 4. Performance adequada
// ===================================================================

import { ErEntity, ErRelationship } from '../../er/declarative/er-types';

export interface LayoutOptions {
  larguraCelula?: number;
  alturaCelula?: number;
  margemX?: number;
  margemY?: number;
  espacamentoMinimo?: number;
}

export interface LayoutResult {
  success: boolean;
  entitiesPositioned: number;
  layoutTime: number;
  layoutType: string;
}

export class LayoutSimplesService {
  
  // ===================================================================
  // SECÇÃO 1: ALGORITMOS DE LAYOUT DISPONÍVEIS
  // ===================================================================
  
  /**
   * LAYOUT EM GRADE (PRINCIPAL)
   * Posiciona entidades numa grade regular e previsível
   * 
   * @param entities - Array de entidades a posicionar
   * @param options - Opções de configuração do layout
   * @returns LayoutResult - Resultado do posicionamento
   */
  async aplicarLayoutGrade(
    entities: ErEntity[], 
    options: LayoutOptions = {}
  ): Promise<LayoutResult> {
    const inicioTempo = performance.now();
    console.log('📊 [Layout Simples] Iniciando layout em grade');
    
    // CONFIGURAÇÃO PADRÃO
    const config = {
      larguraCelula: options.larguraCelula || 220,
      alturaCelula: options.alturaCelula || 160,
      margemX: options.margemX || 100,
      margemY: options.margemY || 100,
      ...options
    };
    
    // CALCULAR DIMENSÕES DA GRADE
    const numeroEntidades = entities.length;
    const colunas = Math.ceil(Math.sqrt(numeroEntidades * 1.3)); // Ligeiramente rectangular
    
    console.log(`📐 [Layout] Configuração: ${colunas} colunas, ${numeroEntidades} entidades`);
    
    // POSICIONAR CADA ENTIDADE
    let entidadesPosicionadas = 0;
    
    entities.forEach((entidade, indice) => {
      const linha = Math.floor(indice / colunas);
      const coluna = indice % colunas;
      
      entidade.x = config.margemX + (coluna * config.larguraCelula);
      entidade.y = config.margemY + (linha * config.alturaCelula);
      
      entidadesPosicionadas++;
      
      console.log(`📍 [Layout] "${entidade.name}" → (${entidade.x}, ${entidade.y})`);
    });
    
    const tempoDecorrido = performance.now() - inicioTempo;
    
    console.log(`✅ [Layout] Grade concluída: ${entidadesPosicionadas} entidades em ${tempoDecorrido.toFixed(1)}ms`);
    
    return {
      success: true,
      entitiesPositioned: entidadesPosicionadas,
      layoutTime: tempoDecorrido,
      layoutType: 'grade-regular'
    };
  }

  /**
   * LAYOUT CIRCULAR (ALTERNATIVO)
   * Posiciona entidades em círculo - útil para poucos elementos
   * 
   * @param entities - Array de entidades (máximo recomendado: 8-10)
   * @param options - Opções de configuração
   * @returns LayoutResult - Resultado do posicionamento
   */
  async aplicarLayoutCircular(
    entities: ErEntity[], 
    options: LayoutOptions = {}
  ): Promise<LayoutResult> {
    const inicioTempo = performance.now();
    console.log('⭕ [Layout Simples] Iniciando layout circular');
    
    if (entities.length > 10) {
      console.warn('⚠️ [Layout] Muitas entidades para layout circular, recomenda-se grade');
    }
    
    // CONFIGURAÇÃO
    const centroX = options.margemX || 400;
    const centroY = options.margemY || 300;
    const raio = 200 + (entities.length * 15); // Raio adaptativo
    
    // POSICIONAR EM CÍRCULO
    let entidadesPosicionadas = 0;
    
    entities.forEach((entidade, indice) => {
      const angulo = (2 * Math.PI * indice) / entities.length;
      
      entidade.x = centroX + Math.cos(angulo) * raio;
      entidade.y = centroY + Math.sin(angulo) * raio;
      
      entidadesPosicionadas++;
      
      console.log(`📍 [Layout] "${entidade.name}" → (${entidade.x}, ${entidade.y}) [ângulo: ${Math.round(angulo * 180 / Math.PI)}°]`);
    });
    
    const tempoDecorrido = performance.now() - inicioTempo;
    
    console.log(`✅ [Layout] Círculo concluído: ${entidadesPosicionadas} entidades em ${tempoDecorrido.toFixed(1)}ms`);
    
    return {
      success: true,
      entitiesPositioned: entidadesPosicionadas,
      layoutTime: tempoDecorrido,
      layoutType: 'circular'
    };
  }

  /**
   * LAYOUT BASEADO EM CONEXÕES (FUTURO)
   * Posiciona entidades tentando minimizar comprimento das ligações
   * 
   * NOTA: A implementar quando layout básico estiver estável
   */
  async aplicarLayoutConexoes(
    entities: ErEntity[], 
    relationships: ErRelationship[],
    options: LayoutOptions = {}
  ): Promise<LayoutResult> {
    console.log('🔗 [Layout] Layout baseado em conexões - EM DESENVOLVIMENTO');
    
    // Por agora, usar layout em grade como fallback
    return this.aplicarLayoutGrade(entities, options);
  }

  // ===================================================================
  // SECÇÃO 2: SELECÇÃO AUTOMÁTICA DE ALGORITMO
  // ===================================================================
  
  /**
   * SELECCIONAR MELHOR ALGORITMO
   * Escolhe automaticamente o melhor algoritmo baseado no número de entidades
   * 
   * @param entities - Array de entidades
   * @param relationships - Array de relacionamentos (opcional)
   * @param options - Opções de configuração
   * @returns LayoutResult - Resultado do layout aplicado
   */
  async aplicarLayoutInteligente(
    entities: ErEntity[], 
    relationships: ErRelationship[] = [],
    options: LayoutOptions = {}
  ): Promise<LayoutResult> {
    console.log('🧠 [Layout] Seleccionando algoritmo inteligente');
    
    const numeroEntidades = entities.length;
    
    if (numeroEntidades <= 6) {
      console.log('🎯 [Layout] Poucas entidades → Layout circular');
      return this.aplicarLayoutCircular(entities, options);
    } else {
      console.log('🎯 [Layout] Muitas entidades → Layout em grade');
      return this.aplicarLayoutGrade(entities, options);
    }
  }

  // ===================================================================
  // SECÇÃO 3: UTILIDADES DE LAYOUT
  // ===================================================================
  
  /**
   * VALIDAR POSIÇÕES
   * Verifica se todas as entidades têm posições válidas
   * 
   * @param entities - Array de entidades a validar
   * @returns boolean - true se todas as posições são válidas
   */
  validarPosicoes(entities: ErEntity[]): boolean {
    console.log('🔍 [Layout] Validando posições das entidades');
    
    for (const entidade of entities) {
      if (entidade.x === undefined || entidade.y === undefined) {
        console.error(`❌ [Layout] Entidade "${entidade.name}" sem posição válida`);
        return false;
      }
      
      if (entidade.x < 0 || entidade.y < 0) {
        console.error(`❌ [Layout] Entidade "${entidade.name}" com coordenadas negativas`);
        return false;
      }
    }
    
    console.log('✅ [Layout] Todas as posições são válidas');
    return true;
  }

  /**
   * CALCULAR BOUNDS DO DIAGRAMA
   * Calcula os limites totais ocupados pelo diagrama
   * 
   * @param entities - Array de entidades posicionadas
   * @returns {width, height, minX, minY, maxX, maxY} - Limites do diagrama
   */
  calcularBoundsDiagrama(entities: ErEntity[]): {
    width: number;
    height: number;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } {
    if (entities.length === 0) {
      return { width: 0, height: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }
    
    const larguraEntidade = 120; // Largura padrão
    const alturaEntidade = 80;   // Altura padrão
    
    const posicoes = entities.map(e => ({ x: e.x || 0, y: e.y || 0 }));
    
    const minX = Math.min(...posicoes.map(p => p.x));
    const minY = Math.min(...posicoes.map(p => p.y));
    const maxX = Math.max(...posicoes.map(p => p.x + larguraEntidade));
    const maxY = Math.max(...posicoes.map(p => p.y + alturaEntidade));
    
    const bounds = {
      width: maxX - minX,
      height: maxY - minY,
      minX,
      minY,
      maxX,
      maxY
    };
    
    console.log('📏 [Layout] Bounds do diagrama:', bounds);
    
    return bounds;
  }

  // ===================================================================
  // SECÇÃO 4: ESTATÍSTICAS E DEBUG
  // ===================================================================
  
  /**
   * OBTER ESTATÍSTICAS DO LAYOUT
   * Fornece informações úteis sobre o layout actual
   * 
   * @param entities - Array de entidades
   * @param relationships - Array de relacionamentos
   * @returns Objecto com estatísticas
   */
  obterEstatisticas(entities: ErEntity[], relationships: ErRelationship[] = []): {
    numeroEntidades: number;
    numeroRelacionamentos: number;
    densidadeConexoes: number;
    algoritmoRecomendado: string;
    bounds: any;
  } {
    const numeroEntidades = entities.length;
    const numeroRelacionamentos = relationships.length;
    const densidadeConexoes = numeroEntidades > 0 ? numeroRelacionamentos / numeroEntidades : 0;
    
    let algoritmoRecomendado = 'grade';
    if (numeroEntidades <= 6) {
      algoritmoRecomendado = 'circular';
    } else if (densidadeConexoes > 1.5) {
      algoritmoRecomendado = 'baseado-conexoes';
    }
    
    const bounds = this.calcularBoundsDiagrama(entities);
    
    const stats = {
      numeroEntidades,
      numeroRelacionamentos,
      densidadeConexoes: Math.round(densidadeConexoes * 100) / 100,
      algoritmoRecomendado,
      bounds
    };
    
    console.log('📊 [Layout] Estatísticas:', stats);
    
    return stats;
  }
}

// ===================================================================
// COMENTÁRIOS FINAIS
// ===================================================================
//
// VANTAGENS DESTA ABORDAGEM:
// ✅ Simples e compreensível
// ✅ Rápido e eficiente  
// ✅ Fácil de debuggar
// ✅ Fácil de modificar
// ✅ Resultados previsíveis
//
// ALGORITMOS DISPONÍVEIS:
// 1. 🔲 Layout em Grade - Principal, para a maioria dos casos
// 2. ⭕ Layout Circular - Para poucos elementos (≤6)
// 3. 🧠 Selecção Inteligente - Escolhe automaticamente
// 4. 🔗 Layout por Conexões - Futuro desenvolvimento
//
// QUANDO USAR CADA UM:
// - Grade: 7+ entidades, layout geral
// - Circular: ≤6 entidades, visualização compacta
// - Inteligente: Quando não sabe qual escolher
//
// ===================================================================