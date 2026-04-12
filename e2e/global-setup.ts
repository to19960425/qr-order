import * as fs from "fs";
import * as path from "path";
import { getAuthenticatedClient } from "./helpers/supabase";

const E2E_PREFIX = "[E2E]";

export const TEST_DATA_PATH = path.join(__dirname, ".test-data.json");

export type TestData = {
  storeId: string;
  table: { id: string; token: string; tableNumber: number };
  categories: { id: string; name: string }[];
  menuItems: {
    id: string;
    name: string;
    price: number;
    categoryId: string;
  }[];
  orderId: string;
};

export default async function globalSetup() {
  const supabase = await getAuthenticatedClient();

  const { data: stores } = await supabase
    .from("stores")
    .select("id")
    .limit(1);
  if (!stores || stores.length === 0) throw new Error("No store found");
  const storeId = stores[0].id;

  // table と categories は互いに独立なので並列実行
  const [tableResult, categoriesResult] = await Promise.all([
    supabase
      .from("tables")
      .insert({ store_id: storeId, table_number: 99, is_active: true })
      .select()
      .single(),
    supabase
      .from("categories")
      .insert([
        { store_id: storeId, name: `${E2E_PREFIX} ドリンク`, sort_order: 900 },
        { store_id: storeId, name: `${E2E_PREFIX} フード`, sort_order: 901 },
      ])
      .select(),
  ]);

  if (tableResult.error)
    throw new Error(`Table creation failed: ${tableResult.error.message}`);
  if (categoriesResult.error)
    throw new Error(
      `Category creation failed: ${categoriesResult.error.message}`
    );

  const table = tableResult.data;
  const categories = categoriesResult.data!;
  const drinkCatId = categories[0].id;
  const foodCatId = categories[1].id;

  const { data: menuItems, error: menuError } = await supabase
    .from("menu_items")
    .insert([
      {
        store_id: storeId,
        category_id: drinkCatId,
        name: `${E2E_PREFIX} カフェラテ`,
        price: 650,
        sort_order: 900,
      },
      {
        store_id: storeId,
        category_id: drinkCatId,
        name: `${E2E_PREFIX} 紅茶`,
        price: 500,
        sort_order: 901,
      },
      {
        store_id: storeId,
        category_id: foodCatId,
        name: `${E2E_PREFIX} チーズケーキ`,
        price: 550,
        sort_order: 900,
      },
      {
        store_id: storeId,
        category_id: foodCatId,
        name: `${E2E_PREFIX} クロワッサン`,
        price: 350,
        sort_order: 901,
      },
    ])
    .select();
  if (menuError)
    throw new Error(`Menu item creation failed: ${menuError.message}`);

  const { data: orderId, error: orderError } = await supabase.rpc(
    "create_order",
    {
      p_store_id: storeId,
      p_table_id: table.id,
      p_items: [
        {
          menu_item_id: menuItems![0].id,
          name: menuItems![0].name,
          price: menuItems![0].price,
          quantity: 2,
        },
      ],
    }
  );
  if (orderError)
    throw new Error(`Order creation failed: ${orderError.message}`);

  const testData: TestData = {
    storeId,
    table: {
      id: table.id,
      token: table.token,
      tableNumber: table.table_number,
    },
    categories: categories.map((c) => ({ id: c.id, name: c.name })),
    menuItems: menuItems!.map((m) => ({
      id: m.id,
      name: m.name,
      price: m.price,
      categoryId: m.category_id,
    })),
    orderId: orderId as string,
  };

  fs.writeFileSync(TEST_DATA_PATH, JSON.stringify(testData, null, 2));
}
