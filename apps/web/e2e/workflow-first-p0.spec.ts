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
  waiting: '\u0416\u0434\u0443 \u043e\u0442\u0432\u0435\u0442\u0430',
  overview: '\u041e\u0431\u0437\u043e\u0440',
  changeTask: '\u0421\u043c\u0435\u043d\u0438\u0442\u044c \u0437\u0430\u0434\u0430\u0447\u0443',
  pinned: '\u0417\u0430\u043a\u0440\u0435\u043f\u043b\u0435\u043d\u043e \u0432\u0430\u043c\u0438',
  list: '\u0421\u043f\u0438\u0441\u043e\u043a',
  calendar: '\u041a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u044c',
  retry: '\u041f\u043e\u0432\u0442\u043e\u0440\u0438\u0442\u044c',
} as const

interface ManagerFixture {
  email: string
  password: string
  taskId: string
  taskIds: string[]
  taskTitle: string
  alternateTaskTitle: string
  projectId: string
  headers: Record<string, string>
}

function randomTestIp() {
  const seed = crypto.randomUUID().replace(/-/g, '')
  return '10.' + [0, 2, 4].map((offset) => (parseInt(seed.slice(offset, offset + 2), 16) % 250) + 1).join('.')
}

async function provisionManager(request: APIRequestContext, workerInfo: WorkerInfo): Promise<ManagerFixture> {
  const worker = workerInfo.workerIndex
  const runId = Date.now().toString(36) + '-' + crypto.randomUUID().slice(0, 8)
  const clientIp = randomTestIp()
  const email = `workflow.e2e.${worker}.${runId}@example.com`
  const username = `workflow_e2e_${worker}_${runId.replace(/-/g, '_')}`
  const password = `E2E-${crypto.randomUUID()}-Aa1!`
  const registration = await request.post(API_BASE + '/auth/register', {
    headers: { 'X-Forwarded-For': clientIp },
    data: { email, username, password, full_name: 'Workflow E2E Manager' },
  })
  expect(registration.status(), `registration status ${registration.status()}`).toBe(201)

  const login = await request.post(API_BASE + '/auth/login', { headers: { 'X-Forwarded-For': clientIp }, data: { email, password } })
  expect(login.ok(), `login status ${login.status()}`).toBeTruthy()
  const token = (await login.json() as { access_token: string }).access_token
  const headers = { Authorization: 'Bearer ' + token, 'X-Forwarded-For': clientIp }

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

  const alternateTaskTitle = 'P0 alternate focus ' + suffix
  const additionalTasks = [
    {
      title: alternateTaskTitle,
      status: 'todo',
      workflow_status: 'ready',
      priority: 'high',
      next_action_description: 'Confirm the alternate focus',
    },
    {
      title: 'P0 planned action ' + suffix,
      status: 'todo',
      workflow_status: 'planned',
      priority: 'medium',
      next_action_description: 'Prepare the next planned action',
    },
    {
      title: 'P0 waiting for team ' + suffix,
      status: 'in_progress',
      workflow_status: 'waiting_for_internal',
      priority: 'medium',
      next_action_description: 'Follow up with the team',
    },
    {
      title: 'P0 waiting for client ' + suffix,
      status: 'in_progress',
      workflow_status: 'waiting_for_client',
      priority: 'medium',
      next_action_description: 'Follow up with the client',
    },
  ]
  const taskIds = [task.id]

  for (const additionalTask of additionalTasks) {
    const response = await request.post(API_BASE + '/tasks/', {
      headers,
      data: {
        ...additionalTask,
        project_id: project.id!,
        assignee_id: profile.id,
        manager_id: profile.id,
        next_action_owner_id: profile.id,
        context: 'P0 acceptance context',
        expected_result: 'The acceptance fixture is actionable',
        acceptance_criteria: '- Visible on Dashboard',
        next_action_due_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        final_due_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      },
    })
    expect(response.ok(), 'additional task status ' + response.status()).toBeTruthy()
    taskIds.push((await response.json() as { id: string }).id)
  }

  return { email, password, taskId: task.id, taskIds, taskTitle, alternateTaskTitle, projectId: project.id!, headers }
}

async function cleanupManager(request: APIRequestContext, manager: ManagerFixture) {
  for (const taskId of manager.taskIds) {
    await request.delete(API_BASE + '/tasks/' + taskId, { headers: manager.headers })
  }
  await request.delete(API_BASE + '/projects/' + manager.projectId, { headers: manager.headers })
}

async function login(page: Page, manager: ManagerFixture) {
  await page.setExtraHTTPHeaders({ 'X-Forwarded-For': randomTestIp() })
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

test('passes the P0 responsive and pinned-focus acceptance review', async ({ page, manager }) => {
  test.setTimeout(60_000)
  await login(page, manager)

  const expectDashboardLayout = async () => {
    await expect(page.getByRole('heading', { name: 'Focus Now' })).toBeVisible()
    const actions = page.getByRole('region', { name: UI.myActions })
    const waiting = page.getByRole('region', { name: UI.waiting })
    await expect(actions.getByRole('listitem')).toHaveCount(3)
    await expect(waiting.getByRole('listitem')).toHaveCount(2)
    const documentWidth = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }))
    expect(documentWidth.scroll).toBeLessThanOrEqual(documentWidth.client + 1)
  }

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await expectDashboardLayout()

  await page.getByRole('button', { name: UI.changeTask }).click()
  await page.getByRole('option', { name: manager.alternateTaskTitle }).click()
  await expect(page.getByRole('heading', { name: manager.alternateTaskTitle })).toBeVisible()
  await expect.poll(() => page.evaluate(() => {
    const persisted = JSON.parse(localStorage.getItem('ui-store') ?? '{}')
    return persisted.state?.pinnedFocusEntityKey
  })).toBe('task:' + manager.taskIds[1])
  await page.reload()
  await expect(page.getByRole('heading', { name: manager.alternateTaskTitle })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(UI.pinned)).toBeVisible()
  await page.setViewportSize({ width: 1024, height: 768 })
  await expectDashboardLayout()
})

test('persists List, Kanban, Timeline, and Calendar context', async ({ page, manager }) => {
  test.setTimeout(60_000)
  await login(page, manager)
  await page.goto('/tasks?view=list&preset=my-actions&sort=priority')
  await expect(page.getByRole('tab', { name: UI.list })).toHaveAttribute('aria-selected', 'true')
  await page.getByRole('tab', { name: 'Kanban' }).click()
  await expect.poll(() => new URL(page.url()).searchParams.get('view')).toBe('kanban')
  await page.getByRole('tab', { name: 'Timeline' }).click()
  await expect.poll(() => new URL(page.url()).searchParams.get('view')).toBe('timeline')
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('tab', { name: 'Timeline' })).toHaveAttribute('aria-selected', 'true', { timeout: 20_000 })
  await page.getByRole('tab', { name: UI.calendar }).click()
  await page.waitForURL((url) => url.pathname === '/calendar')
  expect(new URL(page.url()).searchParams.get('preset')).toBe('my-actions')
  expect(new URL(page.url()).searchParams.get('sort')).toBe('priority')
  await page.goto('/tasks', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('tab', { name: 'Timeline' })).toHaveAttribute('aria-selected', 'true', { timeout: 20_000 })
})

test('shows a stable offline state and recovers through retry', async ({ page, manager }) => {
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (/\/api\/v1\/(tasks|projects|communication-items)\//.test(path)) {
      await route.abort('internetdisconnected')
      return
    }
    await route.continue()
  })
  await login(page, manager)
  await page.getByRole('link', { name: UI.overview }).first().click()
  await expect(page).toHaveURL(/\/$/)
  const errorState = page.getByRole('alert').first()
  await expect(errorState).toBeVisible({ timeout: 20_000 })
  const errorBounds = await errorState.boundingBox()
  expect(errorBounds?.height ?? 0).toBeGreaterThanOrEqual(48)
  const retry = page.getByRole('button', { name: UI.retry }).first()
  await expect(retry).toBeVisible()
  await page.unroute('**/api/v1/**')
  await retry.click()
  await expect(page.getByText(manager.taskTitle).first()).toBeVisible({ timeout: 20_000 })
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
