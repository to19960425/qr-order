import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { submitOrder } from '../customer-cart';
import type { CartItem } from '@/hooks/cart-reducer';

function makeClient(rpcImpl: ReturnType<typeof vi.fn>) {
  return { rpc: rpcImpl } as unknown as SupabaseClient;
}

const baseInput = {
  storeId: 'store-1',
  tableId: 'table-1',
  items: [
    {
      menu_item_id: 'm1',
      name: 'コーヒー',
      price: 500,
      quantity: 2,
      image_url: 'https://example.com/c.png',
    } satisfies CartItem,
  ],
};

describe('submitOrder', () => {
  describe('正常系', () => {
    it('rpc が成功した時、{ kind: "ok", orderId } が返ること', async () => {
      // Arrange
      const rpc = vi.fn().mockResolvedValue({ data: 'order-uuid', error: null });
      const client = makeClient(rpc);

      // Act
      const result = await submitOrder(client, baseInput);

      // Assert
      expect(result).toEqual({ kind: 'ok', orderId: 'order-uuid' });
    });

    it('呼び出し時、rpc の第1引数が "create_order" であること', async () => {
      const rpc = vi.fn().mockResolvedValue({ data: 'order-uuid', error: null });
      const client = makeClient(rpc);

      await submitOrder(client, baseInput);

      expect(rpc).toHaveBeenCalledTimes(1);
      expect(rpc.mock.calls[0][0]).toBe('create_order');
    });

    it('呼び出し時、p_store_id / p_table_id に input の値が渡されること', async () => {
      const rpc = vi.fn().mockResolvedValue({ data: 'order-uuid', error: null });
      const client = makeClient(rpc);

      await submitOrder(client, baseInput);

      const args = rpc.mock.calls[0][1];
      expect(args.p_store_id).toBe('store-1');
      expect(args.p_table_id).toBe('table-1');
    });

    it('p_items の各要素が { menu_item_id, name, price, quantity } の4キーちょうどに整形されること', async () => {
      const rpc = vi.fn().mockResolvedValue({ data: 'order-uuid', error: null });
      const client = makeClient(rpc);

      await submitOrder(client, baseInput);

      const args = rpc.mock.calls[0][1];
      expect(args.p_items).toEqual([
        { menu_item_id: 'm1', name: 'コーヒー', price: 500, quantity: 2 },
      ]);
    });

    it('複数アイテムを渡した時、すべてが順序通りに整形されて渡されること', async () => {
      const rpc = vi.fn().mockResolvedValue({ data: 'order-uuid', error: null });
      const client = makeClient(rpc);

      await submitOrder(client, {
        storeId: 'store-1',
        tableId: 'table-1',
        items: [
          { menu_item_id: 'm1', name: 'コーヒー', price: 500, quantity: 2, image_url: null },
          { menu_item_id: 'm2', name: '紅茶', price: 450, quantity: 1, image_url: null },
        ],
      });

      const args = rpc.mock.calls[0][1];
      expect(args.p_items).toEqual([
        { menu_item_id: 'm1', name: 'コーヒー', price: 500, quantity: 2 },
        { menu_item_id: 'm2', name: '紅茶', price: 450, quantity: 1 },
      ]);
    });
  });

  describe('異常系', () => {
    it('error.message に "クローズ" を含む時、{ kind: "closed" } が返ること', async () => {
      const rpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'テーブルは現在クローズ中です' },
      });
      const client = makeClient(rpc);

      const result = await submitOrder(client, baseInput);

      expect(result).toEqual({ kind: 'closed' });
    });

    it('error.message に "クローズ" を含まない時、{ kind: "error", message } が返ること', async () => {
      const rpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'network failure' },
      });
      const client = makeClient(rpc);

      const result = await submitOrder(client, baseInput);

      expect(result).toEqual({ kind: 'error', message: 'network failure' });
    });

    it('error.message が空文字の時、{ kind: "error", message: "" } が返ること', async () => {
      const rpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: '' },
      });
      const client = makeClient(rpc);

      const result = await submitOrder(client, baseInput);

      expect(result).toEqual({ kind: 'error', message: '' });
    });
  });

  describe('境界値', () => {
    it('items が空配列の時、p_items が空配列で rpc が呼ばれること', async () => {
      const rpc = vi.fn().mockResolvedValue({ data: 'order-uuid', error: null });
      const client = makeClient(rpc);

      await submitOrder(client, { storeId: 'store-1', tableId: 'table-1', items: [] });

      const args = rpc.mock.calls[0][1];
      expect(args.p_items).toEqual([]);
    });
  });
});
