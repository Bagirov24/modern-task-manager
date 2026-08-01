// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useGlobalShortcuts } from './useKeyboardShortcuts'
import { useUIStore } from '@/store/uiStore'

function ShortcutHarness() {
  useGlobalShortcuts()
  return <><input aria-label="Editor" /><div contentEditable data-testid="editor" /></>
}

function renderShortcuts() {
  return render(<MemoryRouter><ShortcutHarness /></MemoryRouter>)
}

beforeEach(() => {
  useUIStore.setState({
    commandPaletteOpen: false,
    sidebarOpen: false,
    modal: { isOpen: false, type: null, data: null },
  })
})

afterEach(() => cleanup())

describe('global keyboard shortcuts', () => {
  it('opens command search with slash when no page control consumes it', () => {
    renderShortcuts()
    fireEvent.keyDown(window, { key: '/' })
    expect(useUIStore.getState().commandPaletteOpen).toBe(true)
  })

  it('respects already handled events and editable targets', () => {
    renderShortcuts()
    const handled = new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true })
    handled.preventDefault()
    window.dispatchEvent(handled)
    expect(useUIStore.getState().commandPaletteOpen).toBe(false)

    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Editor' }), { key: 'c' })
    expect(useUIStore.getState().modal.isOpen).toBe(false)

    fireEvent.keyDown(screen.getByTestId('editor'), { key: '/' })
    expect(useUIStore.getState().commandPaletteOpen).toBe(false)
  })

  it('opens the existing quick-create flow with C', () => {
    renderShortcuts()
    fireEvent.keyDown(window, { key: 'c' })
    expect(useUIStore.getState().modal).toMatchObject({ isOpen: true, type: 'task.quickCreate' })
  })

  it('closes UI-store overlays with Escape', () => {
    renderShortcuts()
    useUIStore.setState({
      commandPaletteOpen: true,
      sidebarOpen: true,
      modal: { isOpen: true, type: 'task.quickCreate', data: null },
    })
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Editor' }), { key: 'Escape' })
    expect(useUIStore.getState().commandPaletteOpen).toBe(false)
    expect(useUIStore.getState().sidebarOpen).toBe(false)
    expect(useUIStore.getState().modal.isOpen).toBe(false)
  })
})
