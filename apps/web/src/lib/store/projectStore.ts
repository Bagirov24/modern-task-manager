/**
 * SHIM: projectStore canonical location is src/store/projectStore.ts.
 * Re-export so @/lib/store/projectStore imports keep working.
 * TODO: Remove in Phase 3 after updating all import paths.
 */
export { useProjectStore } from '../../store/projectStore'
