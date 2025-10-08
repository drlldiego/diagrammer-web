/**
 * Sistema Avançado de Layout para Diagrama ER
 * Implementa algoritmos de posicionamento inteligente com:
 * - Detecção de clusters e comunidades
 * - Roteamento inteligente de conexões
 * - Física simulada para otimização de posições
 * - Prevenção de sobreposições
 */

import * as yaml from "js-yaml";
import {
  ErDiagram,
  ErEntity,
  ErRelationship,
  ErAttribute,
  MermaidErSyntax,
  CardinalitySymbol,
  CROWSFOOT_CARDINALITIES,
  ErDeclarativeParser,
} from "./er-types";

interface LayoutErEntity extends ErEntity {
  width?: number;
  height?: number;
  cluster?: number;
  force?: Vector2D;
  velocity?: Vector2D;
  mass?: number;
  fixed?: boolean;
}

interface LayoutErRelationship extends ErRelationship {
  type?: 'one-to-one' | 'one-to-many' | 'many-to-many';
  points?: Point2D[];
  curvature?: number;
}

interface Point2D {
  x: number;
  y: number;
}

interface Vector2D {
  x: number;
  y: number;
}

interface LayoutConfig {
  horizontalSpacing: number;
  verticalSpacing: number;
  startX: number;
  startY: number;
  canvasWidth: number;
  canvasHeight: number;
  enablePhysics: boolean;
  enableClustering: boolean;
  edgeRouting: 'straight' | 'orthogonal' | 'curved';
  iterations: number;
}

interface GraphMetrics {
  density: number;
  avgDegree: number;
  maxDegree: number;
  clusters: Map<string, number>;
  centrality: Map<string, number>;
  bridges: Set<string>;
}

class AdvancedErLayoutEngine {
  private layoutConfig: LayoutConfig = {
    horizontalSpacing: 150,
    verticalSpacing: 120,
    startX: 50,
    startY: 50,
    canvasWidth: 1200,
    canvasHeight: 1000,
    enablePhysics: true,
    enableClustering: true,
    edgeRouting: 'curved',
    iterations: 50
  };

  private entities: Map<string, LayoutErEntity> = new Map();
  private relationships: LayoutErRelationship[] = [];
  private metrics: GraphMetrics | null = null;

  // Cache de posicionamento
  private layoutCache: Map<string, { entities: LayoutErEntity[], relationships: LayoutErRelationship[] }> = new Map();
  
  /**
   * Gera uma chave única para o cache baseada na estrutura do diagrama
   */
  private generateCacheKey(entities: LayoutErEntity[], relationships: LayoutErRelationship[]): string {
    const entityNames = entities.map(e => e.name).sort().join(',');
    const relationshipKeys = relationships
      .map(r => `${r.from}-${r.cardinality || 'rel'}-${r.to}`)
      .sort()
      .join(',');
    return `${entityNames}|${relationshipKeys}`;
  }

  /**
   * Limpa o cache (útil quando a estrutura do diagrama muda significativamente)
   */
  public clearCache(): void {
    this.layoutCache.clear();
    console.log('🗑️ Cache de layout limpo');
  }

  /**
   * Gera hash determinístico a partir de uma string
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Calcula configurações adaptativas baseadas na quantidade de elementos
   */
  private calculateAdaptiveConfig(entityCount: number): LayoutConfig {
    // Cálculo dinâmico do espaçamento baseado na quantidade de elementos
    let horizontalSpacing: number;
    let verticalSpacing: number;
    let canvasWidth: number;
    let canvasHeight: number;
    
    if (entityCount <= 3) {
      // Poucos elementos - espaçamento generoso
      horizontalSpacing = 350;
      verticalSpacing = 250;
      canvasWidth = 800;
      canvasHeight = 400;
    } else if (entityCount <= 6) {
      // Elementos moderados
      horizontalSpacing = 300;
      verticalSpacing = 220;
      canvasWidth = 1100;
      canvasHeight = 900;
    } else if (entityCount <= 12) {
      // Muitos elementos
      horizontalSpacing = 250;
      verticalSpacing = 200;
      canvasWidth = 1600;
      canvasHeight = 1200;
    } else if (entityCount <= 20) {
      // Elementos numerosos
      horizontalSpacing = 220;
      verticalSpacing = 180;
      canvasWidth = 1800;
      canvasHeight = 1400;
    } else {
      // Muitos elementos - layout compacto
      horizontalSpacing = 200;
      verticalSpacing = 160;
      canvasWidth = Math.max(2000, entityCount * 120);
      canvasHeight = Math.max(1600, entityCount * 100);
    }

    // Aplicar fórmula golden ratio para distribuição ótima
    const cols = Math.ceil(Math.sqrt(entityCount * 1.618));
    const rows = Math.ceil(entityCount / cols);
    
    // Ajustar canvas baseado na grade calculada
    const minCanvasWidth = cols * horizontalSpacing + 200; // padding
    const minCanvasHeight = rows * verticalSpacing + 200; // padding
    
    canvasWidth = Math.max(canvasWidth, minCanvasWidth);
    canvasHeight = Math.max(canvasHeight, minCanvasHeight);

    return {
      ...this.layoutConfig,
      horizontalSpacing,
      verticalSpacing,
      canvasWidth,
      canvasHeight,
      startX: 100, // Padding fixo
      startY: 100, // Padding fixo
    };
  }

  /**
   * Método principal de layout
   */
  public applyLayout(
    entities: LayoutErEntity[],
    relationships: LayoutErRelationship[],
    config?: Partial<LayoutConfig>
  ): { entities: LayoutErEntity[], relationships: LayoutErRelationship[] } {
    // Gerar chave do cache
    const cacheKey = this.generateCacheKey(entities, relationships);
    
    // Verificar se existe no cache
    if (this.layoutCache.has(cacheKey)) {
      const cached = this.layoutCache.get(cacheKey)!;      
      return {
        entities: cached.entities.map(e => ({ ...e })), // Cópia profunda
        relationships: cached.relationships.map(r => ({ ...r })) // Cópia profunda
      };
    }    
    
    // Calcular configuração adaptativa baseada na quantidade de elementos
    const adaptiveConfig = this.calculateAdaptiveConfig(entities.length);
    
    // Atualizar configuração (prioridade: config manual > adaptativo > padrão)
    this.layoutConfig = { ...adaptiveConfig, ...config };

    // Preparar estruturas de dados
    this.entities = new Map(entities.map(e => [e.name, { ...e }]));
    this.relationships = relationships.map(r => ({ ...r }));

    // Calcular métricas do grafo
    this.metrics = this.calculateGraphMetrics();

    // Escolher estratégia de layout baseada nas métricas
    const strategy = this.selectLayoutStrategy();

    // Aplicar layout escolhido
    switch (strategy) {
      case 'hierarchical':
        this.applyHierarchicalLayout();
        break;
      case 'force-directed':
        this.applyForceDirectedLayout();
        break;
      case 'clustered':
        this.applyClusteredLayout();
        break;
      default:
        this.applySmartGridLayout();
    }

    // Otimizar posições com física simulada
    if (this.layoutConfig.enablePhysics) {
      this.optimizeWithPhysics();
    }

    // Rotear conexões para evitar sobreposições
    this.routeConnections();

    // Garantir que tudo está dentro do canvas
    this.fitToCanvas();

    const result = {
      entities: Array.from(this.entities.values()),
      relationships: this.relationships
    };

    // Salvar no cache
    this.layoutCache.set(cacheKey, {
      entities: result.entities.map(e => ({ ...e })), // Cópia profunda
      relationships: result.relationships.map(r => ({ ...r })) // Cópia profunda
    });
    
    console.log(`💾 Layout salvo no cache (chave: ${cacheKey.substring(0, 30)}...)`);

    return result;
  }

  /**
   * Calcula métricas do grafo para decisões inteligentes
   */
  private calculateGraphMetrics(): GraphMetrics {
    const adjacency = this.buildAdjacencyList();
    const degrees = new Map<string, number>();

    // Calcular graus
    this.entities.forEach((entity, name) => {
      degrees.set(name, adjacency.get(name)?.size || 0);
    });

    // Detectar clusters usando algoritmo de Louvain simplificado
    const clusters = this.detectClusters(adjacency);

    // Calcular centralidade (betweenness simplificada)
    const centrality = this.calculateCentrality(adjacency);

    // Identificar pontes (edges críticas)
    const bridges = this.findBridges(adjacency);

    const totalEdges = this.relationships.length;
    const totalNodes = this.entities.size;
    const maxPossibleEdges = (totalNodes * (totalNodes - 1)) / 2;

    return {
      density: maxPossibleEdges > 0 ? totalEdges / maxPossibleEdges : 0,
      avgDegree: Array.from(degrees.values()).reduce((a, b) => a + b, 0) / totalNodes,
      maxDegree: Math.max(...Array.from(degrees.values())),
      clusters,
      centrality,
      bridges
    };
  }

  /**
   * Seleciona estratégia de layout baseada nas características do grafo
   */
  private selectLayoutStrategy(): string {
    if (!this.metrics) return 'grid';

    const { density, avgDegree, clusters } = this.metrics;
    const distinctClusters = new Set(clusters.values()).size;

    // Grafo muito denso: força dirigida funciona melhor
    if (density > 0.3 || avgDegree > 5) {
      return 'force-directed';
    }

    // Múltiplos clusters distintos
    if (distinctClusters > 1 && distinctClusters < this.entities.size / 3) {
      return 'clustered';
    }

    // Estrutura hierárquica detectada (árvore ou DAG)
    if (this.isHierarchical()) {
      return 'hierarchical';
    }

    // Default para grade inteligente
    return 'grid';
  }

  /**
   * Layout hierárquico para estruturas em árvore
   */
  private applyHierarchicalLayout(): void {
    const levels = this.calculateHierarchyLevels();
    const levelGroups = new Map<number, LayoutErEntity[]>();

    // Agrupar por nível
    levels.forEach((level, entityName) => {
      const entity = this.entities.get(entityName);
      if (entity) {
        if (!levelGroups.has(level)) {
          levelGroups.set(level, []);
        }
        levelGroups.get(level)!.push(entity);
      }
    });

    // Posicionar por nível
    const levelHeight = this.layoutConfig.verticalSpacing;
    const sortedLevels = Array.from(levelGroups.keys()).sort((a, b) => a - b);

    sortedLevels.forEach((level, levelIndex) => {
      const entitiesInLevel = levelGroups.get(level)!;
      const levelWidth = entitiesInLevel.length * this.layoutConfig.horizontalSpacing;
      const startX = (this.layoutConfig.canvasWidth - levelWidth) / 2;

      entitiesInLevel.forEach((entity, index) => {
        entity.x = startX + index * this.layoutConfig.horizontalSpacing;
        entity.y = this.layoutConfig.startY + levelIndex * levelHeight;
      });
    });
  }

  /**
   * Layout baseado em física com forças de atração e repulsão
   */
  private applyForceDirectedLayout(): void {
    // Inicializar posições aleatórias mais próximas ao centro
    const centerX = this.layoutConfig.canvasWidth / 2;
    const centerY = this.layoutConfig.canvasHeight / 2;
    const initialRadius = 200; // Raio inicial para posições aleatórias
    
    this.entities.forEach(entity => {
      if (!entity.fixed) {
        // Posições iniciais determinísticas baseadas no hash do nome
        const hash = this.hashString(entity.name);
        const angle = ((hash % 1000) / 1000) * 2 * Math.PI;
        const radius = (((hash >> 10) % 1000) / 1000) * initialRadius;

        entity.x = entity.x || (centerX + radius * Math.cos(angle));
        entity.y = entity.y || (centerY + radius * Math.sin(angle));
        entity.velocity = { x: 0, y: 0 };
        entity.force = { x: 0, y: 0 };
        entity.mass = 1;
      }
    });

    // Configurações do algoritmo 
    const iterations = this.layoutConfig.iterations;
    const idealDistance = Math.min(200, Math.sqrt((this.layoutConfig.canvasWidth * this.layoutConfig.canvasHeight) / (this.entities.size * 4)));

    const k = idealDistance;
    const c = 0.1; // Força de atração aumentada

    for (let iter = 0; iter < iterations; iter++) {
      const temperature = 1 - iter / iterations;

      // Resetar forças
      this.entities.forEach(entity => {
        entity.force = { x: 0, y: 0 };
      });

      // Calcular forças de repulsão (todos contra todos)
      const entitiesArray = Array.from(this.entities.values());
      for (let i = 0; i < entitiesArray.length; i++) {
        for (let j = i + 1; j < entitiesArray.length; j++) {
          const e1 = entitiesArray[i];
          const e2 = entitiesArray[j];

          if (!e1.fixed || !e2.fixed) {
            const dx = e2.x! - e1.x!;
            const dy = e2.y! - e1.y!;
            const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));

            const repulsion = (k * k) / (distance * 2);;
            const fx = (dx / distance) * repulsion;
            const fy = (dy / distance) * repulsion;

            if (!e1.fixed) {
              e1.force!.x -= fx;
              e1.force!.y -= fy;
            }
            if (!e2.fixed) {
              e2.force!.x += fx;
              e2.force!.y += fy;
            }
          }
        }
      }

      // Calcular forças de atração (apenas conectados)
      this.relationships.forEach(rel => {
        const e1 = this.entities.get(rel.from);
        const e2 = this.entities.get(rel.to);

        if (e1 && e2 && (!e1.fixed || !e2.fixed)) {
          const dx = e2.x! - e1.x!;
          const dy = e2.y! - e1.y!;
          const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));

          const attraction = (distance * distance) / (k * 3);;
          const fx = (dx / distance) * attraction * c;
          const fy = (dy / distance) * attraction * c;

          if (!e1.fixed) {
            e1.force!.x += fx;
            e1.force!.y += fy;
          }
          if (!e2.fixed) {
            e2.force!.x -= fx;
            e2.force!.y -= fy;
          }
        }
      });

      // Aplicar forças e atualizar posições
      this.entities.forEach(entity => {
        if (!entity.fixed && entity.force) {
          // Aplicar damping e temperatura
          entity.velocity!.x = (entity.velocity!.x + entity.force.x) * 0.85 * temperature;
          entity.velocity!.y = (entity.velocity!.y + entity.force.y) * 0.85 * temperature;

          // Limitar velocidade máxima
          const maxVel = 20 * temperature;
          entity.velocity!.x = Math.max(-maxVel, Math.min(maxVel, entity.velocity!.x));
          entity.velocity!.y = Math.max(-maxVel, Math.min(maxVel, entity.velocity!.y));

          // Atualizar posição
          entity.x! += entity.velocity!.x;
          entity.y! += entity.velocity!.y;
        }
      });
    }
  }

  /**
   * Layout agrupado por clusters
   */
  private applyClusteredLayout(): void {
    if (!this.metrics) return;

    const clusters = this.metrics.clusters;
    const clusterGroups = new Map<number, LayoutErEntity[]>();

    // Agrupar entidades por cluster
    clusters.forEach((clusterId, entityName) => {
      const entity = this.entities.get(entityName);
      if (entity) {
        entity.cluster = clusterId;
        if (!clusterGroups.has(clusterId)) {
          clusterGroups.set(clusterId, []);
        }
        clusterGroups.get(clusterId)!.push(entity);
      }
    });

    // Calcular layout para cada cluster
    const clusterCenters = this.calculateClusterCenters(clusterGroups.size);

    clusterGroups.forEach((entities, clusterId) => {
      const center = clusterCenters.get(clusterId)!;

      // Aplicar layout circular dentro do cluster
      if (entities.length === 1) {
        entities[0].x = center.x;
        entities[0].y = center.y;
      } else {
        const radius = Math.min(100, 30 * Math.sqrt(entities.length));
        entities.forEach((entity, index) => {
          const angle = (2 * Math.PI * index) / entities.length;
          entity.x = center.x + radius * Math.cos(angle);
          entity.y = center.y + radius * Math.sin(angle);
        });
      }
    });
  }

  /**
   * Grade inteligente melhorada
   */
  private applySmartGridLayout(): void {
    const adjacency = this.buildAdjacencyList();
    const degrees = new Map<string, number>();

    this.entities.forEach((entity, name) => {
      degrees.set(name, adjacency.get(name)?.size || 0);
    });

    // Ordenar por grau (conectividade)
    const sortedEntities = Array.from(this.entities.values()).sort((a, b) =>
      (degrees.get(b.name) || 0) - (degrees.get(a.name) || 0)
    );

    // Calcular grade ótima usando golden ratio
    const total = sortedEntities.length;
    const goldenRatio = 1.618;
    const cols = Math.ceil(Math.sqrt(total * goldenRatio));
    const rows = Math.ceil(total / cols);

    // Usar algoritmo espiral para posicionamento
    const positions = this.generateSpiralPositions(rows, cols);
    const cellWidth = this.layoutConfig.horizontalSpacing;
    const cellHeight = this.layoutConfig.verticalSpacing;

    // Posicionar entidades de alta conectividade no centro
    sortedEntities.forEach((entity, index) => {
      if (index < positions.length) {
        const [row, col] = positions[index];
        entity.x = this.layoutConfig.startX + col * cellWidth;
        entity.y = this.layoutConfig.startY + row * cellHeight;
      }
    });

    // Aplicar jitter determinístico para naturalidade (baseado no nome)
    sortedEntities.forEach(entity => {
      if (!entity.fixed) {
        // Usar hash do nome para garantir determinismo
        const hash = this.hashString(entity.name);
        const offsetX = ((hash % 61) - 30); // -30 a +30
        const offsetY = (((hash >> 8) % 41) - 20); // -20 a +20
        entity.x! += offsetX;
        entity.y! += offsetY;
      }
    });
  }

  /**
   * Otimização final com simulação física
   */
  private optimizeWithPhysics(): void {
    const iterations = 20;
    const entitiesArray = Array.from(this.entities.values());

    for (let iter = 0; iter < iterations; iter++) {
      // Detectar e resolver sobreposições
      for (let i = 0; i < entitiesArray.length; i++) {
        for (let j = i + 1; j < entitiesArray.length; j++) {
          const e1 = entitiesArray[i];
          const e2 = entitiesArray[j];

          const minDistance = 120; // Distância mínima entre entidades
          const dx = e2.x! - e1.x!;
          const dy = e2.y! - e1.y!;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < minDistance && distance > 0) {
            const overlap = minDistance - distance;
            const pushX = (dx / distance) * overlap * 0.5;
            const pushY = (dy / distance) * overlap * 0.5;

            if (!e1.fixed) {
              e1.x! -= pushX;
              e1.y! -= pushY;
            }
            if (!e2.fixed) {
              e2.x! += pushX;
              e2.y! += pushY;
            }
          }
        }
      }
    }
  }

  /**
   * Roteamento inteligente de conexões
   */
  private routeConnections(): void {
    this.relationships.forEach(rel => {
      const fromEntity = this.entities.get(rel.from);
      const toEntity = this.entities.get(rel.to);

      if (!fromEntity || !toEntity) return;

      switch (this.layoutConfig.edgeRouting) {
        case 'orthogonal':
          rel.points = this.calculateOrthogonalPath(fromEntity, toEntity);
          break;
        case 'curved':
          rel.curvature = this.calculateOptimalCurvature(fromEntity, toEntity);
          break;
        default:
          // Linha reta, sem pontos intermediários
          break;
      }
    });
  }

  /**
   * Calcula caminho ortogonal (Manhattan) entre duas entidades
   */
  private calculateOrthogonalPath(from: LayoutErEntity, to: LayoutErEntity): Point2D[] {
    const points: Point2D[] = [];
    const fromCenter = {
      x: from.x! + (from.width || 100) / 2,
      y: from.y! + (from.height || 60) / 2
    };
    const toCenter = {
      x: to.x! + (to.width || 100) / 2,
      y: to.y! + (to.height || 60) / 2
    };

    // Determinar melhor rota baseado em posições relativas
    const dx = toCenter.x - fromCenter.x;
    const dy = toCenter.y - fromCenter.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      // Rota horizontal primeiro
      const midX = fromCenter.x + dx / 2;
      points.push({ x: midX, y: fromCenter.y });
      points.push({ x: midX, y: toCenter.y });
    } else {
      // Rota vertical primeiro
      const midY = fromCenter.y + dy / 2;
      points.push({ x: fromCenter.x, y: midY });
      points.push({ x: toCenter.x, y: midY });
    }

    return points;
  }

  /**
   * Calcula curvatura ótima para evitar sobreposições
   */
  private calculateOptimalCurvature(from: LayoutErEntity, to: LayoutErEntity): number {
    // Verificar se há entidades no caminho direto
    const obstacles = this.findObstaclesInPath(from, to);

    if (obstacles.length === 0) {
      return 0; // Linha reta
    }

    // Calcular curvatura baseada no número de obstáculos
    const baseCurvature = 0.2;
    const curvature = Math.min(0.5, baseCurvature * (1 + obstacles.length * 0.1));

    // Alternar direção da curva para evitar sobreposições múltiplas
    const hash = from.name.charCodeAt(0) + to.name.charCodeAt(0);
    return hash % 2 === 0 ? curvature : -curvature;
  }

  /**
   * Encontra entidades que estão no caminho entre duas outras
   */
  private findObstaclesInPath(from: LayoutErEntity, to: LayoutErEntity): LayoutErEntity[] {
    const obstacles: LayoutErEntity[] = [];
    const margin = 50;

    const x1 = Math.min(from.x!, to.x!) - margin;
    const x2 = Math.max(from.x!, to.x!) + margin;
    const y1 = Math.min(from.y!, to.y!) - margin;
    const y2 = Math.max(from.y!, to.y!) + margin;

    this.entities.forEach(entity => {
      if (entity !== from && entity !== to) {
        if (entity.x! >= x1 && entity.x! <= x2 &&
            entity.y! >= y1 && entity.y! <= y2) {
          obstacles.push(entity);
        }
      }
    });

    return obstacles;
  }

  /**
   * Ajusta todas as entidades para caber no canvas
   */
  private fitToCanvas(): void {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    // Encontrar limites
    this.entities.forEach(entity => {
      minX = Math.min(minX, entity.x!);
      minY = Math.min(minY, entity.y!);
      maxX = Math.max(maxX, entity.x! + (entity.width || 100));
      maxY = Math.max(maxY, entity.y! + (entity.height || 60));
    });

    const currentWidth = maxX - minX;
    const currentHeight = maxY - minY;
    const padding = 50;

    const availableWidth = this.layoutConfig.canvasWidth - 2 * padding;
    const availableHeight = this.layoutConfig.canvasHeight - 2 * padding;

    // Calcular escala necessária
    const scaleX = currentWidth > availableWidth ? availableWidth / currentWidth : 1;
    const scaleY = currentHeight > availableHeight ? availableHeight / currentHeight : 1;
    const scale = Math.min(scaleX, scaleY);

    // Aplicar escala e centralizar
    if (scale < 1) {
      const centerX = this.layoutConfig.canvasWidth / 2;
      const centerY = this.layoutConfig.canvasHeight / 2;
      const currentCenterX = (minX + maxX) / 2;
      const currentCenterY = (minY + maxY) / 2;

      this.entities.forEach(entity => {
        // Escalar relativo ao centro
        entity.x = centerX + (entity.x! - currentCenterX) * scale;
        entity.y = centerY + (entity.y! - currentCenterY) * scale;
      });
    }
  }

  // Métodos auxiliares

  private buildAdjacencyList(): Map<string, Set<string>> {
    const adjacency = new Map<string, Set<string>>();

    this.entities.forEach((_, name) => {
      adjacency.set(name, new Set());
    });

    this.relationships.forEach(rel => {
      adjacency.get(rel.from)?.add(rel.to);
      adjacency.get(rel.to)?.add(rel.from);
    });

    return adjacency;
  }

  private detectClusters(adjacency: Map<string, Set<string>>): Map<string, number> {
    const clusters = new Map<string, number>();
    let clusterId = 0;
    const visited = new Set<string>();

    // DFS para detectar componentes conectados
    const dfs = (node: string, id: number) => {
      visited.add(node);
      clusters.set(node, id);

      const nodeNeighbors = adjacency.get(node);
      if (nodeNeighbors) {
        Array.from(nodeNeighbors).forEach(neighbor => {
          if (!visited.has(neighbor)) {
            dfs(neighbor, id);
          }
        });
      }
    };

    this.entities.forEach((_, name) => {
      if (!visited.has(name)) {
        dfs(name, clusterId++);
      }
    });

    return clusters;
  }

  private calculateCentrality(adjacency: Map<string, Set<string>>): Map<string, number> {
    const centrality = new Map<string, number>();

    // Centralidade de grau simplificada
    this.entities.forEach((_, name) => {
      const degree = adjacency.get(name)?.size || 0;
      centrality.set(name, degree / (this.entities.size - 1));
    });

    return centrality;
  }

  private findBridges(adjacency: Map<string, Set<string>>): Set<string> {
    const bridges = new Set<string>();

    // Implementação simplificada: edges que conectam diferentes clusters
    const clusters = this.detectClusters(adjacency);

    this.relationships.forEach(rel => {
      const fromCluster = clusters.get(rel.from);
      const toCluster = clusters.get(rel.to);

      if (fromCluster !== toCluster) {
        bridges.add(`${rel.from}-${rel.to}`);
      }
    });

    return bridges;
  }

  private isHierarchical(): boolean {
    // Detectar se o grafo tem estrutura hierárquica
    const roots = new Set(this.entities.keys());

    this.relationships.forEach(rel => {
      roots.delete(rel.to);
    });

    // Se tem uma única raiz e não tem ciclos, é hierárquico
    return roots.size === 1 && !this.hasCycles();
  }

  private hasCycles(): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycleDFS = (node: string): boolean => {
      visited.add(node);
      recursionStack.add(node);

      const adjacency = this.buildAdjacencyList();
      const neighbors = adjacency.get(node) || new Set();

      for (const neighbor of Array.from(neighbors)) {
        if (!visited.has(neighbor)) {
          if (hasCycleDFS(neighbor)) {
            recursionStack.delete(node);
            return true;
          }
        } else if (recursionStack.has(neighbor)) {
          recursionStack.delete(node);
          return true;
        }
      }

      recursionStack.delete(node);
      return false;
    };

    const entityNames = Array.from(this.entities.keys());
    for (let i = 0; i < entityNames.length; i++) {
      const name = entityNames[i];
      if (!visited.has(name)) {
        if (hasCycleDFS(name)) return true;
      }
    }

    return false;
  }

  private calculateHierarchyLevels(): Map<string, number> {
    const levels = new Map<string, number>();
    const adjacency = this.buildAdjacencyList();

    // Encontrar raízes
    const roots = new Set(this.entities.keys());
    this.relationships.forEach(rel => {
      roots.delete(rel.to);
    });

    // BFS para calcular níveis
    const queue: [string, number][] = [];
    roots.forEach(root => {
      queue.push([root, 0]);
      levels.set(root, 0);
    });

    while (queue.length > 0) {
      const [node, level] = queue.shift()!;

      const nodeNeighbors = adjacency.get(node);
      if (nodeNeighbors) {
        nodeNeighbors.forEach(neighbor => {
          if (!levels.has(neighbor)) {
            levels.set(neighbor, level + 1);
            queue.push([neighbor, level + 1]);
          }
        });
      }
    }

    return levels;
  }

  private calculateClusterCenters(numClusters: number): Map<number, Point2D> {
    const centers = new Map<number, Point2D>();
    const radius = Math.min(
      this.layoutConfig.canvasWidth,
      this.layoutConfig.canvasHeight
    ) * 0.3;

    const centerX = this.layoutConfig.canvasWidth / 2;
    const centerY = this.layoutConfig.canvasHeight / 2;

    if (numClusters === 1) {
      centers.set(0, { x: centerX, y: centerY });
    } else {
      for (let i = 0; i < numClusters; i++) {
        const angle = (2 * Math.PI * i) / numClusters;
        centers.set(i, {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle)
        });
      }
    }

    return centers;
  }

  private generateSpiralPositions(rows: number, cols: number): [number, number][] {
    const positions: [number, number][] = [];
    const centerRow = Math.floor(rows / 2);
    const centerCol = Math.floor(cols / 2);

    positions.push([centerRow, centerCol]);

    let d = 1;
    let x = centerCol;
    let y = centerRow;
    let dx = 1;
    let dy = 0;

    while (positions.length < rows * cols) {
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < d; j++) {
          x += dx;
          y += dy;

          if (x >= 0 && x < cols && y >= 0 && y < rows) {
            positions.push([y, x]);
          }
        }

        [dx, dy] = [-dy, dx]; // Rotação 90 graus
      }
      d++;
    }

    return positions;
  }
}

export class MermaidErParser implements ErDeclarativeParser {
  private advancedLayoutEngine = new AdvancedErLayoutEngine();

  constructor() {}

  /**
   * Limpa o cache de layout - útil quando você quer recalcular posições
   */
  public clearLayoutCache(): void {
    this.advancedLayoutEngine.clearCache();
  }

  async parse(input: string): Promise<ErDiagram> {
    try {
      const parsedData = this.parseYAML(input);
      const result = await this.parseMermaidErSyntax(parsedData);
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Erro ao analisar sintaxe ER: ${errorMessage}`);
    }
  }

  serialize(diagram: ErDiagram): string {
    const mermaidSyntax = this.serializeToMermaid(diagram);
    return yaml.dump(mermaidSyntax);
  }

  getVersion(): string {
    return "2.0-advanced-layout";
  }

  private parseYAML(input: string): any {
    return yaml.load(input);
  }

  private async parseMermaidErSyntax(data: any): Promise<ErDiagram> {
    if (typeof data.erDiagram === "string") {
      return await this.parseErDiagramString(data.erDiagram, data.Titulo || data.title);
    }

    if (data.erDiagram && typeof data.erDiagram === "object") {
      return await this.parseErDiagramObject(data.erDiagram, data.Titulo || data.title);
    }

    if (typeof data === "object" && data !== null) {
      const relationships: ErRelationship[] = [];
      const entityNames = new Set<string>();

      for (const [key, value] of Object.entries(data)) {
        if (key === 'title' || key === 'Titulo') continue;

        if (typeof value === 'string' && this.isRelationshipLine(`${key} ${value}`)) {
          const relationship = this.parseRelationshipLine(`${key} : ${value}`);
          if (relationship) {
            relationships.push(relationship);
            entityNames.add(relationship.from);
            entityNames.add(relationship.to);
          }
        } else if (typeof value === 'string' && this.isRelationshipLine(key)) {
          const relationship = this.parseRelationshipLine(key);
          if (relationship) {
            relationships.push(relationship);
            entityNames.add(relationship.from);
            entityNames.add(relationship.to);
          }
        }
      }

      if (relationships.length > 0) {
        const entities: ErEntity[] = Array.from(entityNames).map(name => ({
          name,
          attributes: []
        }));

        await this.applyAdvancedLayout(entities, relationships);

        return {
          title: data.Titulo || data.title || "Diagrama ER",
          entities,
          relationships
        };
      }
    }

    throw new Error('Formato inválido. Use relacionamentos diretamente ou "erDiagram" como chave principal.');
  }

  private async parseErDiagramString(
    erDiagramContent: string,
    title?: string
  ): Promise<ErDiagram> {
    const originalLines = erDiagramContent.trim().split("\n");
    const lines = originalLines.map((line) => line.trim()).filter((line) => line);
    const relationships: ErRelationship[] = [];
    const entityNames = new Set<string>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (this.isRelationshipLine(line)) {
        try {
          const relationship = this.parseRelationshipLine(line);
          if (relationship) {
            relationships.push(relationship);
            entityNames.add(relationship.from);
            entityNames.add(relationship.to);
          }
        } catch (error) {
          const lineNumber = originalLines.findIndex(originalLine => originalLine.trim() === line) + 1;
          const errorMsg = error instanceof Error ? error.message : String(error);
          throw new Error(`${errorMsg} (Linha ${lineNumber})`);
        }
      }
    }

    const entities: ErEntity[] = Array.from(entityNames).map((name) => ({
      name,
      attributes: [],
    }));

    await this.applyAdvancedLayout(entities, relationships);

    return {
      title,
      entities,
      relationships,
    };
  }

  private async parseErDiagramObject(erDiagramObj: any, title?: string): Promise<ErDiagram> {
    const entities: ErEntity[] = [];
    const relationships: ErRelationship[] = [];

    if (erDiagramObj.entities) {
      for (const [entityName, entityData] of Object.entries(
        erDiagramObj.entities
      )) {
        const entity: ErEntity = { name: entityName, attributes: [] };

        if (
          entityData &&
          typeof entityData === "object" &&
          (entityData as any).attributes
        ) {
          for (const [attrName, attrData] of Object.entries(
            (entityData as any).attributes
          )) {
            const attribute: ErAttribute = {
              name: attrName,
              ...(typeof attrData === "object"
                ? attrData
                : { type: String(attrData) }),
            };
            entity.attributes!.push(attribute);
          }
        }

        entities.push(entity);
      }
    }

    if (
      erDiagramObj.relationships &&
      Array.isArray(erDiagramObj.relationships)
    ) {
      for (const relationshipStr of erDiagramObj.relationships) {
        const relationship = this.parseRelationshipLine(relationshipStr);
        if (relationship) {
          relationships.push(relationship);
        }
      }
    }

    await this.applyAdvancedLayout(entities, relationships);

    return {
      title,
      entities,
      relationships,
    };
  }

  private isRelationshipLine(line: string): boolean {
    const symbolPattern = /[\w-]+\s+[\|\}][|\w\-\.o\{\}]+\s+[\w-]+/;
    return symbolPattern.test(line);
  }

  private parseRelationshipLine(line: string): ErRelationship | null {
    const symbolRegex = /([\w-]+)\s+([\|\}][|\w\-\.o\{\}]+)\s+([\w-]+)(?:\s*:\s*(.+))?/;
    const symbolMatch = line.match(symbolRegex);

    if (symbolMatch) {
      const [, from, cardinality, to, label] = symbolMatch;

      if (!(cardinality in CROWSFOOT_CARDINALITIES)) {
        throw new Error(
          `Cardinalidade inválida: ${cardinality}. Use símbolos como: ||--||, ||--o{, }o--||, }o--o{, etc.`
        );
      }

      return {
        from: from.trim(),
        to: to.trim(),
        cardinality: cardinality as CardinalitySymbol,
        label: label?.trim(),
        isIdentifying: !cardinality.includes("."),
      };
    }

    return null;
  }

  private async applyAdvancedLayout(
    entities: ErEntity[],
    relationships: ErRelationship[]
  ): Promise<void> {
    if (entities.length === 0) return;

    // Converter para tipos de layout
    const layoutEntities: LayoutErEntity[] = entities.map(e => ({ ...e }));
    const layoutRelationships: LayoutErRelationship[] = relationships.map(r => ({ ...r }));

    const layoutResult = this.advancedLayoutEngine.applyLayout(layoutEntities, layoutRelationships);
    
    // Atualizar entidades com novas posições
    entities.forEach((entity, index) => {
      const layoutEntity = layoutResult.entities[index];
      if (layoutEntity) {
        entity.x = layoutEntity.x;
        entity.y = layoutEntity.y;
      }
    });

    // Atualizar relacionamentos com informações de roteamento
    relationships.forEach((rel, index) => {
      const layoutRel = layoutResult.relationships[index];
      if (layoutRel) {
        (rel as any).points = layoutRel.points;
        (rel as any).curvature = layoutRel.curvature;
      }
    });
  }

  private serializeToMermaid(diagram: ErDiagram): MermaidErSyntax {
    const result: any = {};

    if (diagram.title) {
      result.Titulo = diagram.title;
    }

    diagram.relationships.forEach((rel) => {
      const relationshipKey = `${rel.from} ${rel.cardinality} ${rel.to}`;
      if (rel.label) {
        result[relationshipKey] = rel.label;
      } else {
        result[relationshipKey] = "";
      }
    });

    return result;
  }
}

// Exemplo de uso
export { AdvancedErLayoutEngine };
export type { LayoutConfig };