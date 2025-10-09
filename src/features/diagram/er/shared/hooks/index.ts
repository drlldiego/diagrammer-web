/**
 * Centralized exports for ER hooks
 * Organized by category for better maintainability
 */

// Core hooks - fundamental element management
export { useElementProperties } from './core/useElementProperties';
export { useErElementState } from './core/useErElementState';
export { useErElementSelection } from './core/useErElementSelection';
export { useConnectionData } from './core/useConnectionData';

// Management hooks - specialized services
export { useErPropertyManager } from './management/useErPropertyManager';
export { useErEventManager } from './management/useErEventManager';
export { useErRenderManager } from './management/useErRenderManager';

// Feature hooks - specific functionalities
export { useErExportFunctions } from './features/useErExportFunctions';
export { useSubAttributeCreation } from './features/useSubAttributeCreation';
export { useErUnsavedChanges } from './features/useErUnsavedChanges';

// Composite hooks - unified interfaces
export { useErComposite } from './composite/useErCompositeHook';

// Export types
export type { UseSubAttributeCreationReturn } from './features/useSubAttributeCreation';
export type { UseErElementSelectionReturn } from './core/useErElementSelection';
export type { ElementProperties, UseElementPropertiesReturn } from './core/useElementProperties';