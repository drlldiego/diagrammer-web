/**
 * @fileoverview Serviço de gestão de propriedades para elementos ER (Modelo Entidade-Relacionamento).
 * @description Centraliza todas as operações de atualização de propriedades, redimensionamento de elementos e emissão de eventos relacionados, garantindo tipagem e tratamento de erros.
 *
 * O serviço atua como uma interface segura entre a lógica de negócio e o `modeler` (como bpmn-js/er-js), aplicando diferentes estratégias de atualização.
 */
import { logger } from '../../../../../utils/logger';
import { 
  ErElement, 
  ErBusinessObject, 
  PropertyUpdateOptions,
  ErServiceResult,
  ErPropertyUpdateEvent 
} from '../types';


/**
 * @class PropertyManagementService
 * @classdesc
 * Serviço principal responsável por gerir e persistir as propriedades dos elementos no modelo ER.
 *
 * Integra-se com o `modeler` subjacente para executar operações de modelagem, emitir eventos e garantir a atualização visual.
 */
export class PropertyManagementService {
  protected modeler: any;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(modeler: any) {
    this.modeler = modeler;
  }

  // --- Métodos de Atualização de Propriedades ---
  // ---------------------------------------------

  /**
   * Atualiza uma propriedade num elemento ER de forma segura, tipada e com gestão de eventos.
   *
   * A estratégia de atualização (direta, cardinalidade ou via `modeling.updateProperties`) é determinada
   * com base no nome da propriedade.
   *
   * @template T
   * @param {ErElement} element O elemento ER a ser modificado.
   * @param {T} property O nome da propriedade a ser atualizada, tipada a partir de `ErBusinessObject`.
   * @param {ErBusinessObject[T]} value O novo valor para a propriedade.
   * @param {PropertyUpdateOptions} [options={}] Opções para controlar o re-render e a emissão de eventos.
   * @returns {Promise<ErServiceResult<ErPropertyUpdateEvent>>} Uma promessa que resolve com o resultado da operação,
   * incluindo os dados do evento de atualização em caso de sucesso.
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

      // Determine a estratégia de atualização
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

      // Cria dados do evento de atualização
      const eventData: ErPropertyUpdateEvent = {
        element,
        property: property as string,
        oldValue,
        newValue: value,
        timestamp: Date.now()
      };

      // Dispara eventos a menos que suprimido
      if (!options.skipEventDispatch && eventBus) {
        try {
          eventBus.fire('element.changed', {
            element: element,
            properties: { [property]: value }
          });
          
          // Emite evento personalizado
          this.emitEvent('property.changed', eventData);
        } catch (eventError) {
          logger.error('Failed to dispatch events', 'PropertyManagementService', eventError as Error);
        }
      }

      // Re-renderiza o elemento se necessário
      if (!options.skipRerender && this.shouldTriggerRerender(property as string)) {
        await this.triggerRerender(element, property as string);
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
   * Atualiza múltiplas propriedades num único elemento de forma eficiente.
   *
   * Executa a atualização de cada propriedade individualmente, mas suprime os eventos de re-render e
   * mudança de evento até o final da operação, onde um único re-render e um evento de lote são acionados.
   *
   * @param {ErElement} element O elemento a ser modificado.
   * @param {Partial<ErBusinessObject>} properties Um objeto com as propriedades e os seus novos valores.
   * @param {PropertyUpdateOptions} [options={}] Opções de controlo para a atualização em lote.
   * @returns {Promise<ErServiceResult<ErPropertyUpdateEvent[]>>} Uma promessa que resolve com uma lista de eventos de atualização
   * para cada propriedade modificada.
   */
  async batchUpdateProperties(
    element: ErElement,
    properties: Partial<ErBusinessObject>,
    options: PropertyUpdateOptions = {}
  ): Promise<ErServiceResult<ErPropertyUpdateEvent[]>> {
    const results: ErPropertyUpdateEvent[] = [];
    const batchOptions = { ...options, skipRerender: true, skipEventDispatch: true };

    try {
      // Atualiza cada propriedade individualmente suprimindo re-renders e eventos
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

      // Re-render e dispare evento de lote uma vez no final
      if (!options.skipRerender) {
        await this.triggerRerender(element, 'batch_update');
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

  // --- Métodos de Gestão de Eventos ---
  // ------------------------------------

  /**
   * Adiciona um ouvinte para um evento de serviço personalizado.
   * @param {string} event O nome do evento a subscrever (ex: 'property.changed', 'element.updated').
   * @param {Function} listener A função de callback a ser executada quando o evento é emitido.
   */
  addEventListener(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  /**
   * Remove um ouvinte de um evento de serviço personalizado.
   * @param {string} event O nome do evento.
   * @param {Function} listener A função de callback a ser removida.
   */
  removeEventListener(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emite um evento de serviço personalizado para todos os ouvintes registados.
   * @private
   * @param {string} event O nome do evento a ser emitido.
   * @param {any} data Os dados a serem passados para os ouvintes do evento.
   */
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

  // --- Métodos Internos de Suporte ---
  // -----------------------------------

  /**
   * Determina a estratégia de atualização mais apropriada para uma determinada propriedade.
   *
   * As estratégias incluem: `cardinality` (para setas/conexões), `er_custom` (para propriedades específicas do ER) e
   * `bpmn_standard` (utilizando a API de modelagem padrão).
   *
   * @private
   * @param {string} property O nome da propriedade.
   * @returns {'cardinality' | 'er_custom' | 'bpmn_standard'} A estratégia de atualização a ser utilizada.
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
   * Determina se a alteração de uma propriedade específica deve desencadear uma operação de re-renderização visual.
   *
   * @protected
   * @param {string} property O nome da propriedade.
   * @returns {boolean} `true` se a propriedade for visualmente significativa e exigir re-renderização; caso contrário, `false`.
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
   * Aciona a re-renderização visual de um elemento, utilizando a estratégia adequada (forma ou conexão).
   *
   * @private
   * @param {ErElement} element O elemento a ser re-renderizado.
   * @param {string} property O nome da propriedade que foi alterada, para determinar a estratégia.
   * @returns {Promise<void>}
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

  /**
   * Força o re-render de uma conexão (seta), focando nas cardinalidades.
   * @private
   * @param {ErElement} element A conexão a ser re-renderizada.
   * @param {any} renderer O renderizador responsável.
   * @returns {Promise<void>}
   */
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

  /**
   * Força o re-render de uma forma (entidade, atributo, etc.).
   * @private
   * @param {ErElement} element A forma a ser re-renderizada.
   * @param {any} elementRegistry O registo de elementos do modeler.
   * @param {any} renderer O renderizador responsável.
   * @returns {Promise<void>}
   */
  private async rerenderShape(element: ErElement, elementRegistry: any, renderer: any): Promise<void> {
    if (!renderer?.drawShape) return;

    const gfx = elementRegistry.getGraphics(element);
    if (gfx && gfx.innerHTML !== undefined) {
      gfx.innerHTML = '';
      renderer.drawShape(gfx, element);
    }

    // Força uma atualização do canvas
    try {      
      const eventBus = this.modeler.get('eventBus');
      eventBus?.fire('render.shape', { element });
    } catch (error) {
      logger.warn('Canvas update failed', 'PropertyManagementService', error as Error);
    }
  }

  // --- Método de Limpeza ---
  // -------------------------

  /**
   * Limpa todos os ouvintes de eventos registados pelo serviço, preparando-o para o encerramento ou descarte.
   */
  dispose(): void {
    this.eventListeners.clear();
  }
}