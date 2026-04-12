import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";
import { loadTestData } from "./helpers/test-data";

const testData = loadTestData();

test.describe("管理画面フロー", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.describe("注文ダッシュボード", () => {
    test("注文ダッシュボードが表示される", async ({ page }) => {
      await expect(
        page.getByRole("heading", { name: "注文ダッシュボード" })
      ).toBeVisible();
      await expect(page.getByTestId("column-new")).toBeVisible();
      await expect(page.getByTestId("column-completed")).toBeVisible();
    });

    test("注文を完了にできる", async ({ page }) => {
      await expect(
        page.getByRole("heading", { name: "注文ダッシュボード" })
      ).toBeVisible();

      const newColumn = page.getByTestId("column-new");
      const completeButton = newColumn.getByRole("button", {
        name: "完了にする",
      });

      // シードデータの新規注文が存在することを確認
      await expect(completeButton.first()).toBeVisible({ timeout: 5000 });

      page.on("dialog", (dialog) => dialog.accept());
      await completeButton.first().click();

      // 楽観的更新で「完了にする」ボタンが消えることを確認
      await expect(completeButton.first()).not.toBeVisible({
        timeout: 5000,
      });
    });
  });

  test.describe("メニュー管理", () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole("link", { name: "メニュー" }).click();
      await expect(page).toHaveURL(/\/admin\/menu/);
      await expect(
        page.getByRole("heading", { name: "メニュー管理" })
      ).toBeVisible();
    });

    test("メニュー一覧が表示される", async ({ page }) => {
      await expect(page.getByText("[E2E] ドリンク")).toBeVisible();
      await expect(page.getByText("[E2E] フード")).toBeVisible();
      await expect(page.getByText("[E2E] カフェラテ")).toBeVisible();
      await expect(page.getByText("[E2E] チーズケーキ")).toBeVisible();
    });

    test("メニューを追加できる", async ({ page }) => {
      const drinkSection = page
        .locator("section")
        .filter({ hasText: "[E2E] ドリンク" });
      await drinkSection
        .getByRole("button", { name: "メニューを追加" })
        .click();

      await expect(
        page.getByRole("heading", { name: "メニューを追加" })
      ).toBeVisible();

      await page.getByLabel("名前").fill("[E2E] 抹茶ラテ");
      await page.getByLabel("価格").fill("700");

      await page
        .getByRole("dialog")
        .getByRole("button", { name: "追加" })
        .click();

      await expect(
        page.getByRole("heading", { name: "メニューを追加" })
      ).not.toBeVisible({ timeout: 5000 });
      await expect(page.getByText("[E2E] 抹茶ラテ")).toBeVisible();
    });

    test("メニューを編集できる", async ({ page }) => {
      const teaRow = page
        .locator("div.flex.items-center.gap-3")
        .filter({ hasText: "[E2E] 紅茶" });
      // title属性で編集ボタンを特定（PencilIconボタンにはtitle未設定のため nth で選択）
      await teaRow.getByRole("button").nth(3).click();

      await expect(
        page.getByRole("heading", { name: "メニューを編集" })
      ).toBeVisible();

      await page.getByLabel("名前").clear();
      await page.getByLabel("名前").fill("[E2E] アールグレイ");

      await page
        .getByRole("dialog")
        .getByRole("button", { name: "保存" })
        .click();

      await expect(
        page.getByRole("heading", { name: "メニューを編集" })
      ).not.toBeVisible({ timeout: 5000 });
      await expect(page.getByText("[E2E] アールグレイ")).toBeVisible();
    });

    test("メニューを削除できる", async ({ page }) => {
      page.on("dialog", (dialog) => dialog.accept());

      const croissantRow = page
        .locator("div.flex.items-center.gap-3")
        .filter({ hasText: "[E2E] クロワッサン" });
      await croissantRow.getByRole("button").last().click();

      await expect(page.getByText("[E2E] クロワッサン")).not.toBeVisible({
        timeout: 5000,
      });
    });
  });
});
