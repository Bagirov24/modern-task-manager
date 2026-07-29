/**
 * SHIM: taskStore canonical location is src/store/taskStore.ts.
 * Re-export so @/lib/store/taskStore imports keep working.
 * TODO: Remove in Phase 3 after updating all import paths.
 */
export { useTaskStore } from '../../store/taskStore'
