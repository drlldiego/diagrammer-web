/**
 * Serviço de Gerenciamento de Propriedades (Unificado)
 * Integra toda a funcionalidade de gerenciamento de propriedades com otimizações de renderização
 * 
 * Combina a funcionalidade base com recursos aprimorados para desempenho ideal
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
   * Atualiza a notação e a estratégia de renderização
   */
  setNotation(notation: DiagramNotation): void {
    this.renderingService.setStrategy(notation);
  }

  /**
   * Atualiza uma propriedade em um elemento ER com segurança de tipo e renderização aprimorada
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
          message: 'Elemento ou modelo é nulo',
          timestamp: Date.now()
        }
      };
    }

    try {
      const oldValue = element.businessObject[property];
      const modeling = this.modeler.get('modeling');
      const eventBus = this.modeler.get('eventBus');
      const businessObject = element.businessObject;

      // Determina a estratégia de atualização com base no tipo de propriedade
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
              logger.warn('modeling.updateProperties falhou, usando fallback', 'PropertyManagementService', modelingError as Error);
              businessObject[property] = value;
            }
          } else {
            businessObject[property] = value;
          }
          break;
      }

      // Cria os dados do evento
      const eventData: ErPropertyUpdateEvent = {
        element,
        property: property as string,
        oldValue,
        newValue: value,
        timestamp: Date.now()
      };

      // Despacha eventos, a menos que seja pulado
      if (!options.skipEventDispatch && eventBus) {
        try {
          eventBus.fire('element.changed', {
            element: element,
            properties: { [property]: value }
          });

          // Emite evento de alteração de propriedade personalizada
          this.emitEvent('property.changed', eventData);
        } catch (eventError) {
          logger.error('Falha ao disparar eventos', 'PropertyManagementService', eventError as Error);
        }
      }

      // Re-renderização aprimorada com padrão de estratégia
      if (!options.skipRerender && this.shouldTriggerRerender(property as string)) {
        await this.enhancedRerender(element, property as string, options);
      }

      return {
        success: true,
        data: eventData
      };

    } catch (error) {
      logger.error('Falha ao atualizar propriedade', 'PropertyManagementService', error as Error);
      return {
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: `Falha ao atualizar propriedade ${String(property)}`,
          details: error,
          element,
          timestamp: Date.now()
        }
      };
    }
  }

  /**
   * Atualiza as dimensões do elemento com validação
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
          message: 'Elemento ou modeler é nulo',
          timestamp: Date.now()
        }
      };
    }

    const { width, height } = dimensions;
    const minWidth = 50;
    const minHeight = 30;

    // Validação
    if (width && width < minWidth) {
      return {
        success: false,
        error: {
          code: 'INVALID_DIMENSIONS',
          message: `A largura deve ser pelo menos ${minWidth}px`,
          timestamp: Date.now()
        }
      };
    }

    if (height && height < minHeight) {
      return {
        success: false,
        error: {
          code: 'INVALID_DIMENSIONS',
          message: `A altura deve ser pelo menos ${minHeight}px`,
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
      logger.error('Falha ao redimensionar elemento', 'PropertyManagementService', error as Error);
      return {
        success: false,
        error: {
          code: 'RESIZE_FAILED',
          message: 'Falha ao redimensionar elemento',
          details: error,
          element,
          timestamp: Date.now()
        }
      };
    }
  }

  /**
   * Atualiza em lote várias propriedades com renderização aprimorada
   */
  async batchUpdateProperties(
    element: ErElement,
    properties: Partial<ErBusinessObject>,
    options: PropertyUpdateOptions = {}
  ): Promise<ErServiceResult<ErPropertyUpdateEvent[]>> {
    const results: ErPropertyUpdateEvent[] = [];
    const batchOptions = { ...options, skipRerender: true, skipEventDispatch: true };

    try {
      // Atualiza todas as propriedades sem re-renderização
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

      // Re-renderização aprimorada em lote
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
      logger.error('Falha ao atualizar propriedades em lote', 'PropertyManagementService', error as Error);
      return {
        success: false,
        error: {
          code: 'BATCH_UPDATE_FAILED',
          message: 'Falha ao atualizar propriedades em lote',
          details: error,
          element,
          timestamp: Date.now()
        }
      };
    }
  }

  /**
   * Re-renderização aprimorada usando padrão de estratégia
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
        // Usa a estratégia de renderização para atualizações otimizadas
        this.renderingService.updateElementVisuals(
          element,
          property,
          gfx,
          services.renderer
        );

        // Adiciona feedback visual para a atualização
        this.addUpdateFeedback(element, property);
      }
    } catch (error) {
      logger.error('Falha ao disparar re-renderização aprimorada', 'PropertyManagementService', error as Error);
      // Retorno para re-renderização básica
      await this.triggerRerender(element, property);
    }
  }

  /**
   * Re-renderização aprimorada em lote
   */
  private async batchRerender(element: ErElement, properties: string[]): Promise<void> {
    try {
      const services = this.getModelerServices();
      if (!services) return;

      const { elementRegistry } = services;
      const gfx = elementRegistry.getGraphics(element);
      
      if (gfx) {
        // Determina se a re-renderização completa é necessária ou se podemos fazer atualizações parciais
        const needsFullRerender = this.needsFullRerender(properties);
        
        if (needsFullRerender) {
          this.renderingService.renderElement(element, gfx, services.renderer);
        } else {
          // Aplica atualizações individuais de propriedades
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

        // Adiciona feedback de atualização em lote
        this.addBatchUpdateFeedback(element, properties);
      }
    } catch (error) {
      logger.error('Falha ao disparar re-renderização em lote', 'PropertyManagementService', error as Error);
    }
  }

  /**
   * Re-renderização manual usando a estratégia atual
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
      logger.error('Falha ao disparar re-renderização manual', 'PropertyManagementService', error as Error);
    }
  }

  /**
   * Get dos estilos do elemento da estratégia de renderização atual
   */
  getElementStyles(element: ErElement): Record<string, any> {
    return this.renderingService.getElementStyles(element);
  }

  /**
   * Get das informações da estratégia de renderização atual
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
   * Atualiza a estratégia de renderização quando a notação muda
   */
  updateRenderingStrategy(notation: DiagramNotation): void {
    this.renderingService.setStrategy(notation);
  }

  /**
   * Gerenciamento de eventos
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
        logger.error(`Erro ao disparar evento ${event}`, 'PropertyManagementService', error as Error);
      }
    });
  }

  /**
   * Determina a estratégia de atualização apropriada para uma propriedade
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
   * Determina se uma mudança de propriedade deve acionar a re-renderização
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
   * Determina se as propriedades exigem re-renderização completa
   */
  private needsFullRerender(properties: string[]): boolean {
    const fullRerenderProperties = [
      'name', 'erType', 'isWeak', 'isIdentifying'
    ];
    
    return properties.some(prop => fullRerenderProperties.includes(prop));
  }

  /**
   * Adiciona feedback visual para atualizações de propriedades
   */
  private addUpdateFeedback(element: ErElement, property: string): void {
    try {
      const services = this.getModelerServices();
      if (!services?.canvas) return;

      const feedbackClass = this.getFeedbackClass(property);
      services.canvas.addMarker(element, feedbackClass);

      // Remove feedback após um curto período
      setTimeout(() => {
        services.canvas?.removeMarker(element, feedbackClass);
      }, 300);
    } catch (error) {
      logger.warn('Falha ao adicionar feedback de atualização', 'PropertyManagementService', error as Error);
    }
  }

  /**
   * Adiciona feedback visual para atualizações em lote
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
      logger.warn('Falha ao adicionar feedback de atualização em lote', 'PropertyManagementService', error as Error);
    }
  }

  /**
   * Gets da classe de feedback apropriada para uma propriedade
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
   * Gets serviços do modeler com tratamento de erros
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
      logger.warn('Falha ao obter serviços do modeler', 'PropertyManagementService', error as Error);
      return null;
    }
  }

  /**
   * Trigger de re-renderização como fallback
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
      logger.error('Falha ao disparar re-renderização', 'PropertyManagementService', error as Error);
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

    // Forçar atualização do canvas
    try {
      const canvas = this.modeler.get('canvas');
      const eventBus = this.modeler.get('eventBus');
      eventBus?.fire('render.shape', { element });
    } catch (error) {
      logger.warn('Falha ao atualizar o canvas', 'PropertyManagementService', error as Error);
    }
  }

  /**
   * Método de limpeza para remover listeners e liberar recursos
   */
  dispose(): void {
    this.eventListeners.clear();
  }
}