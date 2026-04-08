import type { SupabaseClient } from '@supabase/supabase-js';
import type { CartItem } from '@/hooks/cart-reducer';

export type SubmitOrderInput = {
  storeId: string;
  tableId: string;
  items: CartItem[];
};

export type SubmitOrderResult =
  | { kind: 'ok'; orderId: string }
  | { kind: 'closed' }
  | { kind: 'error'; message: string };

export async function submitOrder(
  client: SupabaseClient,
  input: SubmitOrderInput,
): Promise<SubmitOrderResult> {
  const p_items = input.items.map((i) => ({
    menu_item_id: i.menu_item_id,
    name: i.name,
    price: i.price,
    quantity: i.quantity,
  }));

  const { data, error } = await client.rpc('create_order', {
    p_store_id: input.storeId,
    p_table_id: input.tableId,
    p_items,
  });

  if (error) {
    if (error.message.includes('クローズ')) {
      return { kind: 'closed' };
    }
    return { kind: 'error', message: error.message };
  }

  return { kind: 'ok', orderId: data as string };
}
