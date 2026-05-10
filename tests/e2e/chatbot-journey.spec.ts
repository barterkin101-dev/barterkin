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

    // Bot responds — wait for server action round-trip + DOM update
    // useActionState triggers a re-render; give it generous time in CI
    await expect(
      page.locator('.whitespace-pre-wrap').filter({ hasText: /listing/i }).nth(1)
    ).toBeVisible({ timeout: 15000 })
  })

  test('escalation flow creates a support ticket', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: /open chat/i }).click()

    // Trigger escalation
    const input = page.getByPlaceholder('Type a message...')
    await input.fill('I need to talk to a human')
    await input.press('Enter')

    // Wait for bot response with escalate action button
    await expect(
      page.locator('.whitespace-pre-wrap').filter({ hasText: /human|support|ticket/i }).nth(1)
    ).toBeVisible({ timeout: 15000 })

    // Click the escalate action button rendered by the bot response
    const escalateButton = page.getByRole('button', { name: /create support ticket/i })
    await expect(escalateButton).toBeVisible({ timeout: 5000 })
    await escalateButton.click()

    // Bot prompts for subject line after clicking escalate
    await expect(page.getByText(/subject line/i)).toBeVisible({ timeout: 5000 })

    // User types a subject-line message
    await input.fill('Cannot publish my listing')
    await input.press('Enter')

    // Escalation form appears with subject pre-filled from the message above
    await expect(page.getByPlaceholder(/subject/i)).toBeVisible({ timeout: 5000 })

    // Fill ticket form body
    await page.getByPlaceholder(/describe your issue/i).fill('This is a test ticket created by the chatbot E2E test.')

    // Submit
    await page.getByRole('button', { name: /create ticket/i }).click()

    // Success confirmation
    await expect(page.getByText(/support ticket created/i)).toBeVisible({ timeout: 15000 })
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
