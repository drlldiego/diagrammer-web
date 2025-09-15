// Algoritmo avançado de posicionamento baseado em análise de grafo
// Suporta layouts complexos com múltiplos caminhos, loops e ramificações

import { FlowDiagram, FlowElement, FlowConnection } from './types';

interface LayoutConfig {
  startX: number;
  startY: number;
  verticalSpacing: number;
  horizontalSpacing: number;
  levelHeight: number;
}

interface GraphNode {
  element: FlowElement;
  level: number;
  column: number;
  children: string[];
  parents: string[];
}

const DEFAULT_CONFIG: LayoutConfig = {
  startX: 400,
  startY: 80,
  verticalSpacing: 120,
  horizontalSpacing: 200,
  levelHeight: 120
};

export class GraphPositioning {
  private config: LayoutConfig;

  constructor(config: Partial<LayoutConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  calculatePositions(diagram: FlowDiagram): FlowDiagram {
    const positionedElements = this.createGraphLayout(diagram);
    
    return {
      ...diagram,
      elements: positionedElements
    };
  }

  private createGraphLayout(diagram: FlowDiagram): FlowElement[] {
    // 1. Construir grafo de dependências
    const graph = this.buildGraph(diagram);
    
    // 2. Calcular níveis (topological levels)
    this.calculateLevels(graph, diagram.connections);
    
    // 3. Organizar elementos por nível e colunas
    this.organizeColumnsInLevels(graph);
    
    // 4. Calcular posições finais
    return this.calculateFinalPositions(graph, diagram.elements);
  }

  private buildGraph(diagram: FlowDiagram): Map<string, GraphNode> {
    const graph = new Map<string, GraphNode>();
    
    // Inicializar nós
    diagram.elements.forEach(element => {
      graph.set(element.id, {
        element,
        level: 0,
        column: 0,
        children: [],
        parents: []
      });
    });
    
    // Construir relações parent-child
    diagram.connections.forEach(conn => {
      const parentNode = graph.get(conn.from);
      const childNode = graph.get(conn.to);
      
      if (parentNode && childNode) {
        parentNode.children.push(conn.to);
        childNode.parents.push(conn.from);
      }
    });
    
    return graph;
  }

  private calculateLevels(graph: Map<string, GraphNode>, connections: FlowConnection[]) {
    // Encontrar nós raiz (sem pais)
    const roots = Array.from(graph.values()).filter(node => node.parents.length === 0);
    
    if (roots.length === 0) {
      console.warn('Nenhum nó raiz encontrado, usando primeiro elemento');
      const firstNode = graph.values().next().value;
      if (firstNode) roots.push(firstNode);
    }
    
    // BFS para calcular níveis, evitando loops infinitos
    const visited = new Set<string>();
    const queue: { nodeId: string; level: number }[] = [];
    
    // Inicializar com nós raiz
    roots.forEach(root => {
      queue.push({ nodeId: root.element.id, level: 0 });
    });
    
    while (queue.length > 0) {
      const { nodeId, level } = queue.shift()!;
      const node = graph.get(nodeId);
      
      if (!node || visited.has(nodeId)) continue;
      
      visited.add(nodeId);
      node.level = Math.max(node.level, level);
      
      // Processar filhos
      node.children.forEach(childId => {
        if (!visited.has(childId)) {
          queue.push({ nodeId: childId, level: level + 1 });
        } else {
          // Se já foi visitado, pode ser um loop - ajustar nível se necessário
          const childNode = graph.get(childId);
          if (childNode && childNode.level <= level) {
            childNode.level = level + 1;
            // Reprocessar filhos do nó que teve nível ajustado
            childNode.children.forEach(grandChildId => {
              if (visited.has(grandChildId)) {
                const grandChild = graph.get(grandChildId);
                if (grandChild && grandChild.level <= childNode.level) {
                  queue.push({ nodeId: grandChildId, level: childNode.level + 1 });
                }
              }
            });
          }
        }
      });
    }
  }

  private organizeColumnsInLevels(graph: Map<string, GraphNode>) {
    // Agrupar nós por nível
    const levelGroups = new Map<number, GraphNode[]>();
    
    graph.forEach(node => {
      if (!levelGroups.has(node.level)) {
        levelGroups.set(node.level, []);
      }
      levelGroups.get(node.level)!.push(node);
    });
    
    // Organizar colunas dentro de cada nível com estratégia melhorada
    levelGroups.forEach((nodes, level) => {
      if (nodes.length === 1) {
        // Nível com 1 elemento: centralizar
        nodes[0].column = 0;
        return;
      }
      
      // Para múltiplos elementos, ordenar por posição ideal baseada nos pais
      const nodesWithScore = nodes.map(node => ({
        node,
        score: this.calculatePositionScore(node, graph)
      }));
      
      // Ordenar por score (posição ideal)
      nodesWithScore.sort((a, b) => a.score - b.score);
      
      // Atribuir colunas balanceadas
      nodesWithScore.forEach(({ node }, index) => {
        if (nodes.length === 2) {
          // 2 elementos: esquerda (-1) e direita (+1)
          node.column = (index === 0) ? -1 : 1;
        } else if (nodes.length === 3) {
          // 3 elementos: esquerda (-1), centro (0), direita (+1)
          node.column = index - 1;
        } else {
          // Mais elementos: distribuir simetricamente
          const center = (nodes.length - 1) / 2;
          node.column = index - center;
        }
      });
    });
  }
  
  private calculatePositionScore(node: GraphNode, graph: Map<string, GraphNode>): number {
    // Calcular posição ideal baseada na posição média dos pais
    if (node.parents.length === 0) return 0; // Nós raiz no centro
    
    let totalParentColumn = 0;
    let validParents = 0;
    
    node.parents.forEach(parentId => {
      const parent = graph.get(parentId);
      if (parent) {
        totalParentColumn += parent.column;
        validParents++;
      }
    });
    
    if (validParents === 0) return 0;
    
    // Retornar posição média dos pais
    return totalParentColumn / validParents;
  }

  private calculateFinalPositions(graph: Map<string, GraphNode>, elements: FlowElement[]): FlowElement[] {
    const positioned = new Map<string, FlowElement>();
    
    // Agrupar por nível para calcular largura de cada nível
    const levelGroups = new Map<number, GraphNode[]>();
    graph.forEach(node => {
      if (!levelGroups.has(node.level)) {
        levelGroups.set(node.level, []);
      }
      levelGroups.get(node.level)!.push(node);
    });
    
    // Calcular posições usando as colunas balanceadas
    graph.forEach(node => {
      // Usar diretamente a coluna calculada (já está centrada em 0)
      const x = this.config.startX + (node.column * this.config.horizontalSpacing);
      const y = this.config.startY + (node.level * this.config.levelHeight);
      
      positioned.set(node.element.id, {
        ...node.element,
        position: { x, y }
      });
    });
    
    return elements.map(el => positioned.get(el.id) || el);
  }
}