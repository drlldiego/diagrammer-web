/**
 * ELK Layout Service
 * Serviço para aplicar layouts automáticos usando ELK.js
 */

import ELK from 'elkjs';
import { ErEntity, ErRelationship } from '../../er/declarative/er-types';

export interface ElkLayoutOptions {
  algorithm?: 'layered' | 'force' | 'stress' | 'mrtree';
  direction?: 'DOWN' | 'UP' | 'LEFT' | 'RIGHT';
  nodeSpacing?: number;
  layerSpacing?: number;
  padding?: number;
}

export interface ElkNode {
  id: string;
  x?: number;
  y?: number;
  width: number;
  height: number;
  labels?: Array<{ text: string }>;
}

export interface ElkEdge {
  id: string;
  sources: string[];
  targets: string[];
}

export interface ElkGraph {
  id: string;
  children: ElkNode[];
  edges: ElkEdge[];
  layoutOptions?: Record<string, any>;
}

export interface LayoutResult {
  success: boolean;
  nodes: Map<string, { x: number; y: number }>;
  error?: string;
}

interface ConnectivityAnalysis {
  hubs: Array<{ entity: string; connections: number; neighbors: string[] }>;
  chains: Array<{ entities: string[]; isLinear: boolean }>;
  clusters: Array<{ entities: string[]; density: number }>;
  isolated: string[];
  overallPattern: 'centralized' | 'distributed' | 'linear' | 'mixed';
  recommendedStrategy: 'adaptive-force' | 'elk-layered' | 'custom-radial' | 'grid-fallback';
}

interface AdaptiveLayoutOptions {
  centerX: number;
  centerY: number;
  baseSpacing: number;
  hubRadius: number;
  chainSpacing: number;
  clusterMargin: number;
}

export class ElkLayoutService {
  private elk: InstanceType<typeof ELK>;
  private defaultOptions: ElkLayoutOptions = {
    algorithm: 'layered',
    direction: 'DOWN',
    nodeSpacing: 80,
    layerSpacing: 150,
    padding: 50
  };

  // Configurações determinísticas para garantir reprodutibilidade
  private readonly DETERMINISTIC_SEED = 42;
  private readonly DETERMINISTIC_OPTIONS = {
    'elk.randomSeed': this.DETERMINISTIC_SEED.toString(),
    'elk.partitioning.activate': 'true',
    'elk.layered.thoroughness': '7',
    'elk.layered.crossingMinimization.semiInteractive': 'false',
    'elk.layered.cycleBreaking.strategy': 'DEPTH_FIRST'
  };

  private patternInfo: any = null;

  constructor() {
    this.elk = new ELK();
  }

  /**
   * Converte estrutura ER para formato ELK
   */
  public convertErToElk(
    entities: ErEntity[],
    relationships: ErRelationship[]
  ): ElkGraph {
    console.log('🔄 [ELK Service] Converting ER structure to ELK format');
    console.log(`📦 Entities: ${entities.length}, Relationships: ${relationships.length}`);

    // Converter entidades para nós ELK
    const elkNodes: ElkNode[] = entities.map(entity => ({
      id: entity.name,
      width: 120,
      height: 80,
      labels: [{ text: entity.name }]
    }));

    // Converter relacionamentos para arestas ELK
    const elkEdges: ElkEdge[] = relationships.map((rel, index) => ({
      id: `edge_${index}_${rel.from}_${rel.to}`,
      sources: [rel.from],
      targets: [rel.to]
    }));

    const elkGraph: ElkGraph = {
      id: 'erDiagram',
      children: elkNodes,
      edges: elkEdges,
      layoutOptions: this.getOptimizedLayoutOptions(entities, relationships)
    };

    console.log('✅ [ELK Service] ER structure converted to ELK format');
    return elkGraph;
  }

  /**
   * Gera opções de layout otimizadas baseadas na estrutura ER
   */
  private getOptimizedLayoutOptions(entities: ErEntity[], relationships: ErRelationship[]): Record<string, any> {
    const entityCount = entities.length;
    const relationshipCount = relationships.length;
    const density = relationshipCount / Math.max(entityCount - 1, 1);
    
    console.log(`📊 [ELK Optimization] Entities: ${entityCount}, Relationships: ${relationshipCount}, Density: ${density.toFixed(2)}`);

    // Detectar tipo de diagrama ER usando análise adaptativa
    const analysis = this.analyzeConnectivityPatterns(entities, relationships);
    const diagramType = analysis.overallPattern;
    console.log(`🔍 [ELK Optimization] Detected diagram type: ${diagramType}`);

    switch (diagramType) {
      case 'centralized':
        return this.getStarLayoutOptions();
      
      case 'linear':
        return this.getChainLayoutOptions();
      
      case 'distributed':
        return this.getClusteredLayoutOptions();
      
      case 'mixed':
        return this.getComplexLayoutOptions();
      
      default:
        return this.getDefaultLayoutOptions();
    }
  }

  /**
   * Analisa padrões de conectividade de forma adaptativa
   */
  private analyzeConnectivityPatterns(entities: ErEntity[], relationships: ErRelationship[]): ConnectivityAnalysis {
    console.log('🔍 [Adaptive Analysis] Starting connectivity pattern analysis');
    
    // Construir mapa de conectividade
    const connectionMap = new Map<string, string[]>();
    entities.forEach(entity => connectionMap.set(entity.name, []));
    
    relationships.forEach(rel => {
      connectionMap.get(rel.from)?.push(rel.to);
      connectionMap.get(rel.to)?.push(rel.from);
    });

    // Analisar hubs (entidades com mais conexões)
    const hubs = Array.from(connectionMap.entries())
      .map(([entity, neighbors]) => ({ entity, connections: neighbors.length, neighbors }))
      .filter(item => item.connections >= 2)
      .sort((a, b) => b.connections - a.connections);

    // Analisar chains (sequências lineares)
    const chains = this.findLinearChains(connectionMap, entities);
    
    // Analisar clusters (grupos densamente conectados)
    const clusters = this.findClusters(connectionMap, entities, relationships);
    
    // Identificar entidades isoladas
    const isolated = Array.from(connectionMap.entries())
      .filter(([_, neighbors]) => neighbors.length === 0)
      .map(([entity, _]) => entity);

    // Determinar padrão geral
    const overallPattern = this.determineOverallPattern(hubs, chains, clusters, isolated, entities.length);
    
    // Recomendar estratégia
    const recommendedStrategy = this.recommendLayoutStrategy(overallPattern, entities.length, relationships.length);

    console.log('📊 [Adaptive Analysis] Analysis complete:', {
      hubs: hubs.length,
      chains: chains.length,
      clusters: clusters.length,
      isolated: isolated.length,
      pattern: overallPattern,
      strategy: recommendedStrategy
    });
    
    // Debug: Log detailed entity categorization
    console.log('🔍 [Debug] Hub entities:', hubs.map(h => h.entity));
    console.log('🔍 [Debug] Chain entities:', chains.flatMap(c => c.entities));
    console.log('🔍 [Debug] Cluster entities:', clusters.flatMap(c => c.entities));
    console.log('🔍 [Debug] Isolated entities:', isolated);
    
    // Check if all entities are accounted for
    const allCategorized = [
      ...hubs.map(h => h.entity),
      ...chains.flatMap(c => c.entities),
      ...clusters.flatMap(c => c.entities),
      ...isolated
    ];
    const allEntityNames = entities.map(e => e.name);
    const missing = allEntityNames.filter(name => !allCategorized.includes(name));
    if (missing.length > 0) {
      console.warn('⚠️ [Debug] Missing entities from categorization:', missing);
    }

    return {
      hubs,
      chains,
      clusters,
      isolated,
      overallPattern,
      recommendedStrategy
    };
  }

  private findLinearChains(connectionMap: Map<string, string[]>, entities: ErEntity[]): Array<{ entities: string[]; isLinear: boolean }> {
    const visited = new Set<string>();
    const chains: Array<{ entities: string[]; isLinear: boolean }> = [];

    entities.forEach(entity => {
      if (visited.has(entity.name)) return;
      
      const neighbors = connectionMap.get(entity.name) || [];
      if (neighbors.length === 1 || neighbors.length === 2) {
        const chain = this.buildChainFromEntity(entity.name, connectionMap, visited);
        if (chain.length >= 3) {
          chains.push({
            entities: chain,
            isLinear: this.isChainLinear(chain, connectionMap)
          });
        }
      }
    });

    return chains;
  }

  private buildChainFromEntity(startEntity: string, connectionMap: Map<string, string[]>, visited: Set<string>): string[] {
    const chain = [startEntity];
    visited.add(startEntity);
    
    let current = startEntity;
    
    while (true) {
      const neighbors = connectionMap.get(current) || [];
      const unvisitedNeighbors = neighbors.filter(n => !visited.has(n));
      
      // Para chains lineares, deve ter no máximo 1 próximo não visitado
      if (unvisitedNeighbors.length !== 1) break;
      
      const next = unvisitedNeighbors[0];
      const nextNeighbors = connectionMap.get(next) || [];
      
      // O próximo elemento deve ter no máximo 2 conexões (linear)
      if (nextNeighbors.length > 2) break;
      
      chain.push(next);
      visited.add(next);
      current = next;
    }
    
    return chain;
  }

  private isChainLinear(chain: string[], connectionMap: Map<string, string[]>): boolean {
    for (let i = 0; i < chain.length; i++) {
      const neighbors = connectionMap.get(chain[i]) || [];
      
      if (i === 0 || i === chain.length - 1) {
        // Extremidades devem ter 1 conexão (na chain)
        if (neighbors.length > 1) return false;
      } else {
        // Elementos do meio devem ter exatamente 2 conexões
        if (neighbors.length !== 2) return false;
      }
    }
    return true;
  }

  private findClusters(connectionMap: Map<string, string[]>, entities: ErEntity[], relationships: ErRelationship[]): Array<{ entities: string[]; density: number }> {
    const clusters: Array<{ entities: string[]; density: number }> = [];
    const visited = new Set<string>();

    entities.forEach(entity => {
      if (visited.has(entity.name)) return;
      
      const cluster = this.expandCluster(entity.name, connectionMap, visited);
      if (cluster.length >= 3) {
        const density = this.calculateClusterDensity(cluster, relationships);
        clusters.push({ entities: cluster, density });
      }
    });

    return clusters;
  }

  private expandCluster(startEntity: string, connectionMap: Map<string, string[]>, globalVisited: Set<string>): string[] {
    if (globalVisited.has(startEntity)) return [];
    
    const cluster = new Set<string>();
    const toVisit = [startEntity];
    
    while (toVisit.length > 0) {
      const current = toVisit.pop()!;
      if (cluster.has(current)) continue;
      
      cluster.add(current);
      globalVisited.add(current);
      
      const neighbors = connectionMap.get(current) || [];
      neighbors.forEach(neighbor => {
        if (!cluster.has(neighbor) && !globalVisited.has(neighbor)) {
          // Só adicionar ao cluster se tem conexão densa
          const neighborConnections = connectionMap.get(neighbor) || [];
          if (neighborConnections.length >= 2) {
            toVisit.push(neighbor);
          }
        }
      });
    }
    
    return Array.from(cluster);
  }

  private calculateClusterDensity(clusterEntities: string[], relationships: ErRelationship[]): number {
    const clusterSet = new Set(clusterEntities);
    const internalConnections = relationships.filter(rel => 
      clusterSet.has(rel.from) && clusterSet.has(rel.to)
    ).length;
    
    const maxPossibleConnections = clusterEntities.length * (clusterEntities.length - 1) / 2;
    return maxPossibleConnections > 0 ? internalConnections / maxPossibleConnections : 0;
  }

  private determineOverallPattern(
    hubs: any[], 
    chains: any[], 
    clusters: any[], 
    isolated: string[], 
    totalEntities: number
  ): 'centralized' | 'distributed' | 'linear' | 'mixed' {
    const hubEntities = hubs.reduce((sum, hub) => sum + hub.neighbors.length + 1, 0);
    const chainEntities = chains.reduce((sum, chain) => sum + chain.entities.length, 0);
    const clusterEntities = clusters.reduce((sum, cluster) => sum + cluster.entities.length, 0);
    
    const hubRatio = hubEntities / totalEntities;
    const chainRatio = chainEntities / totalEntities;
    const clusterRatio = clusterEntities / totalEntities;
    
    if (hubRatio > 0.6) return 'centralized';
    if (chainRatio > 0.6) return 'linear';
    if (clusterRatio > 0.5) return 'distributed';
    return 'mixed';
  }

  private recommendLayoutStrategy(
    pattern: string, 
    entityCount: number, 
    relationshipCount: number
  ): 'adaptive-force' | 'elk-layered' | 'custom-radial' | 'grid-fallback' {
    if (entityCount <= 3) return 'grid-fallback';
    
    switch (pattern) {
      case 'centralized':
        return 'custom-radial';
      case 'linear':
        return 'elk-layered';
      case 'distributed':
        return entityCount <= 15 ? 'adaptive-force' : 'elk-layered';
      case 'mixed':
      default:
        return entityCount <= 10 ? 'adaptive-force' : 'elk-layered';
    }
  }

  /**
   * Detecta padrão específico: Hub central + Anel + Cadeia externa
   */
  private detectHubWithRingPattern(entities: ErEntity[], relationships: ErRelationship[]): boolean {
    console.log('🔍 [Pattern Detection] Checking for Hub-Ring-Chain pattern');

    // Construir grafo de conectividade
    const connections = new Map<string, string[]>();
    entities.forEach(entity => connections.set(entity.name, []));
    
    relationships.forEach(rel => {
      connections.get(rel.from)?.push(rel.to);
      connections.get(rel.to)?.push(rel.from);
    });

    // Encontrar possível hub (entidade com mais conexões)
    let hubEntity = '';
    let maxConnections = 0;
    
    connections.forEach((neighbors, entityName) => {
      if (neighbors.length > maxConnections) {
        maxConnections = neighbors.length;
        hubEntity = entityName;
      }
    });

    // Para ser um hub válido, deve ter pelo menos 2 conexões (relaxado de 3)
    if (maxConnections < 2) {
      console.log('❌ [Pattern Detection] No valid hub found (min 2 connections)');
      return false;
    }

    console.log(`🎯 [Pattern Detection] Potential hub: ${hubEntity} with ${maxConnections} connections`);

    // Verificar se há entidades que formam um "anel" ao redor do hub
    const hubNeighbors = connections.get(hubEntity) || [];
    
    // Procurar por entidades conectadas ao hub que também estão conectadas entre si
    let ringEntities = 0;
    let chainEntities = 0;

    hubNeighbors.forEach(neighbor => {
      const neighborConnections = connections.get(neighbor) || [];
      
      // Contar quantas outras entidades conectadas ao hub esta também está conectada
      const connectionsToOtherHubNeighbors = neighborConnections.filter(conn => 
        conn !== hubEntity && hubNeighbors.includes(conn)
      ).length;

      if (connectionsToOtherHubNeighbors > 0) {
        ringEntities++;
      } else {
        // Se só está conectada ao hub, pode ser parte de uma cadeia
        const totalConnections = neighborConnections.length;
        if (totalConnections <= 2) {
          chainEntities++;
        }
      }
    });

    console.log(`📊 [Pattern Detection] Ring entities: ${ringEntities}, Chain entities: ${chainEntities}`);

    // Padrão detectado se:
    // - Há pelo menos 1 entidade formando anel ao redor do hub (relaxado de 2)
    // - OU há pelo menos 1 entidade em cadeia
    // - OU o hub tem pelo menos 3 conexões (diagramas centralizados)
    const isHubRingPattern = ringEntities >= 1 || chainEntities >= 1 || maxConnections >= 3;

    if (isHubRingPattern) {
      console.log('✅ [Pattern Detection] Hub-Ring-Chain pattern detected!');
      // Armazenar informações do padrão para usar no layout
      this.patternInfo = {
        hubEntity,
        ringEntities: hubNeighbors.filter(neighbor => {
          const neighborConnections = connections.get(neighbor) || [];
          return neighborConnections.some(conn => 
            conn !== hubEntity && hubNeighbors.includes(conn)
          );
        }),
        chainEntities: hubNeighbors.filter(neighbor => {
          const neighborConnections = connections.get(neighbor) || [];
          const connectionsToOtherHubNeighbors = neighborConnections.filter(conn => 
            conn !== hubEntity && hubNeighbors.includes(conn)
          ).length;
          return connectionsToOtherHubNeighbors === 0 && neighborConnections.length <= 2;
        })
      };
    } else {
      console.log('❌ [Pattern Detection] Hub-Ring-Chain pattern not detected');
    }

    return isHubRingPattern;
  }

  /**
   * Detecta padrão Linear Backbone + Vertical Chains
   */
  private detectLinearBackbonePattern(entities: ErEntity[], relationships: ErRelationship[]): boolean {
    console.log('🔍 [Pattern Detection] Checking for Linear Backbone pattern');

    // Construir grafo de conectividade
    const connections = new Map<string, string[]>();
    entities.forEach(entity => connections.set(entity.name, []));
    
    relationships.forEach(rel => {
      connections.get(rel.from)?.push(rel.to);
      connections.get(rel.to)?.push(rel.from);
    });

    // Procurar por uma sequência linear (backbone)
    // Uma sequência linear é caracterizada por entidades que têm exatamente 2 conexões
    // (exceto as extremidades que têm 1 conexão)
    
    const linearCandidates = Array.from(connections.entries())
      .filter(([_, neighbors]) => neighbors.length >= 1 && neighbors.length <= 2)
      .map(([entity, _]) => entity);

    console.log(`📊 [Linear Detection] Linear candidates: ${linearCandidates.join(', ')}`);

    if (linearCandidates.length < 3) {
      console.log('❌ [Linear Detection] Not enough linear candidates for backbone');
      return false;
    }

    // Procurar pelo backbone principal (maior sequência linear)
    const backbone = this.findLongestLinearPath(connections, linearCandidates);
    
    if (backbone.length < 3) {
      console.log('❌ [Linear Detection] No significant backbone found');
      return false;
    }

    console.log(`🔗 [Linear Detection] Backbone found: ${backbone.join(' → ')}`);

    // Verificar se há cadeias verticais (entidades conectadas ao backbone mas não parte dele)
    const backboneSet = new Set(backbone);
    let verticalChains = 0;

    backbone.forEach(backboneEntity => {
      const neighbors = connections.get(backboneEntity) || [];
      const verticalNeighbors = neighbors.filter(neighbor => !backboneSet.has(neighbor));
      
      if (verticalNeighbors.length > 0) {
        verticalChains += verticalNeighbors.length;
        console.log(`⬇️ [Linear Detection] Vertical chain from "${backboneEntity}": ${verticalNeighbors.join(', ')}`);
      }
    });

    console.log(`📊 [Linear Detection] Backbone: ${backbone.length}, Vertical chains: ${verticalChains}`);

    // Padrão detectado se há um backbone significativo com algumas cadeias verticais
    const isLinearBackbone = backbone.length >= 3 && verticalChains >= 1;

    if (isLinearBackbone) {
      console.log('✅ [Pattern Detection] Linear Backbone pattern detected!');
      // Armazenar informações do padrão
      this.patternInfo = {
        backbone,
        verticalChains: this.findVerticalChains(connections, backbone)
      };
    } else {
      console.log('❌ [Pattern Detection] Linear Backbone pattern not detected');
    }

    return isLinearBackbone;
  }

  /**
   * Encontra a maior sequência linear no grafo
   */
  private findLongestLinearPath(connections: Map<string, string[]>, candidates: string[]): string[] {
    let longestPath: string[] = [];

    candidates.forEach(startEntity => {
      const path = this.buildLinearPath(connections, startEntity, new Set());
      if (path.length > longestPath.length) {
        longestPath = path;
      }
    });

    return longestPath;
  }

  /**
   * Constrói um caminho linear a partir de uma entidade
   */
  private buildLinearPath(connections: Map<string, string[]>, start: string, visited: Set<string>): string[] {
    if (visited.has(start)) return [];
    
    visited.add(start);
    const neighbors = connections.get(start) || [];
    const unvisitedNeighbors = neighbors.filter(n => !visited.has(n));
    
    if (unvisitedNeighbors.length === 0) {
      return [start];
    }

    let bestPath = [start];
    
    unvisitedNeighbors.forEach(neighbor => {
      const neighborConnections = connections.get(neighbor) || [];
      // Só continuar se o vizinho tem no máximo 2 conexões (característico de cadeia linear)
      if (neighborConnections.length <= 2) {
        const subPath = this.buildLinearPath(connections, neighbor, new Set(visited));
        if (subPath.length > 0) {
          const fullPath = [start, ...subPath];
          if (fullPath.length > bestPath.length) {
            bestPath = fullPath;
          }
        }
      }
    });

    return bestPath;
  }

  /**
   * Encontra todas as cadeias verticais conectadas ao backbone
   */
  private findVerticalChains(connections: Map<string, string[]>, backbone: string[]): Record<string, string[]> {
    const backboneSet = new Set(backbone);
    const verticalChains: Record<string, string[]> = {};

    backbone.forEach(backboneEntity => {
      const neighbors = connections.get(backboneEntity) || [];
      const verticalNeighbors = neighbors.filter(neighbor => !backboneSet.has(neighbor));
      
      if (verticalNeighbors.length > 0) {
        // Para cada vizinho vertical, construir a cadeia completa
        verticalNeighbors.forEach(verticalStart => {
          const chain = this.buildVerticalChain(connections, verticalStart, backboneSet);
          if (chain.length > 0) {
            verticalChains[backboneEntity] = verticalChains[backboneEntity] || [];
            verticalChains[backboneEntity].push(...chain);
          }
        });
      }
    });

    return verticalChains;
  }

  /**
   * Constrói uma cadeia vertical a partir de uma entidade
   */
  private buildVerticalChain(connections: Map<string, string[]>, start: string, backboneSet: Set<string>): string[] {
    const chain = [start];
    const visited = new Set([start]);
    
    let current = start;
    
    while (true) {
      const neighbors = connections.get(current) || [];
      const nextInChain = neighbors.find(neighbor => 
        !visited.has(neighbor) && !backboneSet.has(neighbor)
      );
      
      if (!nextInChain) break;
      
      chain.push(nextInChain);
      visited.add(nextInChain);
      current = nextInChain;
    }

    return chain;
  }

  /**
   * Configurações para padrão Linear Backbone (CUSTOMIZADO - não usa ELK)
   */
  private getLinearBackboneLayoutOptions(): Record<string, any> {
    return {
      'custom.algorithm': 'linear-backbone',
      'custom.backboneSpacing': 200,
      'custom.verticalSpacing': 150,
      'custom.startX': 300,
      'custom.startY': 300
    };
  }

  /**
   * Configurações para padrão Hub-Ring-Chain (CUSTOMIZADO - não usa ELK)
   */
  private getHubRingChainLayoutOptions(): Record<string, any> {
    // Para este padrão específico, vamos usar nosso algoritmo customizado
    // As opções ELK não são usadas neste caso
    return {
      'custom.algorithm': 'hub-ring-chain',
      'custom.centerX': 600,
      'custom.centerY': 400,
      'custom.ringRadius': 280,
      'custom.chainSpacing': 200
    };
  }

  /**
   * Configurações para layout em estrela (entidade central com outras ao redor)
   */
  private getStarLayoutOptions(): Record<string, any> {
    return {
      ...this.DETERMINISTIC_OPTIONS,
      'elk.algorithm': 'layered',  // Mudado de 'force' para 'layered' (mais determinístico)
      'elk.direction': 'DOWN',
      'elk.spacing.nodeNode': '180',
      'elk.layered.spacing.nodeNodeBetweenLayers': '200',
      'elk.aspectRatio': '1.3',
      'elk.padding': '[top=80,left=80,bottom=80,right=80]'
    };
  }

  /**
   * Configurações para layout em cadeia (sequencial)
   */
  private getChainLayoutOptions(): Record<string, any> {
    return {
      ...this.DETERMINISTIC_OPTIONS,
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.spacing.nodeNode': '170',
      'elk.layered.spacing.nodeNodeBetweenLayers': '220',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.aspectRatio': '1.8',
      'elk.padding': '[top=60,left=60,bottom=60,right=60]'
    };
  }

  /**
   * Configurações para layout agrupado (clusters)
   */
  private getClusteredLayoutOptions(): Record<string, any> {
    return {
      ...this.DETERMINISTIC_OPTIONS,
      'elk.algorithm': 'layered',  // Mudado de 'stress' para 'layered' (mais determinístico)
      'elk.direction': 'DOWN',
      'elk.spacing.nodeNode': '160',
      'elk.layered.spacing.nodeNodeBetweenLayers': '180',
      'elk.aspectRatio': '1.4',
      'elk.padding': '[top=70,left=70,bottom=70,right=70]'
    };
  }

  /**
   * Configurações para diagramas complexos
   */
  private getComplexLayoutOptions(): Record<string, any> {
    return {
      ...this.DETERMINISTIC_OPTIONS,
      'elk.algorithm': 'layered',  // Mudado de 'force' para 'layered' (mais determinístico)
      'elk.direction': 'DOWN',
      'elk.spacing.nodeNode': '170',
      'elk.layered.spacing.nodeNodeBetweenLayers': '200',
      'elk.aspectRatio': '1.2',
      'elk.padding': '[top=90,left=90,bottom=90,right=90]'
    };
  }

  /**
   * Configurações padrão
   */
  private getDefaultLayoutOptions(): Record<string, any> {
    return {
      ...this.DETERMINISTIC_OPTIONS,
      'elk.algorithm': 'layered',  // Mudado de 'force' para 'layered' (mais determinístico)
      'elk.direction': 'DOWN',
      'elk.spacing.nodeNode': '160',
      'elk.layered.spacing.nodeNodeBetweenLayers': '180',
      'elk.aspectRatio': '1.3',
      'elk.padding': '[top=70,left=70,bottom=70,right=70]'
    };
  }

  /**
   * Aplica layout ELK ao grafo
   */
  public async applyLayout(
    entities: ErEntity[],
    relationships: ErRelationship[],
    options: Partial<ElkLayoutOptions> = {}
  ): Promise<LayoutResult> {
    try {
      console.log('🚀 [Adaptive Layout] Starting intelligent layout calculation');
      console.log(`📊 [Adaptive Layout] Input: ${entities.length} entities, ${relationships.length} relationships`);
      
      // Fase 1: Análise adaptativa
      const analysis = this.analyzeConnectivityPatterns(entities, relationships);
      console.log(`🎯 [Adaptive Layout] Strategy selected: ${analysis.recommendedStrategy}`);
      
      // Fase 2: Aplicar estratégia recomendada
      let result: LayoutResult;
      switch (analysis.recommendedStrategy) {
        case 'custom-radial':
          console.log('🎯 [Adaptive Layout] Using CUSTOM RADIAL layout');
          result = await this.applyAdaptiveRadialLayout(entities, relationships, analysis);
          break;
        
        case 'adaptive-force':
          console.log('⚡ [Adaptive Layout] Using ADAPTIVE FORCE layout');
          result = await this.applyAdaptiveForceLayout(entities, relationships, analysis);
          break;
        
        case 'elk-layered':
          console.log('🦌 [Adaptive Layout] Using ELK LAYERED layout');
          result = await this.applyOptimizedElkLayout(entities, relationships, analysis, options);
          break;
        
        case 'grid-fallback':
        default:
          console.log('🔄 [Adaptive Layout] Using GRID FALLBACK layout');
          result = await this.applyIntelligentFallback(entities, relationships, analysis);
          break;
      }
      
      console.log(`✅ [Adaptive Layout] Layout completed: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      console.log(`📍 [Adaptive Layout] Generated positions for ${result.nodes.size} entities`);
      
      return result;
      
    } catch (error) {
      console.error('❌ [Adaptive Layout] Layout calculation failed:', error);
      return {
        success: false,
        nodes: new Map(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async applyAdaptiveRadialLayout(
    entities: ErEntity[], 
    relationships: ErRelationship[], 
    analysis: ConnectivityAnalysis
  ): Promise<LayoutResult> {
    console.log('🎯 [Radial Layout] Applying adaptive radial layout');
    
    const positionsMap = new Map<string, { x: number; y: number }>();
    
    // Configuração adaptativa baseada no tamanho
    const entityCount = entities.length;
    const options: AdaptiveLayoutOptions = {
      centerX: entityCount <= 5 ? 500 : 600,
      centerY: entityCount <= 5 ? 350 : 400,
      baseSpacing: Math.max(150, Math.min(250, 300 - entityCount * 10)),
      hubRadius: Math.max(200, Math.min(400, 150 + entityCount * 15)),
      chainSpacing: Math.max(180, Math.min(250, 200 + entityCount * 5)),
      clusterMargin: 120
    };
    
    // 1. Posicionar hubs principais
    this.positionHubs(analysis.hubs, positionsMap, options);
    
    // 2. Posicionar chains ao redor dos hubs
    this.positionChains(analysis.chains, positionsMap, options, analysis.hubs);
    
    // 3. Posicionar clusters em áreas livres
    this.positionClusters(analysis.clusters, positionsMap, options);
    
    // 4. Posicionar elementos isolados
    this.positionIsolatedElements(analysis.isolated, positionsMap, options);
    
    // 5. Otimização final de posições
    this.optimizeRadialPositions(positionsMap, entities, relationships);
    
    // 6. Handle any unpositioned entities as fallback
    this.handleUnpositionedEntities(entities, relationships, positionsMap, options);
    
    // 7. Validação e correção de bounds
    this.validateAndFixBounds(positionsMap);
    
    console.log(`✅ [Radial Layout] Positioned ${positionsMap.size} entities`);
    
    return {
      success: true,
      nodes: positionsMap
    };
  }

  private positionHubs(
    hubs: Array<{ entity: string; connections: number; neighbors: string[] }>, 
    positionsMap: Map<string, { x: number; y: number }>, 
    options: AdaptiveLayoutOptions
  ): void {
    if (hubs.length === 0) return;
    
    // Hub principal no centro
    const mainHub = hubs[0];
    positionsMap.set(mainHub.entity, { x: options.centerX, y: options.centerY });
    
    // Hubs secundários posicionados considerando conexões
    if (hubs.length > 1) {
      const secondaryHubs = hubs.slice(1);
      
      // Tentar posicionar hubs conectados próximos uns dos outros
      secondaryHubs.forEach((hub, index) => {
        let optimalAngle = (index * 2 * Math.PI) / secondaryHubs.length; // Default uniform distribution
        
        // Check if this hub connects to the main hub or other positioned hubs
        const connectsToMain = hub.neighbors.includes(mainHub.entity);
        const positionedNeighbors = hub.neighbors.filter(neighbor => 
          positionsMap.has(neighbor) && neighbor !== hub.entity
        );
        
        if (positionedNeighbors.length > 0) {
          // Calculate optimal angle based on connected entities
          let sumX = 0, sumY = 0;
          positionedNeighbors.forEach(neighborName => {
            const pos = positionsMap.get(neighborName)!;
            sumX += pos.x;
            sumY += pos.y;
          });
          
          const avgX = sumX / positionedNeighbors.length;
          const avgY = sumY / positionedNeighbors.length;
          
          // Calculate angle towards average position of connected entities
          const dx = avgX - options.centerX;
          const dy = avgY - options.centerY;
          optimalAngle = Math.atan2(dy, dx);
        }
        
        const x = options.centerX + options.hubRadius * Math.cos(optimalAngle);
        const y = options.centerY + options.hubRadius * Math.sin(optimalAngle);
        
        positionsMap.set(hub.entity, { x: Math.round(x), y: Math.round(y) });
      });
    }
  }

  private positionChains(
    chains: Array<{ entities: string[]; isLinear: boolean }>, 
    positionsMap: Map<string, { x: number; y: number }>, 
    options: AdaptiveLayoutOptions,
    hubs: Array<{ entity: string; connections: number; neighbors: string[] }>
  ): void {
    chains.forEach((chain, chainIndex) => {
      // Verificar se chain está conectada a algum hub
      const connectedHub = hubs.find(hub => 
        chain.entities.some(entity => hub.neighbors.includes(entity))
      );
      
      if (connectedHub) {
        this.positionChainAroundHub(chain, connectedHub, positionsMap, options, chainIndex);
      } else {
        this.positionIndependentChain(chain, positionsMap, options, chainIndex);
      }
    });
  }

  private positionChainAroundHub(
    chain: { entities: string[]; isLinear: boolean },
    hub: { entity: string; connections: number; neighbors: string[] },
    positionsMap: Map<string, { x: number; y: number }>,
    options: AdaptiveLayoutOptions,
    chainIndex: number
  ): void {
    const hubPos = positionsMap.get(hub.entity);
    if (!hubPos) return;
    
    // Posicionar chain em uma direção específica a partir do hub
    const angle = (chainIndex * Math.PI) / 2; // 4 direções principais
    const startDistance = options.hubRadius + 50;
    
    chain.entities.forEach((entity, entityIndex) => {
      if (positionsMap.has(entity)) return; // Já posicionado
      
      const distance = startDistance + (entityIndex * options.chainSpacing);
      const x = hubPos.x + distance * Math.cos(angle);
      const y = hubPos.y + distance * Math.sin(angle);
      
      positionsMap.set(entity, { x: Math.round(x), y: Math.round(y) });
    });
  }

  private positionIndependentChain(
    chain: { entities: string[]; isLinear: boolean },
    positionsMap: Map<string, { x: number; y: number }>,
    options: AdaptiveLayoutOptions,
    chainIndex: number
  ): void {
    // Posicionar chain independente em área livre
    const startX = options.centerX - 200 + (chainIndex * 150);
    const startY = options.centerY + options.hubRadius + 100;
    
    chain.entities.forEach((entity, entityIndex) => {
      if (positionsMap.has(entity)) return;
      
      const x = startX + (entityIndex * options.chainSpacing);
      const y = startY;
      
      positionsMap.set(entity, { x, y });
    });
  }

  private positionClusters(
    clusters: Array<{ entities: string[]; density: number }>,
    positionsMap: Map<string, { x: number; y: number }>,
    options: AdaptiveLayoutOptions
  ): void {
    clusters.forEach((cluster, clusterIndex) => {
      const unpositionedEntities = cluster.entities.filter(entity => !positionsMap.has(entity));
      if (unpositionedEntities.length === 0) return;
      
      // Encontrar área livre para o cluster
      const clusterCenter = this.findFreeClusterArea(positionsMap, options, clusterIndex);
      
      // Posicionar elementos do cluster em círculo
      const radius = Math.max(80, unpositionedEntities.length * 15);
      const angleStep = (2 * Math.PI) / unpositionedEntities.length;
      
      unpositionedEntities.forEach((entity, entityIndex) => {
        const angle = entityIndex * angleStep;
        const x = clusterCenter.x + radius * Math.cos(angle);
        const y = clusterCenter.y + radius * Math.sin(angle);
        
        positionsMap.set(entity, { x: Math.round(x), y: Math.round(y) });
      });
    });
  }

  private findFreeClusterArea(
    positionsMap: Map<string, { x: number; y: number }>,
    options: AdaptiveLayoutOptions,
    clusterIndex: number
  ): { x: number; y: number } {
    // Posições candidatas ao redor da área principal
    const candidates = [
      { x: options.centerX + options.hubRadius + 200, y: options.centerY },
      { x: options.centerX - options.hubRadius - 200, y: options.centerY },
      { x: options.centerX, y: options.centerY + options.hubRadius + 200 },
      { x: options.centerX, y: options.centerY - options.hubRadius - 200 }
    ];
    
    // Retornar primeira posição livre ou posição baseada no índice
    return candidates[clusterIndex % candidates.length];
  }

  private positionIsolatedElements(
    isolated: string[],
    positionsMap: Map<string, { x: number; y: number }>,
    options: AdaptiveLayoutOptions
  ): void {
    isolated.forEach((entity, index) => {
      if (positionsMap.has(entity)) return;
      
      // Posicionar elementos isolados em grid na periferia
      const cols = Math.ceil(Math.sqrt(isolated.length));
      const row = Math.floor(index / cols);
      const col = index % cols;
      
      const x = options.centerX + options.hubRadius + 300 + (col * 150);
      const y = options.centerY - 100 + (row * 120);
      
      positionsMap.set(entity, { x, y });
    });
  }

  private optimizeRadialPositions(
    positionsMap: Map<string, { x: number; y: number }>,
    entities: ErEntity[],
    relationships: ErRelationship[]
  ): void {
    // Aplicar otimizações finais para reduzir sobreposições e melhorar distribuição
    this.applyCollisionAvoidance(positionsMap, 140);
    this.improveConnectedElementsProximity(positionsMap, relationships);
  }

  private applyCollisionAvoidance(
    positionsMap: Map<string, { x: number; y: number }>,
    minDistance: number
  ): void {
    const entities = Array.from(positionsMap.entries());
    
    entities.forEach(([entity1, pos1], i) => {
      entities.slice(i + 1).forEach(([entity2, pos2]) => {
        const distance = Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2));
        
        if (distance < minDistance) {
          const pushDistance = (minDistance - distance) / 2;
          const angle = Math.atan2(pos2.y - pos1.y, pos2.x - pos1.x);
          
          positionsMap.set(entity1, {
            x: Math.round(pos1.x - pushDistance * Math.cos(angle)),
            y: Math.round(pos1.y - pushDistance * Math.sin(angle))
          });
          
          positionsMap.set(entity2, {
            x: Math.round(pos2.x + pushDistance * Math.cos(angle)),
            y: Math.round(pos2.y + pushDistance * Math.sin(angle))
          });
        }
      });
    });
  }

  private improveConnectedElementsProximity(
    positionsMap: Map<string, { x: number; y: number }>,
    relationships: ErRelationship[]
  ): void {
    relationships.forEach(rel => {
      const fromPos = positionsMap.get(rel.from);
      const toPos = positionsMap.get(rel.to);
      
      if (!fromPos || !toPos) return;
      
      const distance = Math.sqrt(Math.pow(toPos.x - fromPos.x, 2) + Math.pow(toPos.y - fromPos.y, 2));
      
      // Se elementos conectados estão muito distantes, aproximar ligeiramente
      if (distance > 400) {
        const pullFactor = 0.1; // Puxar 10% mais próximo
        const midX = (fromPos.x + toPos.x) / 2;
        const midY = (fromPos.y + toPos.y) / 2;
        
        positionsMap.set(rel.from, {
          x: Math.round(fromPos.x + (midX - fromPos.x) * pullFactor),
          y: Math.round(fromPos.y + (midY - fromPos.y) * pullFactor)
        });
        
        positionsMap.set(rel.to, {
          x: Math.round(toPos.x + (midX - toPos.x) * pullFactor),
          y: Math.round(toPos.y + (midY - toPos.y) * pullFactor)
        });
      }
    });
  }

  private validateAndFixBounds(positionsMap: Map<string, { x: number; y: number }>): void {
    console.log('🔍 [Bounds] Validating entity positions');
    
    const minX = 50;  // Minimum distance from left edge
    const minY = 50;  // Minimum distance from top edge
    const fixedPositions: string[] = [];
    
    positionsMap.forEach((position, entity) => {
      let needsFix = false;
      let newX = position.x;
      let newY = position.y;
      
      // Check and fix X coordinate
      if (position.x < minX) {
        newX = minX;
        needsFix = true;
      }
      
      // Check and fix Y coordinate  
      if (position.y < minY) {
        newY = minY;
        needsFix = true;
      }
      
      if (needsFix) {
        positionsMap.set(entity, { x: newX, y: newY });
        fixedPositions.push(entity);
        console.log(`🔧 [Bounds] Fixed ${entity}: (${position.x}, ${position.y}) → (${newX}, ${newY})`);
      }
    });
    
    if (fixedPositions.length > 0) {
      console.log(`✅ [Bounds] Fixed ${fixedPositions.length} entities with invalid coordinates`);
    } else {
      console.log('✅ [Bounds] All entities within valid bounds');
    }
  }

  private handleUnpositionedEntities(
    entities: ErEntity[], 
    relationships: ErRelationship[],
    positionsMap: Map<string, { x: number; y: number }>,
    options: AdaptiveLayoutOptions
  ): void {
    const unpositioned = entities.filter(entity => !positionsMap.has(entity.name));
    
    if (unpositioned.length > 0) {
      console.log(`🚨 [Fallback] Found ${unpositioned.length} unpositioned entities:`, unpositioned.map(e => e.name));
      
      // Position them near their connected entities instead of in distant "safe area"
      unpositioned.forEach((entity, index) => {
        const position = this.findOptimalPositionNearConnections(entity.name, relationships, positionsMap, options);
        
        positionsMap.set(entity.name, position);
        console.log(`🔧 [Fallback] Positioned "${entity.name}" at (${position.x}, ${position.y}) near connections`);
      });
    }
  }

  private findOptimalPositionNearConnections(
    entityName: string,
    relationships: ErRelationship[],
    positionsMap: Map<string, { x: number; y: number }>,
    options: AdaptiveLayoutOptions
  ): { x: number; y: number } {
    // Find entities this one connects to
    const connections = relationships.filter(rel => 
      rel.from === entityName || rel.to === entityName
    );
    
    if (connections.length > 0) {
      // Find connected entities that are already positioned
      const connectedPositions: { x: number; y: number }[] = [];
      
      connections.forEach(rel => {
        const connectedEntity = rel.from === entityName ? rel.to : rel.from;
        const position = positionsMap.get(connectedEntity);
        if (position) {
          connectedPositions.push(position);
        }
      });
      
      if (connectedPositions.length > 0) {
        // Calculate average position of connected entities
        const avgX = connectedPositions.reduce((sum, pos) => sum + pos.x, 0) / connectedPositions.length;
        const avgY = connectedPositions.reduce((sum, pos) => sum + pos.y, 0) / connectedPositions.length;
        
        // Position nearby but with safe distance to avoid overlap
        const minOffset = 250; // Minimum safe distance from connected entities
        const maxOffset = 350; // Maximum distance to keep connection reasonable
        
        // Try different positions to avoid collisions
        for (let attempt = 0; attempt < 8; attempt++) {
          const angle = (attempt * Math.PI / 4) + (Math.random() * 0.3); // Systematic angles with small random variation
          const offset = minOffset + (attempt * 15); // Gradually increase distance
          
          const candidateX = Math.round(avgX + Math.cos(angle) * offset);
          const candidateY = Math.round(avgY + Math.sin(angle) * offset);
          
          // Check if this position collides with existing entities
          if (!this.hasCollisionAt(candidateX, candidateY, positionsMap)) {
            return { x: candidateX, y: candidateY };
          }
        }
        
        // Fallback: use maximum offset if no collision-free position found
        const fallbackAngle = Math.random() * 2 * Math.PI;
        return {
          x: Math.round(avgX + Math.cos(fallbackAngle) * maxOffset),
          y: Math.round(avgY + Math.sin(fallbackAngle) * maxOffset)
        };
      }
    }
    
    // Fallback: position near center if no connections found, avoiding collisions
    for (let attempt = 0; attempt < 10; attempt++) {
      const x = options.centerX + (Math.random() - 0.5) * 400;
      const y = options.centerY + (Math.random() - 0.5) * 400;
      
      if (!this.hasCollisionAt(x, y, positionsMap)) {
        return { x: Math.round(x), y: Math.round(y) };
      }
    }
    
    // Final fallback: use a distant position
    return {
      x: options.centerX + 500,
      y: options.centerY + 500
    };
  }

  private hasCollisionAt(x: number, y: number, positionsMap: Map<string, { x: number; y: number }>): boolean {
    const entityWidth = 120;  // Standard entity width
    const entityHeight = 80;  // Standard entity height
    const minDistance = 50;   // Minimum distance between entities
    
    // Check collision with all existing entities using forEach for ES5 compatibility
    let hasCollision = false;
    
    positionsMap.forEach((position, entityName) => {
      if (!hasCollision) {
        const distance = Math.sqrt(
          Math.pow(x - position.x, 2) + Math.pow(y - position.y, 2)
        );
        
        // If distance between centers is less than safe minimum, it's a collision
        const safeDistance = entityWidth + minDistance;
        if (distance < safeDistance) {
          hasCollision = true;
        }
      }
    });
    
    return hasCollision;
  }

  private async applyAdaptiveForceLayout(
    entities: ErEntity[], 
    relationships: ErRelationship[], 
    analysis: ConnectivityAnalysis
  ): Promise<LayoutResult> {
    console.log('⚡ [Force Layout] Applying adaptive force-directed layout');
    
    // Implementação simplificada de force-directed layout adaptativo
    const positionsMap = new Map<string, { x: number; y: number }>();
    
    // Posicionamento inicial baseado na análise
    this.initializeForcePositions(entities, analysis, positionsMap);
    
    // Aplicar força de atração/repulsão
    this.applyForceSimulation(positionsMap, relationships, entities);
    
    console.log(`✅ [Force Layout] Positioned ${positionsMap.size} entities`);
    
    return {
      success: true,
      nodes: positionsMap
    };
  }

  private initializeForcePositions(
    entities: ErEntity[],
    analysis: ConnectivityAnalysis,
    positionsMap: Map<string, { x: number; y: number }>
  ): void {
    const centerX = 600;
    const centerY = 400;
    const radius = 300;
    
    entities.forEach((entity, index) => {
      const angle = (index * 2 * Math.PI) / entities.length;
      const x = centerX + radius * Math.cos(angle) * Math.random();
      const y = centerY + radius * Math.sin(angle) * Math.random();
      
      positionsMap.set(entity.name, { x, y });
    });
  }

  private applyForceSimulation(
    positionsMap: Map<string, { x: number; y: number }>,
    relationships: ErRelationship[],
    entities: ErEntity[]
  ): void {
    const iterations = 50;
    const repulsionStrength = 1000;
    const attractionStrength = 0.1;
    
    for (let iter = 0; iter < iterations; iter++) {
      const forces = new Map<string, { x: number; y: number }>();
      
      // Inicializar forças
      entities.forEach(entity => {
        forces.set(entity.name, { x: 0, y: 0 });
      });
      
      // Força de repulsão (elementos se afastam)
      entities.forEach(entity1 => {
        entities.forEach(entity2 => {
          if (entity1.name === entity2.name) return;
          
          const pos1 = positionsMap.get(entity1.name)!;
          const pos2 = positionsMap.get(entity2.name)!;
          
          const dx = pos1.x - pos2.x;
          const dy = pos1.y - pos2.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          
          const force = repulsionStrength / (distance * distance);
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;
          
          const currentForce1 = forces.get(entity1.name)!;
          forces.set(entity1.name, {
            x: currentForce1.x + fx,
            y: currentForce1.y + fy
          });
        });
      });
      
      // Força de atração (elementos conectados se aproximam)
      relationships.forEach(rel => {
        const pos1 = positionsMap.get(rel.from);
        const pos2 = positionsMap.get(rel.to);
        
        if (!pos1 || !pos2) return;
        
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        
        const force = distance * attractionStrength;
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        
        const currentForce1 = forces.get(rel.from)!;
        forces.set(rel.from, {
          x: currentForce1.x + fx,
          y: currentForce1.y + fy
        });
        
        const currentForce2 = forces.get(rel.to)!;
        forces.set(rel.to, {
          x: currentForce2.x - fx,
          y: currentForce2.y - fy
        });
      });
      
      // Aplicar forças às posições
      const damping = 0.9;
      entities.forEach(entity => {
        const pos = positionsMap.get(entity.name)!;
        const force = forces.get(entity.name)!;
        
        positionsMap.set(entity.name, {
          x: pos.x + force.x * damping,
          y: pos.y + force.y * damping
        });
      });
    }
  }

  private async applyOptimizedElkLayout(
    entities: ErEntity[], 
    relationships: ErRelationship[], 
    analysis: ConnectivityAnalysis,
    options: Partial<ElkLayoutOptions>
  ): Promise<LayoutResult> {
    console.log('🦌 [ELK Layout] Applying optimized ELK layout');
    
    const elkGraph = this.convertErToElk(entities, relationships);
    const layoutOptions = { ...this.defaultOptions, ...options };

    // Aplicar opções personalizadas baseadas na análise
    if (elkGraph.layoutOptions) {
      elkGraph.layoutOptions['elk.algorithm'] = layoutOptions.algorithm;
      elkGraph.layoutOptions['elk.direction'] = layoutOptions.direction;
      elkGraph.layoutOptions['elk.spacing.nodeNode'] = layoutOptions.nodeSpacing?.toString();
      elkGraph.layoutOptions['elk.layered.spacing.nodeNodeBetweenLayers'] = layoutOptions.layerSpacing?.toString();
    }

    try {
      const layoutedGraph = await this.elk.layout(elkGraph);
      const positionsMap = new Map<string, { x: number; y: number }>();
      
      if (layoutedGraph.children) {
        layoutedGraph.children.forEach(node => {
          if (node.x !== undefined && node.y !== undefined) {
            const centerX = node.x + node.width / 2;
            const centerY = node.y + node.height / 2;
            
            positionsMap.set(node.id, { 
              x: Math.round(centerX), 
              y: Math.round(centerY) 
            });
          }
        });
      }

      return {
        success: true,
        nodes: positionsMap
      };
    } catch (error) {
      console.warn('⚠️ [ELK Layout] ELK failed, falling back to intelligent fallback');
      return this.applyIntelligentFallback(entities, relationships, analysis);
    }
  }

  private async applyIntelligentFallback(
    entities: ErEntity[], 
    relationships: ErRelationship[], 
    analysis: ConnectivityAnalysis
  ): Promise<LayoutResult> {
    console.log('🔄 [Intelligent Fallback] Applying smart grid layout');
    
    const positionsMap = new Map<string, { x: number; y: number }>();
    
    // Grid inteligente baseado na conectividade
    const sortedEntities = [...entities].sort((a, b) => {
      const aConnections = relationships.filter(r => r.from === a.name || r.to === a.name).length;
      const bConnections = relationships.filter(r => r.from === b.name || r.to === b.name).length;
      return bConnections - aConnections; // Mais conectados primeiro
    });
    
    const cols = Math.ceil(Math.sqrt(sortedEntities.length * 1.2));
    const cellWidth = 200;
    const cellHeight = 150;
    const startX = 300;
    const startY = 200;

    sortedEntities.forEach((entity, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      
      const x = startX + (col * cellWidth);
      const y = startY + (row * cellHeight);
      
      positionsMap.set(entity.name, { x, y });
    });

    console.log(`✅ [Intelligent Fallback] Positioned ${positionsMap.size} entities in smart grid`);
    
    return {
      success: true,
      nodes: positionsMap
    };
  }

  /**
   * Verifica se o layout ELK é adequado para o diagrama
   */
  public isElkSuitable(entities: ErEntity[], relationships: ErRelationship[]): boolean {
    // ELK é adequado quando:
    // 1. Há mais de 3 entidades (para justificar o overhead)
    // 2. Há relacionamentos suficientes (não é um diagrama trivial)
    // 3. O grafo não é muito complexo (mais de 50 entidades pode ser lento)
    
    const entityCount = entities.length;
    const relationshipCount = relationships.length;
    
    const isComplex = entityCount >= 4 && relationshipCount >= 3;
    const isNotTooComplex = entityCount <= 50;
    const hasConnections = relationshipCount > 0;
    
    const suitable = isComplex && isNotTooComplex && hasConnections;
    
    console.log(`🔍 [ELK Service] Suitability check: entities=${entityCount}, relationships=${relationshipCount}, suitable=${suitable}`);
    
    return suitable;
  }

  /**
   * Detecta o tipo de algoritmo mais adequado baseado na estrutura
   */
  public suggestBestAlgorithm(entities: ErEntity[], relationships: ErRelationship[]): ElkLayoutOptions['algorithm'] {
    const entityCount = entities.length;
    const relationshipCount = relationships.length;
    const density = relationshipCount / Math.max(entityCount - 1, 1);

    // Critérios para escolha do algoritmo:
    // - Layered: Melhor para hierarquias claras (baixa densidade)
    // - Force: Melhor para grafos conectados sem hierarquia clara
    // - Stress: Melhor para grafos menores com alta conectividade

    if (density < 1.5) {
      return 'layered';  // Hierárquico
    } else if (entityCount <= 15) {
      return 'stress';   // Pequeno e denso
    } else {
      return 'force';    // Grande e conectado
    }
  }

  /**
   * Aplica pós-processamento para refinar posicionamento
   */
  private applyPostProcessing(
    positions: Map<string, { x: number; y: number }>,
    entities: ErEntity[],
    relationships: ErRelationship[]
  ): Map<string, { x: number; y: number }> {
    console.log('🎨 [ELK Post-processing] Starting position refinement');

    const refinedPositions = new Map(positions);

    // 1. Detectar e reagrupar clusters relacionados
    this.optimizeClusters(refinedPositions, entities, relationships);

    // 2. Ajustar posições para melhor simetria
    this.improveSymmetry(refinedPositions, entities, relationships);

    // 3. Minimizar cruzamentos de conexões
    this.minimizeCrossings(refinedPositions, entities, relationships);

    // 4. Garantir espaçamento mínimo adequado
    this.enforceMinSpacing(refinedPositions, 140);

    console.log('✅ [ELK Post-processing] Position refinement completed');
    return refinedPositions;
  }

  /**
   * Otimiza agrupamento de entidades relacionadas
   */
  private optimizeClusters(
    positions: Map<string, { x: number; y: number }>,
    entities: ErEntity[],
    relationships: ErRelationship[]
  ): void {
    console.log('🎯 [Cluster Optimization] Analyzing entity clusters');

    // Criar grafo de conectividade
    const connections = new Map<string, string[]>();
    relationships.forEach(rel => {
      if (!connections.has(rel.from)) connections.set(rel.from, []);
      if (!connections.has(rel.to)) connections.set(rel.to, []);
      connections.get(rel.from)!.push(rel.to);
      connections.get(rel.to)!.push(rel.from);
    });

    // Para cada entidade, aproximar das entidades mais conectadas
    entities.forEach(entity => {
      const entityConnections = connections.get(entity.name) || [];
      if (entityConnections.length === 0) return;

      const currentPos = positions.get(entity.name)!;
      const connectedPositions = entityConnections
        .map(connectedName => positions.get(connectedName))
        .filter(pos => pos !== undefined);

      if (connectedPositions.length === 0) return;

      // Calcular centroide das entidades conectadas
      const centroid = {
        x: connectedPositions.reduce((sum, pos) => sum + pos!.x, 0) / connectedPositions.length,
        y: connectedPositions.reduce((sum, pos) => sum + pos!.y, 0) / connectedPositions.length
      };

      // Mover 25% em direção ao centroide (ajuste suave)
      const factor = 0.25;
      const newPos = {
        x: Math.round(currentPos.x + (centroid.x - currentPos.x) * factor),
        y: Math.round(currentPos.y + (centroid.y - currentPos.y) * factor)
      };

      positions.set(entity.name, newPos);
    });
  }

  /**
   * Melhora simetria do layout
   */
  private improveSymmetry(
    positions: Map<string, { x: number; y: number }>,
    entities: ErEntity[],
    relationships: ErRelationship[]
  ): void {
    console.log('⚖️ [Symmetry] Improving layout symmetry');

    // Calcular centro de massa
    const allPositions = Array.from(positions.values());
    const centerOfMass = {
      x: allPositions.reduce((sum, pos) => sum + pos.x, 0) / allPositions.length,
      y: allPositions.reduce((sum, pos) => sum + pos.y, 0) / allPositions.length
    };

    // Aplicar força centrípeta suave para equilibrar distribuição
    positions.forEach((pos, entityName) => {
      const distanceFromCenter = Math.sqrt(
        Math.pow(pos.x - centerOfMass.x, 2) + Math.pow(pos.y - centerOfMass.y, 2)
      );

      // Se muito distante do centro, aproximar ligeiramente
      if (distanceFromCenter > 400) {
        const factor = 0.1; // Ajuste muito suave
        const newPos = {
          x: Math.round(pos.x + (centerOfMass.x - pos.x) * factor),
          y: Math.round(pos.y + (centerOfMass.y - pos.y) * factor)
        };
        positions.set(entityName, newPos);
      }
    });
  }

  /**
   * Minimiza cruzamentos de conexões
   */
  private minimizeCrossings(
    positions: Map<string, { x: number; y: number }>,
    entities: ErEntity[],
    relationships: ErRelationship[]
  ): void {
    console.log('🔀 [Crossings] Minimizing connection crossings');

    // Detectar entidades que causam muitos cruzamentos
    const crossingCounts = new Map<string, number>();
    
    relationships.forEach(rel1 => {
      const pos1From = positions.get(rel1.from);
      const pos1To = positions.get(rel1.to);
      if (!pos1From || !pos1To) return;

      relationships.forEach(rel2 => {
        if (rel1 === rel2) return;
        
        const pos2From = positions.get(rel2.from);
        const pos2To = positions.get(rel2.to);
        if (!pos2From || !pos2To) return;

        if (this.linesIntersect(pos1From, pos1To, pos2From, pos2To)) {
          crossingCounts.set(rel1.from, (crossingCounts.get(rel1.from) || 0) + 1);
          crossingCounts.set(rel1.to, (crossingCounts.get(rel1.to) || 0) + 1);
        }
      });
    });

    // Ajustar posições das entidades com mais cruzamentos
    crossingCounts.forEach((count, entityName) => {
      if (count > 2) { // Se tem mais de 2 cruzamentos
        const currentPos = positions.get(entityName)!;
        // Pequena variação aleatória para quebrar padrões problemáticos
        const newPos = {
          x: currentPos.x + (Math.random() - 0.5) * 40,
          y: currentPos.y + (Math.random() - 0.5) * 40
        };
        positions.set(entityName, newPos);
      }
    });
  }

  /**
   * Garante espaçamento mínimo entre elementos
   */
  private enforceMinSpacing(
    positions: Map<string, { x: number; y: number }>,
    minSpacing: number
  ): void {
    console.log(`📏 [Spacing] Enforcing minimum spacing of ${minSpacing}px`);

    const positionsArray = Array.from(positions.entries());

    positionsArray.forEach(([entityName1, pos1], i) => {
      positionsArray.slice(i + 1).forEach(([entityName2, pos2]) => {
        const distance = Math.sqrt(
          Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2)
        );

        if (distance < minSpacing) {
          // Calcular vetor de separação
          const dx = pos2.x - pos1.x;
          const dy = pos2.y - pos1.y;
          const length = Math.sqrt(dx * dx + dy * dy) || 1;
          
          // Normalizar e aplicar espaçamento mínimo
          const normalizedDx = dx / length;
          const normalizedDy = dy / length;
          
          const separation = minSpacing - distance;
          const moveDistance = separation / 2;
          
          // Mover ambos elementos para longe um do outro
          positions.set(entityName1, {
            x: Math.round(pos1.x - normalizedDx * moveDistance),
            y: Math.round(pos1.y - normalizedDy * moveDistance)
          });
          
          positions.set(entityName2, {
            x: Math.round(pos2.x + normalizedDx * moveDistance),
            y: Math.round(pos2.y + normalizedDy * moveDistance)
          });
        }
      });
    });
  }

  /**
   * Verifica se duas linhas se interceptam
   */
  private linesIntersect(
    p1: { x: number; y: number },
    q1: { x: number; y: number },
    p2: { x: number; y: number },
    q2: { x: number; y: number }
  ): boolean {
    const orientation = (p: { x: number; y: number }, q: { x: number; y: number }, r: { x: number; y: number }) => {
      const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
      if (val === 0) return 0;
      return val > 0 ? 1 : 2;
    };

    const o1 = orientation(p1, q1, p2);
    const o2 = orientation(p1, q1, q2);
    const o3 = orientation(p2, q2, p1);
    const o4 = orientation(p2, q2, q1);

    return o1 !== o2 && o3 !== o4;
  }

  /**
   * Aplica layout customizado para padrão Hub-Ring-Chain
   */
  private async applyCustomHubRingChainLayout(
    entities: ErEntity[],
    relationships: ErRelationship[]
  ): Promise<LayoutResult> {
    console.log('🎯 [Custom Layout] Applying Hub-Ring-Chain layout');
    
    const positionsMap = new Map<string, { x: number; y: number }>();
    const { hubEntity, ringEntities, chainEntities } = this.patternInfo;
    
    // Ajustar layout baseado no tamanho do diagrama
    const totalEntities = entities.length;
    const isSmallDiagram = totalEntities <= 5;
    
    const centerX = isSmallDiagram ? 500 : 600;
    const centerY = isSmallDiagram ? 350 : 400;
    const ringRadius = isSmallDiagram ? 250 : 350;  // Aumentado de 200/280 para 250/350
    
    console.log(`📊 [Custom Layout] Small diagram: ${isSmallDiagram}, Total entities: ${totalEntities}`);
    console.log(`📍 [Custom Layout] Center: (${centerX}, ${centerY}), Ring radius: ${ringRadius}`);
    
    console.log(`🏛️ [Custom Layout] Hub: ${hubEntity}`);
    console.log(`🔄 [Custom Layout] Ring entities: ${ringEntities.join(', ')}`);
    console.log(`⛓️ [Custom Layout] Chain entities: ${chainEntities.join(', ')}`);

    // 1. Posicionar hub no centro
    positionsMap.set(hubEntity, { x: centerX, y: centerY });
    console.log(`📍 [Custom Layout] Hub "${hubEntity}" positioned at center (${centerX}, ${centerY})`);

    // 2. Posicionar entidades do anel em círculo ao redor do hub
    if (ringEntities.length > 0) {
      const angleStep = (2 * Math.PI) / ringEntities.length;
      
      ringEntities.forEach((entity: string, index: number) => {
        const angle = index * angleStep - Math.PI / 2; // Começar no topo
        const x = Math.round(centerX + ringRadius * Math.cos(angle));
        const y = Math.round(centerY + ringRadius * Math.sin(angle));
        
        positionsMap.set(entity, { x, y });
        console.log(`🔄 [Custom Layout] Ring entity "${entity}" positioned at (${x}, ${y}), angle: ${(angle * 180 / Math.PI).toFixed(1)}°`);
      });
    }

    // 3. Posicionar entidades da cadeia externa
    if (chainEntities.length > 0) {
      // Para cada entidade da cadeia, posicioná-la em relação ao hub e expandir a cadeia
      chainEntities.forEach((chainEntity: string, index: number) => {
        // Encontrar entidades conectadas a esta entidade da cadeia (que não seja o hub)
        const chainConnections = relationships.filter(rel => 
          (rel.from === chainEntity && rel.to !== hubEntity) ||
          (rel.to === chainEntity && rel.from !== hubEntity)
        );

        if (chainConnections.length > 0) {
          // Esta entidade tem conexões externas - expandir cadeia
          this.positionChainSequence(chainEntity, chainConnections, entities, relationships, positionsMap, centerX, centerY);
        } else {
          // Entidade simples conectada apenas ao hub
          const chainAngle = (index * Math.PI) / 2; // Espalhar em 4 direções principais
          const chainDistance = ringRadius + 200; // Aumentado de 150 para 200
          const x = Math.round(centerX + chainDistance * Math.cos(chainAngle));
          const y = Math.round(centerY + chainDistance * Math.sin(chainAngle));
          
          positionsMap.set(chainEntity, { x, y });
          console.log(`⛓️ [Custom Layout] Simple chain entity "${chainEntity}" positioned at (${x}, ${y})`);
        }
      });
    }

    // 4. Posicionar entidades restantes (se houver)
    entities.forEach((entity, index) => {
      if (!positionsMap.has(entity.name)) {
        console.log(`🔍 [Custom Layout] Positioning uncategorized entity "${entity.name}"`);
        
        if (isSmallDiagram) {
          // Para diagramas pequenos, usar posicionamento mais inteligente
          const remainingCount = entities.filter(e => !positionsMap.has(e.name)).length;
          const entityIndex = entities.filter(e => !positionsMap.has(e.name)).indexOf(entity);
          
          // Posicionar em ângulos específicos ao redor do hub
          const baseAngle = (entityIndex * 2 * Math.PI) / remainingCount;
          const fallbackRadius = ringRadius + 120; // Um pouco mais longe que o anel
          
          const fallbackX = centerX + fallbackRadius * Math.cos(baseAngle);
          const fallbackY = centerY + fallbackRadius * Math.sin(baseAngle);
          
          positionsMap.set(entity.name, { 
            x: Math.round(fallbackX), 
            y: Math.round(fallbackY) 
          });
          console.log(`📍 [Custom Layout] Small diagram - entity "${entity.name}" positioned at (${Math.round(fallbackX)}, ${Math.round(fallbackY)})`);
        } else {
          // Para diagramas grandes, usar posicionamento aleatório
          const fallbackX = centerX + (Math.random() - 0.5) * 600;
          const fallbackY = centerY + (Math.random() - 0.5) * 400;
          positionsMap.set(entity.name, { 
            x: Math.round(fallbackX), 
            y: Math.round(fallbackY) 
          });
          console.log(`🔍 [Custom Layout] Large diagram - entity "${entity.name}" positioned at fallback location`);
        }
      }
    });

    console.log(`✅ [Custom Layout] Hub-Ring-Chain layout completed with ${positionsMap.size} entities positioned`);

    return {
      success: true,
      nodes: positionsMap
    };
  }

  /**
   * Posiciona uma sequência em cadeia a partir de uma entidade
   */
  private positionChainSequence(
    startEntity: string,
    chainConnections: ErRelationship[],
    allEntities: ErEntity[],
    allRelationships: ErRelationship[],
    positionsMap: Map<string, { x: number; y: number }>,
    centerX: number,
    centerY: number
  ): void {
    console.log(`⛓️ [Chain Sequence] Building chain starting from "${startEntity}"`);

    // Construir cadeia seguindo as conexões
    const chainSequence: string[] = [startEntity];
    const visited = new Set<string>([startEntity]);
    
    // Seguir a cadeia recursivamente
    let currentEntity = startEntity;
    
    while (true) {
      const nextConnection = allRelationships.find(rel => 
        ((rel.from === currentEntity && !visited.has(rel.to)) ||
         (rel.to === currentEntity && !visited.has(rel.from))) &&
        rel.from !== 'ORDER' && rel.to !== 'ORDER' // Não voltar para o hub
      );
      
      if (!nextConnection) break;
      
      const nextEntity = nextConnection.from === currentEntity ? nextConnection.to : nextConnection.from;
      chainSequence.push(nextEntity);
      visited.add(nextEntity);
      currentEntity = nextEntity;
    }

    console.log(`⛓️ [Chain Sequence] Chain sequence: ${chainSequence.join(' → ')}`);

    // Posicionar cadeia em linha
    const chainStartX = centerX - 300; // Mais à esquerda
    const chainStartY = centerY + 320; // Mais abaixo
    const chainSpacing = 200; // Aumentado de 150 para 200

    chainSequence.forEach((entity, index) => {
      const x = chainStartX + (index * chainSpacing);
      const y = chainStartY;
      
      positionsMap.set(entity, { x, y });
      console.log(`⛓️ [Chain Sequence] Entity "${entity}" positioned at (${x}, ${y})`);
    });
  }

  /**
   * Aplica layout customizado para padrão Linear Backbone
   */
  private async applyCustomLinearBackboneLayout(
    entities: ErEntity[],
    relationships: ErRelationship[]
  ): Promise<LayoutResult> {
    console.log('📏 [Linear Layout] Applying Linear Backbone layout');
    
    const positionsMap = new Map<string, { x: number; y: number }>();
    const { backbone, verticalChains } = this.patternInfo;
    
    const backboneStartX = 400;
    const backboneY = 300;
    const backboneSpacing = 200;
    const verticalSpacing = 180;  // Aumentado de 150 para 180
    
    console.log(`📏 [Linear Layout] Backbone: ${backbone.join(' → ')}`);
    console.log(`⬇️ [Linear Layout] Vertical chains:`, verticalChains);

    // 1. Posicionar backbone horizontalmente
    backbone.forEach((entity: string, index: number) => {
      const x = backboneStartX + (index * backboneSpacing);
      const y = backboneY;
      
      positionsMap.set(entity, { x, y });
      console.log(`📏 [Linear Layout] Backbone entity "${entity}" positioned at (${x}, ${y})`);
    });

    // 2. Posicionar cadeias verticais
    Object.entries(verticalChains).forEach(([backboneEntity, chains]) => {
      const backbonePos = positionsMap.get(backboneEntity);
      if (!backbonePos) return;

      const chainsList = chains as string[];
      console.log(`⬇️ [Linear Layout] Processing vertical chains for "${backboneEntity}": ${chainsList.join(', ')}`);

      // Posicionar cada elemento da cadeia vertical abaixo do backbone
      chainsList.forEach((chainEntity: string, chainIndex: number) => {
        const x = backbonePos.x;
        const y = backbonePos.y + verticalSpacing * (chainIndex + 1);
        
        positionsMap.set(chainEntity, { x, y });
        console.log(`⬇️ [Linear Layout] Vertical chain entity "${chainEntity}" positioned at (${x}, ${y})`);
      });
    });

    // 3. Posicionar entidades restantes (se houver)
    entities.forEach((entity, index) => {
      if (!positionsMap.has(entity.name)) {
        console.log(`🔍 [Linear Layout] Positioning uncategorized entity "${entity.name}"`);
        
        // Posicionar à direita do backbone
        const fallbackX = backboneStartX + (backbone.length * backboneSpacing) + 150;
        const fallbackY = backboneY + (index * 100);
        
        positionsMap.set(entity.name, { 
          x: Math.round(fallbackX), 
          y: Math.round(fallbackY) 
        });
        console.log(`📍 [Linear Layout] Entity "${entity.name}" positioned at fallback (${Math.round(fallbackX)}, ${Math.round(fallbackY)})`);
      }
    });

    console.log(`✅ [Linear Layout] Linear Backbone layout completed with ${positionsMap.size} entities positioned`);

    return {
      success: true,
      nodes: positionsMap
    };
  }
}