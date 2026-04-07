import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

type Category = Database['public']['Tables']['categories']['Row'];
type MenuItem = Database['public']['Tables']['menu_items']['Row'];

export type TablePublic = {
  id: string;
  table_number: number;
  store_id: string;
};

export type OrderPageResult =
  | { kind: 'not_found' }
  | { kind: 'closed'; table: TablePublic }
  | {
      kind: 'open';
      table: TablePublic;
      categories: Category[];
      menuItemsByCategory: Record<string, MenuItem[]>;
    };

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getOrderPageData(
  token: string,
): Promise<OrderPageResult> {
  if (!UUID_REGEX.test(token)) {
    return { kind: 'not_found' };
  }

  const supabase = await createClient();

  const { data: table, error: tableError } = await supabase
    .from('tables')
    .select('id, table_number, store_id, is_active')
    .eq('token', token)
    .maybeSingle();

  if (tableError) throw tableError;
  if (!table) return { kind: 'not_found' };

  const tablePublic: TablePublic = {
    id: table.id,
    table_number: table.table_number,
    store_id: table.store_id,
  };

  if (!table.is_active) {
    return { kind: 'closed', table: tablePublic };
  }

  const [categoriesRes, menuItemsRes] = await Promise.all([
    supabase
      .from('categories')
      .select('*')
      .eq('store_id', table.store_id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('menu_items')
      .select('*')
      .eq('store_id', table.store_id)
      .eq('is_available', true)
      .order('sort_order', { ascending: true }),
  ]);

  if (categoriesRes.error) throw categoriesRes.error;
  if (menuItemsRes.error) throw menuItemsRes.error;

  const categories = categoriesRes.data ?? [];
  const items = menuItemsRes.data ?? [];

  const menuItemsByCategory: Record<string, MenuItem[]> = {};
  for (const c of categories) {
    menuItemsByCategory[c.id] = [];
  }
  for (const item of items) {
    // categories に存在しない category_id の item は表示経路がないため捨てる
    menuItemsByCategory[item.category_id]?.push(item);
  }

  return {
    kind: 'open',
    table: tablePublic,
    categories,
    menuItemsByCategory,
  };
}
