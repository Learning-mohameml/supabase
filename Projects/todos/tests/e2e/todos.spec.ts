import { expect, test } from "@playwright/test"
import { deleteTestUser } from "./utils/admin"
import { loginWithMagicLink } from "./utils/auth"

function uniqueTodoTitle(): string {
  return `Playwright todo ${Date.now()}`
}

test.describe("todo workflows", () => {
  let testEmail: string

  test.afterEach(async () => {
    if (testEmail) {
      await deleteTestUser(testEmail)
    }
  })

  test("creates, updates, and deletes a todo", async ({ page }) => {
    test.setTimeout(90_000)

    const initialTitle = uniqueTodoTitle()
    const updatedTitle = `${initialTitle} updated`
    const initialDescription = "Created by Playwright"
    const updatedDescription = "Updated by Playwright"

    testEmail = await loginWithMagicLink(page)

    await page.getByRole("button", { name: "Add Todo" }).click()
    await page.getByPlaceholder("What needs to be done?").fill(initialTitle)
    await page.getByPlaceholder("Add more details (optional)").fill(initialDescription)
    await page.getByRole("button", { name: "Create Todo" }).click()

    const todoLink = page.getByRole("link", { name: initialTitle })
    await expect(todoLink).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(initialDescription)).toBeVisible()
    await expect(todoLink).toHaveAttribute("href", /\/dashboard\/todo\//)

    const todoHref = await todoLink.getAttribute("href")
    if (!todoHref) throw new Error("Todo link is missing href")

    await page.goto(todoHref)

    await expect(page).toHaveURL(/\/dashboard\/todo\//)
    await expect(page.getByRole("heading", { name: initialTitle })).toBeVisible()

    await page.getByRole("button", { name: "Edit" }).click()
    await page.getByPlaceholder("Todo title").fill(updatedTitle)
    await page.getByPlaceholder("Add more details (optional)").fill(updatedDescription)
    await page.getByRole("button", { name: "Save Changes" }).click()

    // Wait for the success toast to confirm the update was persisted
    await expect(page.getByText("Todo updated")).toBeVisible({ timeout: 10_000 })

    // Reload to get fresh server-rendered data
    // (client-side RSC revalidation timing is unreliable in tests)
    await page.reload()

    await expect(page.getByRole("heading", { name: updatedTitle })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(updatedDescription)).toBeVisible()

    const backLink = page.getByRole("link", { name: "Back" })
    await expect(backLink).toHaveAttribute("href", "/dashboard")
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/\/dashboard$/)

    await page.getByRole("button", { name: `Todo actions for ${updatedTitle}` }).click()
    await page.getByRole("menuitem", { name: "Delete" }).click()

    // Wait for the delete toast, then confirm the todo is gone
    await expect(page.getByText("Todo deleted")).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole("link", { name: updatedTitle })).not.toBeVisible({ timeout: 10_000 })
  })

  test("shows the todo not-found page for an invalid route id", async ({ page }) => {
    testEmail = await loginWithMagicLink(page)

    await page.goto("/dashboard/todo/not-a-uuid")

    await expect(page.getByRole("heading", { name: "Todo not found" })).toBeVisible()
    await expect(page.getByText("This todo doesn't exist or has been deleted.")).toBeVisible()
    await expect(page.getByRole("link", { name: "Back to Dashboard" })).toBeVisible()
  })
})
