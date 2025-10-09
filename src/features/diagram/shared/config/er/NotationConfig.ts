/**
 * Configurações específicas para notações de diagramas ER (Chen e Crowsfoot).
 * Define como os elementos se comportam e suas propriedades padrão.
 */
export interface NotationConfig {
  notation: 'chen' | 'crowsfoot';
  elements: {
    hasRelationshipElement: boolean;
    attributeCanConnectToRelationship: boolean;
    allowDirectEntityToEntityConnection: boolean;
  };
  relationshipConfig?: {
    type: string;
    dimensions: { width: number; height: number };
    className: string;
    title: string;
    defaultProperties: any;
  };
}

/**
 * Configurações para cada notação de diagrama ER.
 * Inclui propriedades específicas para elementos de relacionamento na notação Chen.
 */
export const NOTATION_CONFIGS: Record<string, NotationConfig> = {
  chen: {
    notation: 'chen',
    elements: {
      hasRelationshipElement: true,
      attributeCanConnectToRelationship: true,
      allowDirectEntityToEntityConnection: false
    },
    relationshipConfig: {
      type: 'bpmn:ParallelGateway',
      dimensions: { width: 140, height: 80 },
      className: 'bpmn-icon-er-relationship',
      title: 'Relacionamento',
      defaultProperties: {
        width: 140,
        height: 80,
        name: 'Relacionamento',
        cardinalitySource: '1..1',
        cardinalityTarget: '1..N',
        isIdentifying: false,
        erType: 'Relationship'
      }
    }
  },
  crowsfoot: {
    notation: 'crowsfoot',
    elements: {
      hasRelationshipElement: false,
      attributeCanConnectToRelationship: false,
      allowDirectEntityToEntityConnection: true
    }
  }
};