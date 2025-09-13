// Algoritmo de posicionamento simples e limpo para fluxogramas
// Foco em layout intuitivo e labels bem posicionadas

import { FlowDiagram, FlowElement } from './types';

interface LayoutConfig {
  startX: number;
  startY: number;
  verticalSpacing: number;
  horizontalSpacing: number;
}

const DEFAULT_CONFIG: LayoutConfig = {
  startX: 400,
  startY: 80,
  verticalSpacing: 120,
  horizontalSpacing: 250,
};

export class SimplePositioning {
  private config: LayoutConfig;

  constructor(config: Partial<LayoutConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  calculatePositions(diagram: FlowDiagram): FlowDiagram {
    const positionedElements = this.createSimpleLayout(diagram);
    
    return {
      ...diagram,
      elements: positionedElements
    };
  }

  private createSimpleLayout(diagram: FlowDiagram): FlowElement[] {
    const { config } = this;
    const positioned = new Map<string, FlowElement>();
    
    // Classificar elementos por tipo para layout organizado
    const elementsByType = this.classifyElements(diagram.elements);
    
    let currentY = config.startY;
    const centerX = config.startX;
    
    // 1. Start no topo (sempre)
    if (elementsByType.start.length > 0) {
      const startEl = elementsByType.start[0];
      positioned.set(startEl.id, {
        ...startEl,
        position: { x: centerX, y: currentY }
      });
      currentY += config.verticalSpacing;
    }
    
    // 2. Processes em sequência vertical
    elementsByType.process.forEach(processEl => {
      positioned.set(processEl.id, {
        ...processEl,
        position: { x: centerX, y: currentY }
      });
      currentY += config.verticalSpacing;
    });
    
    // 3. Decision centralizada
    if (elementsByType.decision.length > 0) {
      const decisionEl = elementsByType.decision[0];
      const decisionY = currentY;
      
      positioned.set(decisionEl.id, {
        ...decisionEl,
        position: { x: centerX, y: decisionY }
      });
      currentY += config.verticalSpacing;
      
      // 4. Posicionar End elements baseado nas conexões
      this.positionEndElements(
        diagram, 
        elementsByType.end, 
        decisionEl.id, 
        decisionY, 
        currentY, 
        positioned
      );
    } else {
      // Se não há decisão, ends em sequência
      elementsByType.end.forEach(endEl => {
        positioned.set(endEl.id, {
          ...endEl,
          position: { x: centerX, y: currentY }
        });
        currentY += config.verticalSpacing;
      });
    }
    
    return diagram.elements.map(el => positioned.get(el.id) || el);
  }
  
  private classifyElements(elements: FlowElement[]) {
    return {
      start: elements.filter(el => el.type === 'start'),
      process: elements.filter(el => el.type === 'process'),
      decision: elements.filter(el => el.type === 'decision'),
      end: elements.filter(el => el.type === 'end')
    };
  }
  
  private positionEndElements(
    diagram: FlowDiagram,
    endElements: FlowElement[],
    decisionId: string,
    decisionY: number,
    nextY: number,
    positioned: Map<string, FlowElement>
  ) {
    const { config } = this;
    const centerX = config.startX;
    
    // Encontrar conexões que saem da decisão
    const decisionConnections = diagram.connections.filter(conn => conn.from === decisionId);
    
    if (decisionConnections.length === 0) {
      // Sem conexões, posicionar ends em sequência
      endElements.forEach(endEl => {
        positioned.set(endEl.id, {
          ...endEl,
          position: { x: centerX, y: nextY }
        });
        nextY += config.verticalSpacing;
      });
      return;
    }
    
    // Separar por tipo de conexão
    const yesConnection = decisionConnections.find(conn => 
      conn.label?.toLowerCase() === 'sim' || 
      !conn.label || 
      conn.label === ''
    );
    
    const noConnection = decisionConnections.find(conn => 
      conn.label?.toLowerCase() === 'não' ||
      conn.label?.toLowerCase() === 'no'
    );
    
    // Posicionar elemento do caminho "Sim" (principal) - embaixo da decisão
    if (yesConnection) {
      const yesElement = endElements.find(el => el.id === yesConnection.to);
      if (yesElement) {
        positioned.set(yesElement.id, {
          ...yesElement,
          position: { x: centerX, y: nextY }
        });
      }
    }
    
    // Posicionar elemento do caminho "Não" (alternativo) - à direita da decisão
    if (noConnection) {
      const noElement = endElements.find(el => el.id === noConnection.to);
      if (noElement) {
        positioned.set(noElement.id, {
          ...noElement,
          position: { x: centerX + config.horizontalSpacing, y: decisionY }
        });
      }
    }
    
    // Posicionar elementos restantes
    endElements.forEach(endEl => {
      if (!positioned.has(endEl.id)) {
        positioned.set(endEl.id, {
          ...endEl,
          position: { x: centerX + config.horizontalSpacing, y: nextY }
        });
        nextY += config.verticalSpacing;
      }
    });
  }
}