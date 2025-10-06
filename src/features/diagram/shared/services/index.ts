/**
 * Exports for ER diagram services
 * Centralized access point for all ER operation services
 */

// export { ErElementGroupingService } from './er-element-grouping.service'; // REMOVIDO - Serviço de agrupamento
export { ErSubAttributeService } from './er-sub-attribute.service';
export { 
  ElementPlacementBlockerService,
  createElementPlacementBlockerService 
} from './element-placement-blocker.service';
export { ElkLayoutService } from './elk-layout.service';
export { ConnectionAnchorsService } from './connection-anchors.service';

// Novos serviços do pipeline híbrido
export { 
  CollisionResolverService,
  createCollisionResolverService 
} from './collision-resolver.service';
export { 
  EdgeRouterService,
  createEdgeRouterService 
} from './edge-router.service';
export { 
  LayoutStabilityService,
  createLayoutStabilityService 
} from './layout-stability.service';
export { 
  LayoutMetricsService,
  createLayoutMetricsService 
} from './layout-metrics.service';

// Export types
// export type { 
//   GroupingOptions, 
//   GroupingResult 
// } from './er-element-grouping.service'; // REMOVIDO - Tipos de agrupamento

export type { 
  SubAttributeOptions, 
  SubAttributeResult 
} from './er-sub-attribute.service';

export type {
  Point,
  ElementBounds,
  Connection,
  DiagramElement
} from './element-placement-blocker.service';

export type {
  ElkLayoutOptions,
  LayoutResult,
  ElkNode,
  ElkEdge,
  ElkGraph
} from './elk-layout.service';

export type {
  AnchorPoint,
  ConnectionInfo
} from './connection-anchors.service';

// Tipos dos novos serviços híbridos
export type {
  Node,
  Vector,
  Bounds,
  CollisionMetrics
} from './collision-resolver.service';

export type {
  Edge,
  PathfindingResult,
  RoutingMetrics
} from './edge-router.service';

export type {
  PositionSnapshot,
  StabilityMetrics,
  SmoothingOptions
} from './layout-stability.service';

export type {
  LayoutMetrics,
  DebugSnapshot,
  PerformanceReport
} from './layout-metrics.service';