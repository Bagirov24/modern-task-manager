/**
 * SHIM: authStore canonical location is src/store/authStore.ts.
 * Re-export so @/lib/store/authStore imports keep working.
 * TODO: Remove in Phase 3 after updating all import paths.
 */
export { useAuthStore } from '../../store/authStore'
export type { User } from '../../store/authStore'
