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

export const NOTATION_CONFIGS: Record<string, NotationConfig> = {
  chen: {
    notation: 'chen',
    elements: {
      hasRelationshipElement: true,
      attributeCanConnectToRelationship: true,
      allowDirectEntityToEntityConnection: false
    },
    relationshipConfig: {
      type: 'bpmn:IntermediateCatchEvent',
      dimensions: { width: 140, height: 80 },
      className: 'bpmn-icon-er-relationship',
      title: 'Relacionamento',
      defaultProperties: {
        width: 140,
        height: 80,
        name: 'Relacionamento',
        cardinalitySource: '1',
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