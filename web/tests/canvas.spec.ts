import { test, expect, type Page } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL ?? "admin@example.com";
const PASSWORD = process.env.E2E_PASSWORD ?? "admin";

async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button:has-text("login")');
  await expect(page).toHaveURL(/\/(app|pipelines)/);
}

test("create a client pipeline via canvas drag-and-drop", async ({ page }) => {
  await login(page);

  await page.goto("/pipelines/new");
  await expect(page.getByRole("heading", { name: /create client pipeline/i })).toBeVisible();

  const stamp = Date.now();
  const brokerName = `e2e-broker-${stamp}`;
  const payloadName = `e2e-payload-${stamp}`;
  const destinationName = `e2e-destination-${stamp}`;
  const pipelineName = `e2e-pipe-${stamp}`;

  await page.getByRole("button", { name: /^\+\s*mqtt$/i }).click();
  await page.getByRole("button", { name: /broker slot — empty/i }).click();

  await page.getByRole("tab", { name: /\+ new/i }).click();
  await page.fill('input[name="name"]', brokerName);
  await page.fill('input[name="description"]', "e2e client MQTT broker");
  await page.fill('input[name="config.broker_url"]', "mqtt://localhost:1883");
  await page.fill('input[name="config.topic"]', "e2e/topic");
  await page.fill('input[name="config.client_id"]', `e2e-${stamp}`);
  await page.getByRole("button", { name: /save broker/i }).click();
  await expect(page.getByText(brokerName)).toBeVisible();

  await page.getByRole("button", { name: /^\+\s*new payload$/i }).click();
  await page.getByRole("button", { name: /payload slot — empty/i }).click();

  await page.getByRole("tab", { name: /\+ new/i }).click();
  await page.fill('input[placeholder="e.g. weather"]', payloadName);
  await page.click('button:has-text("+ add field")');
  await page.getByLabel("name").last().fill("temperature");
  await page.getByRole("button", { name: /save payload/i }).click();
  await expect(page.getByText(payloadName)).toBeVisible();

  await page.getByRole("button", { name: /^\+\s*webhook$/i }).click();
  await page.getByRole("button", { name: /destination slot — empty/i }).click();

  await page.getByRole("tab", { name: /\+ new/i }).click();
  await page.fill('input[name="name"]', destinationName);
  await page.fill('input[name="description"]', "e2e client webhook destination");
  await page.fill('input[name="config.url"]', "https://client.example.com/iot/events");
  await page.getByRole("button", { name: /save destination/i }).click();
  await expect(page.getByText(destinationName)).toBeVisible();

  await page.fill('input[placeholder="client-a-cold-chain"]', pipelineName);
  await page.getByRole("button", { name: /\+ create client pipeline/i }).click();

  await expect(page).toHaveURL(/\/pipelines$/);
  await expect(page.getByText(pipelineName)).toBeVisible();
});
