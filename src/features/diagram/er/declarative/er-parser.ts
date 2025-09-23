// Parser para sintaxe Mermaid ER compatível com Crow's Foot

import * as yaml from 'js-yaml';
import { 
  ErDiagram, 
  ErEntity, 
  ErRelationship, 
  ErAttribute,
  MermaidErSyntax,
  CardinalitySymbol,
  CROWSFOOT_CARDINALITIES,
  ErDeclarativeParser,
  ErLayoutConfig
} from './er-types';

export class MermaidErParser implements ErDeclarativeParser {
  private layoutConfig: ErLayoutConfig = {
    entityWidth: 150,
    entityHeight: 100,
    horizontalSpacing: 350, // Aumentar ainda mais espaçamento horizontal
    verticalSpacing: 250,   // Aumentar ainda mais espaçamento vertical
    startX: 200,            // Posição inicial mais à direita
    startY: 150             // Posição inicial um pouco mais baixa
  };

  parse(input: string): ErDiagram {
    try {
      const format = this.detectFormat(input);
      const parsedData = format === 'json' 
        ? this.parseJSON(input)
        : this.parseYAML(input);

      return this.parseMermaidErSyntax(parsedData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Erro ao analisar sintaxe ER: ${errorMessage}`);
    }
  }

  serialize(diagram: ErDiagram): string {
    const mermaidSyntax = this.serializeToMermaid(diagram);
    return yaml.dump(mermaidSyntax);
  }

  getVersion(): string {
    return "1.0-mermaid-er";
  }

  private detectFormat(input: string): 'json' | 'yaml' {
    const trimmed = input.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return 'json';
    }
    return 'yaml';
  }

  private parseJSON(input: string): any {
    return JSON.parse(input);
  }

  private parseYAML(input: string): any {
    return yaml.load(input);
  }

  private parseMermaidErSyntax(data: any): ErDiagram {
    // Suportar tanto formato completo quanto formato Mermaid direto
    if (typeof data.erDiagram === 'string') {
      return this.parseErDiagramString(data.erDiagram, data.title);
    }
    
    if (data.erDiagram && typeof data.erDiagram === 'object') {
      return this.parseErDiagramObject(data.erDiagram, data.title);
    }

    throw new Error('Formato inválido. Use "erDiagram" como chave principal.');
  }

  private parseErDiagramString(erDiagramContent: string, title?: string): ErDiagram {
    const lines = erDiagramContent.trim().split('\n').map(line => line.trim()).filter(line => line);
    
    console.log('🔍 Analisando linhas do erDiagram:');
    lines.forEach((line, index) => console.log(`  ${index}: "${line}"`));
    
    const relationships: ErRelationship[] = [];
    const entityNames = new Set<string>();

    // Processar apenas relacionamentos - entidades são extraídas automaticamente
    for (const line of lines) {
      console.log(`🔎 Verificando linha: "${line}"`);
      const isRel = this.isRelationshipLine(line);
      console.log(`   É relacionamento? ${isRel}`);
      
      if (isRel) {
        const relationship = this.parseRelationshipLine(line);
        console.log(`   Relacionamento parseado:`, relationship);
        if (relationship) {
          relationships.push(relationship);
          // Adicionar nomes das entidades automaticamente
          entityNames.add(relationship.from);
          entityNames.add(relationship.to);
        }
      }
    }

    // Criar entidades a partir dos nomes encontrados nos relacionamentos
    const entities: ErEntity[] = Array.from(entityNames).map(name => ({
      name,
      attributes: [] // Sem atributos no formato Mermaid puro
    }));

    // Aplicar posicionamento automático
    this.applyAutoLayout(entities, relationships);

    return {
      title,
      entities,
      relationships
    };
  }

  private parseErDiagramObject(erDiagramObj: any, title?: string): ErDiagram {
    const entities: ErEntity[] = [];
    const relationships: ErRelationship[] = [];

    // Parse entities
    if (erDiagramObj.entities) {
      for (const [entityName, entityData] of Object.entries(erDiagramObj.entities)) {
        const entity: ErEntity = {
          name: entityName,
          attributes: []
        };

        if (entityData && typeof entityData === 'object' && (entityData as any).attributes) {
          for (const [attrName, attrData] of Object.entries((entityData as any).attributes)) {
            const attribute: ErAttribute = {
              name: attrName,
              ...(typeof attrData === 'object' ? attrData : { type: String(attrData) })
            };
            entity.attributes!.push(attribute);
          }
        }

        entities.push(entity);
      }
    }

    // Parse relationships
    if (erDiagramObj.relationships && Array.isArray(erDiagramObj.relationships)) {
      for (const relationshipStr of erDiagramObj.relationships) {
        const relationship = this.parseRelationshipLine(relationshipStr);
        if (relationship) {
          relationships.push(relationship);
        }
      }
    }

    // Aplicar posicionamento automático
    this.applyAutoLayout(entities, relationships);

    return {
      title,
      entities,
      relationships
    };
  }

  private isRelationshipLine(line: string): boolean {
    // Regex para capturar relacionamentos Mermaid ER
    // Padrões suportados:
    // - CUSTOMER ||--o{ ORDER : places
    // - CUSTOMER }|..|{ DELIVERY-ADDRESS : has
    // - PRODUCT ||--|| ORDER-ITEM
    // - Suporta hífens em nomes de entidades
    return /[\w-]+\s+[\|\}][|\w\-\.o\{\}]+\s+[\w-]+/.test(line);
  }

  private isEntityDefinition(line: string): boolean {
    return /^\w+:\s*$/.test(line) || /^\w+\s*\{\s*$/.test(line);
  }

  private isAttributeLine(line: string): boolean {
    return /^\s*\w+/.test(line) && !this.isRelationshipLine(line) && !this.isEntityDefinition(line);
  }

  private parseRelationshipLine(line: string): ErRelationship | null {
    // Regex para capturar relacionamentos Mermaid: ENTITY1 ||--o{ ENTITY2 : label
    // Suporta nomes com hífens como DELIVERY-ADDRESS, ORDER-ITEM
    const relationshipRegex = /([\w-]+)\s+([\|\}][|\w\-\.o\{\}]+)\s+([\w-]+)(?:\s*:\s*(.+))?/;
    const match = line.match(relationshipRegex);

    if (!match) {
      return null;
    }

    const [, from, cardinality, to, label] = match;
    
    // Validar cardinalidade
    if (!(cardinality in CROWSFOOT_CARDINALITIES)) {
      console.error(`❌ Cardinalidade inválida: ${cardinality}. Cardinalidades disponíveis:`, Object.keys(CROWSFOOT_CARDINALITIES));
      throw new Error(`Cardinalidade inválida: ${cardinality}. Use: ||--||, ||--o{, }o--||, }o--o{, etc.`);
    }

    return {
      from: from.trim(),
      to: to.trim(),
      cardinality: cardinality as CardinalitySymbol,
      label: label?.trim(),
      isIdentifying: !cardinality.includes('.') // Linha sólida = identificante
    };
  }

  private parseEntityDefinition(line: string): ErEntity {
    const entityName = line.replace(/[:\{]/g, '').trim();
    return {
      name: entityName,
      attributes: []
    };
  }

  private parseAttributeLine(line: string): ErAttribute | null {
    // Suportar vários formatos de atributos:
    // - name type PK    
    // - name: {type: "string", primaryKey: true}
    
    const cleanLine = line.trim();
    
    // Formato simples: name type [PK|...]
    const simpleFormat = /^(\w+)\s+(\w+)(?:\s+(PK|UK|NN))*/.exec(cleanLine);
    if (simpleFormat) {
      const [, name, type, ...modifiers] = simpleFormat;
      
      return {
        name,
        type,
        primaryKey: modifiers.includes('PK'),        
        required: modifiers.includes('NN')
      };
    }

    // Formato apenas nome (tipo será inferido)
    const nameOnly = /^(\w+)$/.exec(cleanLine);
    if (nameOnly) {
      return {
        name: nameOnly[1],
        type: 'string'
      };
    }

    return null;
  }

  private applyAutoLayout(entities: ErEntity[], relationships: ErRelationship[] = []): void {
    if (entities.length === 0) return;

    // Para diagramas pequenos, use um layout mais inteligente baseado em relacionamentos
    if (entities.length <= 8) {
      this.applyRelationshipBasedLayout(entities, relationships);
    } else {
      // Para diagramas maiores, use o layout de grade otimizado
      this.applyOptimizedGridLayout(entities);
    }
  }

  private applyRelationshipBasedLayout(entities: ErEntity[], relationships: ErRelationship[]): void {
    // Crie um mapa de conectividade para entender as conexões
    const connectionMap = new Map<string, string[]>();
    
    // Inicializar mapa
    entities.forEach(entity => {
      connectionMap.set(entity.name, []);
    });

    // Preencher conexões
    relationships.forEach(rel => {
      connectionMap.get(rel.from)?.push(rel.to);
      connectionMap.get(rel.to)?.push(rel.from);
    });

    // Layout estilo Mermaid: hierárquico com entidade central
    this.applyMermaidStyleLayout(entities, connectionMap, relationships);
  }

  private applyMermaidStyleLayout(entities: ErEntity[], connectionMap: Map<string, string[]>, relationships: ErRelationship[]): void {
    // Encontrar entidade com mais conexões (centro da estrela)
    let centralEntity = entities[0];
    let maxConnections = 0;
    
    entities.forEach(entity => {
      const connections = connectionMap.get(entity.name)?.length || 0;
      if (connections > maxConnections) {
        maxConnections = connections;
        centralEntity = entity;
      }
    });

    // Se não há entidade claramente central, usar a primeira mencionada nos relacionamentos
    if (maxConnections <= 1 && relationships.length > 0) {
      const firstEntity = entities.find(e => e.name === relationships[0].from);
      if (firstEntity) centralEntity = firstEntity;
    }

    // Posição central do canvas
    const centerX = this.layoutConfig.startX + this.layoutConfig.horizontalSpacing * 2;
    const centerY = this.layoutConfig.startY + this.layoutConfig.verticalSpacing * 1.5;

    // Posicionar entidade central
    centralEntity.x = centerX;
    centralEntity.y = centerY;

    // Entidades conectadas à central
    const connectedEntities = connectionMap.get(centralEntity.name) || [];
    const otherEntities = entities.filter(e => e !== centralEntity);

    if (otherEntities.length === 0) return;

    // Layout hierárquico inspirado no Mermaid
    this.arrangeInHierarchicalPattern(centralEntity, otherEntities, connectedEntities, centerX, centerY, relationships);
  }

  private arrangeInHierarchicalPattern(
    centralEntity: ErEntity, 
    otherEntities: ErEntity[], 
    connectedEntities: string[],
    centerX: number, 
    centerY: number,
    relationships: ErRelationship[]
  ): void {
    // Separar entidades por nível hierárquico
    const directlyConnected = otherEntities.filter(e => connectedEntities.includes(e.name));
    const secondaryEntities = otherEntities.filter(e => !connectedEntities.includes(e.name));

    // 1. Posicionar entidades diretamente conectadas ao centro evitando sobreposições
    this.positionPrimaryEntitiesWithoutOverlaps(directlyConnected, centerX, centerY, centralEntity);

    // 2. Posicionar entidades secundárias conectadas às primárias
    this.positionSecondaryEntitiesWithoutOverlaps(secondaryEntities, directlyConnected, relationships, centerX, centerY, [...directlyConnected, centralEntity]);

    // 3. Otimização final para evitar sobreposição de conexões com elementos
    this.optimizeToAvoidConnectionOverlaps(otherEntities.concat([centralEntity]), relationships);
  }

  private findBridgeEntities(entities: ErEntity[], relationships: ErRelationship[]): Set<string> {
    const bridges = new Set<string>();
    
    entities.forEach(entity => {
      const relatedToThis = relationships.filter(r => r.from === entity.name || r.to === entity.name);
      const uniqueConnections = new Set<string>();
      
      relatedToThis.forEach(rel => {
        if (rel.from === entity.name) uniqueConnections.add(rel.to);
        if (rel.to === entity.name) uniqueConnections.add(rel.from);
      });
      
      // Se conecta a 3+ entidades diferentes, é uma bridge
      if (uniqueConnections.size >= 3) {
        bridges.add(entity.name);
      }
    });
    
    return bridges;
  }

  private positionPrimaryEntitiesWithoutOverlaps(entities: ErEntity[], centerX: number, centerY: number, centralEntity: ErEntity): void {
    if (entities.length === 0) return;

    // Usar posicionamento estratégico para evitar que conexões passem sobre outros elementos
    const positions = this.calculateStrategicPositions(entities.length, centerX, centerY);
    
    // Ordenar entidades por importância (número de conexões) para dar prioridade às melhores posições
    const sortedEntities = [...entities].sort((a, b) => {
      const aConnections = this.countEntityConnections(a.name);
      const bConnections = this.countEntityConnections(b.name);
      return bConnections - aConnections;
    });

    sortedEntities.forEach((entity, index) => {
      entity.x = positions[index].x;
      entity.y = positions[index].y;
    });
  }

  private calculateStrategicPositions(count: number, centerX: number, centerY: number): Array<{x: number, y: number}> {
    const positions: Array<{x: number, y: number}> = [];
    const baseRadius = this.layoutConfig.horizontalSpacing * 1.4; // Aumentar raio para mais espaço

    if (count === 1) {
      positions.push({ x: centerX, y: centerY - baseRadius });
    } else if (count === 2) {
      positions.push({ x: centerX - baseRadius * 0.8, y: centerY });
      positions.push({ x: centerX + baseRadius * 0.8, y: centerY });
    } else if (count === 3) {
      // Triângulo: topo, inferior-esquerda, inferior-direita
      positions.push({ x: centerX, y: centerY - baseRadius });
      positions.push({ x: centerX - baseRadius * 0.8, y: centerY + baseRadius * 0.6 });
      positions.push({ x: centerX + baseRadius * 0.8, y: centerY + baseRadius * 0.6 });
    } else {
      // Padrão em cruz para 4+ elementos, evitando linhas diagonais que atravessam o centro
      const cardinalPositions = [
        { x: centerX, y: centerY - baseRadius },           // Norte
        { x: centerX + baseRadius, y: centerY },            // Leste  
        { x: centerX, y: centerY + baseRadius },           // Sul
        { x: centerX - baseRadius, y: centerY }            // Oeste
      ];

      // Para mais de 4, adicionar posições intermediárias
      if (count > 4) {
        cardinalPositions.push(
          { x: centerX + baseRadius * 0.7, y: centerY - baseRadius * 0.7 }, // NE
          { x: centerX + baseRadius * 0.7, y: centerY + baseRadius * 0.7 }, // SE
          { x: centerX - baseRadius * 0.7, y: centerY + baseRadius * 0.7 }, // SW
          { x: centerX - baseRadius * 0.7, y: centerY - baseRadius * 0.7 }  // NW
        );
      }

      positions.push(...cardinalPositions.slice(0, count));
    }

    return positions;
  }

  private countEntityConnections(entityName: string): number {
    // Implementação simples - em um cenário real, isso seria passado como parâmetro
    return 1;
  }

  private positionSecondaryEntitiesWithoutOverlaps(
    secondaryEntities: ErEntity[], 
    primaryEntities: ErEntity[], 
    relationships: ErRelationship[],
    centerX: number, 
    centerY: number,
    existingEntities: ErEntity[]
  ): void {
    secondaryEntities.forEach(secondary => {
      const relatedPrimary = this.findRelatedPrimary(secondary, primaryEntities, relationships);
      
      if (relatedPrimary) {
        // Posicionar em uma das posições cardinais ao redor da entidade relacionada
        const candidatePositions = this.generateCandidatePositions(relatedPrimary, centerX, centerY);
        const bestPosition = this.findBestPositionAvoidingOverlaps(candidatePositions, existingEntities, relationships);
        
        secondary.x = bestPosition.x;
        secondary.y = bestPosition.y;
        existingEntities.push(secondary); // Adicionar à lista para próximas verificações
      } else {
        // Posicionar em área livre longe do centro
        const freePosition = this.findFreePosition(centerX, centerY, existingEntities);
        secondary.x = freePosition.x;
        secondary.y = freePosition.y;
        existingEntities.push(secondary);
      }
    });
  }

  private generateCandidatePositions(relatedEntity: ErEntity, centerX: number, centerY: number): Array<{x: number, y: number}> {
    const distance = this.layoutConfig.horizontalSpacing * 0.9;
    const entityX = relatedEntity.x || centerX;
    const entityY = relatedEntity.y || centerY;

    return [
      { x: entityX, y: entityY - distance },           // Norte
      { x: entityX + distance, y: entityY },           // Leste
      { x: entityX, y: entityY + distance },          // Sul
      { x: entityX - distance, y: entityY },          // Oeste
      { x: entityX + distance*0.7, y: entityY - distance*0.7 }, // NE
      { x: entityX + distance*0.7, y: entityY + distance*0.7 }, // SE
      { x: entityX - distance*0.7, y: entityY + distance*0.7 }, // SW
      { x: entityX - distance*0.7, y: entityY - distance*0.7 }  // NW
    ];
  }

  private findBestPositionAvoidingOverlaps(
    candidates: Array<{x: number, y: number}>, 
    existingEntities: ErEntity[], 
    relationships: ErRelationship[]
  ): {x: number, y: number} {
    // Pontuar cada posição baseado na distância de outros elementos e potenciais sobreposições
    let bestPosition = candidates[0];
    let bestScore = -Infinity;

    for (const position of candidates) {
      let score = 0;

      // Penalizar proximidade com outras entidades
      for (const entity of existingEntities) {
        const distance = Math.sqrt(
          Math.pow(position.x - (entity.x || 0), 2) + 
          Math.pow(position.y - (entity.y || 0), 2)
        );
        score += distance; // Maior distância = melhor score
      }

      // Bonificar posições que não criam potenciais sobreposições de linhas
      score += this.scoreForLineOverlapAvoidance(position, existingEntities, relationships);

      if (score > bestScore) {
        bestScore = score;
        bestPosition = position;
      }
    }

    return bestPosition;
  }

  private scoreForLineOverlapAvoidance(
    position: {x: number, y: number}, 
    entities: ErEntity[], 
    relationships: ErRelationship[]
  ): number {
    // Implementação simplificada: bonificar posições que não estão no caminho direto entre outras entidades conectadas
    let score = 0;
    const buffer = 50; // Buffer zone ao redor de linhas

    for (const rel of relationships) {
      const fromEntity = entities.find(e => e.name === rel.from);
      const toEntity = entities.find(e => e.name === rel.to);
      
      if (fromEntity && toEntity && fromEntity.x != null && fromEntity.y != null && toEntity.x != null && toEntity.y != null) {
        const distanceFromLine = this.distanceFromLineSegment(
          position, 
          { x: fromEntity.x, y: fromEntity.y }, 
          { x: toEntity.x, y: toEntity.y }
        );
        
        if (distanceFromLine < buffer) {
          score -= 100; // Penalizar posições que estão muito próximas de linhas existentes
        }
      }
    }

    return score;
  }

  private distanceFromLineSegment(
    point: {x: number, y: number}, 
    lineStart: {x: number, y: number}, 
    lineEnd: {x: number, y: number}
  ): number {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) return Math.sqrt(A * A + B * B);

    const param = dot / lenSq;
    let xx, yy;

    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private findFreePosition(centerX: number, centerY: number, existingEntities: ErEntity[]): {x: number, y: number} {
    const attempts = 20;
    const minDistance = this.layoutConfig.horizontalSpacing * 0.8;
    
    for (let i = 0; i < attempts; i++) {
      const angle = (Math.PI * 2 * i) / attempts;
      const distance = this.layoutConfig.horizontalSpacing * (2 + Math.random());
      
      const candidate = {
        x: centerX + distance * Math.cos(angle),
        y: centerY + distance * Math.sin(angle)
      };

      // Verificar se está suficientemente longe de outras entidades
      const tooClose = existingEntities.some(entity => {
        const dist = Math.sqrt(
          Math.pow(candidate.x - (entity.x || 0), 2) + 
          Math.pow(candidate.y - (entity.y || 0), 2)
        );
        return dist < minDistance;
      });

      if (!tooClose) {
        return candidate;
      }
    }

    // Fallback: posição aleatória distante
    const fallbackAngle = Math.random() * Math.PI * 2;
    return {
      x: centerX + this.layoutConfig.horizontalSpacing * 3 * Math.cos(fallbackAngle),
      y: centerY + this.layoutConfig.horizontalSpacing * 3 * Math.sin(fallbackAngle)
    };
  }

  private findRelatedPrimary(secondary: ErEntity, primaryEntities: ErEntity[], relationships: ErRelationship[]): ErEntity | null {
    for (const relationship of relationships) {
      if (relationship.from === secondary.name) {
        return primaryEntities.find(p => p.name === relationship.to) || null;
      }
      if (relationship.to === secondary.name) {
        return primaryEntities.find(p => p.name === relationship.from) || null;
      }
    }
    return null;
  }

  private optimizeToAvoidConnectionOverlaps(entities: ErEntity[], relationships: ErRelationship[]): void {
    // Otimização final: fazer pequenos ajustes para evitar que conexões passem sobre elementos
    for (const entity of entities) {
      if (!entity.x || !entity.y) continue;

      // Verificar se esta entidade está no caminho de alguma conexão
      for (const rel of relationships) {
        if (rel.from === entity.name || rel.to === entity.name) continue; // Pular conexões próprias

        const fromEntity = entities.find(e => e.name === rel.from);
        const toEntity = entities.find(e => e.name === rel.to);
        
        if (!fromEntity?.x || !fromEntity?.y || !toEntity?.x || !toEntity?.y) continue;

        const distanceFromLine = this.distanceFromLineSegment(
          { x: entity.x, y: entity.y },
          { x: fromEntity.x, y: fromEntity.y },
          { x: toEntity.x, y: toEntity.y }
        );

        // Se a entidade está muito próxima de uma linha, movê-la ligeiramente
        if (distanceFromLine < 60) { // Buffer de 60px
          const lineAngle = Math.atan2(toEntity.y - fromEntity.y, toEntity.x - fromEntity.x);
          const perpAngle = lineAngle + Math.PI / 2;
          const moveDistance = 70 - distanceFromLine;

          // Mover na direção perpendicular à linha
          entity.x += moveDistance * Math.cos(perpAngle);
          entity.y += moveDistance * Math.sin(perpAngle);
        }
      }
    }
  }


  private applyOptimizedGridLayout(entities: ErEntity[]): void {
    // Para diagramas maiores, use uma grade mais espaçada
    const entitiesPerRow = Math.min(4, Math.ceil(Math.sqrt(entities.length)));
    
    entities.forEach((entity, index) => {
      const row = Math.floor(index / entitiesPerRow);
      const col = index % entitiesPerRow;
      
      entity.x = this.layoutConfig.startX + (col * this.layoutConfig.horizontalSpacing);
      entity.y = this.layoutConfig.startY + (row * this.layoutConfig.verticalSpacing);
    });
  }

  private serializeToMermaid(diagram: ErDiagram): any {
    const result: any = {};
    
    if (diagram.title) {
      result.title = diagram.title;
    }

    let erDiagramString = '';

    // Serializar relacionamentos
    if (diagram.relationships.length > 0) {
      for (const rel of diagram.relationships) {
        const label = rel.label ? ` : ${rel.label}` : '';
        erDiagramString += `    ${rel.from} ${rel.cardinality} ${rel.to}${label}\n`;
      }
    }

    // Serializar entidades com atributos
    if (diagram.entities.length > 0) {
      for (const entity of diagram.entities) {
        if (entity.attributes && entity.attributes.length > 0) {
          erDiagramString += `    ${entity.name} {\n`;
          for (const attr of entity.attributes) {
            let attrLine = `        ${attr.type || 'string'} ${attr.name}`;
            if (attr.primaryKey) attrLine += ' PK';            
            if (attr.required) attrLine += ' NN';
            erDiagramString += attrLine + '\n';
          }
          erDiagramString += '    }\n';
        }
      }
    }

    result.erDiagram = erDiagramString.trim();
    
    return result;
  }
}