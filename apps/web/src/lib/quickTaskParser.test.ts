import { describe, expect, it } from 'vitest'
import { parseQuickTask } from './quickTaskParser'

describe('parseQuickTask', () => {
  it('extracts a correctable Russian quick task', () => {
    expect(parseQuickTask('Подготовить API интеграции Telegram #CRM !Высокий @Иван завтра', new Date(2026, 6, 30))).toEqual({
      title: 'Подготовить API интеграции Telegram',
      project: 'CRM',
      priority: 'high',
      assignee: 'Иван',
      dueDate: '2026-07-31',
      labels: [],
    })
  })

  it('uses additional hashtags as labels', () => {
    const parsed = parseQuickTask('Проверить релиз #Platform #regression #mobile !P0')
    expect(parsed.project).toBe('Platform')
    expect(parsed.labels).toEqual(['regression', 'mobile'])
    expect(parsed.priority).toBe('urgent')
  })
})
