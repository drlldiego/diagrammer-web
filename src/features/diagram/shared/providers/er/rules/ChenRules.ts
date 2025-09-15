import { BaseErRules, Element, ConnectionValidationResult } from './ErConnectionRules';

/**
 * ChenRules - Regras específicas para notação Chen (ER Clássico)
 * 
 * Características da notação Chen:
 * - Relacionamentos são elementos separados (losangos)
 * - Atributos podem conectar a Relacionamentos
 * - Entidades conectam a Relacionamentos (não diretamente entre si)
 * - Cardinalidade é expressa nos Relacionamentos
 */
export class ChenRules extends BaseErRules {

  validateConnection(source: Element, target: Element): ConnectionValidationResult {
    // Primeiro, verificar validações comuns
    const commonResult = this.commonValidations(source, target);
    if (!commonResult.canConnect) {
      return commonResult;
    }

    const sourceErType = this.getErType(source);
    const targetErType = this.getErType(target);

    // === REGRAS ESPECÍFICAS CHEN ===

    // 1. Entity -> Relationship ✓
    if (this.isEntity(source) && this.isRelationship(target)) {
      return { canConnect: true };
    }

    if (this.isRelationship(source) && this.isEntity(target)) {
      return { canConnect: true };
    }

    // 2. Attribute -> Relationship ✓ (Chen permite)
    if (this.isAttribute(source) && this.isRelationship(target)) {
      return { canConnect: true };
    }

    if (this.isRelationship(source) && this.isAttribute(target)) {
      return { canConnect: true };
    }

    // 3. Entity -> Entity ✗ (Chen precisa de Relationship no meio)
    if (this.isEntity(source) && this.isEntity(target)) {
      return {
        canConnect: false,
        message: 'Na notação Chen, Entidades devem se conectar através de Relacionamentos'
      };
    }

    // 4. Attribute -> Attribute ✗ (não faz sentido em nenhuma notação)
    if (this.isAttribute(source) && this.isAttribute(target)) {
      return {
        canConnect: false,
        message: 'Atributos não podem se conectar diretamente'
      };
    }

    // 5. Conexões com atributos compostos (especiais)
    if (this.isCompositeAttribute(source) || this.isCompositeAttribute(target)) {
      return this.validateCompositeAttributeConnection(source, target);
    }

    // Se chegou aqui, permitir (pode ser uma conexão válida não coberta)
    return { canConnect: true };
  }

  getConnectionType(source: Element, target: Element): string {
    if (this.isEntity(source) && this.isRelationship(target)) {
      return 'entity-relationship';
    }

    if (this.isRelationship(source) && this.isEntity(target)) {
      return 'relationship-entity';
    }

    if (this.isAttribute(source) && this.isRelationship(target)) {
      return 'attribute-relationship';
    }

    if (this.isRelationship(source) && this.isAttribute(target)) {
      return 'relationship-attribute';
    }

    if (this.isAttribute(source) && this.isEntity(target)) {
      return 'attribute-entity';
    }

    if (this.isEntity(source) && this.isAttribute(target)) {
      return 'entity-attribute';
    }

    if (this.isCompositeAttribute(source) || this.isCompositeAttribute(target)) {
      return 'composite-attribute';
    }

    return 'generic';
  }

  getCardinalityOptions(source: Element, target: Element): string[] {
    // Na notação Chen, cardinalidade geralmente é definida no relacionamento
    // Mas para conexões Entity-Relationship, podemos ter opções
    if ((this.isEntity(source) && this.isRelationship(target)) ||
        (this.isRelationship(source) && this.isEntity(target))) {
      return ['1', 'N', 'M', '0..1', '0..N', '1..N'];
    }

    // Para outras conexões, cardinalidade pode não se aplicar
    if (this.isAttribute(source) || this.isAttribute(target)) {
      return ['1']; // Atributos geralmente têm cardinalidade 1
    }

    return ['1', 'N'];
  }

  private validateCompositeAttributeConnection(source: Element, target: Element): ConnectionValidationResult {
    // Atributo composto pode ter sub-atributos
    if (this.isCompositeAttribute(source) && this.isAttribute(target)) {
      return { 
        canConnect: true,
        message: 'Conexão de composição (atributo composto -> sub-atributo)'
      };
    }

    if (this.isAttribute(source) && this.isCompositeAttribute(target)) {
      return { 
        canConnect: true,
        message: 'Conexão de composição (sub-atributo -> atributo composto)'
      };
    }

    // Atributo composto pode conectar a entidades e relacionamentos como atributo normal
    if (this.isCompositeAttribute(source)) {
      if (this.isEntity(target) || this.isRelationship(target)) {
        return { canConnect: true };
      }
    }

    if (this.isCompositeAttribute(target)) {
      if (this.isEntity(source) || this.isRelationship(source)) {
        return { canConnect: true };
      }
    }

    return {
      canConnect: false,
      message: 'Conexão não válida para atributo composto'
    };
  }

  /**
   * Métodos auxiliares específicos para Chen
   */
  
  public canEntityConnectDirectly(): boolean {
    return false; // Chen sempre precisa de relacionamento no meio
  }

  public hasRelationshipElements(): boolean {
    return true; // Chen tem elementos de relacionamento
  }

  public canAttributeConnectToRelationship(): boolean {
    return true; // Chen permite atributos em relacionamentos
  }
}