/**
 * Service para agrupamento de elementos ER
 * Encapsula toda a lógica de criação de containers e agrupamento
 */

import { ErElement } from "../../er/core";
import { ErElementUtils } from "../utilities/er-element-utilities";
import { logger } from "../../../../utils/logger";

export interface GroupingOptions {
  notation: "chen" | "crowsfoot";
  containerName?: string;
  padding?: number;
  timeout?: number;
}

export interface GroupingResult {
  success: boolean;
  container?: any;
  movedElements?: ErElement[];
  error?: string;
}

export class ErElementGroupingService {
  private modeler: any;
  private modeling: any;
  private elementFactory: any;
  private erElementFactory: any;
  private elementRegistry: any;
  private canvas: any;
  private selection: any;
  private eventBus: any;
  private groupedElements: Map<string, ErElement[]> = new Map();

  constructor(modeler: any) {
    this.modeler = modeler;
    this.modeling = modeler.get("modeling");
    this.elementFactory = modeler.get("elementFactory");
    this.elementRegistry = modeler.get("elementRegistry");
    this.canvas = modeler.get("canvas");
    this.selection = modeler.get("selection");
    this.eventBus = modeler.get("eventBus");

    // Try to get erElementFactory if available
    try {
      this.erElementFactory = modeler.get("erElementFactory");
    } catch {
      this.erElementFactory = null;
    }

    this.setupEventListeners();
  }

  /**
   * Agrupa elementos selecionados em um container composto
   */
  public async groupElements(
    elements: ErElement[],
    options: GroupingOptions
  ): Promise<GroupingResult> {
    const { notation, containerName, padding = 40, timeout = 500 } = options;

    try {
      // Validar se agrupamento é possível
      const validation = ErElementUtils.validateGrouping(elements, notation);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.reason,
        };
      }

      // Filtrar apenas elementos ER válidos
      const erElementsToGroup = elements.filter(
        (el) =>
          el.businessObject?.erType &&
          el.type !== "bpmn:SequenceFlow" &&
          el.type !== "label"
      );

      ErElementUtils.logOperation("Agrupamento", erElementsToGroup.length, {
        notation,
      });

      // Calcular posicionamento
      const bounds = ErElementUtils.calculateBounds(erElementsToGroup);
      const idealSize = ErElementUtils.calculateIdealContainerSize(
        erElementsToGroup,
        padding
      );

      // Criar container
      const container = await this.createContainer(
        erElementsToGroup,
        bounds,
        idealSize,
        containerName || `Agrupamento (${erElementsToGroup.length} elementos)`
      );

      if (!container) {
        return {
          success: false,
          error: "Falha ao criar container",
        };
      }

      // Para bpmn:Group, não precisamos mover elementos para dentro,
      // apenas posicioná-los próximos e armazenar a relação
      const positionResult = await this.positionElementsNearGroup(
        erElementsToGroup,
        container,
        padding
      );

      if (!positionResult.success) {
        return {
          success: false,
          error: positionResult.error,
          container,
        };
      }

      // Auto-scroll e selecionar container
      await this.focusOnContainer(container);

      logger.info(
        `Agrupamento concluído com sucesso - ${erElementsToGroup.length} elementos`,
        "ErElementGroupingService"
      );

      return {
        success: true,
        container,
        movedElements: erElementsToGroup,
      };
    } catch (error) {
      logger.error(
        "Erro no agrupamento de elementos:",
        "ErElementGroupingService",
        error as Error
      );
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Cria o container para agrupamento
   */
  private async createContainer(
    elements: ErElement[],
    bounds: any,
    idealSize: any,
    name: string
  ): Promise<any> {
    try {
      const bpmnFactory = this.modeler.get("bpmnFactory");
      const root = this.canvas.getRootElement();

      if (!root) {
        throw new Error("Root element não encontrado");
      }

      const bo = bpmnFactory.create("bpmn:Group", {
        id: `CompositeContainer_${Date.now()}`,
        erType: "CompositeAttribute",
        isComposite: true
      });

      const containerShape = this.elementFactory.createShape({
        type: "bpmn:Group",
        width: idealSize.width,
        height: idealSize.height,
        businessObject: bo,
      });

      const createdContainer = this.modeling.createShape(
        containerShape,
        { x: bounds.x - 20, y: bounds.y - 30 },
        root
      );      

      logger.debug(
        `Container criado: ${createdContainer.id} em posição (${
          bounds.x - 20
        }, ${bounds.y - 30})`,
        "ErElementGroupingService"
      );

      // Armazenar relação entre grupo e elementos filhos
      this.groupedElements.set(createdContainer.id, elements);
      
      logger.info(
        `Grupo ${createdContainer.id} criado com ${elements.length} elementos filhos`,
        "ErElementGroupingService"
      );
      
      // Log dos elementos filhos para debug
      elements.forEach((el, index) => {
        logger.debug(`  Elemento ${index + 1}: ${el.id} em (${el.x}, ${el.y})`, "ErElementGroupingService");
      });

      return createdContainer;
    } catch (error) {
      logger.error(
        "Erro ao criar container:",
        "ErElementGroupingService",
        error as Error
      );
      return null;
    }
  }

  /**
   * Posiciona elementos próximos ao grupo (em grid)
   */
  private async positionElementsNearGroup(
    elements: ErElement[],
    group: any,
    padding: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!group || !group.id) {
        return {
          success: false,
          error: "Grupo não foi criado corretamente",
        };
      }

      logger.info(
        `Posicionando ${elements.length} elementos próximos ao grupo ${group.id}`,
        "ErElementGroupingService"
      );

      let positionErrors = 0;

      for (let index = 0; index < elements.length; index++) {
        const element = elements[index];

        try {
          // Calcular posição em grid dentro do grupo
          const targetX = group.x + padding + (index % 2) * 120;
          const targetY = group.y + padding + Math.floor(index / 2) * 80;
          const delta = {
            x: targetX - (element.x || 0),
            y: targetY - (element.y || 0),
          };

          this.modeling.moveShape(element, delta);
          logger.debug(
            `Elemento ${index + 1}/${elements.length} (${
              element.id
            }) posicionado em (${targetX}, ${targetY})`,
            "ErElementGroupingService"
          );
        } catch (positionError) {
          logger.error(
            `Falha ao posicionar elemento ${element.id}`,
            "ErElementGroupingService",
            positionError as Error
          );
          positionErrors++;
        }
      }

      if (positionErrors === elements.length) {
        return {
          success: false,
          error: "Falha ao posicionar todos os elementos",
        };
      } else if (positionErrors > 0) {
        return {
          success: true,
          error: `${positionErrors} elemento(s) não puderam ser posicionados`,
        };
      }

      return { success: true };
    } catch (error) {
      logger.error(
        "Erro geral ao posicionar elementos:",
        "ErElementGroupingService",
        error as Error
      );
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Foca na visualização do container criado
   */
  private async focusOnContainer(container: any): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          const containerCenter = {
            x: container.x + container.width / 2,
            y: container.y + container.height / 2,
          };

          this.canvas.scroll(containerCenter);
          this.selection.select(container);

          logger.debug(
            "Foco direcionado para o container criado",
            "ErElementGroupingService"
          );
        } catch (error) {
          logger.error(
            "Erro ao focar no container:",
            "ErElementGroupingService",
            error as Error
          );
        }

        resolve();
      }, 600);
    });
  }

  /**
   * Configura os event listeners para movimento de grupos
   */
  private setupEventListeners(): void {
    // Armazenar posição anterior dos grupos para calcular delta
    const groupPositions: Map<string, { x: number; y: number }> = new Map();

    // Escutar quando um elemento começa a se mover
    this.eventBus.on('element.move.start', (event: any) => {
      const { element } = event;
      
      if (element.type === 'bpmn:Group' && 
          element.businessObject?.erType === 'CompositeAttribute' &&
          this.groupedElements.has(element.id)) {
        
        // Armazenar posição inicial
        groupPositions.set(element.id, { x: element.x, y: element.y });
        logger.debug(`Iniciando movimento do grupo ${element.id} em (${element.x}, ${element.y})`, "ErElementGroupingService");
      }
    });

    // Escutar quando um elemento termina de se mover
    this.eventBus.on('element.move.end', (event: any) => {
      const { element } = event;
      
      // Verificar se é um grupo ER
      if (element.type === 'bpmn:Group' && 
          element.businessObject?.erType === 'CompositeAttribute' &&
          this.groupedElements.has(element.id)) {
        
        const previousPosition = groupPositions.get(element.id);
        if (previousPosition) {
          // Calcular delta manualmente
          const delta = {
            x: element.x - previousPosition.x,
            y: element.y - previousPosition.y
          };
          
          logger.debug(`Grupo ${element.id} movido de (${previousPosition.x}, ${previousPosition.y}) para (${element.x}, ${element.y}), delta: (${delta.x}, ${delta.y})`, "ErElementGroupingService");
          
          if (delta.x !== 0 || delta.y !== 0) {
            this.moveGroupElements(element, delta);
          }
          
          // Limpar posição armazenada
          groupPositions.delete(element.id);
        } else {
          // Fallback para event.delta se disponível
          if (event.delta && (event.delta.x !== 0 || event.delta.y !== 0)) {
            logger.debug(`Usando event.delta para grupo ${element.id}: (${event.delta.x}, ${event.delta.y})`, "ErElementGroupingService");
            this.moveGroupElements(element, event.delta);
          }
        }
      }
    });
  }

  /**
   * Move elementos filhos quando o grupo é movido
   */
  private moveGroupElements(group: any, delta: { x: number; y: number }): void {
    const childElements = this.groupedElements.get(group.id);
    
    if (!childElements || childElements.length === 0) {
      logger.warn(`Nenhum elemento filho encontrado para o grupo ${group.id}`, "ErElementGroupingService");
      return;
    }

    try {
      logger.info(
        `Movendo ${childElements.length} elementos filhos do grupo ${group.id} com delta (${delta.x}, ${delta.y})`,
        "ErElementGroupingService"
      );

      // Verificar se os elementos ainda existem no elementRegistry
      const validElements = childElements.filter(el => {
        const exists = this.elementRegistry.get(el.id);
        if (!exists) {
          logger.warn(`Elemento ${el.id} não encontrado no registry`, "ErElementGroupingService");
        }
        return exists;
      });

      if (validElements.length === 0) {
        logger.warn(`Nenhum elemento válido encontrado para mover`, "ErElementGroupingService");
        return;
      }

      // Aplicar o mesmo delta a todos os elementos filhos válidos
      this.modeling.moveElements(validElements, delta);

      logger.info(
        `${validElements.length} elementos filhos movidos com sucesso`,
        "ErElementGroupingService"
      );
    } catch (error) {
      logger.error(
        "Erro ao mover elementos filhos:",
        "ErElementGroupingService",
        error as Error
      );
    }
  }

  /**
   * Remove um grupo e limpa suas referências
   */
  public removeGroup(groupId: string): void {
    this.groupedElements.delete(groupId);
    logger.debug(`Grupo ${groupId} removido das referências`, "ErElementGroupingService");
  }

  /**
   * Obtém elementos filhos de um grupo
   */
  public getGroupElements(groupId: string): ErElement[] | undefined {
    return this.groupedElements.get(groupId);
  }

  /**
   * Verifica se o modeler está disponível e válido
   */
  isReady(): boolean {
    return !!(
      this.modeler &&
      this.modeling &&
      this.elementFactory &&
      this.elementRegistry
    );
  }

  /**
   * Debug: mostra informações sobre grupos ativos
   */
  public debugGroupInfo(): void {
    logger.info(`Grupos ativos: ${this.groupedElements.size}`, "ErElementGroupingService");
    
    this.groupedElements.forEach((elements, groupId) => {
      const group = this.elementRegistry.get(groupId);
      logger.info(`Grupo ${groupId}:`, "ErElementGroupingService");
      logger.info(`  - Posição: (${group?.x}, ${group?.y})`, "ErElementGroupingService");
      logger.info(`  - Elementos: ${elements.length}`, "ErElementGroupingService");
      
      elements.forEach((el, index) => {
        const registryEl = this.elementRegistry.get(el.id);
        logger.info(`    ${index + 1}. ${el.id} - existe: ${!!registryEl} - pos: (${registryEl?.x}, ${registryEl?.y})`, "ErElementGroupingService");
      });
    });
  }
}
