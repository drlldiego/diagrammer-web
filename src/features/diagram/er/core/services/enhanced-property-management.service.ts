/**
 * Enhanced Property Management Service
 * Integrates with Rendering Strategy for optimized visual updates
 */
import { PropertyManagementService } from './property-management.service';
import { RenderingStrategyService } from './rendering-strategy.service';
import { ErElement, ErBusinessObject, PropertyUpdateOptions, ErServiceResult, ErPropertyUpdateEvent, DiagramNotation } from '../types';
import { logger } from '../../../../../utils/logger';

export class EnhancedPropertyManagementService extends PropertyManagementService {
  private renderingService: RenderingStrategyService;

  constructor(modeler: any, notation: DiagramNotation = 'chen') {
    super(modeler);
    this.renderingService = new RenderingStrategyService(notation);
  }

  /**
   * Updates notation and rendering strategy
   */
  setNotation(notation: DiagramNotation): void {
    this.renderingService.setStrategy(notation);
  }

  /**
   * Enhanced property update with optimized rendering
   */
  async updateProperty<T extends keyof ErBusinessObject>(
    element: ErElement,
    property: T,
    value: ErBusinessObject[T],
    options: PropertyUpdateOptions = {}
  ): Promise<ErServiceResult<ErPropertyUpdateEvent>> {
    // Call parent implementation for property update logic
    const result = await super.updateProperty(element, property, value, options);

    if (result.success && !options.skipRerender && this.shouldTriggerRerender(property as string)) {
      await this.enhancedRerender(element, property as string, options);
    }

    return result;
  }

  /**
   * Enhanced re-rendering using strategy pattern
   */
  private async enhancedRerender(
    element: ErElement,
    property: string,
    options: PropertyUpdateOptions
  ): Promise<void> {
    try {
      const services = this.getModelerServices();
      if (!services) return;

      const { elementRegistry } = services;
      const gfx = elementRegistry.getGraphics(element);
      
      if (gfx) {
        // Use rendering strategy for optimized updates
        this.renderingService.updateElementVisuals(
          element,
          property,
          gfx,
          services.renderer
        );

        // Add visual feedback for the update
        this.addUpdateFeedback(element, property);
      }
    } catch (error) {
      logger.error('Enhanced rerender failed', 'EnhancedPropertyManagementService', error as Error);
      // Fallback to parent implementation
      await super['triggerRerender'](element, property);
    }
  }

  /**
   * Batch update with single optimized re-render
   */
  async batchUpdateProperties(
    element: ErElement,
    properties: Partial<ErBusinessObject>,
    options: PropertyUpdateOptions = {}
  ): Promise<ErServiceResult<ErPropertyUpdateEvent[]>> {
    // Call parent implementation but skip individual re-renders
    const batchOptions = { ...options, skipRerender: true };
    const result = await super.batchUpdateProperties(element, properties, batchOptions);

    if (result.success && !options.skipRerender) {
      await this.batchRerender(element, Object.keys(properties));
    }

    return result;
  }

  /**
   * Optimized batch re-rendering
   */
  private async batchRerender(element: ErElement, properties: string[]): Promise<void> {
    try {
      const services = this.getModelerServices();
      if (!services) return;

      const { elementRegistry } = services;
      const gfx = elementRegistry.getGraphics(element);
      
      if (gfx) {
        // Determine if full re-render is needed or if we can do partial updates
        const needsFullRerender = this.needsFullRerender(properties);
        
        if (needsFullRerender) {
          this.renderingService.renderElement(element, gfx, services.renderer);
        } else {
          // Apply individual property updates
          properties.forEach(property => {
            if (this.shouldTriggerRerender(property)) {
              this.renderingService.updateElementVisuals(
                element,
                property,
                gfx,
                services.renderer
              );
            }
          });
        }

        // Add batch update feedback
        this.addBatchUpdateFeedback(element, properties);
      }
    } catch (error) {
      logger.error('Batch rerender failed', 'EnhancedPropertyManagementService', error as Error);
    }
  }

  /**
   * Determines if properties require full re-render
   */
  private needsFullRerender(properties: string[]): boolean {
    const fullRerenderProperties = [
      'name', 'erType', 'isWeak', 'isIdentifying'
    ];
    
    return properties.some(prop => fullRerenderProperties.includes(prop));
  }

  /**
   * Adds visual feedback for property updates
   */
  private addUpdateFeedback(element: ErElement, property: string): void {
    try {
      const services = this.getModelerServices();
      if (!services?.canvas) return;

      const feedbackClass = this.getFeedbackClass(property);
      services.canvas.addMarker(element, feedbackClass);

      // Remove feedback after short delay
      setTimeout(() => {
        services.canvas?.removeMarker(element, feedbackClass);
      }, 300);
    } catch (error) {
      // Silent fail for feedback - not critical
    }
  }

  /**
   * Adds visual feedback for batch updates
   */
  private addBatchUpdateFeedback(element: ErElement, properties: string[]): void {
    try {
      const services = this.getModelerServices();
      if (!services?.canvas) return;

      services.canvas.addMarker(element, 'er-batch-updated');

      setTimeout(() => {
        services.canvas?.removeMarker(element, 'er-batch-updated');
      }, 500);
    } catch (error) {
      // Silent fail for feedback
    }
  }

  /**
   * Gets appropriate CSS class for visual feedback
   */
  private getFeedbackClass(property: string): string {
    switch (property) {
      case 'name':
        return 'er-name-updated';
      case 'cardinalitySource':
      case 'cardinalityTarget':
        return 'er-cardinality-updated';
      case 'isPrimaryKey':
        return 'er-primary-key-updated';
      case 'isRequired':
        return 'er-required-updated';
      default:
        return 'er-property-updated';
    }
  }

  /**
   * Gets modeler services with error handling
   */
  private getModelerServices() {
    if (!this.modeler) return null;

    try {
      return {
        elementRegistry: this.modeler.get('elementRegistry'),
        canvas: this.modeler.get('canvas'),
        eventBus: this.modeler.get('eventBus'),
        renderer: this.modeler.get('bpmnRenderer') || this.modeler.get('erBpmnRenderer')
      };
    } catch (error) {
      logger.warn('Failed to get modeler services', 'EnhancedPropertyManagementService', error as Error);
      return null;
    }
  }

  /**
   * Updates the rendering strategy when notation changes
   */
  updateRenderingStrategy(notation: DiagramNotation): void {
    this.renderingService.setStrategy(notation);
  }

  /**
   * Gets current rendering strategy info
   */
  getRenderingStrategyInfo() {
    const strategy = this.renderingService.getCurrentStrategy();
    return {
      name: strategy.name,
      notation: strategy.notation,
      availableStrategies: this.renderingService.getAvailableStrategies()
    };
  }

  /**
   * Manual re-render using current strategy
   */
  async manualRerender(element: ErElement): Promise<void> {
    try {
      const services = this.getModelerServices();
      if (!services) return;

      const { elementRegistry } = services;
      const gfx = elementRegistry.getGraphics(element);
      
      if (gfx) {
        this.renderingService.renderElement(element, gfx, services.renderer);
      }
    } catch (error) {
      logger.error('Manual rerender failed', 'EnhancedPropertyManagementService', error as Error);
    }
  }

  /**
   * Gets element styles from current rendering strategy
   */
  getElementStyles(element: ErElement): Record<string, any> {
    return this.renderingService.getElementStyles(element);
  }
}