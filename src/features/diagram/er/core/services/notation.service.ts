import { 
  ErElement, 
  DiagramNotation, 
  NotationStrategyInterface,
  ErServiceResult 
} from '../types';
import { isErEntity, isErRelationship } from '../types';

// Opções de cardinalidade padronizadas para ambas as notações
const CARDINALITY_OPTIONS = ['0..1', '1..1', '0..N', '1..N'];

// Mapeamento de exibição das cardinalidades
const CARDINALITY_DISPLAY_MAP: Record<string, string> = {
  '0..1': '0..1 (Zero ou Um)',
  '1..1': '1..1 (Exatamente Um)',    
  '0..N': '0..N (Zero ou Muitos)',
  '1..N': '1..N (Um ou Muitos)'        
};

/**
 * Formata cardinalidade para exibição
 */
function formatCardinality(cardinality: string): string {
  return CARDINALITY_DISPLAY_MAP[cardinality] || cardinality;
}

/**
 * Estratégia de Notação Chen
 */
export class ChenNotationStrategy implements NotationStrategyInterface {
  readonly name: DiagramNotation = 'chen';
  readonly allowDirectEntityConnections = false;
  readonly hasRelationshipElements = true;
  readonly canAttributeConnectToRelationship = true;

  getCardinalityOptions(source: ErElement, target: ErElement): string[] {
    return CARDINALITY_OPTIONS;
  }

  validateConnection(source: ErElement, target: ErElement): boolean {
    const sourceIsEntity = isErEntity(source);
    const targetIsEntity = isErEntity(target);
    const sourceIsRelationship = isErRelationship(source);
    const targetIsRelationship = isErRelationship(target);

    if (sourceIsEntity && targetIsEntity) {
      return false;
    }

    if (sourceIsRelationship && targetIsRelationship) {
      return false;
    }

    return true;
  }

  getDefaultCardinality(source: ErElement, target: ErElement): string {
    const sourceIsEntity = isErEntity(source);
    const targetIsEntity = isErEntity(target);

    if (sourceIsEntity && !targetIsEntity) {
      return '1..1';
    }
    
    if (!sourceIsEntity && targetIsEntity) {
      return '1..N';
    }

    return '1..1';
  }

  formatCardinalityDisplay(cardinality: string): string {
    return formatCardinality(cardinality);
  }
}

/**
 * Estratégia de Notação Crow's Foot
 */
export class CrowsFootNotationStrategy implements NotationStrategyInterface {
  readonly name: DiagramNotation = 'crowsfoot';
  readonly allowDirectEntityConnections = true;
  readonly hasRelationshipElements = false;
  readonly canAttributeConnectToRelationship = false;

  getCardinalityOptions(source: ErElement, target: ErElement): string[] {
    return CARDINALITY_OPTIONS;
  }

  validateConnection(source: ErElement, target: ErElement): boolean {
    const sourceIsEntity = isErEntity(source);
    const targetIsEntity = isErEntity(target);
    
    if (sourceIsEntity && targetIsEntity) {
      return true;
    }

    if (source.businessObject.erType === 'Attribute') {
      return targetIsEntity;
    }

    if (target.businessObject.erType === 'Attribute') {
      return sourceIsEntity;
    }

    return true;
  }

  getDefaultCardinality(source: ErElement, target: ErElement): string {
    const sourceIsEntity = isErEntity(source);
    const targetIsEntity = isErEntity(target);

    if (sourceIsEntity && targetIsEntity) {
      return '1..N';
    }

    return '1..1';
  }

  formatCardinalityDisplay(cardinality: string): string {
    return formatCardinality(cardinality);
  }
}

/**
 * Serviço de gerenciamento de estratégias de notação ER
 */
export class NotationService {
  private strategy!: NotationStrategyInterface;
  private strategies: Map<DiagramNotation, NotationStrategyInterface> = new Map();
  private currentNotation: DiagramNotation = 'chen';

  constructor(notation: DiagramNotation = 'chen') {
    this.currentNotation = notation;
    
    this.strategies.set('chen', new ChenNotationStrategy());
    this.strategies.set('crowsfoot', new CrowsFootNotationStrategy());
    
    const result = this.setStrategy(notation);
    if (!result.success) {
      this.strategy = new ChenNotationStrategy();
      this.currentNotation = 'chen';
    }
  }

  /**
   * Altera a estratégia de notação atual
   */
  setStrategy(notation: DiagramNotation): ErServiceResult<void> {
    const strategy = this.strategies.get(notation);
    
    if (!strategy) {
      return {
        success: false,
        error: {
          code: 'INVALID_NOTATION',
          message: `Notação '${notation}' não é suportada`,
          timestamp: Date.now()
        }
      };
    }

    this.strategy = strategy;
    this.currentNotation = notation;
    return { success: true };
  }

  getCurrentStrategy(): NotationStrategyInterface {
    return this.strategy;
  }

  getCardinalityOptions(source: ErElement, target: ErElement): string[] {
    return this.strategy?.getCardinalityOptions(source, target) || CARDINALITY_OPTIONS;
  }

  /**
   * Valida se uma conexão entre dois elementos é permitida
   */
  validateConnection(source: ErElement, target: ErElement): ErServiceResult<boolean> {
    try {
      const isValid = this.strategy.validateConnection(source, target);
      
      return {
        success: true,
        data: isValid,
        warnings: isValid ? [] : [`Conexão não permitida para a notação ${this.strategy.name}`]
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Falha ao validar conexão',
          details: error,
          timestamp: Date.now()
        }
      };
    }
  }

  getDefaultCardinality(source: ErElement, target: ErElement): string {
    return this.strategy.getDefaultCardinality(source, target);
  }

  formatCardinalityDisplay(cardinality: string): string {
    return formatCardinality(cardinality);
  }

  getNotationInfo() {
    return {
      notation: this.strategy.name,
      allowDirectEntityConnections: this.strategy.allowDirectEntityConnections,
      hasRelationshipElements: this.strategy.hasRelationshipElements,
      canAttributeConnectToRelationship: this.strategy.canAttributeConnectToRelationship
    };
  }

  getAvailableNotations(): DiagramNotation[] {
    return Array.from(this.strategies.keys());
  }

  isElementTypeAllowed(elementType: string): boolean {
    if (elementType === 'Relationship') {
      return this.strategy.hasRelationshipElements;
    }
    
    return true;
  }
}