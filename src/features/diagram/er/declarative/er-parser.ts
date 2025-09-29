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

export class MermaidErParser implements ErDeclarativeParser {
  private layoutConfig: ErLayoutConfig = {
    entityWidth: 150,
    entityHeight: 100,
    horizontalSpacing: 300,
    verticalSpacing: 220,
    startX: 200,
    startY: 150,
  };

  parse(input: string): ErDiagram {
    try {
      const format = this.detectFormat(input);
      const parsedData =
        format === "json" ? this.parseJSON(input) : this.parseYAML(input);

      return this.parseMermaidErSyntax(parsedData);
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
    return "1.0-mermaid-er";
  }

  private detectFormat(input: string): "json" | "yaml" {
    const trimmed = input.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      return "json";
    }
    return "yaml";
  }

  private parseJSON(input: string): any {
    return JSON.parse(input);
  }

  private parseYAML(input: string): any {
    return yaml.load(input);
  }

  private parseMermaidErSyntax(data: any): ErDiagram {
    if (typeof data.erDiagram === "string") {
      return this.parseErDiagramString(data.erDiagram, data.title);
    }

    if (data.erDiagram && typeof data.erDiagram === "object") {
      return this.parseErDiagramObject(data.erDiagram, data.title);
    }

    throw new Error('Formato inválido. Use "erDiagram" como chave principal.');
  }

  private parseErDiagramString(
    erDiagramContent: string,
    title?: string
  ): ErDiagram {
    const lines = erDiagramContent
      .trim()
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line);
    const relationships: ErRelationship[] = [];
    const entityNames = new Set<string>();

    for (const line of lines) {
      if (this.isRelationshipLine(line)) {
        const relationship = this.parseRelationshipLine(line);
        if (relationship) {
          relationships.push(relationship);
          entityNames.add(relationship.from);
          entityNames.add(relationship.to);
        }
      }
    }

    const entities: ErEntity[] = Array.from(entityNames).map((name) => ({
      name,
      attributes: [],
    }));

    this.applyAutoLayout(entities, relationships);

    return {
      title,
      entities,
      relationships,
    };
  }

  private parseErDiagramObject(erDiagramObj: any, title?: string): ErDiagram {
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

    this.applyAutoLayout(entities, relationships);

    return {
      title,
      entities,
      relationships,
    };
  }

  private isRelationshipLine(line: string): boolean {
    return /[\w-]+\s+[\|\}][|\w\-\.o\{\}]+\s+[\w-]+/.test(line);
  }

  private parseRelationshipLine(line: string): ErRelationship | null {
    const relationshipRegex =
      /([\w-]+)\s+([\|\}][|\w\-\.o\{\}]+)\s+([\w-]+)(?:\s*:\s*(.+))?/;
    const match = line.match(relationshipRegex);

    if (!match) return null;

    const [, from, cardinality, to, label] = match;

    if (!(cardinality in CROWSFOOT_CARDINALITIES)) {
      throw new Error(
        `Cardinalidade inválida: ${cardinality}. Use: ||--||, ||--o{, }o--||, }o--o{, etc.`
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

  // -------- Novo layout inteligente --------
  private applyAutoLayout(
    entities: ErEntity[],
    relationships: ErRelationship[]
  ): void {
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

    // Distribui horizontalmente cada nível
    Object.keys(levelMap)
      .map(Number)
      .sort((a, b) => a - b)
      .forEach((lvl) => {
        const rowEntities = levelMap[lvl];
        const spacingX = this.layoutConfig.horizontalSpacing;
        const startX = this.layoutConfig.startX;

        rowEntities.forEach((entity, index) => {
          entity.x = startX + index * spacingX;
          entity.y =
            this.layoutConfig.startY + lvl * this.layoutConfig.verticalSpacing;
        });
      });
  }

  private serializeToMermaid(diagram: ErDiagram): any {
    const result: any = {};

    if (diagram.title) result.title = diagram.title;

    let erDiagramString = "";

    if (diagram.relationships.length > 0) {
      for (const rel of diagram.relationships) {
        const label = rel.label ? ` : ${rel.label}` : "";
        erDiagramString += `    ${rel.from} ${rel.cardinality} ${rel.to}${label}\n`;
      }
    }

    if (diagram.entities.length > 0) {
      for (const entity of diagram.entities) {
        if (entity.attributes && entity.attributes.length > 0) {
          erDiagramString += `    ${entity.name} {\n`;
          for (const attr of entity.attributes) {
            let attrLine = `        ${attr.type || "string"} ${attr.name}`;
            if (attr.primaryKey) attrLine += " PK";
            if (attr.required) attrLine += " NN";
            erDiagramString += attrLine + "\n";
          }
          erDiagramString += "    }\n";
        }
      }
    }

    result.erDiagram = erDiagramString.trim();
    return result;
  }
}
