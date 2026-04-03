import { expect, test } from "@playwright/test"
import { deleteTestUser } from "./utils/admin"
import { loginWithMagicLink } from "./utils/auth"

test.describe("auth flows", () => {
  let testEmail: string

  test.afterEach(async () => {
    if (testEmail) {
      await deleteTestUser(testEmail)
    }
  })

  test("redirects unauthenticated users from /dashboard to /login", async ({ page }) => {
    await page.goto("/dashboard")

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByText("Sign in to manage your tasks")).toBeVisible()
    await expect(page.getByRole("button", { name: "Send Magic Link" })).toBeVisible()
  })

  test("logs in with a magic link and logs out", async ({ page }) => {
    testEmail = await loginWithMagicLink(page)

    await page.getByRole("button", { name: "Log out" }).click()

    await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 })
    await expect(page.getByRole("button", { name: "Send Magic Link" })).toBeVisible()
  })
})
