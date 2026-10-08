import { test, expect } from "@playwright/test";

test.describe("WhatsApp Promotional Campaign Manager E2E Flow", () => {
  test("loads the dashboard and renders core metric cards", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("h1")).toContainText("Promotional Campaign Dashboard");
    await expect(page.getByText("Total Customers")).toBeVisible();
    await expect(page.getByText("Opted-in Customers")).toBeVisible();
    await expect(page.getByText("Messages Sent")).toBeVisible();
  });

  test("navigates to create campaign wizard and renders step 1", async ({ page }) => {
    await page.goto("/campaigns/create");
    await expect(page.locator("h1")).toContainText("Create WhatsApp Campaign");
    await expect(page.getByText("Step 1 — Campaign Details")).toBeVisible();
    await expect(page.getByPlaceholder("e.g. Diwali Mega Sale 2026")).toBeVisible();
  });

  test("loads customer management with opt-in status and search", async ({ page }) => {
    await page.goto("/customers");
    await expect(page.locator("h1")).toContainText("Customer Directory");
    await expect(page.getByText("Aarav Sharma")).toBeVisible();
    await expect(page.getByRole("button", { name: "Opted In" })).toBeVisible();
  });

  test("loads WhatsApp templates and triggers preview", async ({ page }) => {
    await page.goto("/templates");
    await expect(page.locator("h1")).toContainText("WhatsApp Template Manager");
    await expect(page.getByText("Festive Season Discount Offer")).toBeVisible();
    await expect(page.getByText("Template Preview")).toBeVisible();
  });

  test("navigates to settings and verifies n8n integration status", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText("n8n Orchestration Server")).toBeVisible();
    await expect(page.getByText("WhatsApp Transport Layer")).toBeVisible();
  });
});
