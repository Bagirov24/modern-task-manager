/**
 * SHIM: themeStore has been merged into uiStore (src/store/uiStore.ts).
 * This file re-exports from uiStore so existing imports don't break
 * while the codebase is being migrated.
 *
 * TODO: Remove this file in Phase 3 after all imports are updated.
 */
export { useUIStore as useThemeStore } from '../../store/uiStore'
