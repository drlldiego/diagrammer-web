// Algoritmo de posicionamento específico para sintaxe hierárquica
// Organiza elementos seguindo a estrutura hierárquica das decisões

import { FlowDiagram, FlowElement, FlowConnection } from './types';

interface DecisionBranch {
  condition: string;
  elements: FlowElement[];
  connections: FlowConnection[];
}

const LAYOUT_CONFIG = {
  startX: 400,
  startY: 100,
  verticalSpacing: 150,
  horizontalSpacing: 250,
  elementWidth: 120,
  elementHeight: 80
};

export class HierarchicalPositioning {
  
  calculatePositions(diagram: FlowDiagram): FlowDiagram {    
    
    // 1. Identificar elemento inicial
    const startElement = diagram.elements.find(el => el.type === 'start');
    if (!startElement) {      
      return diagram;
    }

    // 2. Criar mapa de posições
    const positions = new Map<string, { x: number, y: number }>();
    
    // 3. Processar fluxo principal
    this.processMainFlow(startElement, diagram, positions);
    
    // 4. Aplicar posições aos elementos
    const positionedElements = diagram.elements.map(element => ({
      ...element,
      position: positions.get(element.id) || { x: 400, y: 100 }
    }));
    
    return {
      ...diagram,
      elements: positionedElements
    };
  }

  private processMainFlow(
    startElement: FlowElement, 
    diagram: FlowDiagram, 
    positions: Map<string, { x: number, y: number }>
  ) {
    let currentElement = startElement;
    let currentY = LAYOUT_CONFIG.startY;
    const mainX = LAYOUT_CONFIG.startX;
    
    const visited = new Set<string>();
    
    while (currentElement && !visited.has(currentElement.id)) {            
      // Posicionar elemento atual
      positions.set(currentElement.id, { x: mainX, y: currentY });
      visited.add(currentElement.id);
      
      // Se é uma decisão, processar ramificações
      if (currentElement.type === 'decision') {
        const branches = this.getDecisionBranches(currentElement, diagram);
        this.positionDecisionBranches(currentElement, branches, currentY, positions, diagram);
        
        // Para decisões, não continuar o fluxo principal automaticamente
        break;
      }
      
      // Encontrar próximo elemento no fluxo principal
      const nextElement = this.getNextElement(currentElement, diagram, visited);
      if (!nextElement) break;
      currentElement = nextElement;
      currentY += LAYOUT_CONFIG.verticalSpacing;
    }
  }

  private getDecisionBranches(
    decisionElement: FlowElement, 
    diagram: FlowDiagram
  ): DecisionBranch[] {
    const branches: DecisionBranch[] = [];
    
    // Encontrar todas as conexões saindo da decisão
    const outgoingConnections = diagram.connections.filter(conn => conn.from === decisionElement.id);
    
    for (const connection of outgoingConnections) {
      const firstElement = diagram.elements.find(el => el.id === connection.to);
      if (!firstElement) continue;
      
      // Seguir a cadeia de elementos desta condição
      const branchElements = this.followBranch(firstElement, diagram, [decisionElement.id]);
      const branchConnections = this.getBranchConnections(branchElements, diagram);
      
      branches.push({
        condition: connection.label || 'Default',
        elements: branchElements,
        connections: branchConnections
      });
    }
    
    return branches;
  }

  private followBranch(
    startElement: FlowElement, 
    diagram: FlowDiagram, 
    visited: string[]
  ): FlowElement[] {
    const elements: FlowElement[] = [startElement];
    let currentElement = startElement;
    const localVisited = new Set(visited);
    localVisited.add(startElement.id);
    
    while (true) {
      const nextConnection = diagram.connections.find(conn => 
        conn.from === currentElement.id && !localVisited.has(conn.to)
      );
      
      if (!nextConnection) break;
      
      const nextElement = diagram.elements.find(el => el.id === nextConnection.to);
      if (!nextElement) break;
      
      // Se chegou numa decisão que já foi visitada (loop), parar
      if (visited.includes(nextElement.id)) {
        break;
      }
      
      elements.push(nextElement);
      localVisited.add(nextElement.id);
      currentElement = nextElement;
      
      // Se chegou num fim, parar
      if (nextElement.type === 'end') break;
    }
    
    return elements;
  }

  private getBranchConnections(
    branchElements: FlowElement[], 
    diagram: FlowDiagram
  ): FlowConnection[] {
    const elementIds = new Set(branchElements.map(el => el.id));
    return diagram.connections.filter(conn => 
      elementIds.has(conn.from) && elementIds.has(conn.to)
    );
  }

  private positionDecisionBranches(
    decisionElement: FlowElement,
    branches: DecisionBranch[],
    decisionY: number,
    positions: Map<string, { x: number, y: number }>,
    diagram: FlowDiagram
  ) {
    const decisionX = LAYOUT_CONFIG.startX;
    const branchStartY = decisionY + LAYOUT_CONFIG.verticalSpacing;        
    
    // Distribuir ramificações horizontalmente
    const totalWidth = (branches.length - 1) * LAYOUT_CONFIG.horizontalSpacing;
    const startX = decisionX - totalWidth / 2;
    
    branches.forEach((branch, index) => {
      const branchX = startX + (index * LAYOUT_CONFIG.horizontalSpacing);      
      
      // Posicionar elementos da ramificação
      let currentY = branchStartY;
      branch.elements.forEach(element => {
        // Se o elemento já foi posicionado (ex: loop para decisão), usar posição existente
        if (!positions.has(element.id)) {
          positions.set(element.id, { x: branchX, y: currentY });          
          currentY += LAYOUT_CONFIG.verticalSpacing;
        } else {          
          currentY = positions.get(element.id)!.y;
        }
      });
    });
  }

  private getNextElement(
    currentElement: FlowElement, 
    diagram: FlowDiagram, 
    visited: Set<string>
  ): FlowElement | null {
    const connection = diagram.connections.find(conn => 
      conn.from === currentElement.id && !visited.has(conn.to)
    );
    
    if (!connection) return null;
    
    return diagram.elements.find(el => el.id === connection.to) || null;
  }
}