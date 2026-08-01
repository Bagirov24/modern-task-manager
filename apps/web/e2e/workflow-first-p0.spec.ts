import { expect, test as base, type APIRequestContext, type Page, type WorkerInfo } from '@playwright/test'

const API_BASE = process.env.E2E_API_URL ?? 'http://127.0.0.1:8000/api/v1'
const UI = {
  password: '\u041f\u0430\u0440\u043e\u043b\u044c',
  login: '\u0412\u043e\u0439\u0442\u0438',
  myActions: '\u041c\u043e\u0438 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f',
  communications: '\u041a\u043e\u043c\u043c\u0443\u043d\u0438\u043a\u0430\u0446\u0438\u0438',
  openTask: '\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u0437\u0430\u0434\u0430\u0447\u0443',
  mainNavigation: '\u041e\u0441\u043d\u043e\u0432\u043d\u0430\u044f \u043d\u0430\u0432\u0438\u0433\u0430\u0446\u0438\u044f',
  tasks: '\u0417\u0430\u0434\u0430\u0447\u0438',
  commandSearch: '\u041f\u043e\u0438\u0441\u043a \u043a\u043e\u043c\u0430\u043d\u0434',
  quickTask: '\u0411\u044b\u0441\u0442\u0440\u0430\u044f \u0437\u0430\u0434\u0430\u0447\u0430',
} as const

interface ManagerFixture {
  email: string
  password: string
  taskId: string
  taskTitle: string
  projectId: string
  headers: Record<string, string>
}

async function provisionManager(request: APIRequestContext, workerInfo: WorkerInfo): Promise<ManagerFixture> {
  const worker = workerInfo.workerIndex
  const runId = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
  const email = `workflow.e2e.${worker}.${runId}@example.com`
  const username = `workflow_e2e_${worker}_${runId.replace(/-/g, '_')}`
  const password = `E2E-${crypto.randomUUID()}-Aa1!`
  const registration = await request.post(`${API_BASE}/auth/register`, {
    data: { email, username, password, full_name: 'Workflow E2E Manager' },
  })
  expect(registration.status(), `registration status ${registration.status()}`).toBe(201)

  const login = await request.post(`${API_BASE}/auth/login`, { data: { email, password } })
  expect(login.ok(), `login status ${login.status()}`).toBeTruthy()
  const token = (await login.json() as { access_token: string }).access_token
  const headers = { Authorization: `Bearer ${token}` }

  const profileResponse = await request.get(`${API_BASE}/auth/me`, { headers })
  expect(profileResponse.ok(), `profile status ${profileResponse.status()}`).toBeTruthy()
  const profile = await profileResponse.json() as { id: string }

  const suffix = `${workerInfo.project.name}-${worker}-${runId}`
  const projectResponse = await request.post(`${API_BASE}/projects/`, {
    headers,
    data: { name: `Workflow E2E ${suffix}`, description: 'P0 browser gate fixture' },
  })
  const project = await projectResponse.json() as { id?: string; detail?: unknown }
  expect(
    projectResponse.ok(),
    `project status ${projectResponse.status()}: ${JSON.stringify(project.detail ?? project)}`,
  ).toBeTruthy()
  expect(project.id, 'project response id').toBeTruthy()

  const taskTitle = `P0 daily workflow ${suffix}`
  const taskResponse = await request.post(`${API_BASE}/tasks/`, {
    headers,
    data: {
      title: taskTitle,
      description: 'Verify context-preserving manager workflow',
      status: 'in_progress',
      workflow_status: 'in_progress',
      priority: 'urgent',
      project_id: project.id!,
      assignee_id: profile.id,
      manager_id: profile.id,
      next_action_owner_id: profile.id,
      next_action_description: 'Review the workflow gate',
      next_action_due_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      final_due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      context: 'P0 daily workflow',
      expected_result: 'The manager keeps task context',
      acceptance_criteria: '- Drawer opens\n- Escape restores focus',
    },
  })
  expect(taskResponse.ok(), `task status ${taskResponse.status()}`).toBeTruthy()
  const task = await taskResponse.json() as { id: string }

  return { email, password, taskId: task.id, taskTitle, projectId: project.id!, headers }
}

async function cleanupManager(request: APIRequestContext, manager: ManagerFixture) {
  await request.delete(`${API_BASE}/tasks/${manager.taskId}`, { headers: manager.headers })
  await request.delete(`${API_BASE}/projects/${manager.projectId}`, { headers: manager.headers })
}

async function login(page: Page, manager: ManagerFixture) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(manager.email)
  await page.getByLabel(UI.password).fill(manager.password)
  await page.getByRole('button', { name: UI.login }).click()
  await page.waitForURL(/\/tasks(?:\?|$)/)
}

async function expectNoUnnamedIconButtons(page: Page) {
  const unnamed = await page.locator('button:visible').evaluateAll((buttons) =>
    buttons
      .filter((button) => !button.getAttribute('aria-label') && !button.textContent?.trim())
      .map((button) => button.outerHTML.slice(0, 180)),
  )
  expect(unnamed).toEqual([])
}

const test = base.extend<object, { manager: ManagerFixture }>({
  manager: [async ({ playwright }, provide, workerInfo) => {
    const request = await playwright.request.newContext()
    let manager: ManagerFixture | undefined
    try {
      manager = await provisionManager(request, workerInfo)
      await provide(manager)
    } finally {
      if (manager) await cleanupManager(request, manager)
      await request.dispose()
    }
  }, { scope: 'worker' }],
})

test('manager completes the desktop daily-work loop without losing task context', async ({ page, manager }) => {
  await login(page, manager)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Focus Now' })).toBeVisible()
  await expect(page.getByRole('heading', { name: UI.myActions })).toBeVisible()
  await expect(page.getByText(manager.taskTitle).first()).toBeVisible()
  await expectNoUnnamedIconButtons(page)

  await page.goto('/tasks?view=list&preset=my-actions&sort=priority')
  const openTask = page.getByRole('button', { name: `${UI.openTask} ${manager.taskTitle}` })
  await expect(openTask).toBeVisible()
  await expectNoUnnamedIconButtons(page)
  await openTask.focus()
  await openTask.click()
  await expect(page.getByRole('dialog', { name: manager.taskTitle })).toBeVisible()
  await expect(page.getByRole('tab', { name: new RegExp(UI.communications) })).toBeVisible()
  await expectNoUnnamedIconButtons(page)
  expect(new URL(page.url()).searchParams.get('task')).toBe(manager.taskId)

  await page.keyboard.press('Escape')
  await expect.poll(() => new URL(page.url()).searchParams.has('task')).toBe(false)
  expect(new URL(page.url()).searchParams.get('view')).toBe('list')
  expect(new URL(page.url()).searchParams.get('preset')).toBe('my-actions')
  expect(new URL(page.url()).searchParams.get('sort')).toBe('priority')
  await expect(openTask).toBeFocused()

  await page.goto('/')
  await page.keyboard.press('/')
  const commandSearch = page.getByPlaceholder(new RegExp(UI.commandSearch))
  await expect(commandSearch).toBeVisible()
  await expect(commandSearch).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('Escape')
  await expect(commandSearch).toBeHidden()

  await page.keyboard.press('c')
  await expect(page.getByRole('dialog', { name: UI.quickTask })).toBeVisible()
  await page.keyboard.press('Escape')
})

test.describe('mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('uses bottom navigation and a fullscreen task view', async ({ page, manager }) => {
    await login(page, manager)
    const navigation = page.getByRole('navigation', { name: UI.mainNavigation })
    await expect(navigation).toBeVisible()
    await expect(navigation.getByRole('link')).toHaveCount(5)
    await expectNoUnnamedIconButtons(page)
    await navigation.getByRole('link', { name: UI.tasks }).click()

    const openTask = page.getByRole('button', { name: `${UI.openTask} ${manager.taskTitle}` })
    await expect(openTask).toBeVisible()
    await openTask.click()
    const drawer = page.getByRole('dialog', { name: manager.taskTitle })
    await expect(drawer).toBeVisible()
    const bounds = await drawer.boundingBox()
    expect(Math.round(bounds?.width ?? 0)).toBe(390)
    await expect(page.getByRole('tab', { name: new RegExp(UI.communications) })).toBeVisible()
    await expectNoUnnamedIconButtons(page)
  })
})
