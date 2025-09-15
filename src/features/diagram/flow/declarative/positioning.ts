import { FlowDiagram, FlowElement, Position } from './types';

interface LayoutConfig {
  startX: number;      // Posição X inicial (centro)
  startY: number;      // Posição Y inicial (topo)
  verticalSpacing: number;  // Espaçamento vertical entre níveis
  horizontalSpacing: number; // Espaçamento horizontal entre elementos
  elementWidth: number;     // Largura aproximada de um elemento
}

const DEFAULT_CONFIG: LayoutConfig = {
  startX: 400,
  startY: 100,
  verticalSpacing: 150,
  horizontalSpacing: 200,
  elementWidth: 120
};

export class AutoPositioning {
  private config: LayoutConfig;

  constructor(config: Partial<LayoutConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // Calcula posições automáticas para todos os elementos
  calculatePositions(diagram: FlowDiagram): FlowDiagram {
    const positionedElements = this.buildLayoutTree(diagram);
    
    return {
      ...diagram,
      elements: positionedElements
    };
  }

  private buildLayoutTree(diagram: FlowDiagram): FlowElement[] {
    // Encontrar elemento inicial (start)
    const startElement = diagram.elements.find(el => el.type === 'start');
    if (!startElement) {
      throw new Error('Fluxograma deve ter pelo menos um elemento "start"');
    }

    // Construir árvore de dependências
    const dependencyTree = this.buildDependencyTree(diagram, startElement.id);
    
    // Calcular posições baseadas na árvore
    const positionedElements = new Map<string, FlowElement>();
    this.assignPositions(dependencyTree, positionedElements, 0, 0);

    return diagram.elements.map(el => 
      positionedElements.get(el.id) || el
    );
  }

  private buildDependencyTree(diagram: FlowDiagram, rootId: string): TreeNode {
    const visited = new Set<string>();
    
    const buildNode = (elementId: string): TreeNode => {
      if (visited.has(elementId)) {
        // Evitar loops infinitos
        return { element: diagram.elements.find(el => el.id === elementId)!, children: [] };
      }
      
      visited.add(elementId);
      const element = diagram.elements.find(el => el.id === elementId)!;
      
      // Encontrar filhos (elementos que este elemento conecta)
      const children = diagram.connections
        .filter(conn => conn.from === elementId)
        .map(conn => buildNode(conn.to));

      return { element, children };
    };

    return buildNode(rootId);
  }

  private assignPositions(
    node: TreeNode, 
    positioned: Map<string, FlowElement>, 
    level: number, 
    siblingIndex: number
  ): void {
    const { config } = this;
    
    // Calcular posição Y baseada no nível
    const y = config.startY + (level * config.verticalSpacing);
    
    // Calcular posição X baseada no índice entre irmãos e largura necessária
    let x: number;
    
    if (level === 0) {
      // Elemento raiz sempre no centro
      x = config.startX;
    } else {
      // Distribuir horizontalmente baseado no número de irmãos
      const totalWidth = (node.children.length - 1) * config.horizontalSpacing;
      const startX = config.startX - (totalWidth / 2);
      x = startX + (siblingIndex * config.horizontalSpacing);
    }

    // Criar elemento posicionado
    const positionedElement: FlowElement = {
      ...node.element,
      position: { x, y }
    };
    
    positioned.set(node.element.id, positionedElement);

    // Recursivamente posicionar filhos
    node.children.forEach((child, index) => {
      this.assignPositions(child, positioned, level + 1, index);
    });
  }
}

interface TreeNode {
  element: FlowElement;
  children: TreeNode[];
}