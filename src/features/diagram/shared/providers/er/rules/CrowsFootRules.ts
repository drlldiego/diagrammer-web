import { BaseErRules, Element, ConnectionValidationResult } from './ErConnectionRules';

/**
 * CrowsFootRules - Regras específicas para notação Crow's Foot
 * 
 * Características da notação Crow's Foot:
 * - NÃO há elementos de Relacionamento separados
 * - Entidades se conectam diretamente entre si
 * - Atributos conectam APENAS a Entidades
 * - Cardinalidade é expressa nas extremidades das conexões
 * - Mais simples e direta que Chen
 */
export class CrowsFootRules extends BaseErRules {

  validateConnection(source: Element, target: Element): ConnectionValidationResult {
    // Primeiro, verificar validações comuns
    const commonResult = this.commonValidations(source, target);
    if (!commonResult.canConnect) {
      return commonResult;
    }

    const sourceErType = this.getErType(source);
    const targetErType = this.getErType(target);

    // === REGRAS ESPECÍFICAS CROW'S FOOT ===

    // 1. Entity -> Entity ✓ (Crow's Foot permite conexão direta)
    if (this.isEntity(source) && this.isEntity(target)) {
      return { 
        canConnect: true,
        message: 'Relacionamento direto entre entidades'
      };
    }

    // 2. Attribute -> Relationship ✗ (Crow's Foot não tem relacionamentos)
    if (this.isAttribute(source) && this.isRelationship(target)) {
      return {
        canConnect: false,
        message: 'Na notação Crow\'s Foot não existem elementos de Relacionamento'
      };
    }

    if (this.isRelationship(source) && this.isAttribute(target)) {
      return {
        canConnect: false,
        message: 'Na notação Crow\'s Foot não existem elementos de Relacionamento'
      };
    }

    // 3. Entity -> Relationship ✗ (não deveria existir em Crow's Foot)
    if (this.isEntity(source) && this.isRelationship(target)) {
      return {
        canConnect: false,
        message: 'Na notação Crow\'s Foot não existem elementos de Relacionamento'
      };
    }

    if (this.isRelationship(source) && this.isEntity(target)) {
      return {
        canConnect: false,
        message: 'Na notação Crow\'s Foot não existem elementos de Relacionamento'
      };
    }

    // 4. Qualquer conexão com Relationship ✗
    if (this.isRelationship(source) || this.isRelationship(target)) {
      return {
        canConnect: false,
        message: 'Elementos de Relacionamento não são válidos na notação Crow\'s Foot'
      };
    }

    // 5. Attribute -> Attribute ✗ (não faz sentido em nenhuma notação)
    if (this.isAttribute(source) && this.isAttribute(target)) {
      return {
        canConnect: false,
        message: 'Atributos não podem se conectar diretamente'
      };
    }

    // 6. Conexões com atributos compostos (especiais)
    if (this.isCompositeAttribute(source) || this.isCompositeAttribute(target)) {
      return this.validateCompositeAttributeConnection(source, target);
    }

    // Se chegou aqui, permitir (pode ser uma conexão válida não coberta)
    return { canConnect: true };
  }

  getConnectionType(source: Element, target: Element): string {
    if (this.isEntity(source) && this.isEntity(target)) {
      return 'entity-entity'; // Relacionamento direto
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
    // Na notação Crow's Foot, cardinalidade é nas extremidades das conexões Entity-Entity
    if (this.isEntity(source) && this.isEntity(target)) {
      return ['1', 'N', 'M', '0..1', '0..N', '1..N'];
    }

    // Para conexões Attribute-Entity, cardinalidade geralmente é 1
    if ((this.isAttribute(source) && this.isEntity(target)) ||
        (this.isEntity(source) && this.isAttribute(target))) {
      return ['1']; // Atributos têm cardinalidade 1 com entidades
    }

    return ['1'];
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

    // Atributo composto conecta APENAS a entidades (não a relacionamentos em Crow's Foot)
    if (this.isCompositeAttribute(source)) {
      if (this.isEntity(target)) {
        return { canConnect: true };
      }
      if (this.isRelationship(target)) {
        return {
          canConnect: false,
          message: 'Na notação Crow\'s Foot, atributos conectam apenas a Entidades'
        };
      }
    }

    if (this.isCompositeAttribute(target)) {
      if (this.isEntity(source)) {
        return { canConnect: true };
      }
      if (this.isRelationship(source)) {
        return {
          canConnect: false,
          message: 'Na notação Crow\'s Foot, atributos conectam apenas a Entidades'
        };
      }
    }

    return {
      canConnect: false,
      message: 'Conexão não válida para atributo composto'
    };
  }

  /**
   * Métodos auxiliares específicos para Crow's Foot
   */
  
  public canEntityConnectDirectly(): boolean {
    return true; // Crow's Foot permite conexão direta entre entidades
  }

  public hasRelationshipElements(): boolean {
    return false; // Crow's Foot não tem elementos de relacionamento
  }

  public canAttributeConnectToRelationship(): boolean {
    return false; // Crow's Foot não permite (nem tem relacionamentos)
  }

  public requiresCardinalityOnBothEnds(): boolean {
    return true; // Crow's Foot precisa de cardinalidade nas duas extremidades da conexão Entity-Entity
  }
}