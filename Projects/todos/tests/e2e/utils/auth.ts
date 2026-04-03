import { expect, type Page } from "@playwright/test"

const MAILPIT_URL = "http://127.0.0.1:54324"

type MailpitMessage = {
  ID: string
}

type MailpitSearchResponse = {
  messages: MailpitMessage[]
}

type MailpitMessageResponse = {
  Text: string
}

export function createTestEmail(): string {
  return `playwright-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.com`
}

async function getLatestMagicLink(email: string): Promise<string> {
  const deadline = Date.now() + 60_000

  while (Date.now() < deadline) {
    const searchResponse = await fetch(
      `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(email)}`
    )

    if (searchResponse.ok) {
      const result = (await searchResponse.json()) as MailpitSearchResponse
      const latest = result.messages.at(0)

      if (latest?.ID) {
        const messageResponse = await fetch(`${MAILPIT_URL}/api/v1/message/${latest.ID}`)

        if (messageResponse.ok) {
          const message = (await messageResponse.json()) as MailpitMessageResponse
          const match = message.Text.match(/https?:\/\/[^\s)"']+/i)

          if (match) {
            return match[0]
          }
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000))
  }

  throw new Error(`Timed out waiting for a magic link for ${email}`)
}

export async function loginWithMagicLink(page: Page, email = createTestEmail()): Promise<string> {
  await page.goto("/login")
  await page.getByPlaceholder("your@email.com").fill(email)
  await page.getByRole("button", { name: "Send Magic Link" }).click()
  await expect(page.getByRole("button", { name: "Try a different email" })).toBeVisible({
    timeout: 10_000,
  })

  const magicLink = await getLatestMagicLink(email)
  await page.goto(magicLink)

  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByText(email)).toBeVisible()

  return email
}
