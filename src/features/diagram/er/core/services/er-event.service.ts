import { logger } from '../../../../../utils/logger';
import { ErEventType, ErEventListener, ErServiceResult } from '../types';

/**
 * Serviço centralizado de gerenciamento de eventos para diagramas ER
 */
export class ErEventService {
  private eventBus: any;
  private listeners: Map<ErEventType, Set<ErEventListener>> = new Map();
  private globalListeners: Set<ErEventListener> = new Set();
  private isActive = true;

  constructor(eventBus?: any) {
    this.eventBus = eventBus;
    this.initializeEventTypes();
  }

  /**
   * Inscreve-se em um tipo específico de evento
   * @returns Função para cancelar a inscrição
   */
  subscribe<T = any>(
    event: ErEventType, 
    callback: ErEventListener<T>
  ): ErServiceResult<() => void> {
    if (!this.isActive) {
      return {
        success: false,
        error: {
          code: 'SERVICE_INACTIVE',
          message: 'Event service is not active',
          timestamp: Date.now()
        }
      };
    }

    try {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, new Set());
      }

      this.listeners.get(event)!.add(callback);

      // Retornar função de unsubscribe
      const unsubscribe = () => {
        this.unsubscribe(event, callback);
      };

      return {
        success: true,
        data: unsubscribe
      };
    } catch (error) {
      logger.error(`Failed to subscribe to event ${event}`, 'ErEventService', error as Error);
      return {
        success: false,
        error: {
          code: 'SUBSCRIPTION_FAILED',
          message: `Failed to subscribe to ${event}`,
          details: error,
          timestamp: Date.now()
        }
      };
    }
  }

  /**
   * Inscreve-se em todos os eventos (listener global)
   */
  subscribeGlobal<T = any>(callback: ErEventListener<T>): ErServiceResult<() => void> {
    if (!this.isActive) {
      return {
        success: false,
        error: {
          code: 'SERVICE_INACTIVE',
          message: 'Event service is not active',
          timestamp: Date.now()
        }
      };
    }

    try {
      this.globalListeners.add(callback);

      const unsubscribe = () => {
        this.globalListeners.delete(callback);
      };

      return {
        success: true,
        data: unsubscribe
      };
    } catch (error) {
      logger.error('Failed to subscribe to global events', 'ErEventService', error as Error);
      return {
        success: false,
        error: {
          code: 'GLOBAL_SUBSCRIPTION_FAILED',
          message: 'Failed to subscribe to global events',
          details: error,
          timestamp: Date.now()
        }
      };
    }
  }

  unsubscribe<T = any>(event: ErEventType, callback: ErEventListener<T>): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
      
      // Limpa o conjunto se estiver vazio
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Emite um evento para todos os subscribers
   */
  emit<T = any>(event: ErEventType, data: T): ErServiceResult<void> {
    if (!this.isActive) {
      return {
        success: false,
        error: {
          code: 'SERVICE_INACTIVE',
          message: 'Event service is not active',
          timestamp: Date.now()
        }
      };
    }

    try {
      const eventData = {
        type: event,
        data,
        timestamp: Date.now()
      };

      // Emitir para listeners específicos do evento
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.forEach(listener => {
          try {
            listener(event, data);
          } catch (error) {
            logger.error(`Event listener error for ${event}`, 'ErEventService', error as Error);
          }
        });
      }

      // Emitir para listeners globais
      this.globalListeners.forEach(listener => {
        try {
          listener(event, data);
        } catch (error) {
          logger.error(`Global event listener error for ${event}`, 'ErEventService', error as Error);
        }
      });

      // Emitir para o barramento de eventos externo, se disponível
      if (this.eventBus && typeof this.eventBus.fire === 'function') {
        try {
          this.eventBus.fire(`er.${event}`, eventData);
        } catch (error) {
          logger.warn(`Failed to emit to external event bus for ${event}`, 'ErEventService', error as Error);
        }
      }

      return { success: true };

    } catch (error) {
      logger.error(`Failed to emit event ${event}`, 'ErEventService', error as Error);
      return {
        success: false,
        error: {
          code: 'EMIT_FAILED',
          message: `Failed to emit event ${event}`,
          details: error,
          timestamp: Date.now()
        }
      };
    }
  }

  emitBatch<T = any>(events: Array<{ type: ErEventType; data: T }>): ErServiceResult<void> {
    const results: ErServiceResult<void>[] = [];

    for (const { type, data } of events) {
      const result = this.emit(type, data);
      results.push(result);
      
      // Parar a emissão em lote se algum evento falhar
      if (!result.success) {
        logger.warn(`Batch emit stopped at ${type} due to error`);
        break;
      }
    }

    const failedResults = results.filter(r => !r.success);
    
    if (failedResults.length > 0) {
      return {
        success: false,
        error: {
          code: 'BATCH_EMIT_FAILED',
          message: `${failedResults.length} events failed to emit`,
          details: failedResults,
          timestamp: Date.now()
        }
      };
    }

    return { success: true };
  }

  getStatistics() {
    const eventStats: Record<string, number> = {};
    
    this.listeners.forEach((listeners, event) => {
      eventStats[event] = listeners.size;
    });

    return {
      totalEvents: this.listeners.size,
      globalListeners: this.globalListeners.size,
      eventStats,
      isActive: this.isActive
    };
  }

  hasListeners(event: ErEventType): boolean {
    const eventListeners = this.listeners.get(event);
    return (eventListeners && eventListeners.size > 0) || this.globalListeners.size > 0;
  }

  removeAllListeners(event?: ErEventType): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
      this.globalListeners.clear();
    }
  }

  pause(): void {
    this.isActive = false;
  }

  resume(): void {
    this.isActive = true;
  }

  setEventBus(eventBus: any): void {
    this.eventBus = eventBus;
  }

  /**
   * Limpa e descarta o serviço
   */
  dispose(): void {
    this.isActive = false;
    this.listeners.clear();
    this.globalListeners.clear();
    this.eventBus = null;
  }

  private initializeEventTypes(): void {
    const eventTypes: ErEventType[] = [
      'element.created',
      'element.updated',
      'element.deleted',
      'element.selected',
      'element.deselected',
      'property.changed',
      'connection.created',
      'connection.updated',
      'connection.deleted',
      'diagram.mode.changed',
      'diagram.notation.changed',
      'validation.completed',
      'export.completed',
      'import.completed'
    ];

    eventTypes.forEach(event => {
      this.listeners.set(event, new Set());
    });
  }
}