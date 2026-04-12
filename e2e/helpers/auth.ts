import { expect, type Page } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "./config";

export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto("/admin/login");
  await page.getByLabel("メールアドレス").fill(ADMIN_EMAIL);
  await page.getByLabel("パスワード").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "ログイン" }).click();
  await expect(page).toHaveURL(/\/admin\/orders/, { timeout: 10000 });
}
