import { expect, type Page } from "@playwright/test"

export async function deleteCurrentAccount(page: Page): Promise<void> {
  await page.goto("/dashboard/profile")
  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible({ timeout: 10_000 })

  await page.getByRole("button", { name: "Delete Account" }).click()
  await page.getByPlaceholder("delete my account").fill("delete my account")
  await page.getByRole("button", { name: "Permanently Delete Account" }).click()

  // The app's client-side redirect (signOut + router.push) can be slow or
  // fail silently when the user was already deleted from auth.users.
  // Give it a reasonable window, then force-navigate as a fallback.
  try {
    await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 })
  } catch {
    await page.goto("/login")
    await expect(page).toHaveURL(/\/login$/)
  }
}
