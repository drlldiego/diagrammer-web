import { ErElement, DiagramNotation, isErConnection, isErEntity, isErAttribute, isErRelationship } from '../types';
import { logger } from '../../../../../utils/logger';

/**
 * Interface base para estratégias de renderização
 */
export interface RenderingStrategyInterface {
  readonly name: string;
  readonly notation: DiagramNotation;
  
  canRender(element: ErElement): boolean;
  renderElement(element: ErElement, gfx: any, renderer: any): void;
  renderConnection(element: ErElement, gfx: any, renderer: any): void;
  updateElementVisuals(element: ErElement, property: string, gfx: any, renderer: any): void;
  getElementStyles(element: ErElement): Record<string, any>;
}

/**
 * Estratégia de renderização para notação Chen
 */
export class ChenRenderingStrategy implements RenderingStrategyInterface {
  readonly name = 'chen-rendering';
  readonly notation: DiagramNotation = 'chen';

  canRender(element: ErElement): boolean {
    return element.businessObject?.erType !== undefined || isErConnection(element);
  }

  renderElement(element: ErElement, gfx: any, renderer: any): void {
    if (!this.canRender(element)) return;

    try {
      if (isErConnection(element)) {
        this.renderConnection(element, gfx, renderer);
      } else {
        this.renderShape(element, gfx, renderer);
      }
    } catch (error) {
      logger.error(`Renderização para notação Chen falhou para o elemento ${element.id}`, 'ChenRenderingStrategy', error as Error);
    }
  }

  renderConnection(element: ErElement, gfx: any, renderer: any): void {
    if (!isErConnection(element)) return;

    gfx.innerHTML = '';

    if (renderer.drawConnection) {
      renderer.drawConnection(gfx, element);
    }

    this.applyChenConnectionStyles(element, gfx);
  }

  renderShape(element: ErElement, gfx: any, renderer: any): void {
    gfx.innerHTML = '';

    if (renderer.drawShape) {
      renderer.drawShape(gfx, element);
    }

    this.applyChenShapeStyles(element, gfx);
  }

  updateElementVisuals(element: ErElement, property: string, gfx: any, renderer: any): void {
    const fullRerenderProperties = [
      'name', 'isWeak', 'erType', 'isIdentifying'
    ];

    if (fullRerenderProperties.includes(property)) {
      this.renderElement(element, gfx, renderer);
    } else {
      this.updateSpecificProperty(element, property, gfx);
    }
  }

  getElementStyles(element: ErElement): Record<string, any> {
    const baseStyles = {
      fill: '#ffffff',
      stroke: '#000000',
      strokeWidth: 1
    };

    if (isErEntity(element)) {
      return {
        ...baseStyles,
        fill: element.businessObject.isWeak ? '#ffe6e6' : '#e6f3ff',
        strokeWidth: element.businessObject.isWeak ? 2 : 1
      };
    }

    if (isErRelationship(element)) {
      return {
        ...baseStyles,
        fill: '#fff2e6',
        shape: 'diamond'
      };
    }

    if (isErAttribute(element)) {
      const styles: any = { ...baseStyles, fill: '#e6ffe6' };
      
      if (element.businessObject.isPrimaryKey) {
        styles.textDecoration = 'underline';
      }
      
      if (element.businessObject.isDerived) {
        styles.strokeDasharray = '5,5';
      }
      
      return styles;
    }

    return baseStyles;
  }

  private applyChenConnectionStyles(element: ErElement, gfx: any): void {
    const pathElement = gfx.querySelector('path');
    if (pathElement) {
      if (element.businessObject?.isIdentifying) {
        pathElement.style.strokeWidth = '2';
      }
    }
  }

  private applyChenShapeStyles(element: ErElement, gfx: any): void {
    const rectElement = gfx.querySelector('rect, path');
    if (!rectElement) return;

    const styles = this.getElementStyles(element);
    Object.entries(styles).forEach(([key, value]) => {
      if (key !== 'shape') {
        rectElement.style[key] = value;
      }
    });
  }

  private updateSpecificProperty(element: ErElement, property: string, gfx: any): void {
    switch (property) {
      case 'isPrimaryKey':
        this.updatePrimaryKeyVisualization(element, gfx);
        break;
      case 'isRequired':
        this.updateRequiredVisualization(element, gfx);
        break;
      case 'cardinalitySource':
      case 'cardinalityTarget':
        this.updateCardinalityVisualization(element, gfx);
        break;
    }
  }

  private updatePrimaryKeyVisualization(element: ErElement, gfx: any): void {
    const textElement = gfx.querySelector('text');
    if (textElement && isErAttribute(element)) {
      textElement.style.textDecoration = element.businessObject.isPrimaryKey ? 'underline' : 'none';
    }
  }

  private updateRequiredVisualization(element: ErElement, gfx: any): void {
    const rectElement = gfx.querySelector('rect');
    if (rectElement && isErAttribute(element)) {
      rectElement.style.strokeWidth = element.businessObject.isRequired ? '2' : '1';
    }
  }

  private updateCardinalityVisualization(element: ErElement, gfx: any): void {
    const existingLabels = gfx.querySelectorAll('.cardinality-label');
    existingLabels.forEach((label: any) => label.remove());

    if (isErConnection(element)) {
      this.createCardinalityLabels(element, gfx);
    }
  }

  private createCardinalityLabels(element: ErElement, gfx: any): void {
    const { cardinalitySource, cardinalityTarget } = element.businessObject;

    if (cardinalitySource) {
      this.createCardinalityLabel(cardinalitySource, 'source', gfx);
    }

    if (cardinalityTarget) {
      this.createCardinalityLabel(cardinalityTarget, 'target', gfx);
    }
  }

  private createCardinalityLabel(cardinality: string, position: 'source' | 'target', gfx: any): void {
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.textContent = cardinality;
    label.classList.add('cardinality-label', `cardinality-${position}`);
    label.style.fontSize = '12px';
    label.style.fill = '#333';
    
    const x = position === 'source' ? 10 : -10;
    const y = -5;
    label.setAttribute('x', x.toString());
    label.setAttribute('y', y.toString());
    
    gfx.appendChild(label);
  }
}

/**
 * Estratégia de renderização para notação Crow's Foot
 */
export class CrowsFootRenderingStrategy implements RenderingStrategyInterface {
  readonly name = 'crowsfoot-rendering';
  readonly notation: DiagramNotation = 'crowsfoot';

  canRender(element: ErElement): boolean {
    if (isErRelationship(element)) return false;
    return element.businessObject?.erType !== undefined || isErConnection(element);
  }

  renderElement(element: ErElement, gfx: any, renderer: any): void {
    if (!this.canRender(element)) return;

    try {
      if (isErConnection(element)) {
        this.renderConnection(element, gfx, renderer);
      } else {
        this.renderShape(element, gfx, renderer);
      }
    } catch (error) {
      logger.error(`Renderização para notação Crow's foot falhou para o elemento ${element.id}`, 'CrowsFootRenderingStrategy', error as Error);
    }
  }

  renderConnection(element: ErElement, gfx: any, renderer: any): void {
    if (!isErConnection(element)) return;

    gfx.innerHTML = '';

    if (renderer.drawConnection) {
      renderer.drawConnection(gfx, element);
    }

    this.applyCrowsFootConnectionStyles(element, gfx);
  }

  renderShape(element: ErElement, gfx: any, renderer: any): void {
    gfx.innerHTML = '';

    if (renderer.drawShape) {
      renderer.drawShape(gfx, element);
    }

    this.applyCrowsFootShapeStyles(element, gfx);
  }

  updateElementVisuals(element: ErElement, property: string, gfx: any, renderer: any): void {
    const fullRerenderProperties = [
      'name', 'erType', 'isPrimaryKey', 'isRequired'
    ];

    if (fullRerenderProperties.includes(property)) {
      this.renderElement(element, gfx, renderer);
    } else {
      this.updateSpecificProperty(element, property, gfx);
    }
  }

  getElementStyles(element: ErElement): Record<string, any> {
    const baseStyles = {
      fill: '#ffffff',
      stroke: '#000000',
      strokeWidth: 1
    };

    if (isErEntity(element)) {
      return {
        ...baseStyles,
        fill: '#f0f8ff',
        cornerRadius: 5
      };
    }

    if (isErAttribute(element)) {
      const styles = { ...baseStyles, fill: '#f5f5f5' };
      
      if (element.businessObject.isPrimaryKey) {
        styles.fill = '#ffe6cc';
        styles.strokeWidth = 2;
      }
      
      return styles;
    }

    return baseStyles;
  }

  private applyCrowsFootConnectionStyles(element: ErElement, gfx: any): void {
    const sourceIsEntity = element.source ? isErEntity(element.source) : false;
    const targetIsEntity = element.target ? isErEntity(element.target) : false;

    if (sourceIsEntity && targetIsEntity) {
      this.addCrowsFootSymbols(element, gfx);
    }
  }

  private applyCrowsFootShapeStyles(element: ErElement, gfx: any): void {
    const rectElement = gfx.querySelector('rect');
    if (!rectElement) return;

    const styles = this.getElementStyles(element);
    Object.entries(styles).forEach(([key, value]) => {
      if (key !== 'cornerRadius') {
        rectElement.style[key] = value;
      } else {
        rectElement.setAttribute('rx', value.toString());
        rectElement.setAttribute('ry', value.toString());
      }
    });
  }

  private updateSpecificProperty(element: ErElement, property: string, gfx: any): void {
    switch (property) {
      case 'cardinalitySource':
      case 'cardinalityTarget':
        this.updateCrowsFootCardinality(element, gfx);
        break;
      case 'isPrimaryKey':
        this.updatePrimaryKeyVisualization(element, gfx);
        break;
    }
  }

  private addCrowsFootSymbols(element: ErElement, gfx: any): void {
    const { cardinalitySource, cardinalityTarget } = element.businessObject;

    if (this.isManySideCardinality(cardinalitySource)) {
      this.createCrowsFootSymbol(gfx, 'source');
    }

    if (this.isManySideCardinality(cardinalityTarget)) {
      this.createCrowsFootSymbol(gfx, 'target');
    }
  }

  private isManySideCardinality(cardinality: string | undefined): boolean {
    return cardinality?.includes('*') || cardinality === 'N' || cardinality === 'M';
  }

  private createCrowsFootSymbol(gfx: any, position: 'source' | 'target'): void {
    const symbol = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    
    const pathData = position === 'source' 
      ? 'M-5,0 L-15,-5 M-5,0 L-15,0 M-5,0 L-15,5'
      : 'M5,0 L15,-5 M5,0 L15,0 M5,0 L15,5';

    symbol.setAttribute('d', pathData);
    symbol.style.stroke = '#000';
    symbol.style.strokeWidth = '1';
    symbol.style.fill = 'none';
    symbol.classList.add('crowsfoot-symbol', `crowsfoot-${position}`);
    
    gfx.appendChild(symbol);
  }

  private updateCrowsFootCardinality(element: ErElement, gfx: any): void {
    const existingSymbols = gfx.querySelectorAll('.crowsfoot-symbol');
    existingSymbols.forEach((symbol: any) => symbol.remove());

    if (isErConnection(element)) {
      this.addCrowsFootSymbols(element, gfx);
    }
  }

  private updatePrimaryKeyVisualization(element: ErElement, gfx: any): void {
    const rectElement = gfx.querySelector('rect');
    if (rectElement && isErAttribute(element)) {
      const styles = this.getElementStyles(element);
      rectElement.style.fill = styles.fill;
      rectElement.style.strokeWidth = styles.strokeWidth;
    }
  }
}

/**
 * Serviço de gerenciamento de estratégias de renderização
 */
export class RenderingStrategyService {
  private strategies: Map<DiagramNotation, RenderingStrategyInterface> = new Map();
  private currentStrategy!: RenderingStrategyInterface;

  constructor(notation: DiagramNotation = 'chen') {
    this.initializeStrategies();
    this.setStrategy(notation);
  }

  private initializeStrategies(): void {
    this.strategies.set('chen', new ChenRenderingStrategy());
    this.strategies.set('crowsfoot', new CrowsFootRenderingStrategy());
  }

  setStrategy(notation: DiagramNotation): boolean {
    const strategy = this.strategies.get(notation);
    if (strategy) {
      this.currentStrategy = strategy;
      return true;
    }
    return false;
  }

  getCurrentStrategy(): RenderingStrategyInterface {
    return this.currentStrategy;
  }

  renderElement(element: ErElement, gfx: any, renderer: any): void {
    if (this.currentStrategy.canRender(element)) {
      this.currentStrategy.renderElement(element, gfx, renderer);
    }
  }

  updateElementVisuals(element: ErElement, property: string, gfx: any, renderer: any): void {
    if (this.currentStrategy.canRender(element)) {
      this.currentStrategy.updateElementVisuals(element, property, gfx, renderer);
    }
  }

  getElementStyles(element: ErElement): Record<string, any> {
    return this.currentStrategy.getElementStyles(element);
  }

  getAvailableStrategies(): DiagramNotation[] {
    return Array.from(this.strategies.keys());
  }
}