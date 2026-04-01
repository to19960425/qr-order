import { test, expect } from "@playwright/test";

const EMAIL = process.env.TEST_ADMIN_EMAIL!;
const PASSWORD = process.env.TEST_ADMIN_PASSWORD!;

test.describe("認証フロー", () => {
  test("未認証で /admin/orders にアクセスすると /admin/login にリダイレクトされる", async ({
    page,
  }) => {
    await page.goto("/admin/orders");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("ログイン成功で /admin/orders に遷移する", async ({ page }) => {
    await page.goto("/admin/login");

    await page.getByLabel("メールアドレス").fill(EMAIL);
    await page.getByLabel("パスワード").fill(PASSWORD);
    await page.getByRole("button", { name: "ログイン" }).click();

    await expect(page).toHaveURL(/\/admin\/orders/, { timeout: 10000 });
    await expect(page.getByText("注文ダッシュボード")).toBeVisible();
  });

  test("ログイン失敗でエラーメッセージが表示される", async ({ page }) => {
    await page.goto("/admin/login");

    await page.getByLabel("メールアドレス").fill(EMAIL);
    await page.getByLabel("パスワード").fill("wrong-password");
    await page.getByRole("button", { name: "ログイン" }).click();

    await expect(
      page.getByText("メールアドレスまたはパスワードが正しくありません")
    ).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test.describe("認証済み", () => {
    test.describe.configure({ mode: "serial" });

    test.beforeEach(async ({ page }) => {
      await page.goto("/admin/login");
      await page.getByLabel("メールアドレス").fill(EMAIL);
      await page.getByLabel("パスワード").fill(PASSWORD);
      await page.getByRole("button", { name: "ログイン" }).click();
      await expect(page).toHaveURL(/\/admin\/orders/, { timeout: 10000 });
    });

    test("サイドバーのナビゲーションが機能する", async ({ page }) => {
      await page.getByRole("link", { name: "メニュー" }).click();
      await expect(page).toHaveURL(/\/admin\/menu/);
      await expect(page.getByText("メニュー管理")).toBeVisible();

      await page.getByRole("link", { name: "席" }).click();
      await expect(page).toHaveURL(/\/admin\/tables/);
      await expect(page.getByText("席管理")).toBeVisible();

      await page.getByRole("link", { name: "注文" }).click();
      await expect(page).toHaveURL(/\/admin\/orders/);
      await expect(page.getByText("注文ダッシュボード")).toBeVisible();
    });

    test("ログアウトで /admin/login に戻る", async ({ page }) => {
      await page.getByRole("button", { name: "ログアウト" }).click();
      await expect(page).toHaveURL(/\/admin\/login/, { timeout: 10000 });
    });

    test("認証済みで /admin/login にアクセスすると /admin/orders にリダイレクトされる", async ({
      page,
    }) => {
      await page.goto("/admin/login");
      await expect(page).toHaveURL(/\/admin\/orders/, { timeout: 10000 });
    });
  });
});
