/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { OrderWithItems } from '../useRealtimeOrders';

// ---------- Supabase client mock ----------

// Realtime channel mock
let realtimeCallback: ((payload: any) => void) | null = null;
let subscribeStatusCb: ((status: string) => void) | null = null;

const mockChannel = {
  on: vi.fn(function (this: any, _event: string, _filter: any, cb: any) {
    realtimeCallback = cb;
    return this;
  }),
  subscribe: vi.fn((cb?: (status: string) => void) => {
    subscribeStatusCb = cb ?? null;
    cb?.('SUBSCRIBED');
    return mockChannel;
  }),
  unsubscribe: vi.fn(),
};

// Query builder helpers
function createSelectBuilder(data: any, error: any = null) {
  const builder: Record<string, any> = {};
  const methods = ['select', 'eq', 'gte', 'order', 'limit', 'single', 'maybeSingle'];
  for (const m of methods) {
    builder[m] = vi.fn(() => builder);
  }
  builder.then = (onfulfilled: any, onrejected?: any) =>
    Promise.resolve({ data, error }).then(onfulfilled, onrejected);
  return builder;
}

function createUpdateBuilder(error: any = null) {
  const builder: Record<string, any> = {};
  const methods = ['update', 'eq', 'select', 'single', 'maybeSingle'];
  for (const m of methods) {
    builder[m] = vi.fn(() => builder);
  }
  builder.then = (onfulfilled: any, onrejected?: any) =>
    Promise.resolve({ data: null, error }).then(onfulfilled, onrejected);
  return builder;
}

// Track from() calls
let fromCallIndex = 0;
let fromBuilders: Record<string, any>[] = [];

const mockSupabase = {
  from: vi.fn((table: string) => {
    const builder = fromBuilders[fromCallIndex] ?? createSelectBuilder([]);
    fromCallIndex++;
    return builder;
  }),
  channel: vi.fn(() => mockChannel),
  removeChannel: vi.fn(),
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}));

// ---------- Test data factories ----------

function makeOrder(overrides: Partial<OrderWithItems> = {}): OrderWithItems {
  return {
    id: overrides.id ?? 'order-1',
    store_id: 'store-1',
    table_id: 'table-1',
    order_number: overrides.order_number ?? 1,
    status: overrides.status ?? 'new',
    total_amount: overrides.total_amount ?? 1000,
    created_at: overrides.created_at ?? '2026-04-09T05:00:00Z',
    updated_at: overrides.updated_at ?? '2026-04-09T05:00:00Z',
    order_items: overrides.order_items ?? [
      { id: 'item-1', name: 'カフェラテ', price: 500, quantity: 2 },
    ],
    tables: overrides.tables ?? { table_number: 3 },
  };
}

const newOrder1 = makeOrder({
  id: 'order-1',
  order_number: 1,
  status: 'new',
  created_at: '2026-04-09T05:00:00Z',
});

const newOrder2 = makeOrder({
  id: 'order-2',
  order_number: 2,
  status: 'new',
  created_at: '2026-04-09T06:00:00Z',
  tables: { table_number: 5 },
});

const completedOrder1 = makeOrder({
  id: 'order-3',
  order_number: 3,
  status: 'completed',
  created_at: '2026-04-09T03:00:00Z',
  updated_at: '2026-04-09T05:45:00Z',
});

// ---------- Setup ----------

beforeEach(() => {
  vi.clearAllMocks();
  fromCallIndex = 0;
  fromBuilders = [];
  realtimeCallback = null;
  subscribeStatusCb = null;
});

afterEach(() => {
  vi.restoreAllMocks();
});

function setupInitialData(newOrders: OrderWithItems[], completedOrders: OrderWithItems[]) {
  const newBuilder = createSelectBuilder(newOrders);
  const completedBuilder = createSelectBuilder(completedOrders);
  fromBuilders = [newBuilder, completedBuilder];
}

async function renderRealtimeHook(onNewOrder?: () => void) {
  const { useRealtimeOrders } = await import('../useRealtimeOrders');
  const hook = renderHook(() => useRealtimeOrders({ onNewOrder }));
  // Wait for initial data fetch
  await waitFor(() => {
    expect(mockSupabase.from).toHaveBeenCalled();
  });
  return hook;
}

// ---------- Tests ----------

describe('useRealtimeOrders', () => {
  describe('初回データ取得', () => {
    it('マウント時にstatus=newの注文をorder_items・tables付きで全件取得すること', async () => {
      // Arrange
      setupInitialData([newOrder1], []);

      // Act
      const { result } = await renderRealtimeHook();

      // Assert
      await waitFor(() => {
        expect(result.current.newOrders).toHaveLength(1);
      });
      expect(result.current.newOrders[0].id).toBe('order-1');
      expect(result.current.newOrders[0].order_items).toHaveLength(1);
      expect(result.current.newOrders[0].tables.table_number).toBe(3);
    });

    it('マウント時にstatus=completedかつ当日JST 0:00以降の注文のみ取得すること', async () => {
      // Arrange
      setupInitialData([], [completedOrder1]);

      // Act
      const { result } = await renderRealtimeHook();

      // Assert
      await waitFor(() => {
        expect(result.current.completedOrders).toHaveLength(1);
      });
      expect(result.current.completedOrders[0].id).toBe('order-3');
      expect(result.current.completedOrders[0].status).toBe('completed');
    });

    it('新規注文がcreated_at昇順（古い順＝受付順）で返されること', async () => {
      // Arrange — DB が ASC で返すことを前提
      setupInitialData([newOrder1, newOrder2], []);

      // Act
      const { result } = await renderRealtimeHook();

      // Assert
      await waitFor(() => {
        expect(result.current.newOrders).toHaveLength(2);
      });
      expect(result.current.newOrders[0].id).toBe('order-1');
      expect(result.current.newOrders[1].id).toBe('order-2');
    });

    it('完了済み注文がupdated_at降順（新しい順）で返されること', async () => {
      // Arrange
      const comp1 = makeOrder({ id: 'c1', status: 'completed', updated_at: '2026-04-09T04:00:00Z' });
      const comp2 = makeOrder({ id: 'c2', status: 'completed', updated_at: '2026-04-09T06:00:00Z' });
      // DB returns DESC order
      setupInitialData([], [comp2, comp1]);

      // Act
      const { result } = await renderRealtimeHook();

      // Assert
      await waitFor(() => {
        expect(result.current.completedOrders).toHaveLength(2);
      });
      expect(result.current.completedOrders[0].id).toBe('c2');
      expect(result.current.completedOrders[1].id).toBe('c1');
    });

    it('各注文のorder_itemsにname・price・quantityが含まれること', async () => {
      // Arrange
      const order = makeOrder({
        order_items: [
          { id: 'i1', name: 'アメリカーノ', price: 400, quantity: 1 },
          { id: 'i2', name: 'チーズケーキ', price: 600, quantity: 2 },
        ],
      });
      setupInitialData([order], []);

      // Act
      const { result } = await renderRealtimeHook();

      // Assert
      await waitFor(() => {
        expect(result.current.newOrders).toHaveLength(1);
      });
      const items = result.current.newOrders[0].order_items;
      expect(items).toHaveLength(2);
      expect(items[0]).toMatchObject({ name: 'アメリカーノ', price: 400, quantity: 1 });
      expect(items[1]).toMatchObject({ name: 'チーズケーキ', price: 600, quantity: 2 });
    });

    it('各注文にtables.table_numberが含まれること', async () => {
      // Arrange
      const order = makeOrder({ tables: { table_number: 7 } });
      setupInitialData([order], []);

      // Act
      const { result } = await renderRealtimeHook();

      // Assert
      await waitFor(() => {
        expect(result.current.newOrders).toHaveLength(1);
      });
      expect(result.current.newOrders[0].tables.table_number).toBe(7);
    });
  });

  describe('Realtimeイベント: INSERT', () => {
    it('status=newのINSERTイベント受信時、新規注文リストに追加されること', async () => {
      // Arrange
      setupInitialData([], []);
      const { result } = await renderRealtimeHook();
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // INSERT で取得するデータ用のビルダーを準備（fetchOrder は .single() で単一オブジェクト）
      fromBuilders.push(createSelectBuilder(newOrder1));

      // Act — Realtime INSERT イベントをシミュレート
      await act(async () => {
        realtimeCallback?.({
          eventType: 'INSERT',
          new: { id: 'order-1', status: 'new' },
        });
      });

      // Assert
      await waitFor(() => {
        expect(result.current.newOrders).toHaveLength(1);
      });
      expect(result.current.newOrders[0].id).toBe('order-1');
    });

    it('新規注文INSERT時にonNewOrderコールバックが呼び出されること', async () => {
      // Arrange
      setupInitialData([], []);
      const onNewOrder = vi.fn();
      const { result } = await renderRealtimeHook(onNewOrder);
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      fromBuilders.push(createSelectBuilder(newOrder1));

      // Act
      await act(async () => {
        realtimeCallback?.({
          eventType: 'INSERT',
          new: { id: 'order-1', status: 'new' },
        });
      });

      // Assert
      await waitFor(() => {
        expect(onNewOrder).toHaveBeenCalledTimes(1);
      });
    });

    it('INSERT後の注文データにorder_items・tablesが含まれること', async () => {
      // Arrange
      setupInitialData([], []);
      const { result } = await renderRealtimeHook();
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const fullOrder = makeOrder({
        id: 'order-new',
        order_items: [{ id: 'i1', name: 'ラテ', price: 500, quantity: 1 }],
        tables: { table_number: 4 },
      });
      fromBuilders.push(createSelectBuilder(fullOrder));

      // Act
      await act(async () => {
        realtimeCallback?.({
          eventType: 'INSERT',
          new: { id: 'order-new', status: 'new' },
        });
      });

      // Assert
      await waitFor(() => {
        expect(result.current.newOrders).toHaveLength(1);
      });
      expect(result.current.newOrders[0].order_items).toHaveLength(1);
      expect(result.current.newOrders[0].tables.table_number).toBe(4);
    });
  });

  describe('Realtimeイベント: UPDATE', () => {
    it('statusがnewからcompletedに変更された時、新規注文リストから完了済みリストに移動すること', async () => {
      // Arrange
      setupInitialData([newOrder1], []);
      const { result } = await renderRealtimeHook();
      await waitFor(() => expect(result.current.newOrders).toHaveLength(1));

      // Act — UPDATE イベント
      await act(async () => {
        realtimeCallback?.({
          eventType: 'UPDATE',
          new: { ...newOrder1, status: 'completed', updated_at: '2026-04-09T06:00:00Z' },
        });
      });

      // Assert
      await waitFor(() => {
        expect(result.current.newOrders).toHaveLength(0);
        expect(result.current.completedOrders).toHaveLength(1);
      });
      expect(result.current.completedOrders[0].id).toBe('order-1');
    });

    it('UPDATE（ステータス変更）時にonNewOrderコールバックが呼ばれないこと', async () => {
      // Arrange
      setupInitialData([newOrder1], []);
      const onNewOrder = vi.fn();
      const { result } = await renderRealtimeHook(onNewOrder);
      await waitFor(() => expect(result.current.newOrders).toHaveLength(1));

      // Act
      await act(async () => {
        realtimeCallback?.({
          eventType: 'UPDATE',
          new: { ...newOrder1, status: 'completed' },
        });
      });

      // Assert
      expect(onNewOrder).not.toHaveBeenCalled();
    });
  });

  describe('楽観的更新', () => {
    it('completeOrder呼び出し時、DB応答前に新規→完了へ即座に移動すること', async () => {
      // Arrange
      setupInitialData([newOrder1], []);
      const { result } = await renderRealtimeHook();
      await waitFor(() => expect(result.current.newOrders).toHaveLength(1));

      // UPDATE用ビルダー（解決を遅延させるPromise）
      let resolveUpdate!: (v: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolveUpdate = resolve;
      });
      const pendingBuilder: Record<string, any> = {};
      const methods = ['update', 'eq', 'select', 'single', 'maybeSingle'];
      for (const m of methods) {
        pendingBuilder[m] = vi.fn(() => pendingBuilder);
      }
      pendingBuilder.then = (onfulfilled: any, onrejected?: any) =>
        pendingPromise.then(onfulfilled, onrejected);
      fromBuilders.push(pendingBuilder);

      // Act — completeOrder を呼ぶ（まだ resolve しない）
      // 非await で呼び出し。楽観的更新（setState）は同期的に行われる。
      const promise = act(() => {
        result.current.completeOrder('order-1');
      });

      // Assert — DB応答前に楽観的更新が反映されている
      expect(result.current.newOrders).toHaveLength(0);
      expect(result.current.completedOrders).toHaveLength(1);
      expect(result.current.completedOrders[0].id).toBe('order-1');

      // Cleanup — resolve して promise を完了
      await act(async () => {
        resolveUpdate({ data: null, error: null });
      });
      await promise;
    });

    it('DB更新が成功した場合、楽観的更新後の状態がそのまま維持されること', async () => {
      // Arrange
      setupInitialData([newOrder1], []);
      const { result } = await renderRealtimeHook();
      await waitFor(() => expect(result.current.newOrders).toHaveLength(1));

      fromBuilders.push(createUpdateBuilder(null));

      // Act
      await act(async () => {
        await result.current.completeOrder('order-1');
      });

      // Assert
      expect(result.current.newOrders).toHaveLength(0);
      expect(result.current.completedOrders).toHaveLength(1);
    });

    it('DB更新が失敗した場合、注文が新規注文リストにロールバックされること', async () => {
      // Arrange
      setupInitialData([newOrder1], []);
      const { result } = await renderRealtimeHook();
      await waitFor(() => expect(result.current.newOrders).toHaveLength(1));

      fromBuilders.push(createUpdateBuilder({ message: 'DB error' }));

      // Act
      await act(async () => {
        await result.current.completeOrder('order-1');
      });

      // Assert — ロールバック
      expect(result.current.newOrders).toHaveLength(1);
      expect(result.current.newOrders[0].id).toBe('order-1');
      expect(result.current.completedOrders).toHaveLength(0);
    });

    it('DB更新が失敗した場合、エラー情報が返されること', async () => {
      // Arrange
      setupInitialData([newOrder1], []);
      const { result } = await renderRealtimeHook();
      await waitFor(() => expect(result.current.newOrders).toHaveLength(1));

      fromBuilders.push(createUpdateBuilder({ message: 'DB error' }));

      // Act
      let error: any;
      await act(async () => {
        error = await result.current.completeOrder('order-1');
      });

      // Assert
      expect(error).toEqual({ message: 'DB error' });
    });
  });

  describe('接続断リカバリ', () => {
    it('Realtimeチャンネル再接続時に全データを再取得して最新状態に同期すること', async () => {
      // Arrange
      setupInitialData([newOrder1], []);
      const { result } = await renderRealtimeHook();
      await waitFor(() => expect(result.current.newOrders).toHaveLength(1));

      // 再接続時の新しいデータ
      fromBuilders.push(createSelectBuilder([newOrder1, newOrder2]));
      fromBuilders.push(createSelectBuilder([completedOrder1]));

      // Act — SUBSCRIBED ステータスを再送（再接続シミュレート）
      await act(async () => {
        subscribeStatusCb?.('SUBSCRIBED');
      });

      // Assert
      await waitFor(() => {
        expect(result.current.newOrders).toHaveLength(2);
        expect(result.current.completedOrders).toHaveLength(1);
      });
    });
  });

  describe('エッジケース', () => {
    it('注文が0件の場合、newOrders・completedOrdersともに空配列が返ること', async () => {
      // Arrange
      setupInitialData([], []);

      // Act
      const { result } = await renderRealtimeHook();

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.newOrders).toEqual([]);
      expect(result.current.completedOrders).toEqual([]);
    });

    it('同一注文IDのINSERTが重複受信された場合、リストに重複追加されないこと', async () => {
      // Arrange
      setupInitialData([], []);
      const { result } = await renderRealtimeHook();
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      fromBuilders.push(createSelectBuilder(newOrder1));
      fromBuilders.push(createSelectBuilder(newOrder1));

      // Act — 同一INSERTを2回
      await act(async () => {
        realtimeCallback?.({
          eventType: 'INSERT',
          new: { id: 'order-1', status: 'new' },
        });
      });
      await act(async () => {
        realtimeCallback?.({
          eventType: 'INSERT',
          new: { id: 'order-1', status: 'new' },
        });
      });

      // Assert
      await waitFor(() => {
        expect(result.current.newOrders).toHaveLength(1);
      });
    });

    it('楽観的更新済みの注文にRealtimeのUPDATEイベントが届いた場合、二重処理されないこと', async () => {
      // Arrange
      setupInitialData([newOrder1], []);
      const { result } = await renderRealtimeHook();
      await waitFor(() => expect(result.current.newOrders).toHaveLength(1));

      fromBuilders.push(createUpdateBuilder(null));

      // Act — 楽観的更新
      await act(async () => {
        await result.current.completeOrder('order-1');
      });

      // Realtime UPDATE が遅れて届く
      await act(async () => {
        realtimeCallback?.({
          eventType: 'UPDATE',
          new: { ...newOrder1, status: 'completed' },
        });
      });

      // Assert — 完了リストに重複がないこと
      expect(result.current.completedOrders).toHaveLength(1);
      expect(result.current.newOrders).toHaveLength(0);
    });
  });
});
