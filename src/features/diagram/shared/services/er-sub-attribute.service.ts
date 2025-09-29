/**
 * Service para criação e gerenciamento de sub-atributos ER
 * Encapsula toda a lógica de criação de sub-atributos
 */

import { ErElement } from '../../er/core';
import { ErElementUtils } from '../utilities/er-element-utilities';
import { logger } from '../../../../utils/logger';

export interface SubAttributeOptions {
  name?: string;
  dataType?: string;
  isRequired?: boolean;
  isPrimaryKey?: boolean;
  isMultivalued?: boolean;
  isDerived?: boolean;
  timeout?: number;
}

export interface SubAttributeResult {
  success: boolean;
  subAttribute?: any;
  connection?: any;
  error?: string;
}

export class ErSubAttributeService {
  private modeler: any;
  private modeling: any;
  private elementFactory: any;
  private erElementFactory: any;
  private elementRegistry: any;
  private canvas: any;
  private selection: any;

  constructor(modeler: any) {
    this.modeler = modeler;
    this.modeling = modeler.get('modeling');
    this.elementFactory = modeler.get('elementFactory');
    this.elementRegistry = modeler.get('elementRegistry');
    this.canvas = modeler.get('canvas');
    this.selection = modeler.get('selection');
    
    // Try to get erElementFactory if available
    try {
      this.erElementFactory = modeler.get('erElementFactory');
    } catch {
      this.erElementFactory = null;
    }
  }

  /**
   * Cria um sub-atributo para um elemento pai
   */
  async createSubAttribute(
    parentElement: ErElement, 
    properties: any, 
    options: SubAttributeOptions = {}
  ): Promise<SubAttributeResult> {
    const { 
      name, 
      dataType = 'VARCHAR',
      isRequired = true,
      isPrimaryKey = false,
      isMultivalued = false,
      isDerived = false,
      timeout = 400
    } = options;

    try {
      // Validar se sub-atributo pode ser criado
      const validation = ErElementUtils.validateSubAttributeCreation(parentElement, properties);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.reason
        };
      }

      ErElementUtils.logOperation('Criação de sub-atributo', 1, { 
        parentId: parentElement.id, 
        parentType: properties?.erType 
      });

      // Determinar posicionamento
      const positioning = this.calculateSubAttributePosition(parentElement, properties);
      
      // Gerar nome único
      const uniqueName = name || this.generateUniqueSubAttributeName(parentElement);

      // Criar sub-atributo
      const subAttribute = await this.createSubAttributeShape(
        parentElement,
        positioning,
        uniqueName,
        { dataType, isRequired, isPrimaryKey, isMultivalued, isDerived }
      );

      if (!subAttribute) {
        return {
          success: false,
          error: 'Falha ao criar sub-atributo'
        };
      }

      // Criar conexão visual se necessário
      const connection = await this.createSubAttributeConnection(
        parentElement, 
        subAttribute, 
        properties,
        timeout
      );

      // Auto-scroll e selecionar sub-atributo
      await this.focusOnSubAttribute(subAttribute, timeout);

      // Reorganizar sub-atributos se possível
      await this.reorganizeSubAttributes(parentElement);

      logger.info('Sub-atributo criado com sucesso', 'ErSubAttributeService');

      return {
        success: true,
        subAttribute,
        connection
      };

    } catch (error) {
      logger.error('Erro ao criar sub-atributo:', 'ErSubAttributeService', error as Error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Calcula a posição ideal para o sub-atributo
   */
  private calculateSubAttributePosition(parentElement: ErElement, properties: any): {
    x: number;
    y: number;
    parentElement: any;
  } {
    const parentX = parentElement.x || 0;
    const parentY = parentElement.y || 0;
    const parentWidth = parentElement.width || 80;
    const parentHeight = parentElement.height || 50;    
    
      // Colocar sub-atributo fora, próximo ao pai
      const initialX = parentX + 20;
      const initialY = parentY + parentHeight + 30;
      
      const freePosition = ErElementUtils.findFreePosition(
        this.elementRegistry,
        initialX, 
        initialY, 
        80, 
        50
      );

      return {
        x: freePosition.x,
        y: freePosition.y,
        parentElement: this.canvas.getRootElement()
      };
    
  }

  /**
   * Cria o shape do sub-atributo
   */
  private async createSubAttributeShape(
    parentElement: ErElement,
    positioning: any,
    name: string,
    attributeProperties: any
  ): Promise<any> {
    try {
      let subAttributeShape;

      // Usar erElementFactory se disponível
      if (this.erElementFactory && typeof this.erElementFactory.createShape === 'function') {
        subAttributeShape = this.erElementFactory.createShape({
          type: 'bpmn:IntermediateCatchEvent',
          width: 80,
          height: 50,
          erType: 'Attribute',
          name: name,
          isRequired: attributeProperties.isRequired,
          isPrimaryKey: attributeProperties.isPrimaryKey,        
          isMultivalued: attributeProperties.isMultivalued,
          isDerived: attributeProperties.isDerived,
          isComposite: false,
          isSubAttribute: true,
          dataType: attributeProperties.dataType
        });
      } else {
        // Fallback para elementFactory padrão
        subAttributeShape = this.elementFactory.createShape({
          type: 'bpmn:IntermediateCatchEvent',
          businessObject: {
            id: `SubAttribute_${Date.now()}`,
            name: name,
            erType: 'Attribute',
            isRequired: attributeProperties.isRequired,
            isPrimaryKey: attributeProperties.isPrimaryKey,        
            isMultivalued: attributeProperties.isMultivalued,
            isDerived: attributeProperties.isDerived,
            isComposite: false,
            isSubAttribute: true,
            dataType: attributeProperties.dataType
          }
        });
      }

      // Criar o sub-atributo no diagrama
      const createdElement = this.modeling.createShape(
        subAttributeShape,
        { x: positioning.x, y: positioning.y },
        positioning.parentElement
      );

      logger.debug(`Sub-atributo criado: ${createdElement.id} em posição (${positioning.x}, ${positioning.y})`, 'ErSubAttributeService');

      return createdElement;

    } catch (error) {
      logger.error('Erro ao criar shape do sub-atributo:', 'ErSubAttributeService', error as Error);
      return null;
    }
  }

  /**
   * Cria conexão visual entre pai e sub-atributo
   */
  private async createSubAttributeConnection(
    parentElement: ErElement,
    subAttribute: any,
    properties: any,
    timeout: number
  ): Promise<any> {

    try {
      const parentX = parentElement.x || 0;
      const parentY = parentElement.y || 0;
      const parentWidth = parentElement.width || 80;
      const parentHeight = parentElement.height || 50;

      const connectionShape = this.elementFactory.createConnection({
        type: 'bpmn:SequenceFlow',
        source: parentElement,
        target: subAttribute,
        waypoints: [
          { x: parentX + parentWidth / 2, y: parentY + parentHeight },
          { x: subAttribute.x + 40, y: subAttribute.y }
        ]
      });
      
      const connection = this.modeling.createConnection(
        parentElement,
        subAttribute,
        connectionShape,
        this.canvas.getRootElement()
      );

      // Marcar a conexão como pai-filho
      if (connection.businessObject) {
        connection.businessObject.isParentChild = true;
        
        try {
          this.modeling.updateProperties(connection, { isParentChild: true });
        } catch (attrError) {
          logger.error('Erro ao atualizar propriedades da conexão:', 'ErSubAttributeService', attrError as Error);
        }
      }

      logger.debug('Conexão visual criada entre pai e sub-atributo', 'ErSubAttributeService');
      
      return connection;

    } catch (connectionError) {
      logger.error('Erro ao criar conexão visual:', 'ErSubAttributeService', connectionError as Error);
      logger.warn('Sub-atributo foi criado mas sem conexão visual');
      return null;
    }
  }

  /**
   * Gera nome único para sub-atributo
   */
  private generateUniqueSubAttributeName(parentElement: ErElement): string {
    return ErElementUtils.generateUniqueName(
      this.elementRegistry,
      'Sub-atributo',
      'Attribute',
      parentElement.id
    );
  }

  /**
   * Foca na visualização do sub-atributo criado
   */
  private async focusOnSubAttribute(subAttribute: any, timeout: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          const elementCenter = {
            x: subAttribute.x + (subAttribute.width || 80) / 2,
            y: subAttribute.y + (subAttribute.height || 50) / 2
          };
          
          this.canvas.scroll(elementCenter);
          this.selection.select(subAttribute);
          
          logger.debug('Foco direcionado para o sub-atributo criado', 'ErSubAttributeService');
        } catch (error) {
          logger.error('Erro ao focar no sub-atributo:', 'ErSubAttributeService', error as Error);
        }
        
        resolve();
      }, timeout);
    });
  }

  /**
   * Reorganiza sub-atributos após criação
   */
  private async reorganizeSubAttributes(parentElement: ErElement): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          const erMoveRules = this.modeler.get('erMoveRules');
          
          if (erMoveRules && typeof erMoveRules.reorganizeSubAttributes === 'function') {
            erMoveRules.reorganizeSubAttributes(parentElement);
            logger.debug('Sub-atributos reorganizados', 'ErSubAttributeService');
          } else {
            logger.warn('ErMoveRules não disponível para reorganização', 'ErSubAttributeService');
          }
        } catch (error) {
          logger.error('Erro ao reorganizar sub-atributos:', 'ErSubAttributeService', error as Error);
        }
        
        resolve();
      }, 300);
    });
  }

  /**
   * Verifica se o modeler está disponível e válido
   */
  isReady(): boolean {
    return !!(this.modeler && this.modeling && this.elementFactory && this.elementRegistry);
  }
}