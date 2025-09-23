export { useElementProperties } from './useElementProperties';
export { useErExportFunctions } from './useErExportFunctions';
export { useErUnsavedChanges } from './useErUnsavedChanges';

// Legacy hook (kept for compatibility)
export { usePropertyUpdater } from './usePropertyUpdater';

// New specialized hooks
export { useErPropertyManager } from './useErPropertyManager';
export { useEnhancedErPropertyManager } from './useEnhancedErPropertyManager';
export { useErElementState } from './useErElementState';
export { useErEventManager } from './useErEventManager';
export { useErRenderManager } from './useErRenderManager';
export { useConnectionData } from './useConnectionData';

// Composite hook (recommended replacement for usePropertyUpdater)
export { useErComposite } from './useErCompositeHook';