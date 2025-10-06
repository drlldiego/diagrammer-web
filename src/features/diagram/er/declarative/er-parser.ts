// Parser para sintaxe Mermaid ER compatível com Crow's Foot

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
  ErLayoutConfig,
} from "./er-types";
import { 
  ElkLayoutService,
  CollisionResolverService,
  EdgeRouterService,
  LayoutStabilityService,
  LayoutMetricsService,
  createCollisionResolverService,
  createEdgeRouterService,
  createLayoutStabilityService,
  createLayoutMetricsService,
  type Node,
  type Edge,
  type LayoutMetrics
} from "../../shared/services";

export class MermaidErParser implements ErDeclarativeParser {
  private layoutConfig: ErLayoutConfig = {
    entityWidth: 120,
    entityHeight: 80,
    horizontalSpacing: 300,
    verticalSpacing: 250,
    startX: 200,
    startY: 150,
  };

  private elkLayoutService: ElkLayoutService;
  private collisionResolver: CollisionResolverService;
  private edgeRouter: EdgeRouterService;
  private stabilityService: LayoutStabilityService;
  private metricsService: LayoutMetricsService;

  constructor() {
    this.elkLayoutService = new ElkLayoutService();
    this.collisionResolver = createCollisionResolverService();
    this.edgeRouter = createEdgeRouterService();
    this.stabilityService = createLayoutStabilityService();
    this.metricsService = createLayoutMetricsService();
  }

  async parse(input: string): Promise<ErDiagram> {
    console.log('🎬 [ER Parser Debug] Starting parse method (YAML only)');
    try {
      const parsedData = this.parseYAML(input);

      console.log('🔧 [ER Parser Debug] About to call parseMermaidErSyntax');
      const result = await this.parseMermaidErSyntax(parsedData);
      console.log('✅ [ER Parser Debug] Parse completed, entities:', result.entities.length);
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
    return "1.0-mermaid-er-yaml";
  }

  private parseYAML(input: string): any {
    return yaml.load(input);
  }

  private async parseMermaidErSyntax(data: any): Promise<ErDiagram> {
    if (typeof data.erDiagram === "string") {
      return await this.parseErDiagramString(data.erDiagram, data.title);
    }

    if (data.erDiagram && typeof data.erDiagram === "object") {
      return await this.parseErDiagramObject(data.erDiagram, data.title);
    }

    throw new Error('Formato inválido. Use "erDiagram" como chave principal.');
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
          // Enhanced error with line information
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

    await this.applyAutoLayout(entities, relationships);

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

    await this.applyAutoLayout(entities, relationships);

    return {
      title,
      entities,
      relationships,
    };
  }

  private isRelationshipLine(line: string): boolean {
    // Aceita apenas símbolos tradicionais de cardinalidade
    const symbolPattern = /[\w-]+\s+[\|\}][|\w\-\.o\{\}]+\s+[\w-]+/;
    return symbolPattern.test(line);
  }

  private parseRelationshipLine(line: string): ErRelationship | null {
    // Parser apenas símbolos tradicionais de cardinalidade
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

  // -------- Novo layout inteligente anti-sobreposição --------
  private async applyAutoLayout(
    entities: ErEntity[],
    relationships: ErRelationship[]
  ): Promise<void> {
    if (entities.length === 0) return;

    const entityMap: Record<string, ErEntity> = {};
    entities.forEach((e) => (entityMap[e.name] = e));

    const connectionCounts: Record<string, number> = {};
    relationships.forEach((rel) => {
      connectionCounts[rel.from] = (connectionCounts[rel.from] || 0) + 1;
      connectionCounts[rel.to] = (connectionCounts[rel.to] || 0) + 1;
    });

    // Inicializa níveis e visitados
    const levels: Record<string, number> = {};
    const visited: Set<string> = new Set();
    const queue: Array<{ name: string; level: number }> = [];

    // Começa pelos hubs
    const hubs = [...entities].sort(
      (a, b) =>
        (connectionCounts[b.name] || 0) - (connectionCounts[a.name] || 0)
    );
    if (hubs.length === 0) return;

    queue.push({ name: hubs[0].name, level: 0 });
    levels[hubs[0].name] = 0;
    visited.add(hubs[0].name);

    while (queue.length > 0) {
      const { name, level } = queue.shift()!;
      const neighbors = relationships
        .filter((r) => r.from === name || r.to === name)
        .map((r) => (r.from === name ? r.to : r.from));

      neighbors.forEach((neigh) => {
        if (!visited.has(neigh)) {
          levels[neigh] = level + 1;
          queue.push({ name: neigh, level: level + 1 });
          visited.add(neigh);
        }
      });
    }

    // Para entidades que não estão conectadas a hubs, coloca no nível 0
    entities.forEach((e) => {
      if (levels[e.name] == null) levels[e.name] = 0;
    });

    // Agrupa entidades por nível
    const levelMap: Record<number, ErEntity[]> = {};
    entities.forEach((e) => {
      const lvl = levels[e.name]!;
      if (!levelMap[lvl]) levelMap[lvl] = [];
      levelMap[lvl].push(e);
    });

    // Aplicar posicionamento híbrido (ELK + fallback circular)
    console.log('🚀 [ER Parser Debug] About to apply hybrid positioning');
    console.log('📊 Level map keys:', Object.keys(levelMap));
    console.log('🔗 Relationships:', relationships.length);
    await this.applyHybridPositioning(levelMap, relationships, entities);
  }

  /**
   * Sistema híbrido: tenta ELK primeiro, fallback para algoritmo circular
   */
  private async applyHybridPositioning(
    levelMap: Record<number, ErEntity[]>,
    relationships: ErRelationship[],
    allEntities: ErEntity[]
  ): Promise<void> {
    console.log('🔄 [Hybrid Positioning] Starting hybrid layout system');

    // PIPELINE HÍBRIDO: ELK + Pós-processamento determinístico
    console.log(`🚀 [Hybrid Pipeline] Starting hybrid layout pipeline`);
    
    // Gerar ID único do diagrama para tracking
    const diagramId = this.generateDiagramId(allEntities, relationships);
    
    // Executar pipeline híbrido completo
    await this.executeHybridLayoutPipeline(diagramId, allEntities, relationships);
  }
  
  /**
   * Executa o pipeline híbrido completo ELK + pós-processamento
   */
  private async executeHybridLayoutPipeline(
    diagramId: string,
    allEntities: ErEntity[],
    relationships: ErRelationship[]
  ): Promise<void> {
    console.log(`🎯 [Hybrid Pipeline] Executing complete hybrid layout pipeline for ${diagramId}`);
    
    // Iniciar medição de tempo total
    this.metricsService.startTimer('total');
    
    // 1. PRE-ELK: Normalização e snapshot inicial
    this.metricsService.startTimer('normalization');
    this.metricsService.createDebugSnapshot(diagramId, 'pre-elk', this.convertToNodes(allEntities), 'Before ELK layout');
    this.normalizeBBoxes(allEntities);
    const timeNormalization = this.metricsService.stopTimer('normalization');
    
    // 2. ELK LAYOUT: Layout global inteligente (TEMPORARIAMENTE DESABILITADO)
    this.metricsService.startTimer('elk');
    // const elkSuccess = await this.executeElkLayout(allEntities, relationships);
    const elkSuccess = false; // Force fallback to simple layout
    
    // Apply simple grid layout since ELK is disabled
    console.log('📊 [Layout] Using simple grid layout algorithm');
    this.applyFallbackPositioning(allEntities);
    
    const timeELK = this.metricsService.stopTimer('elk');
    
    this.metricsService.createDebugSnapshot(diagramId, 'post-elk', this.convertToNodes(allEntities), 
      elkSuccess ? 'After ELK layout' : 'Using simple layout algorithm');
    
    // 3. POST-ELK: Resolução de colisões
    this.metricsService.startTimer('collision');
    const nodes = this.convertToNodes(allEntities);
    const collisionMetrics = this.collisionResolver.resolveCollisions(nodes, 50, 16);
    this.applyNodesBackToEntities(nodes, allEntities);
    const timeCollision = this.metricsService.stopTimer('collision');
    
    this.metricsService.createDebugSnapshot(diagramId, 'post-collision', nodes, 
      `Resolved ${collisionMetrics.resolvedCollisions} collisions`);
    
    // 4. EDGE ROUTING: Roteamento inteligente de conexões
    this.metricsService.startTimer('routing');
    const edges = this.convertToEdges(relationships, allEntities);
    const canvasBounds = this.calculateCanvasBounds(allEntities);
    const routingMetrics = this.edgeRouter.routeEdges(edges, nodes, canvasBounds);
    const timeRouting = this.metricsService.stopTimer('routing');
    
    // Waypoints serão aplicados pelo ErDiagramGenerator após este pipeline
    console.log('🔄 [Pipeline] Waypoints calculation completed, ready for visual application');
    
    this.metricsService.createDebugSnapshot(diagramId, 'post-routing', nodes, 
      `Rerouted ${routingMetrics.reroutedEdges} edges`);
    
    // 5. STABILITY: Smoothing e preservação do mental map
    this.metricsService.startTimer('stability');
    const stabilityMetrics = this.stabilityService.applySmoothTransition(diagramId, nodes, 'interactive');
    this.applyNodesBackToEntities(nodes, allEntities);
    const timeStability = this.metricsService.stopTimer('stability');
    
    // Salvar snapshot para próxima execução
    const diagramHash = this.stabilityService.createDiagramHash(nodes, edges.map(e => ({
      source: e.source.id,
      target: e.target.id
    })));
    
    this.stabilityService.savePositionSnapshot(diagramId, nodes, {
      diagramHash,
      nodeCount: allEntities.length,
      edgeCount: relationships.length
    });
    
    this.metricsService.createDebugSnapshot(diagramId, 'final', nodes, 
      `Final positions with stability index: ${stabilityMetrics.stabilityIndex.toFixed(3)}`);
    
    // 6. MÉTRICAS FINAIS: Coleta e análise
    const timeTotal = this.metricsService.stopTimer('total');
    const qualityMetrics = this.metricsService.calculateQualityMetrics(nodes, edges);
    
    const finalMetrics: LayoutMetrics = {
      timeTotal,
      timeELK,
      timeCollisionResolver: timeCollision,
      timeEdgeRouter: timeRouting,
      timeStability,
      overlapArea: qualityMetrics.overlapArea,
      numCrossings: qualityMetrics.numCrossings,
      meanEdgeLength: qualityMetrics.meanEdgeLength,
      maxNodeDisplacement: stabilityMetrics.maxDisplacement,
      stabilityIndex: stabilityMetrics.stabilityIndex,
      totalNodes: allEntities.length,
      totalEdges: relationships.length,
      nodesRepositioned: collisionMetrics.resolvedCollisions,
      edgesRerouted: routingMetrics.reroutedEdges,
      collision: collisionMetrics,
      routing: routingMetrics,
      stability: stabilityMetrics,
      timestamp: Date.now(),
      diagramId,
      elkAlgorithm: elkSuccess ? 'layered' : 'fallback',
      success: true
    };
    
    this.metricsService.recordLayoutMetrics(finalMetrics);
    
    console.log(`✅ [Hybrid Pipeline] Pipeline completed successfully in ${timeTotal.toFixed(1)}ms`);
  }
  
  /**
   * Executa layout ELK com configurações determinísticas
   */
  private async executeElkLayout(entities: ErEntity[], relationships: ErRelationship[]): Promise<boolean> {
    const isElkSuitable = this.elkLayoutService.isElkSuitable(entities, relationships);
    console.log(`🔍 [ELK Execution] ELK suitable: ${isElkSuitable}`);

    if (isElkSuitable) {
      try {
        // Tentar layout ELK
        console.log('🚀 [Hybrid Positioning] Attempting ELK layout');
        const elkResult = await this.elkLayoutService.applyLayout(entities, relationships, {
          algorithm: this.elkLayoutService.suggestBestAlgorithm(entities, relationships),
          direction: 'DOWN',
          nodeSpacing: 160,
          layerSpacing: 240,
          padding: 80
        });

        if (elkResult.success && elkResult.nodes.size > 0) {
          // Aplicar posições do ELK
          console.log('✅ [ELK Execution] ELK layout successful, applying positions');
          
          entities.forEach(entity => {
            const position = elkResult.nodes.get(entity.name);
            if (position) {
              entity.x = position.x;
              entity.y = position.y;
              console.log(`📍 [ELK] Entity "${entity.name}" positioned at (${entity.x}, ${entity.y})`);
            }
          });

          console.log('🎯 [ELK Execution] ELK layout completed successfully');
          return true;
        } else {
          console.warn('⚠️ [ELK Execution] ELK layout failed, using fallback');
          this.applyFallbackPositioning(entities);
          return false;
        }
      } catch (error) {
        console.error('❌ [ELK Execution] ELK layout error:', error);
        console.log('🔄 [ELK Execution] Falling back to simple layout');
        this.applyFallbackPositioning(entities);
        return false;
      }
    } else {
      console.log('📊 [ELK Execution] Using fallback layout (ELK not suitable)');
      this.applyFallbackPositioning(entities);
      return false;
    }
  }

  /**
   * Aplica posicionamento de fallback simples
   */
  private applyFallbackPositioning(entities: ErEntity[]): void {
    const cols = Math.ceil(Math.sqrt(entities.length * 1.2));
    const cellWidth = 200;
    const cellHeight = 150;
    const startX = 300;
    const startY = 200;

    entities.forEach((entity, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      
      entity.x = startX + (col * cellWidth);
      entity.y = startY + (row * cellHeight);
    });
  }

  /**
   * Gera ID único para o diagrama baseado na estrutura
   */
  private generateDiagramId(entities: ErEntity[], relationships: ErRelationship[]): string {
    const entityIds = entities.map(e => e.name).sort().join(',');
    const relationshipIds = relationships.map(r => `${r.from}-${r.to}`).sort().join(',');
    
    const combined = `${entityIds}|${relationshipIds}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return `diagram_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Converte entidades ER para formato Node
   */
  private convertToNodes(entities: ErEntity[]): Node[] {
    return entities.map(entity => ({
      id: entity.name,
      x: entity.x || 0,
      y: entity.y || 0,
      width: this.layoutConfig.entityWidth,
      height: this.layoutConfig.entityHeight,
      weight: 1,
      fixed: false
    }));
  }

  /**
   * Converte relacionamentos para formato Edge
   */
  private convertToEdges(relationships: ErRelationship[], entities: ErEntity[]): Edge[] {
    return relationships.map((rel, index) => {
      const sourceEntity = entities.find(e => e.name === rel.from);
      const targetEntity = entities.find(e => e.name === rel.to);
      
      if (!sourceEntity || !targetEntity) {
        throw new Error(`Entity not found for relationship: ${rel.from} -> ${rel.to}`);
      }

      return {
        id: `edge_${index}_${rel.from}_${rel.to}`,
        source: {
          id: sourceEntity.name,
          x: sourceEntity.x || 0,
          y: sourceEntity.y || 0,
          width: this.layoutConfig.entityWidth,
          height: this.layoutConfig.entityHeight
        },
        target: {
          id: targetEntity.name,
          x: targetEntity.x || 0,
          y: targetEntity.y || 0,
          width: this.layoutConfig.entityWidth,
          height: this.layoutConfig.entityHeight
        },
        type: 'straight'
      };
    });
  }

  /**
   * Aplica posições dos Nodes de volta para as entidades
   */
  private applyNodesBackToEntities(nodes: Node[], entities: ErEntity[]): void {
    nodes.forEach(node => {
      const entity = entities.find(e => e.name === node.id);
      if (entity) {
        entity.x = Math.round(node.x);
        entity.y = Math.round(node.y);
      }
    });
  }

  /**
   * Calcula bounds do canvas baseado nas entidades
   */
  private calculateCanvasBounds(entities: ErEntity[]): { x: number; y: number; width: number; height: number } {
    if (entities.length === 0) {
      return { x: 0, y: 0, width: 1000, height: 800 };
    }

    const margin = 100;
    const entityWidth = this.layoutConfig.entityWidth;
    const entityHeight = this.layoutConfig.entityHeight;

    const xs = entities.map(e => (e.x || 0) - entityWidth / 2);
    const ys = entities.map(e => (e.y || 0) - entityHeight / 2);
    
    const minX = Math.min(...xs) - margin;
    const minY = Math.min(...ys) - margin;
    const maxX = Math.max(...xs.map((x, i) => x + entityWidth)) + margin;
    const maxY = Math.max(...ys.map((y, i) => y + entityHeight)) + margin;

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  /**
   * Normaliza bounding boxes dos elementos
   */
  private normalizeBBoxes(entities: ErEntity[]): void {
    entities.forEach(entity => {
      // Garantir que dimensões estão definidas
      if (!entity.x) entity.x = 0;
      if (!entity.y) entity.y = 0;
      
      // Normalizar posições para números inteiros
      entity.x = Math.round(entity.x);
      entity.y = Math.round(entity.y);
    });
  }

  // Métodos de serialização (já existentes)
  private serializeToMermaid(diagram: ErDiagram): MermaidErSyntax {
    const result: any = {};

    if (diagram.title) {
      result.title = diagram.title;
    }

    let erDiagramString = "";

    diagram.relationships.forEach((rel) => {
      if (rel.label) {
        erDiagramString += `  ${rel.from} ${rel.cardinality} ${rel.to} : ${rel.label}\n`;
      } else {
        erDiagramString += `  ${rel.from} ${rel.cardinality} ${rel.to}\n`;
      }
    });

    result.erDiagram = erDiagramString.trim();
    return result;
  }

  /**
   * Aplicar waypoints calculados pelo Edge Router às conexões visuais
   */
}