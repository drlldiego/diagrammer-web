/**
 * ErElementUtils - Utilitários centralizados para elementos ER
 * Consolida lógica que estava duplicada em vários providers
 */

import { ErElement, ErBusinessObject } from '../types';

export class ErElementUtils {
  /**
   * Obter tipo ER de um elemento (lógica antes duplicada em vários arquivos)
   */
  static getErType(element: any): string | null {
    if (!element?.businessObject) return null;
    
    return element.businessObject.erType || 
           element.businessObject.$attrs?.['er:erType'] ||
           element.businessObject.$attrs?.['ns0:erType'] || 
           null;
  }

  /**
   * Verificar se é uma entidade
   */
  static isEntity(element: any): boolean {
    return this.getErType(element) === 'Entity';
  }

  /**
   * Verificar se é um atributo
   */
  static isAttribute(element: any): boolean {
    return this.getErType(element) === 'Attribute';
  }

  /**
   * Verificar se é um relacionamento
   */
  static isRelationship(element: any): boolean {
    return this.getErType(element) === 'Relationship';
  }

  /**
   * Verificar se é um sub-atributo
   */
  static isSubAttribute(element: any): boolean {
    return this.getErType(element) === 'SubAttribute';
  }

  /**
   * Verificar se é um atributo composto
   */
  static isCompositeAttribute(element: any): boolean {
    return this.isAttribute(element) && element.businessObject?.isComposite === true;
  }

  /**
   * Verificar se é elemento ER por tipo BPMN (para elementos importados)
   */
  static isErElementByBpmnType(element: any): boolean {
    if (!element?.type) return false;

    const erType = this.getErType(element);
    
    return (
      (element.type === 'bpmn:Task' && erType === 'Entity') ||
      (element.type === 'bpmn:IntermediateCatchEvent' && (erType === 'Attribute' || erType === 'SubAttribute')) ||
      (element.type === 'bpmn:ParallelGateway' && erType === 'Relationship')
    );
  }

  /**
   * Verificar se elemento tem cores customizadas (helper para providers)
   */
  static hasCustomColors(element: any): boolean {
    if (!element?.businessObject?.$attrs) return false;
    
    return !!(
      element.businessObject.$attrs['bioc:fill'] ||
      element.businessObject.$attrs['bioc:stroke']
    );
  }

  /**
   * Obter propriedades de cardinalidade de um elemento
   */
  static getCardinalityProperties(element: any): { source?: string; target?: string } {
    if (!element?.businessObject) return {};
    
    const bo = element.businessObject;
    
    return {
      source: bo.cardinalitySource || 
              bo.$attrs?.['er:cardinalitySource'] ||
              bo.$attrs?.['ns0:cardinalitySource'],
      target: bo.cardinalityTarget || 
              bo.$attrs?.['er:cardinalityTarget'] ||
              bo.$attrs?.['ns0:cardinalityTarget']
    };
  }

  /**
   * Verificar se é uma conexão pai-filho (atributo composto)
   */
  static isParentChildConnection(element: any): boolean {
    if (!element?.businessObject) return false;
    
    return element.businessObject.isParentChild === true ||
           element.businessObject.$attrs?.['er:isParentChild'] === 'true' ||
           element.businessObject.$attrs?.['ns0:isParentChild'] === 'true';
  }

  /**
   * Verificar se é uma entidade fraca
   */
  static isWeakEntity(element: any): boolean {
    if (!this.isEntity(element)) return false;
    
    return element.businessObject.isWeak === true ||
           element.businessObject.$attrs?.['er:isWeak'] === 'true' ||
           element.businessObject.$attrs?.['ns0:isWeak'] === 'true';
  }

  /**
   * Verificar se é um relacionamento identificador
   */
  static isIdentifyingRelationship(element: any): boolean {
    if (!this.isRelationship(element)) return false;
    
    return element.businessObject.isIdentifying === true ||
           element.businessObject.$attrs?.['er:isIdentifying'] === 'true' ||
           element.businessObject.$attrs?.['ns0:isIdentifying'] === 'true';
  }

  /**
   * Verificar se é uma chave primária
   */
  static isPrimaryKey(element: any): boolean {
    if (!this.isAttribute(element)) return false;
    
    return element.businessObject.isPrimaryKey === true ||
           element.businessObject.$attrs?.['er:isPrimaryKey'] === 'true' ||
           element.businessObject.$attrs?.['ns0:isPrimaryKey'] === 'true';
  }

  /**
   * Verificar se é um atributo obrigatório
   */
  static isRequiredAttribute(element: any): boolean {
    if (!this.isAttribute(element)) return false;
    
    return element.businessObject.isRequired === true ||
           element.businessObject.$attrs?.['er:isRequired'] === 'true' ||
           element.businessObject.$attrs?.['ns0:isRequired'] === 'true';
  }

  /**
   * Verificar se é um atributo multivalorado
   */
  static isMultivaluedAttribute(element: any): boolean {
    if (!this.isAttribute(element)) return false;
    
    return element.businessObject.isMultivalued === true ||
           element.businessObject.$attrs?.['er:isMultivalued'] === 'true' ||
           element.businessObject.$attrs?.['ns0:isMultivalued'] === 'true';
  }

  /**
   * Verificar se é um atributo derivado
   */
  static isDerivedAttribute(element: any): boolean {
    if (!this.isAttribute(element)) return false;
    
    return element.businessObject.isDerived === true ||
           element.businessObject.$attrs?.['er:isDerived'] === 'true' ||
           element.businessObject.$attrs?.['ns0:isDerived'] === 'true';
  }

  /**
   * Obter nome de exibição do elemento
   */
  static getDisplayName(element: any): string {
    if (!element?.businessObject) return element?.id || 'Elemento';
    
    return element.businessObject.name || element.businessObject.id || element.id || 'Elemento';
  }

  /**
   * Verificar se dois elementos podem se conectar (lógica básica)
   */
  static canElementsConnect(source: any, target: any): boolean {
    // Não permitir auto-conexão
    if (source?.id === target?.id) return false;
    
    // Verificar se ambos são elementos ER válidos
    if (!this.isErElementByBpmnType(source) || !this.isErElementByBpmnType(target)) {
      return false;
    }
    
    return true;
  }

  /**
   * Debug: Imprimir informações do elemento (útil para desenvolvimento)
   */
  static debugElement(element: any, label?: string): void {
    if (!element) {
      console.log(`[ErElementUtils] ${label || 'Element'}: null/undefined`);
      return;
    }
    
    console.log(`[ErElementUtils] ${label || 'Element'}:`, {
      id: element.id,
      type: element.type,
      erType: this.getErType(element),
      isEntity: this.isEntity(element),
      isAttribute: this.isAttribute(element),
      isRelationship: this.isRelationship(element),
      hasCustomColors: this.hasCustomColors(element),
      displayName: this.getDisplayName(element)
    });
  }
}