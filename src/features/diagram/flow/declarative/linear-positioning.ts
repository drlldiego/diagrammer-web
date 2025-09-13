// Algoritmo de posicionamento linear para fluxogramas
// Layout mais limpo e intuitivo que árvore

import { FlowDiagram, FlowElement, Position } from './types';

interface LayoutConfig {
  startX: number;
  startY: number;
  verticalSpacing: number;
  horizontalSpacing: number;
}

const DEFAULT_CONFIG: LayoutConfig = {
  startX: 400,
  startY: 100,
  verticalSpacing: 150,
  horizontalSpacing: 300,
};

export class LinearPositioning {
  private config: LayoutConfig;

  constructor(config: Partial<LayoutConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  calculatePositions(diagram: FlowDiagram): FlowDiagram {
    const positionedElements = this.buildLinearLayout(diagram);
    
    return {
      ...diagram,
      elements: positionedElements
    };
  }

  private buildLinearLayout(diagram: FlowDiagram): FlowElement[] {
    // Encontrar elemento inicial
    const startElement = diagram.elements.find(el => el.type === 'start');
    if (!startElement) {
      throw new Error('Fluxograma deve ter pelo menos um elemento "start"');
    }

    // Criar cadeia linear de elementos
    const chain = this.buildLinearChain(diagram, startElement.id);
    
    // Posicionar elementos linearmente
    return this.positionLinearChain(chain, diagram.elements);
  }

  private buildLinearChain(diagram: FlowDiagram, startId: string): string[] {
    const chain: string[] = [];
    const visited = new Set<string>();
    
    const traverse = (elementId: string) => {
      if (visited.has(elementId)) return;
      
      visited.add(elementId);
      chain.push(elementId);
      
      // Encontrar próximo elemento na cadeia principal
      const nextConnections = diagram.connections
        .filter(conn => conn.from === elementId)
        .sort((a, b) => {
          // Priorizar conexões "Sim" ou sem label primeiro
          if (a.label === 'Sim' && b.label !== 'Sim') return -1;
          if (b.label === 'Sim' && a.label !== 'Sim') return 1;
          if (!a.label && b.label) return -1;
          if (a.label && !b.label) return 1;
          return 0;
        });

      // Continuar com o primeiro (caminho principal)
      if (nextConnections.length > 0) {
        traverse(nextConnections[0].to);
      }

      // Processar caminhos alternativos (ex: "Não")
      for (let i = 1; i < nextConnections.length; i++) {
        const altTarget = nextConnections[i].to;
        if (!visited.has(altTarget)) {
          chain.push(altTarget);
          visited.add(altTarget);
        }
      }
    };

    traverse(startId);
    
    // Adicionar elementos não visitados (se existirem)
    diagram.elements.forEach(el => {
      if (!visited.has(el.id)) {
        chain.push(el.id);
      }
    });

    return chain;
  }

  private positionLinearChain(chain: string[], allElements: FlowElement[]): FlowElement[] {
    const { config } = this;
    const positionedElements = new Map<string, FlowElement>();
    
    let currentY = config.startY;
    let currentX = config.startX;
    
    // Mapear elementos por ID para acesso rápido
    const elementMap = new Map(allElements.map(el => [el.id, el]));
    
    chain.forEach((elementId, index) => {
      const element = elementMap.get(elementId);
      if (!element) return;

      // Calcular posição baseada no tipo e índice
      let x = currentX;
      let y = currentY;

      // Elementos alternativos (como "Erro" em decisões) vão para a direita
      const isAlternativePath = this.isAlternativeElement(elementId, chain, allElements);
      
      if (isAlternativePath) {
        x = currentX + config.horizontalSpacing;
        // Manter Y do elemento de decisão anterior
        const decisionIndex = this.findPreviousDecision(elementId, chain, allElements);
        if (decisionIndex >= 0) {
          y = config.startY + (decisionIndex * config.verticalSpacing);
        }
      } else {
        // Elemento principal: avançar verticalmente
        y = currentY;
        currentY += config.verticalSpacing;
      }

      const positionedElement: FlowElement = {
        ...element,
        position: { x, y }
      };

      positionedElements.set(elementId, positionedElement);
    });

    return allElements.map(el => positionedElements.get(el.id) || el);
  }

  private isAlternativeElement(elementId: string, chain: string[], allElements: FlowElement[]): boolean {
    // Verificar se este elemento é destino de uma conexão "Não" ou similar
    const element = allElements.find(el => el.id === elementId);
    if (!element) return false;

    // Elementos "end" com nome "Erro" são tipicamente alternativos
    return element.type === 'end' && 
           (element.name.toLowerCase().includes('erro') || 
            element.name.toLowerCase().includes('error'));
  }

  private findPreviousDecision(elementId: string, chain: string[], allElements: FlowElement[]): number {
    const currentIndex = chain.indexOf(elementId);
    
    // Procurar o último elemento "decision" antes deste
    for (let i = currentIndex - 1; i >= 0; i--) {
      const prevElement = allElements.find(el => el.id === chain[i]);
      if (prevElement?.type === 'decision') {
        return i;
      }
    }
    
    return -1;
  }
}