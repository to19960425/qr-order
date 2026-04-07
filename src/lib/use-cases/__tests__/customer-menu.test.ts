import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { getOrderPageData } from '../customer-menu';
import { queryBuilder, makeClient, type Builder } from '@/test/supabase-mock';
import type { Database } from '@/types/database';

const mockedCreateClient = vi.mocked(createClient);

type Category = Database['public']['Tables']['categories']['Row'];
type MenuItem = Database['public']['Tables']['menu_items']['Row'];
type TableRow = Database['public']['Tables']['tables']['Row'];

const VALID_TOKEN = '11111111-1111-4111-8111-111111111111';
const STORE_ID = 'store-1';
const TABLE_ID = 'table-1';

function makeTable(overrides: Partial<TableRow> = {}): Pick<
  TableRow,
  'id' | 'store_id' | 'table_number' | 'is_active'
> {
  return {
    id: overrides.id ?? TABLE_ID,
    store_id: overrides.store_id ?? STORE_ID,
    table_number: overrides.table_number ?? 5,
    is_active: overrides.is_active ?? true,
  };
}

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: overrides.id ?? 'cat-1',
    store_id: overrides.store_id ?? STORE_ID,
    name: overrides.name ?? 'コーヒー',
    sort_order: overrides.sort_order ?? 0,
    created_at: overrides.created_at ?? '2024-01-01T00:00:00Z',
  };
}

function makeMenuItem(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    id: overrides.id ?? 'item-1',
    category_id: overrides.category_id ?? 'cat-1',
    store_id: overrides.store_id ?? STORE_ID,
    name: overrides.name ?? 'カフェラテ',
    description: overrides.description ?? null,
    price: overrides.price ?? 650,
    image_url: overrides.image_url ?? null,
    is_available: overrides.is_available ?? true,
    sort_order: overrides.sort_order ?? 0,
    created_at: overrides.created_at ?? '2024-01-01T00:00:00Z',
  };
}

function setupClient(byTable: Record<string, Builder | Builder[]>) {
  const client = makeClient(byTable);
  mockedCreateClient.mockResolvedValue(client as never);
  return client;
}

describe('getOrderPageData', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('テーブル取得', () => {
    it('有効なtokenを指定した時、該当テーブルとそのstoreのメニューが返ること', async () => {
      // Arrange
      const tablesBuilder = queryBuilder({ data: makeTable() });
      const categoriesBuilder = queryBuilder({
        data: [makeCategory({ id: 'cat-1', sort_order: 0 })],
      });
      const menuItemsBuilder = queryBuilder({
        data: [makeMenuItem({ category_id: 'cat-1' })],
      });
      setupClient({
        tables: tablesBuilder,
        categories: categoriesBuilder,
        menu_items: menuItemsBuilder,
      });

      // Act
      const result = await getOrderPageData(VALID_TOKEN);

      // Assert
      expect(result.kind).toBe('open');
      if (result.kind !== 'open') return;
      expect(result.table).toEqual({
        id: TABLE_ID,
        table_number: 5,
        store_id: STORE_ID,
      });
      expect(result.categories).toHaveLength(1);
      expect(result.menuItemsByCategory['cat-1']).toHaveLength(1);
      expect(tablesBuilder.eq).toHaveBeenCalledWith('token', VALID_TOKEN);
    });

    it('該当テーブルが見つからない時、kind="not_found"が返ること', async () => {
      // Arrange
      setupClient({ tables: queryBuilder({ data: null }) });

      // Act
      const result = await getOrderPageData(VALID_TOKEN);

      // Assert
      expect(result).toEqual({ kind: 'not_found' });
    });

    it('tokenがUUID形式でない時、kind="not_found"が返ること（DBアクセスなし）', async () => {
      // Arrange
      const client = { from: vi.fn() };
      mockedCreateClient.mockResolvedValue(client as never);

      // Act
      const result = await getOrderPageData('not-a-uuid');

      // Assert
      expect(result).toEqual({ kind: 'not_found' });
      expect(client.from).not.toHaveBeenCalled();
    });

    it('tables取得でDBエラーが発生した時、エラーがスローされること', async () => {
      // Arrange
      const dbError = { message: 'connection failed', code: '500' };
      setupClient({ tables: queryBuilder({ error: dbError }) });

      // Act & Assert
      await expect(getOrderPageData(VALID_TOKEN)).rejects.toEqual(dbError);
    });
  });

  describe('営業状態の判定', () => {
    it('tables.is_activeがfalseの時、kind="closed"とtable情報が返ること', async () => {
      // Arrange
      setupClient({
        tables: queryBuilder({ data: makeTable({ is_active: false }) }),
      });

      // Act
      const result = await getOrderPageData(VALID_TOKEN);

      // Assert
      expect(result.kind).toBe('closed');
      if (result.kind !== 'closed') return;
      expect(result.table).toEqual({
        id: TABLE_ID,
        table_number: 5,
        store_id: STORE_ID,
      });
    });

    it('tables.is_activeがfalseの時、メニュー取得クエリが実行されないこと', async () => {
      // Arrange
      const client = setupClient({
        tables: queryBuilder({ data: makeTable({ is_active: false }) }),
      });

      // Act
      await getOrderPageData(VALID_TOKEN);

      // Assert
      const calls = client.from.mock.calls.map((c) => c[0]);
      expect(calls).toEqual(['tables']);
    });

    it('tables.is_activeがtrueの時、kind="open"でcategoriesとmenuItemsByCategoryが返ること', async () => {
      // Arrange
      setupClient({
        tables: queryBuilder({ data: makeTable({ is_active: true }) }),
        categories: queryBuilder({ data: [makeCategory({ id: 'cat-1' })] }),
        menu_items: queryBuilder({
          data: [makeMenuItem({ category_id: 'cat-1' })],
        }),
      });

      // Act
      const result = await getOrderPageData(VALID_TOKEN);

      // Assert
      expect(result.kind).toBe('open');
      if (result.kind !== 'open') return;
      expect(result.categories).toHaveLength(1);
      expect(result.menuItemsByCategory['cat-1']).toHaveLength(1);
    });
  });

  describe('メニューフィルタ', () => {
    it('menu_itemsを取得する時、is_available=trueのアイテムのみが返ること', async () => {
      // Arrange
      const menuItemsBuilder = queryBuilder({
        data: [makeMenuItem({ is_available: true })],
      });
      setupClient({
        tables: queryBuilder({ data: makeTable() }),
        categories: queryBuilder({ data: [makeCategory()] }),
        menu_items: menuItemsBuilder,
      });

      // Act
      const result = await getOrderPageData(VALID_TOKEN);

      // Assert
      expect(menuItemsBuilder.eq).toHaveBeenCalledWith('is_available', true);
      if (result.kind !== 'open') throw new Error('expected open');
      const allItems = Object.values(result.menuItemsByCategory).flat();
      expect(allItems.every((i) => i.is_available)).toBe(true);
    });

    it('is_available=falseのアイテムは、結果のmenuItemsByCategoryに含まれないこと', async () => {
      // Arrange
      const menuItemsBuilder = queryBuilder({
        data: [
          makeMenuItem({ id: 'item-A', is_available: true }),
          makeMenuItem({ id: 'item-B', is_available: true }),
        ],
      });
      setupClient({
        tables: queryBuilder({ data: makeTable() }),
        categories: queryBuilder({ data: [makeCategory()] }),
        menu_items: menuItemsBuilder,
      });

      // Act
      const result = await getOrderPageData(VALID_TOKEN);

      // Assert
      // UseCase が is_available フィルタを「DB側」に渡している契約を検証
      expect(menuItemsBuilder.eq).toHaveBeenCalledWith('is_available', true);
      if (result.kind !== 'open') throw new Error('expected open');
      const ids = Object.values(result.menuItemsByCategory)
        .flat()
        .map((i) => i.id);
      expect(ids).toEqual(['item-A', 'item-B']);
    });

    it('テーブルのstore_idと一致するメニューのみが返ること', async () => {
      // Arrange
      const menuItemsBuilder = queryBuilder({ data: [makeMenuItem()] });
      const categoriesBuilder = queryBuilder({ data: [makeCategory()] });
      setupClient({
        tables: queryBuilder({ data: makeTable({ store_id: 'my-store' }) }),
        categories: categoriesBuilder,
        menu_items: menuItemsBuilder,
      });

      // Act
      await getOrderPageData(VALID_TOKEN);

      // Assert
      expect(menuItemsBuilder.eq).toHaveBeenCalledWith('store_id', 'my-store');
      expect(categoriesBuilder.eq).toHaveBeenCalledWith('store_id', 'my-store');
    });
  });

  describe('ソート', () => {
    it('categoriesがsort_order昇順で並んで返ること', async () => {
      // Arrange
      const categoriesBuilder = queryBuilder({
        data: [
          makeCategory({ id: 'c1', sort_order: 0 }),
          makeCategory({ id: 'c2', sort_order: 1 }),
          makeCategory({ id: 'c3', sort_order: 2 }),
        ],
      });
      setupClient({
        tables: queryBuilder({ data: makeTable() }),
        categories: categoriesBuilder,
        menu_items: queryBuilder({ data: [] }),
      });

      // Act
      const result = await getOrderPageData(VALID_TOKEN);

      // Assert
      expect(categoriesBuilder.order).toHaveBeenCalledWith('sort_order', {
        ascending: true,
      });
      if (result.kind !== 'open') throw new Error('expected open');
      expect(result.categories.map((c) => c.id)).toEqual(['c1', 'c2', 'c3']);
    });

    it('menuItemsByCategory内の各配列がsort_order昇順で並んで返ること', async () => {
      // Arrange
      const menuItemsBuilder = queryBuilder({
        data: [
          makeMenuItem({ id: 'm1', category_id: 'cat-1', sort_order: 0 }),
          makeMenuItem({ id: 'm2', category_id: 'cat-1', sort_order: 1 }),
          makeMenuItem({ id: 'm3', category_id: 'cat-1', sort_order: 2 }),
        ],
      });
      setupClient({
        tables: queryBuilder({ data: makeTable() }),
        categories: queryBuilder({ data: [makeCategory({ id: 'cat-1' })] }),
        menu_items: menuItemsBuilder,
      });

      // Act
      const result = await getOrderPageData(VALID_TOKEN);

      // Assert
      expect(menuItemsBuilder.order).toHaveBeenCalledWith('sort_order', {
        ascending: true,
      });
      if (result.kind !== 'open') throw new Error('expected open');
      expect(result.menuItemsByCategory['cat-1'].map((i) => i.id)).toEqual([
        'm1',
        'm2',
        'm3',
      ]);
    });
  });

  describe('空カテゴリの扱い', () => {
    it('メニューが0件のカテゴリがある時、そのカテゴリもcategoriesに含まれること', async () => {
      // Arrange
      setupClient({
        tables: queryBuilder({ data: makeTable() }),
        categories: queryBuilder({
          data: [
            makeCategory({ id: 'cat-empty', sort_order: 0 }),
            makeCategory({ id: 'cat-with-items', sort_order: 1 }),
          ],
        }),
        menu_items: queryBuilder({
          data: [makeMenuItem({ category_id: 'cat-with-items' })],
        }),
      });

      // Act
      const result = await getOrderPageData(VALID_TOKEN);

      // Assert
      if (result.kind !== 'open') throw new Error('expected open');
      expect(result.categories.map((c) => c.id)).toContain('cat-empty');
    });

    it('メニューが0件のカテゴリのcategoryIdは、menuItemsByCategoryで空配列にマップされること', async () => {
      // Arrange
      setupClient({
        tables: queryBuilder({ data: makeTable() }),
        categories: queryBuilder({
          data: [
            makeCategory({ id: 'cat-empty' }),
            makeCategory({ id: 'cat-with-items' }),
          ],
        }),
        menu_items: queryBuilder({
          data: [makeMenuItem({ category_id: 'cat-with-items' })],
        }),
      });

      // Act
      const result = await getOrderPageData(VALID_TOKEN);

      // Assert
      if (result.kind !== 'open') throw new Error('expected open');
      expect(result.menuItemsByCategory['cat-empty']).toEqual([]);
      expect(result.menuItemsByCategory['cat-with-items']).toHaveLength(1);
    });
  });

  describe('境界値', () => {
    it('店舗にカテゴリが1件もない時、categoriesが空配列で返ること', async () => {
      // Arrange
      setupClient({
        tables: queryBuilder({ data: makeTable() }),
        categories: queryBuilder({ data: [] }),
        menu_items: queryBuilder({ data: [] }),
      });

      // Act
      const result = await getOrderPageData(VALID_TOKEN);

      // Assert
      if (result.kind !== 'open') throw new Error('expected open');
      expect(result.categories).toEqual([]);
    });

    it('店舗にメニューが1件もない時、menuItemsByCategoryのすべてのキーが空配列であること', async () => {
      // Arrange
      setupClient({
        tables: queryBuilder({ data: makeTable() }),
        categories: queryBuilder({
          data: [makeCategory({ id: 'cat-1' }), makeCategory({ id: 'cat-2' })],
        }),
        menu_items: queryBuilder({ data: [] }),
      });

      // Act
      const result = await getOrderPageData(VALID_TOKEN);

      // Assert
      if (result.kind !== 'open') throw new Error('expected open');
      expect(result.menuItemsByCategory['cat-1']).toEqual([]);
      expect(result.menuItemsByCategory['cat-2']).toEqual([]);
    });
  });
});
