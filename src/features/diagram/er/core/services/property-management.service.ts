/**
 * Property Management Service (Unified)
 * Integrates all property management functionality with rendering optimizations
 * 
 * Combines the base functionality with enhanced features for optimal performance
 */
import { logger } from '../../../../../utils/logger';
import { 
  ErElement, 
  ErBusinessObject, 
  PropertyUpdateOptions,
  ErServiceResult,
  ErPropertyUpdateEvent,
  DiagramNotation 
} from '../types';
import { RenderingStrategyService } from './rendering-strategy.service';

export class PropertyManagementService {
  protected modeler: any;
  private eventListeners: Map<string, Function[]> = new Map();
  private renderingService: RenderingStrategyService;

  constructor(modeler: any, notation: DiagramNotation = 'chen') {
    this.modeler = modeler;
    this.renderingService = new RenderingStrategyService(notation);
  }

  /**
   * Updates notation and rendering strategy
   */
  setNotation(notation: DiagramNotation): void {
    this.renderingService.setStrategy(notation);
  }

  /**
   * Updates a property on an ER element with type safety and enhanced rendering
   */
  async updateProperty<T extends keyof ErBusinessObject>(
    element: ErElement,
    property: T,
    value: ErBusinessObject[T],
    options: PropertyUpdateOptions = {}
  ): Promise<ErServiceResult<ErPropertyUpdateEvent>> {
    if (!element || !this.modeler) {
      return {
        success: false,
        error: {
          code: 'INVALID_PARAMS',
          message: 'Element or modeler is null',
          timestamp: Date.now()
        }
      };
    }

    try {
      const oldValue = element.businessObject[property];
      const modeling = this.modeler.get('modeling');
      const eventBus = this.modeler.get('eventBus');
      const businessObject = element.businessObject;

      // Determine update strategy based on property type
      const updateStrategy = this.getUpdateStrategy(property as string);
      
      switch (updateStrategy) {
        case 'cardinality':
          businessObject[property] = value;
          break;
          
        case 'er_custom':
          businessObject[property] = value;
          break;
          
        case 'bpmn_standard':
          if (!options.skipValidation) {
            try {
              modeling.updateProperties(element, { [property]: value });
            } catch (modelingError) {
              logger.warn('modeling.updateProperties failed, using fallback', 'PropertyManagementService', modelingError as Error);
              businessObject[property] = value;
            }
          } else {
            businessObject[property] = value;
          }
          break;
      }

      // Create event data
      const eventData: ErPropertyUpdateEvent = {
        element,
        property: property as string,
        oldValue,
        newValue: value,
        timestamp: Date.now()
      };

      // Dispatch events unless skipped
      if (!options.skipEventDispatch && eventBus) {
        try {
          eventBus.fire('element.changed', {
            element: element,
            properties: { [property]: value }
          });
          
          // Emit custom property change event
          this.emitEvent('property.changed', eventData);
        } catch (eventError) {
          logger.error('Failed to dispatch events', 'PropertyManagementService', eventError as Error);
        }
      }

      // Enhanced re-rendering with strategy pattern
      if (!options.skipRerender && this.shouldTriggerRerender(property as string)) {
        await this.enhancedRerender(element, property as string, options);
      }

      return {
        success: true,
        data: eventData
      };

    } catch (error) {
      logger.error('Property update failed', 'PropertyManagementService', error as Error);
      return {
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: `Failed to update property ${String(property)}`,
          details: error,
          element,
          timestamp: Date.now()
        }
      };
    }
  }

  /**
   * Updates element dimensions with validation
   */
  async updateElementSize(
    element: ErElement,
    dimensions: { width?: number; height?: number },
    options: PropertyUpdateOptions = {}
  ): Promise<ErServiceResult<void>> {
    if (!element || !this.modeler) {
      return {
        success: false,
        error: {
          code: 'INVALID_PARAMS',
          message: 'Element or modeler is null',
          timestamp: Date.now()
        }
      };
    }

    const { width, height } = dimensions;
    const minWidth = 50;
    const minHeight = 30;

    // Validation
    if (width && width < minWidth) {
      return {
        success: false,
        error: {
          code: 'INVALID_DIMENSIONS',
          message: `Width must be at least ${minWidth}px`,
          timestamp: Date.now()
        }
      };
    }

    if (height && height < minHeight) {
      return {
        success: false,
        error: {
          code: 'INVALID_DIMENSIONS',
          message: `Height must be at least ${minHeight}px`,
          timestamp: Date.now()
        }
      };
    }

    try {
      const modeling = this.modeler.get('modeling');
      const newBounds = {
        x: element.x || 0,
        y: element.y || 0,
        width: width || element.width || minWidth,
        height: height || element.height || minHeight,
      };

      modeling.resizeShape(element, newBounds);

      if (!options.skipEventDispatch) {
        this.emitEvent('element.updated', { element, type: 'resize', dimensions });
      }

      return { success: true };

    } catch (error) {
      logger.error('Element resize failed', 'PropertyManagementService', error as Error);
      return {
        success: false,
        error: {
          code: 'RESIZE_FAILED',
          message: 'Failed to resize element',
          details: error,
          element,
          timestamp: Date.now()
        }
      };
    }
  }

  /**
   * Batch update multiple properties with enhanced rendering
   */
  async batchUpdateProperties(
    element: ErElement,
    properties: Partial<ErBusinessObject>,
    options: PropertyUpdateOptions = {}
  ): Promise<ErServiceResult<ErPropertyUpdateEvent[]>> {
    const results: ErPropertyUpdateEvent[] = [];
    const batchOptions = { ...options, skipRerender: true, skipEventDispatch: true };

    try {
      // Update all properties without re-rendering
      for (const [property, value] of Object.entries(properties)) {
        const result = await this.updateProperty(
          element, 
          property as keyof ErBusinessObject, 
          value, 
          batchOptions
        );
        
        if (result.success && result.data) {
          results.push(result.data);
        }
      }

      // Enhanced batch re-rendering
      if (!options.skipRerender) {
        await this.batchRerender(element, Object.keys(properties));
      }

      if (!options.skipEventDispatch) {
        const eventBus = this.modeler.get('eventBus');
        eventBus?.fire('element.changed', { element, properties });
        this.emitEvent('property.changed', { element, properties, batch: true });
      }

      return { success: true, data: results };

    } catch (error) {
      logger.error('Batch update failed', 'PropertyManagementService', error as Error);
      return {
        success: false,
        error: {
          code: 'BATCH_UPDATE_FAILED',
          message: 'Failed to batch update properties',
          details: error,
          element,
          timestamp: Date.now()
        }
      };
    }
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
      logger.error('Enhanced rerender failed', 'PropertyManagementService', error as Error);
      // Fallback to basic rerender
      await this.triggerRerender(element, property);
    }
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
      logger.error('Batch rerender failed', 'PropertyManagementService', error as Error);
    }
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
      logger.error('Manual rerender failed', 'PropertyManagementService', error as Error);
    }
  }

  /**
   * Gets element styles from current rendering strategy
   */
  getElementStyles(element: ErElement): Record<string, any> {
    return this.renderingService.getElementStyles(element);
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
   * Updates the rendering strategy when notation changes
   */
  updateRenderingStrategy(notation: DiagramNotation): void {
    this.renderingService.setStrategy(notation);
  }

  /**
   * Event management
   */
  addEventListener(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  removeEventListener(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emitEvent(event: string, data: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        logger.error(`Event listener error for ${event}`, 'PropertyManagementService', error as Error);
      }
    });
  }

  /**
   * Determines the appropriate update strategy for a property
   */
  private getUpdateStrategy(property: string): 'cardinality' | 'er_custom' | 'bpmn_standard' {
    if (property === 'cardinalitySource' || property === 'cardinalityTarget') {
      return 'cardinality';
    }

    const erCustomProperties = [
      'isWeak', 'isPrimaryKey', 'isRequired', 'isMultivalued', 'isDerived',
      'isComposite', 'isSubAttribute', 'dataType', 'description', 'erType',
      'cardinality', 'isIdentifying', 'nullable', 'type', 'isDeclarative',
      'mermaidCardinality'
    ];

    return erCustomProperties.includes(property) ? 'er_custom' : 'bpmn_standard';
  }

  /**
   * Determines if a property change should trigger re-rendering
   */
  protected shouldTriggerRerender(property: string): boolean {
    const visualProperties = [
      'name', 'isWeak', 'isPrimaryKey', 'isRequired', 'isMultivalued',
      'isDerived', 'isComposite', 'cardinalitySource', 'cardinalityTarget',
      'isIdentifying', 'dataType', 'description', 'erType', 'cardinality',
      'nullable', 'type'
    ];
    
    return visualProperties.includes(property);
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
      logger.warn('Failed to get modeler services', 'PropertyManagementService', error as Error);
      return null;
    }
  }

  /**
   * Triggers element re-rendering with appropriate strategy
   */
  private async triggerRerender(element: ErElement, property: string): Promise<void> {
    try {
      const elementRegistry = this.modeler.get('elementRegistry');
      const renderer = this.modeler.get('bpmnRenderer') || this.modeler.get('erBpmnRenderer');

      if (property === 'cardinalitySource' || property === 'cardinalityTarget') {
        await this.rerenderConnection(element, renderer);
      } else {
        await this.rerenderShape(element, elementRegistry, renderer);
      }
    } catch (error) {
      logger.error('Re-render failed', 'PropertyManagementService', error as Error);
    }
  }

  private async rerenderConnection(element: ErElement, renderer: any): Promise<void> {
    if (!element.waypoints || !renderer) return;

    if (renderer.updateConnectionCardinalities) {
      renderer.updateConnectionCardinalities(element);
    } else if (renderer.drawConnection) {
      const elementRegistry = this.modeler.get('elementRegistry');
      const connectionGfx = elementRegistry.getGraphics(element);
      if (connectionGfx && connectionGfx.innerHTML !== undefined) {
        connectionGfx.innerHTML = '';
        renderer.drawConnection(connectionGfx, element);
      }
    }
  }

  private async rerenderShape(element: ErElement, elementRegistry: any, renderer: any): Promise<void> {
    if (!renderer?.drawShape) return;

    const gfx = elementRegistry.getGraphics(element);
    if (gfx && gfx.innerHTML !== undefined) {
      gfx.innerHTML = '';
      renderer.drawShape(gfx, element);
    }

    // Force canvas update
    try {
      const canvas = this.modeler.get('canvas');
      const eventBus = this.modeler.get('eventBus');
      eventBus?.fire('render.shape', { element });
    } catch (error) {
      logger.warn('Canvas update failed', 'PropertyManagementService', error as Error);
    }
  }

  /**
   * Cleanup method
   */
  dispose(): void {
    this.eventListeners.clear();
  }
}