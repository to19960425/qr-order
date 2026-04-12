import { test, expect } from "@playwright/test";
import { loadTestData } from "./helpers/test-data";

const testData = loadTestData();
const TOKEN = testData.table.token;

function latteCard(page: import("@playwright/test").Page) {
  return page
    .locator("div.rounded-lg.border")
    .filter({ has: page.getByRole("heading", { name: "[E2E] カフェラテ" }) });
}

test.describe("注文フロー", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
  });

  test("メニュー画面にアクセスし、メニューが表示される", async ({ page }) => {
    await page.goto(`/order/${TOKEN}`);

    await expect(
      page.getByText(`テーブル ${testData.table.tableNumber}`)
    ).toBeVisible();

    // E2Eカテゴリタブが存在する
    await expect(
      page.getByRole("button", { name: "[E2E] ドリンク" })
    ).toBeVisible();

    // E2Eドリンクタブをクリックしてメニューを確認
    await page.getByRole("button", { name: "[E2E] ドリンク" }).click();
    await expect(page.getByText("[E2E] カフェラテ")).toBeVisible();
  });

  test("カテゴリタブで絞り込みができる", async ({ page }) => {
    await page.goto(`/order/${TOKEN}`);

    // フードタブをクリック
    await page.getByRole("button", { name: "[E2E] フード" }).click();

    await expect(page.getByText("[E2E] チーズケーキ")).toBeVisible();
    await expect(page.getByText("[E2E] カフェラテ")).not.toBeVisible();

    // ドリンクタブに切り替え
    await page.getByRole("button", { name: "[E2E] ドリンク" }).click();

    await expect(page.getByText("[E2E] カフェラテ")).toBeVisible();
    await expect(page.getByText("[E2E] チーズケーキ")).not.toBeVisible();
  });

  test("メニューをカートに追加できる", async ({ page }) => {
    await page.goto(`/order/${TOKEN}`);
    await page.getByRole("button", { name: "[E2E] ドリンク" }).click();

    await latteCard(page).getByLabel("カートに追加").click();

    await expect(page.getByText("カート（1点） ¥650")).toBeVisible();

    await latteCard(page).getByLabel("数量を増やす").click();

    await expect(page.getByText("カート（2点） ¥1,300")).toBeVisible();
  });

  test("カート画面で数量変更ができる", async ({ page }) => {
    await page.goto(`/order/${TOKEN}`);
    await page.getByRole("button", { name: "[E2E] ドリンク" }).click();

    await latteCard(page).getByLabel("カートに追加").click();
    await latteCard(page).getByLabel("数量を増やす").click();

    await page.getByRole("link", { name: "注文を確認する" }).click();
    await expect(page).toHaveURL(`/order/${TOKEN}/cart`);

    await expect(page.getByLabel("数量 2")).toBeVisible();

    await page.getByLabel("[E2E] カフェラテを1つ増やす").click();
    await expect(page.getByLabel("数量 3")).toBeVisible();
    // 合計欄（xlサイズのspan）で金額を確認
    await expect(page.getByText("¥1,950", { exact: true }).last()).toBeVisible();

    await page.getByLabel("[E2E] カフェラテを1つ減らす").click();
    await expect(page.getByLabel("数量 2")).toBeVisible();
    await expect(page.getByText("¥1,300", { exact: true }).last()).toBeVisible();
  });

  test("注文を確定し、完了画面が表示される", async ({ page }) => {
    await page.goto(`/order/${TOKEN}`);
    await page.getByRole("button", { name: "[E2E] ドリンク" }).click();

    await latteCard(page).getByLabel("カートに追加").click();

    await page.getByRole("link", { name: "注文を確認する" }).click();
    await expect(page).toHaveURL(`/order/${TOKEN}/cart`);

    page.on("dialog", (dialog) => dialog.accept());

    await page.getByRole("button", { name: "注文を確定する" }).click();

    await expect(page).toHaveURL(`/order/${TOKEN}/complete`, {
      timeout: 10000,
    });
    await expect(page.getByText("注文を受け付けました")).toBeVisible();
    await expect(
      page.getByText("お支払いはレジにてお願いいたします")
    ).toBeVisible();
  });

  test("完了画面からメニュー画面に戻れる", async ({ page }) => {
    await page.goto(`/order/${TOKEN}/complete`);

    await expect(page.getByText("注文を受け付けました")).toBeVisible();

    await page.getByRole("link", { name: "メニューに戻る" }).click();

    await expect(page).toHaveURL(`/order/${TOKEN}`);
    await expect(
      page.getByText(`テーブル ${testData.table.tableNumber}`)
    ).toBeVisible();
  });

  test("無効なトークンでエラー画面が表示される", async ({ page }) => {
    await page.goto("/order/00000000-0000-0000-0000-000000000000");

    await expect(
      page.getByText("QRコードを読み取れませんでした")
    ).toBeVisible();
  });
});
