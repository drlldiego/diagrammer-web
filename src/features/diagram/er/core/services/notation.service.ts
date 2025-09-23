/**
 * Notation Service
 * Implements Strategy Pattern for different ER notations (Chen vs Crow's Foot)
 */
import { 
  ErElement, 
  DiagramNotation, 
  NotationStrategyInterface,
  ErServiceResult 
} from '../types';
import { isErEntity, isErRelationship } from '../types';

/**
 * Chen Notation Strategy
 */
export class ChenNotationStrategy implements NotationStrategyInterface {
  readonly name: DiagramNotation = 'chen';
  readonly allowDirectEntityConnections = false;
  readonly hasRelationshipElements = true;
  readonly canAttributeConnectToRelationship = true;

  getCardinalityOptions(source: ErElement, target: ErElement): string[] {
    // Chen notation uses traditional cardinalities
    return ['1', 'N', '0..1', '0..N', '1..N'];
  }

  validateConnection(source: ErElement, target: ErElement): boolean {
    const sourceIsEntity = isErEntity(source);
    const targetIsEntity = isErEntity(target);
    const sourceIsRelationship = isErRelationship(source);
    const targetIsRelationship = isErRelationship(target);

    // Chen notation rules:
    // - Entities cannot connect directly to other entities
    // - Entities connect to relationships
    // - Attributes connect to entities or relationships
    if (sourceIsEntity && targetIsEntity) {
      return false; // Entities need a relationship between them
    }

    if (sourceIsRelationship && targetIsRelationship) {
      return false; // Relationships cannot connect directly
    }

    return true;
  }

  getDefaultCardinality(source: ErElement, target: ErElement): string {
    const sourceIsEntity = isErEntity(source);
    const targetIsEntity = isErEntity(target);

    if (sourceIsEntity && !targetIsEntity) {
      return '1'; // Entity to relationship
    }
    
    if (!sourceIsEntity && targetIsEntity) {
      return 'N'; // Relationship to entity
    }

    return '1';
  }

  formatCardinalityDisplay(cardinality: string): string {
    const displayMap: Record<string, string> = {
      '1': '1 (Um)',
      'N': 'N (Muitos)',      
      '0..1': '0..1 (Zero ou Um)',
      '0..N': '0..N (Zero ou Muitos)',
      '1..N': '1..N (Um ou Muitos)'
    };
    
    return displayMap[cardinality] || cardinality;
  }
}

/**
 * Crow's Foot Notation Strategy
 */
export class CrowsFootNotationStrategy implements NotationStrategyInterface {
  readonly name: DiagramNotation = 'crowsfoot';
  readonly allowDirectEntityConnections = true;
  readonly hasRelationshipElements = false;
  readonly canAttributeConnectToRelationship = false;

  getCardinalityOptions(source: ErElement, target: ErElement): string[] {
    // Crow's foot notation typically uses different cardinality representation
    return ['1', '0..1', '1..*', '0..*'];
  }

  validateConnection(source: ErElement, target: ErElement): boolean {
    const sourceIsEntity = isErEntity(source);
    const targetIsEntity = isErEntity(target);

    // Crow's foot notation rules:
    // - Entities can connect directly to other entities
    // - Attributes connect only to entities
    // - No separate relationship elements
    
    if (sourceIsEntity && targetIsEntity) {
      return true; // Direct entity connections are allowed
    }

    // Attributes can only connect to entities
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
      return '1..*'; // Many-to-many by default
    }

    return '1';
  }

  formatCardinalityDisplay(cardinality: string): string {
    const displayMap: Record<string, string> = {
      '1': '1 (Exatamente Um)',
      '0..1': '0..1 (Zero ou Um)',
      '1..*': '1..* (Um ou Mais)',
      '0..*': '0..* (Zero ou Mais)'
    };
    
    return displayMap[cardinality] || cardinality;
  }
}

/**
 * Notation Service manages different ER notation strategies
 */
export class NotationService {
  private strategy!: NotationStrategyInterface;
  private strategies: Map<DiagramNotation, NotationStrategyInterface> = new Map();
  private currentNotation: DiagramNotation = 'chen';

  constructor(notation: DiagramNotation = 'chen') {
    this.currentNotation = notation;
    
    // Initialize available strategies
    this.strategies.set('chen', new ChenNotationStrategy());
    this.strategies.set('crowsfoot', new CrowsFootNotationStrategy());
    
    // Set initial strategy
    const result = this.setStrategy(notation);
    if (!result.success) {
      // Fallback to chen notation
      this.strategy = new ChenNotationStrategy();
      this.currentNotation = 'chen';
    }
  }

  /**
   * Changes the current notation strategy
   */
  setStrategy(notation: DiagramNotation): ErServiceResult<void> {
    const strategy = this.strategies.get(notation);
    
    if (!strategy) {
      return {
        success: false,
        error: {
          code: 'INVALID_NOTATION',
          message: `Notation '${notation}' is not supported`,
          timestamp: Date.now()
        }
      };
    }

    this.strategy = strategy;
    this.currentNotation = notation;
    return { success: true };
  }

  /**
   * Gets current notation strategy
   */
  getCurrentStrategy(): NotationStrategyInterface {
    return this.strategy;
  }

  /**
   * Gets cardinality options for a connection between two elements
   */
  getCardinalityOptions(source: ErElement, target: ErElement): string[] {
    if (!this.strategy) {
      // Fallback to default options if strategy is not initialized
      return this.currentNotation === 'crowsfoot' 
        ? ['1', '0..1', '1..*', '0..*']
        : ['1', 'N', 'M', '0..1', '0..N', '1..N'];
    }
    return this.strategy.getCardinalityOptions(source, target);
  }

  /**
   * Validates if a connection between two elements is allowed
   */
  validateConnection(source: ErElement, target: ErElement): ErServiceResult<boolean> {
    try {
      const isValid = this.strategy.validateConnection(source, target);
      
      return {
        success: true,
        data: isValid,
        warnings: isValid ? [] : [`Connection not allowed in ${this.strategy.name} notation`]
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Failed to validate connection',
          details: error,
          timestamp: Date.now()
        }
      };
    }
  }

  /**
   * Gets default cardinality for a connection
   */
  getDefaultCardinality(source: ErElement, target: ErElement): string {
    return this.strategy.getDefaultCardinality(source, target);
  }

  /**
   * Formats cardinality for display
   */
  formatCardinalityDisplay(cardinality: string): string {
    return this.strategy.formatCardinalityDisplay(cardinality);
  }

  /**
   * Gets notation information
   */
  getNotationInfo() {
    return {
      notation: this.strategy.name,
      allowDirectEntityConnections: this.strategy.allowDirectEntityConnections,
      hasRelationshipElements: this.strategy.hasRelationshipElements,
      canAttributeConnectToRelationship: this.strategy.canAttributeConnectToRelationship
    };
  }

  /**
   * Gets all available notations
   */
  getAvailableNotations(): DiagramNotation[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * Checks if an element type is allowed in current notation
   */
  isElementTypeAllowed(elementType: string): boolean {
    if (elementType === 'Relationship') {
      return this.strategy.hasRelationshipElements;
    }
    
    // Entities and Attributes are allowed in all notations
    return true;
  }
}