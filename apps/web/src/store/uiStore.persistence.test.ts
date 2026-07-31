import { describe, expect, it } from 'vitest'
import { partializeUIState, useUIStore } from './uiStore'

describe('uiStore persistence', () => {
  it('keeps UI preferences including the pinned focus and last task view', () => {
    useUIStore.setState({
      mode: 'light',
      language: 'en',
      sidebarCollapsed: true,
      pinnedFocusEntityKey: 'task:focus',
      lastTaskView: 'timeline',
    })

    expect(partializeUIState(useUIStore.getState())).toEqual({
      mode: 'light',
      language: 'en',
      sidebarCollapsed: true,
      pinnedFocusEntityKey: 'task:focus',
      lastTaskView: 'timeline',
    })
  })
})
