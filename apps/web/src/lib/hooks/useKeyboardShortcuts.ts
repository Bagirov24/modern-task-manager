import { useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '@/store/uiStore'

interface Shortcut {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  action: () => void
  description: string
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable ||
    Boolean(target.closest('[contenteditable="true"]'))
  )
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      const editableTarget = isEditableTarget(event.target)

      for (const shortcut of shortcuts) {
        if (editableTarget && shortcut.key.toLowerCase() !== 'escape') continue
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey
        const altMatch = shortcut.alt ? event.altKey : !event.altKey

        if (event.key.toLowerCase() === shortcut.key.toLowerCase() && ctrlMatch && shiftMatch && altMatch) {
          event.preventDefault()
          shortcut.action()
          return
        }
      }
    },
    [shortcuts],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

export function useGlobalShortcuts() {
  const navigate = useNavigate()
  const openModal = useUIStore((state) => state.openModal)
  const closeModal = useUIStore((state) => state.closeModal)
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen)
  const setCommandPaletteOpen = useUIStore((state) => state.setCommandPaletteOpen)

  const shortcuts = useMemo<Shortcut[]>(() => [
    { key: 'k', ctrl: true, action: () => setCommandPaletteOpen(true), description: 'Open command search' },
    { key: '/', action: () => setCommandPaletteOpen(true), description: 'Focus search' },
    { key: 'c', action: () => openModal('task.quickCreate'), description: 'Create task' },
    {
      key: 'Escape',
      action: () => {
        setCommandPaletteOpen(false)
        closeModal()
        setSidebarOpen(false)
      },
      description: 'Close active overlay',
    },
    { key: 't', ctrl: true, shift: true, action: () => navigate('/tasks'), description: 'Open tasks' },
    { key: 'p', ctrl: true, shift: true, action: () => navigate('/projects'), description: 'Open projects' },
    { key: 's', ctrl: true, shift: true, action: () => navigate('/settings'), description: 'Open settings' },
  ], [closeModal, navigate, openModal, setCommandPaletteOpen, setSidebarOpen])

  useKeyboardShortcuts(shortcuts)
}
