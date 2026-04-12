import * as fs from "fs";
import { TEST_DATA_PATH, type TestData } from "./global-setup";
import { getAuthenticatedClient } from "./helpers/supabase";

export default async function globalTeardown() {
  let testData: TestData;
  try {
    testData = JSON.parse(fs.readFileSync(TEST_DATA_PATH, "utf-8"));
  } catch {
    return;
  }

  const supabase = await getAuthenticatedClient();

  // 1. テストテーブルに紐づく注文を全削除（シードデータ + テスト中に作成された注文）
  if (testData.table?.id) {
    const { data: orders } = await supabase
      .from("orders")
      .select("id")
      .eq("table_id", testData.table.id);
    if (orders && orders.length > 0) {
      const orderIds = orders.map((o) => o.id);
      await supabase.from("order_items").delete().in("order_id", orderIds);
      await supabase.from("orders").delete().in("id", orderIds);
    }
  }

  // 2. [E2E] プレフィックスのメニューアイテム → カテゴリの順で削除（FK依存）
  await supabase.from("menu_items").delete().like("name", "[E2E]%");
  await supabase.from("categories").delete().like("name", "[E2E]%");

  // 3. テストテーブルを削除
  if (testData.table?.id) {
    await supabase.from("tables").delete().eq("id", testData.table.id);
  }

  fs.unlinkSync(TEST_DATA_PATH);
}
