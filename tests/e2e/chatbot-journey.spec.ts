import { test, expect } from '@playwright/test'

test.describe('chatbot customer journey', () => {
  test('widget opens and bot greets the user', async ({ page }) => {
    await page.goto('/')

    // Widget button is visible
    const chatButton = page.getByRole('button', { name: /open chat/i })
    await expect(chatButton).toBeVisible()

    // Open chat
    await chatButton.click()

    // Chat window is visible with header
    await expect(page.getByText('Barterkin Support')).toBeVisible()

    // Bot sends a greeting
    await expect(page.getByText(/hey there/i)).toBeVisible()
    await expect(page.getByText(/what can i help you with/i)).toBeVisible()
  })

  test('user sends a message and receives a bot response', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: /open chat/i }).click()

    // Type and send a message
    const input = page.getByPlaceholder('Type a message...')
    await input.fill('How do I create a listing?')
    await input.press('Enter')

    // User message appears
    await expect(page.getByText('How do I create a listing?')).toBeVisible()

    // Bot responds (wait for server action round-trip)
    await expect(page.locator('.whitespace-pre-wrap').filter({ hasText: /listing/i }).nth(1)).toBeVisible({ timeout: 5000 })
  })

  test('escalation flow creates a support ticket', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: /open chat/i }).click()

    // Trigger escalation
    const input = page.getByPlaceholder('Type a message...')
    await input.fill('I need to talk to a human')
    await input.press('Enter')

    // Wait for bot response
    await expect(page.locator('.whitespace-pre-wrap').filter({ hasText: /human|support|ticket/i }).nth(1)).toBeVisible({ timeout: 5000 })

    // Click escalate action if present
    const escalateButton = page.getByRole('button', { name: /contact support|create support ticket/i })
    if (await escalateButton.isVisible().catch(() => false)) {
      await escalateButton.click()
    }

    // Escalation form appears
    await expect(page.getByPlaceholder(/subject/i)).toBeVisible({ timeout: 3000 })

    // Fill ticket form
    await page.getByPlaceholder(/subject/i).fill('Test chatbot escalation')
    await page.getByPlaceholder(/describe your issue/i).fill('This is a test ticket created by the chatbot E2E test.')

    // Submit
    await page.getByRole('button', { name: /create ticket/i }).click()

    // Success confirmation
    await expect(page.getByText(/support ticket created/i)).toBeVisible({ timeout: 5000 })
  })

  test('chat widget is accessible on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    const chatButton = page.getByRole('button', { name: /open chat/i })
    await expect(chatButton).toBeVisible()

    await chatButton.click()
    await expect(page.getByText('Barterkin Support')).toBeVisible()
  })
})
