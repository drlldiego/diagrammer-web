/**
 * ErConnectionRules - Regras de conexão entre elementos ER
 * Factory pattern para determinar regras baseado na notação ativa
 */

export interface Element {
  id: string;
  type: string;
  businessObject?: {
    erType?: string;
    [key: string]: any;
  };
  source?: Element;
  target?: Element;
  parent?: Element;
}

export interface ConnectionValidationResult {
  canConnect: boolean;
  message?: string;
}

export interface ErNotationRules {
  validateConnection(source: Element, target: Element): ConnectionValidationResult;
  getConnectionType(source: Element, target: Element): string;
  getCardinalityOptions(source: Element, target: Element): string[];
}

export abstract class BaseErRules implements ErNotationRules {
  
  abstract validateConnection(source: Element, target: Element): ConnectionValidationResult;
  abstract getConnectionType(source: Element, target: Element): string;
  abstract getCardinalityOptions(source: Element, target: Element): string[];

  protected getErType(element: Element): string | null {
    return element.businessObject?.erType || 
           element.businessObject?.['er:erType'] ||
           element.businessObject?.['ns0:erType'] ||
           null;
  }

  protected isEntity(element: Element): boolean {
    return this.getErType(element) === 'Entity';
  }

  protected isAttribute(element: Element): boolean {
    return this.getErType(element) === 'Attribute';
  }

  protected isRelationship(element: Element): boolean {
    return this.getErType(element) === 'Relationship';
  }

  protected isCompositeAttribute(element: Element): boolean {
    return this.isAttribute(element) && element.businessObject?.isComposite === true;
  }

  // Regras comuns a ambas notações
  protected commonValidations(source: Element, target: Element): ConnectionValidationResult {
    // Não permitir auto-conexão
    if (source.id === target.id) {
      return {
        canConnect: false,
        message: 'Um elemento não pode se conectar a si mesmo'
      };
    }

    // Atributo sempre pode conectar a Entidade (ambas notações)
    if (this.isAttribute(source) && this.isEntity(target)) {
      return { canConnect: true };
    }

    if (this.isEntity(source) && this.isAttribute(target)) {
      return { canConnect: true };
    }

    return { canConnect: true };
  }
}

export class ErConnectionRulesFactory {
  private static instance: ErConnectionRulesFactory;
  private currentNotation: 'chen' | 'crowsfoot' = 'chen';
  private chenRules: ErNotationRules | null = null;
  private crowsFootRules: ErNotationRules | null = null;

  private constructor() {}

  public static getInstance(): ErConnectionRulesFactory {
    if (!ErConnectionRulesFactory.instance) {
      ErConnectionRulesFactory.instance = new ErConnectionRulesFactory();
    }
    return ErConnectionRulesFactory.instance;
  }

  public setNotation(notation: 'chen' | 'crowsfoot'): void {
    this.currentNotation = notation;
  }

  public getCurrentRules(): ErNotationRules {
    if (this.currentNotation === 'chen') {
      return this.getChenRules();
    } else {
      return this.getCrowsFootRules();
    }
  }

  private getChenRules(): ErNotationRules {
    if (!this.chenRules) {
      // Import dinâmico será implementado na próxima fase
      throw new Error('Chen rules not implemented yet');
    }
    return this.chenRules;
  }

  private getCrowsFootRules(): ErNotationRules {
    if (!this.crowsFootRules) {
      // Import dinâmico será implementado na próxima fase
      throw new Error('CrowsFoot rules not implemented yet');
    }
    return this.crowsFootRules;
  }

  // Métodos temporários para registro manual (Fase 1)
  public registerChenRules(rules: ErNotationRules): void {
    this.chenRules = rules;
  }

  public registerCrowsFootRules(rules: ErNotationRules): void {
    this.crowsFootRules = rules;
  }
}