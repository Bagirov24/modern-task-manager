import { describe, expect, it } from 'vitest'
import { partializeUIState, useUIStore } from './uiStore'

describe('uiStore persistence', () => {
  it('keeps prior UI preferences and adds only the pinned Dashboard preference', () => {
    useUIStore.setState({ mode: 'light', language: 'en', sidebarCollapsed: true, pinnedFocusEntityKey: 'task:focus' })

    expect(partializeUIState(useUIStore.getState())).toEqual({
      mode: 'light',
      language: 'en',
      sidebarCollapsed: true,
      pinnedFocusEntityKey: 'task:focus',
    })
  })
})
