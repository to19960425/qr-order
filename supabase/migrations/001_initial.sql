-- ============================================================
-- 001_initial.sql
-- テーブル作成 + RLS + RPC + トリガー
-- ============================================================

-- 店舗
CREATE TABLE stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 席
CREATE TABLE tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  table_number int NOT NULL,
  token uuid UNIQUE DEFAULT gen_random_uuid(),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(store_id, table_number)
);

-- カテゴリ
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- メニュー
CREATE TABLE menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price int NOT NULL,
  image_url text,
  is_available boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 注文
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  table_id uuid REFERENCES tables(id) ON DELETE SET NULL,
  order_number serial,
  status text DEFAULT 'new' CHECK (status IN ('new', 'completed')),
  total_amount int NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 注文明細（注文時点のスナップショット）
CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES menu_items(id),
  name text NOT NULL,
  price int NOT NULL,
  quantity int NOT NULL DEFAULT 1
);

-- ============================================================
-- updated_at 自動更新トリガー
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 注文作成 RPC
-- ============================================================

CREATE OR REPLACE FUNCTION create_order(
  p_store_id uuid,
  p_table_id uuid,
  p_items jsonb
) RETURNS uuid AS $$
DECLARE
  v_order_id uuid;
  v_total int;
  v_is_active boolean;
BEGIN
  -- テーブルが有効か確認
  SELECT is_active INTO v_is_active
  FROM tables WHERE id = p_table_id;

  IF NOT v_is_active THEN
    RAISE EXCEPTION 'テーブルは現在クローズ中です';
  END IF;

  -- 合計金額を計算
  SELECT SUM(
    (item->>'price')::int * (item->>'quantity')::int
  ) INTO v_total
  FROM jsonb_array_elements(p_items) item;

  -- 注文を作成
  INSERT INTO orders (store_id, table_id, status, total_amount)
  VALUES (p_store_id, p_table_id, 'new', v_total)
  RETURNING id INTO v_order_id;

  -- 注文明細を作成
  INSERT INTO order_items (order_id, menu_item_id, name, price, quantity)
  SELECT
    v_order_id,
    (item->>'menu_item_id')::uuid,
    item->>'name',
    (item->>'price')::int,
    (item->>'quantity')::int
  FROM jsonb_array_elements(p_items) item;

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RLS（Row Level Security）
-- ============================================================

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- stores: 誰でも読み取り可、認証済みユーザーは全操作可
CREATE POLICY "stores_select" ON stores FOR SELECT USING (true);
CREATE POLICY "stores_all_authenticated" ON stores FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- tables: anon は token 指定で読み取り可、認証済みユーザーは全操作可
CREATE POLICY "tables_select_by_token" ON tables FOR SELECT USING (true);
CREATE POLICY "tables_all_authenticated" ON tables FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- categories: 誰でも読み取り可、認証済みユーザーは全操作可
CREATE POLICY "categories_select" ON categories FOR SELECT USING (true);
CREATE POLICY "categories_all_authenticated" ON categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- menu_items: anon は is_available = true のみ読み取り可、認証済みユーザーは全操作可
CREATE POLICY "menu_items_select_available" ON menu_items FOR SELECT USING (is_available = true);
CREATE POLICY "menu_items_all_authenticated" ON menu_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- orders: 認証済みユーザーは全操作可（anon の INSERT は create_order RPC 経由）
CREATE POLICY "orders_all_authenticated" ON orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- order_items: 認証済みユーザーは全操作可（anon の INSERT は create_order RPC 経由）
CREATE POLICY "order_items_all_authenticated" ON order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- Realtime 有効化
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE orders;
