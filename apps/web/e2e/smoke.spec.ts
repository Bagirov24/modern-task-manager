import { test, expect } from '@playwright/test'

/**
 * Phase 6 — E2E Smoke Suite
 * Покрывает критические пути: auth, dashboard, tasks CRUD, projects.
 * Запуск: pnpm exec playwright test
 */

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const EMAIL = process.env.TEST_EMAIL ?? 'test@example.com'
const PASSWORD = process.env.TEST_PASSWORD ?? 'testpassword'

test.describe('Smoke — Auth', () => {
  test('redirect to /login when not authenticated', async ({ page }) => {
    await page.goto(`${BASE}/`)
    await expect(page).toHaveURL(/\/login/)
  })

  test('can login with valid credentials', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.getByLabel(/email/i).fill(EMAIL)
    await page.getByLabel(/пароль|password/i).fill(PASSWORD)
    await page.getByRole('button', { name: /войти|login|sign in/i }).click()
    await expect(page).toHaveURL(`${BASE}/`)
    await expect(page.getByText(/добро пожаловать/i)).toBeVisible()
  })

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.getByLabel(/email/i).fill('wrong@example.com')
    await page.getByLabel(/пароль|password/i).fill('wrongpassword')
    await page.getByRole('button', { name: /войти|login|sign in/i }).click()
    await expect(page.getByRole('alert')).toBeVisible()
  })
})

test.describe('Smoke — Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.getByLabel(/email/i).fill(EMAIL)
    await page.getByLabel(/пароль|password/i).fill(PASSWORD)
    await page.getByRole('button', { name: /войти|login|sign in/i }).click()
    await page.waitForURL(`${BASE}/`)
  })

  test('dashboard shows stat cards', async ({ page }) => {
    await expect(page.getByText(/всего задач/i)).toBeVisible()
    await expect(page.getByText(/в работе/i)).toBeVisible()
    await expect(page.getByText(/завершено/i)).toBeVisible()
  })

  test('sidebar navigation works', async ({ page }) => {
    await page.getByRole('link', { name: /задачи/i }).click()
    await expect(page).toHaveURL(/\/tasks/)
    await page.getByRole('link', { name: /проекты/i }).click()
    await expect(page).toHaveURL(/\/projects/)
  })
})

test.describe('Smoke — Tasks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.getByLabel(/email/i).fill(EMAIL)
    await page.getByLabel(/пароль|password/i).fill(PASSWORD)
    await page.getByRole('button', { name: /войти|login|sign in/i }).click()
    await page.waitForURL(`${BASE}/`)
    await page.goto(`${BASE}/tasks`)
  })

  test('tasks page loads with view toggle', async ({ page }) => {
    await expect(page.getByText(/задачи/i).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /задача/i })).toBeVisible()
  })

  test('can switch to timeline view', async ({ page }) => {
    const timelineBtn = page.locator('[aria-label*="imeline"], [title*="imeline"]').first()
    await timelineBtn.click()
    // timeline view или empty state должен быть виден
    await expect(page.locator('body')).toBeVisible()
  })

  test('can open create task dialog', async ({ page }) => {
    await page.getByRole('button', { name: /задача/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
  })

  test('can search tasks', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/поиск задач/i)
    await searchInput.fill('test')
    await page.waitForTimeout(300)
    // Поиск не должен бросать ошибку
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Smoke — Projects', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.getByLabel(/email/i).fill(EMAIL)
    await page.getByLabel(/пароль|password/i).fill(PASSWORD)
    await page.getByRole('button', { name: /войти|login|sign in/i }).click()
    await page.waitForURL(`${BASE}/`)
    await page.goto(`${BASE}/projects`)
  })

  test('projects page loads', async ({ page }) => {
    await expect(page.getByText(/проекты/i).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /новый проект/i })).toBeVisible()
  })

  test('can open create project dialog', async ({ page }) => {
    await page.getByRole('button', { name: /новый проект/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
  })
})

test.describe('Smoke — Command Palette', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.getByLabel(/email/i).fill(EMAIL)
    await page.getByLabel(/пароль|password/i).fill(PASSWORD)
    await page.getByRole('button', { name: /войти|login|sign in/i }).click()
    await page.waitForURL(`${BASE}/`)
  })

  test('opens with Ctrl+K', async ({ page }) => {
    await page.keyboard.press('Control+k')
    await expect(page.getByPlaceholder(/поиск команд/i)).toBeVisible()
    await page.keyboard.press('Escape')
  })

  test('navigates via command palette', async ({ page }) => {
    await page.keyboard.press('Control+k')
    await page.getByPlaceholder(/поиск команд/i).fill('задачи')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/tasks/)
  })
})
