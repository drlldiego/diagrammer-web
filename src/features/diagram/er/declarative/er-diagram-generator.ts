// Gerador de diagramas ER visuais a partir da sintaxe declarativa
import BpmnModeler from "bpmn-js/lib/Modeler";
import { ErDiagram, ErEntity, ErRelationship, CROWSFOOT_CARDINALITIES } from './er-types';
import { logger } from "../../../../utils/logger";
import { ConnectionAnchorsService, AnchorPoint } from "../../shared/services";

export class ErDiagramGenerator {
  private modeler: BpmnModeler;
  private elementRegistry: any;
  private modeling: any;
  private elementFactory: any;
  private erElementFactory: any;
  private canvas: any;
  private anchorsService: ConnectionAnchorsService;

  constructor(modeler: BpmnModeler) {
    this.modeler = modeler;
    this.elementRegistry = modeler.get('elementRegistry');
    this.modeling = modeler.get('modeling');
    this.elementFactory = modeler.get('elementFactory');
    this.erElementFactory = modeler.get('erElementFactory');
    this.canvas = modeler.get('canvas');
    this.anchorsService = new ConnectionAnchorsService();
  }

  /**
   * Garantir que o processo tenha a estrutura semântica correta
   */
  private ensureProcessStructure(): void {
    const processElement = this.elementRegistry.filter((element: any) => {
      return element.type === 'bpmn:Process';
    })[0];

    if (processElement && processElement.businessObject) {
      // Garantir que flowElements existe e é um array
      if (!processElement.businessObject.flowElements) {
        processElement.businessObject.flowElements = [];
      }
      
      // Garantir que outras propriedades necessárias estão inicializadas
      if (!processElement.businessObject.$parent) {
        processElement.businessObject.$parent = null;
      }
      
      // Nota: di (Diagram Interchange) não deve ser acessado via businessObject
      // A partir do BPMN.js v10+, di está disponível apenas no elemento do diagrama
    }
  }

  private validateAndFixElementStructure(element: any, parentElement: any): void {
    if (!element || !element.businessObject) {
      console.error('🚨 [Element Validation] Element or businessObject is null');
      return;
    }

    // Garantir que o businessObject tem todas as propriedades necessárias
    const bo = element.businessObject;
    
    // Inicializar $parent se não existir
    if (!bo.$parent && parentElement && parentElement.businessObject) {
      bo.$parent = parentElement.businessObject;
    }
    
    // Garantir que o elemento pai tem flowElements inicializado
    if (parentElement && parentElement.businessObject) {
      if (!parentElement.businessObject.flowElements) {
        parentElement.businessObject.flowElements = [];
      }
    }
    
    // Garantir propriedades básicas do businessObject
    if (!bo.id) {
      bo.id = element.id;
    }
    
    // Garantir que $attrs está inicializado
    if (!bo.$attrs) {
      bo.$attrs = {};
    }
    
    // Nota: di não deve ser inicializado no businessObject
    // O BPMN.js gerencia o di automaticamente no elemento do diagrama
    
    console.log(`✅ [Element Validation] Validated element ${element.id} with parent ${parentElement?.id || 'root'}`);
  }

  async generateVisualDiagram(diagram: ErDiagram): Promise<void> {
    try {            
      // 1. Limpar canvas atual e pontos de ancoragem    
      await this.clearCanvas();
      this.anchorsService.clearAll();

      // 2. Verificar se modeler está disponível
      if (!this.modeler) {
        throw new Error('Modeler não está disponível');
      }

      // 3. Garantir estrutura semântica correta do processo
      this.ensureProcessStructure();            

      // 4. Criar entidades com posições já otimizadas (vem do parser com layout calculado)
      const entityElements = new Map<string, any>();
      for (const entity of diagram.entities) {        
        const entityElement = await this.createEntity(entity);
        entityElements.set(entity.name, entityElement);        
      }            

      // 5. Criar relacionamentos com ancoragem direta otimizada
      const connections: any[] = [];
      for (const relationship of diagram.relationships) {        
        const connection = await this.createRelationship(relationship, entityElements);
        if (connection) {
          connections.push({
            connection,
            relationship,
            fromEntity: entityElements.get(relationship.from),
            toEntity: entityElements.get(relationship.to)
          });
        }
      }

      // 6. Aplicar ancoragem direta inteligente (substitui simulação de movimento)
      this.applyDirectConnectionAnchoring(entityElements, connections);

      // 7. Aplicar zoom para ajustar visualização
      this.canvas.zoom('fit-viewport');            
      
    } catch (error) {      
      throw error;
    }
  }

  /**
   * Aplica ancoragem direta inteligente para conexões sem simular movimento
   */
  private applyDirectConnectionAnchoring(
    entityElements: Map<string, any>, 
    connections: Array<{connection: any, relationship: any, fromEntity: any, toEntity: any}>
  ): void {
    console.log('🔗 [Direct Anchoring] Applying intelligent connection anchoring');
    
    connections.forEach(({ connection, fromEntity, toEntity }) => {
      try {
        // Calcular waypoints otimizados diretamente
        const optimizedWaypoints = this.calculateOptimizedWaypoints(fromEntity, toEntity);
        
        if (optimizedWaypoints && optimizedWaypoints.length >= 2) {
          // Aplicar waypoints diretamente à conexão
          connection.waypoints = optimizedWaypoints;
          
          // Calcular pontos de ancoragem para registro
          const fromBounds = this.getElementBounds(fromEntity);
          const toBounds = this.getElementBounds(toEntity);
          
          if (fromBounds && toBounds) {
            const fromAnchor = this.calculateOptimalAnchorPoint(fromBounds, toBounds);
            const toAnchor = this.calculateOptimalAnchorPoint(toBounds, fromBounds);
            
            // Registrar no serviço de ancoragem para referência futura
            this.anchorsService.registerConnection({
              id: connection.id,
              fromElementId: fromEntity.id,
              toElementId: toEntity.id,
              fromPoint: fromAnchor,
              toPoint: toAnchor
            });
          }
          
          console.log(`🎯 [Direct Anchoring] Connection "${fromEntity.id}" → "${toEntity.id}" anchored with ${optimizedWaypoints.length} waypoints`);
        }
      } catch (error) {
        console.warn(`⚠️ [Direct Anchoring] Failed to anchor connection "${fromEntity.id}" → "${toEntity.id}":`, error);
      }
    });
    
    console.log(`✅ [Direct Anchoring] Applied anchoring to ${connections.length} connections`);
  }

  /**
   * Calcula waypoints otimizados para uma conexão
   */
  private calculateOptimizedWaypoints(fromEntity: any, toEntity: any): Array<{x: number, y: number}> {
    const fromBounds = this.getElementBounds(fromEntity);
    const toBounds = this.getElementBounds(toEntity);
    
    if (!fromBounds || !toBounds) {
      return [];
    }
    
    // Calcular pontos de ancoragem otimizados
    const fromPoint = this.calculateOptimalAnchorPoint(fromBounds, toBounds);
    const toPoint = this.calculateOptimalAnchorPoint(toBounds, fromBounds);
    
    // Determinar se precisa de waypoints intermediários
    const needsIntermediatePoints = this.shouldUseIntermediateWaypoints(fromBounds, toBounds, fromPoint, toPoint);
    
    if (!needsIntermediatePoints) {
      return [
        { x: fromPoint.x, y: fromPoint.y },
        { x: toPoint.x, y: toPoint.y }
      ];
    }
    
    // Calcular waypoints intermediários ortogonais
    const intermediatePoints = this.calculateOrthogonalWaypoints(fromPoint, toPoint, fromBounds, toBounds);
    
    return [
      { x: fromPoint.x, y: fromPoint.y },
      ...intermediatePoints,
      { x: toPoint.x, y: toPoint.y }
    ];
  }

  /**
   * Calcula ponto de ancoragem otimizado em uma borda
   */
  private calculateOptimalAnchorPoint(sourceBounds: any, targetBounds: any): AnchorPoint {
    const sourceCenter = {
      x: sourceBounds.x + sourceBounds.width / 2,
      y: sourceBounds.y + sourceBounds.height / 2
    };
    
    const targetCenter = {
      x: targetBounds.x + targetBounds.width / 2,
      y: targetBounds.y + targetBounds.height / 2
    };
    
    // Calcular direção da conexão
    const dx = targetCenter.x - sourceCenter.x;
    const dy = targetCenter.y - sourceCenter.y;
    
    // Determinar melhor lado da borda
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    
    if (absDx > absDy) {
      // Conexão predominantemente horizontal
      const side = dx > 0 ? 'right' : 'left';
      return {
        x: dx > 0 ? sourceBounds.x + sourceBounds.width : sourceBounds.x,
        y: sourceCenter.y,
        side: side as 'top' | 'right' | 'bottom' | 'left',
        occupied: false
      };
    } else {
      // Conexão predominantemente vertical
      const side = dy > 0 ? 'bottom' : 'top';
      return {
        x: sourceCenter.x,
        y: dy > 0 ? sourceBounds.y + sourceBounds.height : sourceBounds.y,
        side: side as 'top' | 'right' | 'bottom' | 'left',
        occupied: false
      };
    }
  }

  /**
   * Determina se são necessários waypoints intermediários
   */
  private shouldUseIntermediateWaypoints(
    fromBounds: any, 
    toBounds: any, 
    fromPoint: AnchorPoint, 
    toPoint: AnchorPoint
  ): boolean {
    // Verificar se a linha direta atravessa algum dos elementos
    const directDistance = Math.sqrt(Math.pow(toPoint.x - fromPoint.x, 2) + Math.pow(toPoint.y - fromPoint.y, 2));
    const elementDistance = Math.sqrt(
      Math.pow(toBounds.x + toBounds.width/2 - fromBounds.x - fromBounds.width/2, 2) + 
      Math.pow(toBounds.y + toBounds.height/2 - fromBounds.y - fromBounds.height/2, 2)
    );
    
    // Apenas usar waypoints intermediários se elementos estão muito próximos OU há real intersecção
    return directDistance < 80 || this.wouldLineIntersectElements(fromPoint, toPoint, fromBounds, toBounds);
  }

  /**
   * Verifica se linha direta intersectaria elementos
   */
  private wouldLineIntersectElements(fromPoint: AnchorPoint, toPoint: AnchorPoint, fromBounds: any, toBounds: any): boolean {
    // Verificar se a linha conectaria laterais opostas dos elementos (situação que beneficia de waypoints)
    const fromCenter = { x: fromBounds.x + fromBounds.width/2, y: fromBounds.y + fromBounds.height/2 };
    const toCenter = { x: toBounds.x + toBounds.width/2, y: toBounds.y + toBounds.height/2 };
    
    // Calcular se os elementos estão em posições que requerem roteamento ortogonal
    const horizontalOverlap = !(fromBounds.x + fromBounds.width < toBounds.x || toBounds.x + toBounds.width < fromBounds.x);
    const verticalOverlap = !(fromBounds.y + fromBounds.height < toBounds.y || toBounds.y + toBounds.height < fromBounds.y);
    
    // Usar waypoints apenas se há sobreposição significativa que tornaria a linha confusa
    return horizontalOverlap && verticalOverlap;
  }

  /**
   * Calcula waypoints intermediários ortogonais
   */
  private calculateOrthogonalWaypoints(
    fromPoint: AnchorPoint, 
    toPoint: AnchorPoint, 
    fromBounds: any, 
    toBounds: any
  ): Array<{x: number, y: number}> {
    const dx = toPoint.x - fromPoint.x;
    const dy = toPoint.y - fromPoint.y;
    
    // Se já está alinhado, não precisa de pontos intermediários
    if (Math.abs(dx) < 10 || Math.abs(dy) < 10) {
      return [];
    }
    
    // Escolher direção baseada na posição relativa dos elementos
    const preferHorizontalFirst = Math.abs(dx) > Math.abs(dy);
    
    if (preferHorizontalFirst) {
      // Horizontal primeiro, depois vertical
      return [{ x: toPoint.x, y: fromPoint.y }];
    } else {
      // Vertical primeiro, depois horizontal
      return [{ x: fromPoint.x, y: toPoint.y }];
    }
  }

  private async clearCanvas(): Promise<void> {
    const rootElement = this.canvas.getRootElement();
    const allElements = this.elementRegistry.filter((element: any) => {
      return element.parent === rootElement && element.type !== 'label';
    });

    if (allElements.length > 0) {
      this.modeling.removeElements(allElements);
    }
  }

  private async createEntity(entity: ErEntity): Promise<any> {    
    
    try {
      const entityElement = this.erElementFactory.createShape({
        type: 'bpmn:Task',
        width: 120,
        height: 80,
        name: entity.name,
        erType: 'Entity',
        isWeak: entity.isWeak || false
      });            

      // Posicionamento
      const position = {
        x: entity.x !== undefined ? entity.x : 100,
        y: entity.y !== undefined ? entity.y : 100
      };            

      // Adicionar entidade ao canvas (usar o Process como parent, não o root element)
      const processElement = this.elementRegistry.filter((element: any) => {
        return element.type === 'bpmn:Process';
      })[0];
      
      const parentElement = processElement || this.canvas.getRootElement();
      
      // Validar e completar estrutura semântica do elemento antes da criação
      this.validateAndFixElementStructure(entityElement, parentElement);
      
      const addedEntity = this.modeling.createShape(
        entityElement,
        position,
        parentElement
      );            

      return addedEntity;
      
    } catch (error) {      
      throw error;
    }
  }

  // Métodos de atributos removidos
  private async createRelationship(relationship: ErRelationship, entityElements: Map<string, any>): Promise<any> {        
    const fromEntity = entityElements.get(relationship.from);
    const toEntity = entityElements.get(relationship.to);

    if (!fromEntity) {      
      throw new Error(`Entidade de origem não encontrada: ${relationship.from}`);
    }

    if (!toEntity) {      
      throw new Error(`Entidade de destino não encontrada: ${relationship.to}`);
    }    

    // Obter informações da cardinalidade
    const cardinalityInfo = CROWSFOOT_CARDINALITIES[relationship.cardinality as keyof typeof CROWSFOOT_CARDINALITIES];
    
    const sourceConverted = this.convertCardinalityToString(cardinalityInfo.from);
    const targetConverted = this.convertCardinalityToString(cardinalityInfo.to);
    
    try {
      // Criar conexão usando modeling.createConnection com atributos apropriados      
      
      
      const connectionAttrs = {
        type: 'bpmn:SequenceFlow',
        source: fromEntity,
        target: toEntity,
        name: relationship.label || '',
        cardinalitySource: sourceConverted,
        cardinalityTarget: targetConverted,
        isParentChild: relationship.isIdentifying || false,
        // Marcar como vinda do modo declarativo
        isDeclarative: true,
        mermaidCardinality: relationship.cardinality
      };
      
      // Usar o Process como parent para conexões também
      const processElement = this.elementRegistry.filter((element: any) => {
        return element.type === 'bpmn:Process';
      })[0];
      
      const parentElement = processElement || this.canvas.getRootElement();
      
      // Validar estrutura antes da criação da conexão
      this.validateAndFixElementStructure(connectionAttrs, parentElement);
      
      const connection = this.modeling.createConnection(
        fromEntity, 
        toEntity, 
        connectionAttrs, 
        parentElement
      );

      if (connection) {
        // TEMPORARIAMENTE DESABILITADO: Sistema de pontos de ancoragem tem bug nos bounds
        // this.optimizeConnectionRouting(connection, fromEntity, toEntity);
        
        // Explicitly set properties on the businessObject
        const propertiesToUpdate: any = {};
        
        if (relationship.label) {
          propertiesToUpdate.name = relationship.label;
        }
        
        if (cardinalityInfo) {
          propertiesToUpdate.cardinalitySource = this.convertCardinalityToString(cardinalityInfo.from);
          propertiesToUpdate.cardinalityTarget = this.convertCardinalityToString(cardinalityInfo.to);
          // Marcar como vinda do modo declarativo para evitar sobrescrita pelo renderer
          propertiesToUpdate.isDeclarative = true;
          propertiesToUpdate.mermaidCardinality = relationship.cardinality;
        }
        
        if (relationship.isIdentifying !== undefined) {
          propertiesToUpdate.isParentChild = relationship.isIdentifying;
        }
        
        // Definir propriedades diretamente no businessObject (solução para propriedades customizadas)
        if (connection.businessObject) {
          Object.assign(connection.businessObject, propertiesToUpdate);
        }
        
        // Também tentar updateProperties como backup
        if (Object.keys(propertiesToUpdate).length > 0) {
          this.modeling.updateProperties(connection, propertiesToUpdate);
        }
        
        return connection;
      } else {        
        throw new Error(`Falha ao criar conexão entre ${relationship.from} e ${relationship.to}`);
      }      
      
    } catch (connectionError) {
      logger.error(`Erro ao criar relacionamento ${relationship.from} -> ${relationship.to}:`, undefined, connectionError as Error);
      throw connectionError;
    }
  }

  private convertCardinalityToString(cardinality: 'one' | 'zero-or-one' | 'zero-or-many' | 'one-or-many'): string {
    switch (cardinality) {
      case 'one':
        return '1..1';
      case 'zero-or-one':
        return '0..1';
      case 'zero-or-many':
        return '0..N';
      case 'one-or-many':
        return '1..N';
      default:
        return '1..1';
    }
  }





  private optimizeConnectionRouting(connection: any, fromEntity: any, toEntity: any): void {
    try {
      console.log(`🔗 [Connection Routing] Optimizing connection between ${fromEntity.id} and ${toEntity.id}`);
      
      // Obter bounds dos elementos
      const fromBounds = this.getElementBounds(fromEntity);
      const toBounds = this.getElementBounds(toEntity);
      
      if (!fromBounds || !toBounds) {
        console.warn('⚠️ [Connection Routing] Could not get element bounds');
        return;
      }

      // Encontrar os melhores pontos de ancoragem
      const anchorPair = this.anchorsService.findOptimalAnchorPair(
        fromEntity.id,
        toEntity.id,
        fromBounds,
        toBounds
      );

      // Registrar a conexão
      this.anchorsService.registerConnection({
        id: connection.id,
        fromElementId: fromEntity.id,
        toElementId: toEntity.id,
        fromPoint: anchorPair.fromPoint,
        toPoint: anchorPair.toPoint
      });

      // Aplicar waypoints personalizados baseados nos pontos de ancoragem
      this.applySmartWaypoints(connection, anchorPair.fromPoint, anchorPair.toPoint);

      console.log(`✅ [Connection Routing] Connection optimized: ${anchorPair.fromPoint.side} → ${anchorPair.toPoint.side}`);

    } catch (error) {
      console.error('❌ [Connection Routing] Failed to optimize connection routing:', error);
    }
  }

  private shouldUseOrthogonalRouting(horizontalDistance: number, verticalDistance: number): boolean {
    // Usar roteamento ortogonal para elementos próximos ou quando há risco de sobreposição
    return horizontalDistance < 250 || verticalDistance < 100;
  }

  private applyOrthogonalRouting(connection: any, fromCenter: {x: number, y: number}, toCenter: {x: number, y: number}): void {
    // Criar roteamento ortogonal inteligente que evita sobreposições
    const horizontalDistance = Math.abs(toCenter.x - fromCenter.x);
    const verticalDistance = Math.abs(toCenter.y - fromCenter.y);
    
    let waypoints;

    if (horizontalDistance > verticalDistance) {
      // Rota predominantemente horizontal: sair horizontalmente primeiro
      const midX = fromCenter.x + (toCenter.x - fromCenter.x) * 0.7;
      waypoints = [
        { x: fromCenter.x, y: fromCenter.y },
        { x: midX, y: fromCenter.y },
        { x: midX, y: toCenter.y },
        { x: toCenter.x, y: toCenter.y }
      ];
    } else {
      // Rota predominantemente vertical: sair verticalmente primeiro
      const midY = fromCenter.y + (toCenter.y - fromCenter.y) * 0.7;
      waypoints = [
        { x: fromCenter.x, y: fromCenter.y },
        { x: fromCenter.x, y: midY },
        { x: toCenter.x, y: midY },
        { x: toCenter.x, y: toCenter.y }
      ];
    }

    try {
      if (this.modeling.updateWaypoints) {
        this.modeling.updateWaypoints(connection, waypoints);
      }
    } catch (error) {
      logger.warn('Não foi possível aplicar roteamento ortogonal:', undefined, error as Error);
    }
  }

  /**
   * Obter bounds (posição e tamanho) de um elemento
   */
  private getElementBounds(element: any): { x: number; y: number; width: number; height: number } | null {
    try {
      // Em BPMN.js, o bounds está disponível diretamente no elemento, não no businessObject.di
      let bounds = null;
      
      // Primeiro, tentar acessar bounds diretamente do elemento (abordagem correta para BPMN.js)
      if (element.x !== undefined && element.y !== undefined && element.width !== undefined && element.height !== undefined) {
        bounds = {
          x: element.x,
          y: element.y,
          width: element.width,
          height: element.height
        };
      }
      // Fallback: se não encontrou bounds diretos, usar valores padrão baseados na posição
      else if (element.x !== undefined && element.y !== undefined) {
        bounds = {
          x: element.x,
          y: element.y,
          width: element.width || 120,
          height: element.height || 80
        };
      }
      // Último recurso: tentar no businessObject (sem di)
      else if (element.businessObject) {
        const bo = element.businessObject;
        if (bo.x !== undefined && bo.y !== undefined) {
          bounds = {
            x: bo.x,
            y: bo.y,
            width: bo.width || 120,
            height: bo.height || 80
          };
        }
      }

      if (bounds) {
        console.log(`📐 [Element Bounds] ${element.id}: (${bounds.x}, ${bounds.y}) ${bounds.width}x${bounds.height}`);
        return {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height
        };
      }

      console.warn(`⚠️ [Element Bounds] Could not determine bounds for ${element.id}`);
      return null;
    } catch (error) {
      console.error(`❌ [Element Bounds] Failed to get bounds for ${element.id}:`, error);
      return null;
    }
  }

  /**
   * Aplicar waypoints inteligentes baseados nos pontos de ancoragem
   */
  private applySmartWaypoints(connection: any, fromPoint: any, toPoint: any): void {
    try {
      console.log(`📍 [Smart Waypoints] Applying waypoints: (${fromPoint.x}, ${fromPoint.y}) → (${toPoint.x}, ${toPoint.y})`);

      // Criar waypoints baseados nos pontos de ancoragem
      const waypoints = [
        { x: fromPoint.x, y: fromPoint.y },
        { x: toPoint.x, y: toPoint.y }
      ];

      // Se os pontos estão em lados opostos ou distantes, adicionar pontos intermediários
      if (this.needsIntermediatePoints(fromPoint, toPoint)) {
        const intermediatePoints = this.calculateIntermediatePoints(fromPoint, toPoint);
        waypoints.splice(1, 0, ...intermediatePoints);
      }

      // Aplicar os waypoints à conexão
      if (connection.waypoints) {
        connection.waypoints = waypoints;
      }

      // Tentar usar o modeling para atualizar waypoints se disponível
      if (this.modeling.updateWaypoints) {
        this.modeling.updateWaypoints(connection, waypoints);
      }

      console.log(`✅ [Smart Waypoints] Applied ${waypoints.length} waypoints to connection`);

    } catch (error) {
      console.error('❌ [Smart Waypoints] Failed to apply smart waypoints:', error);
    }
  }

  /**
   * Determina se são necessários pontos intermediários
   */
  private needsIntermediatePoints(fromPoint: any, toPoint: any): boolean {
    const distance = Math.sqrt(
      Math.pow(toPoint.x - fromPoint.x, 2) + 
      Math.pow(toPoint.y - fromPoint.y, 2)
    );
    
    // Usar pontos intermediários para conexões longas ou quando os lados são perpendiculares
    const isLongDistance = distance > 300;
    const isPerpendicularSides = this.arePerpendicularSides(fromPoint.side, toPoint.side);
    
    return isLongDistance || isPerpendicularSides;
  }

  /**
   * Verifica se dois lados são perpendiculares
   */
  private arePerpendicularSides(side1: string, side2: string): boolean {
    const verticalSides = ['top', 'bottom'];
    const horizontalSides = ['left', 'right'];
    
    return (verticalSides.includes(side1) && horizontalSides.includes(side2)) ||
           (horizontalSides.includes(side1) && verticalSides.includes(side2));
  }

  /**
   * Calcula pontos intermediários para roteamento ortogonal
   */
  private calculateIntermediatePoints(fromPoint: any, toPoint: any): Array<{ x: number; y: number }> {
    const points = [];
    
    // Criar roteamento ortogonal baseado nos lados dos pontos
    if (fromPoint.side === 'right' && toPoint.side === 'left') {
      // Horizontal direto - pode precisar de desvio vertical se muito próximo
      const midX = (fromPoint.x + toPoint.x) / 2;
      points.push({ x: midX, y: fromPoint.y });
      points.push({ x: midX, y: toPoint.y });
    } else if (fromPoint.side === 'bottom' && toPoint.side === 'top') {
      // Vertical direto - pode precisar de desvio horizontal se muito próximo
      const midY = (fromPoint.y + toPoint.y) / 2;
      points.push({ x: fromPoint.x, y: midY });
      points.push({ x: toPoint.x, y: midY });
    } else if (this.arePerpendicularSides(fromPoint.side, toPoint.side)) {
      // Lados perpendiculares - criar curva em L
      if (['top', 'bottom'].includes(fromPoint.side)) {
        points.push({ x: fromPoint.x, y: toPoint.y });
      } else {
        points.push({ x: toPoint.x, y: fromPoint.y });
      }
    }
    
    return points;
  }

  /**
   * Simula movimento de elementos para ativar ErMoveRules
   * Isso força o recálculo das conexões usando o algoritmo existente
   */
  private simulateElementMovement(elements: any[]): void {
    try {
      console.log('🎭 [Movement Simulation] Starting simulation to trigger ErMoveRules');
      
      // Obter eventBus para disparar eventos de movimento
      const eventBus = this.modeler.get('eventBus') as any;
      
      if (!eventBus || typeof eventBus.fire !== 'function') {
        console.warn('⚠️ [Movement Simulation] EventBus not available');
        return;
      }

      // Para cada elemento, simular um "movimento" mínimo
      elements.forEach((element, index) => {
        setTimeout(() => {
          try {
            console.log(`🚶 [Movement Simulation] Simulating movement for ${element.id}`);
            
            // Disparar evento de movimento com delta zero (força recálculo sem mover)
            eventBus.fire('element.moved', {
              element: element,
              delta: { x: 0, y: 0 }
            });

            // Também disparar shape.move.end para garantir que ErMoveRules seja ativado
            eventBus.fire('shape.move.end', {
              element: element,
              shape: element,
              delta: { x: 0, y: 0 }
            });

          } catch (error) {
            console.error(`❌ [Movement Simulation] Error simulating movement for ${element.id}:`, error);
          }
        }, index * 50); // Escalonar no tempo para evitar conflitos
      });

      console.log(`✅ [Movement Simulation] Scheduled movement simulation for ${elements.length} elements`);

    } catch (error) {
      console.error('❌ [Movement Simulation] Failed to simulate movement:', error);
    }
  }

}