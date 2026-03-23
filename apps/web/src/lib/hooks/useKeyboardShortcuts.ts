import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

interface Shortcut {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  action: () => void
  description: string
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return
      }

      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey
        const altMatch = shortcut.alt ? e.altKey : !e.altKey

        if (e.key.toLowerCase() === shortcut.key.toLowerCase() && ctrlMatch && shiftMatch && altMatch) {
          e.preventDefault()
          shortcut.action()
          return
        }
      }
    },
    [shortcuts]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

export function useGlobalShortcuts() {
  const navigate = useNavigate()

  useKeyboardShortcuts([
    { key: 't', ctrl: true, shift: true, action: () => navigate('/tasks'), description: 'Перейти к задачам' },
    { key: 'p', ctrl: true, shift: true, action: () => navigate('/projects'), description: 'Перейти к проектам' },
    { key: 's', ctrl: true, shift: true, action: () => navigate('/settings'), description: 'Настройки' },
  ])
}
