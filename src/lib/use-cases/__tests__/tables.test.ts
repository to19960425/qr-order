import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------- Mock external boundaries ----------

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/store', () => ({
  getStoreId: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { getStoreId } from '@/lib/store';
import {
  getTables,
  createTable,
  deleteTable,
  toggleTableStatus,
} from '../tables';

const mockedCreateClient = vi.mocked(createClient);
const mockedGetStoreId = vi.mocked(getStoreId);

// ---------- Test helpers ----------

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function makeTable(
  overrides: Partial<{
    id: string;
    store_id: string;
    table_number: number;
    token: string;
    is_active: boolean;
    created_at: string;
  }> = {},
) {
  return {
    id: overrides.id ?? 'table-1',
    store_id: overrides.store_id ?? 'store-1',
    table_number: overrides.table_number ?? 1,
    token: overrides.token ?? 'tok-aaa',
    is_active: overrides.is_active ?? true,
    created_at: overrides.created_at ?? '2024-01-01T00:00:00Z',
  };
}

/**
 * Supabase のクエリビルダーを模倣するテナブルオブジェクトを生成する。
 * await するとresponseが返る。チェインメソッドは全て自身を返す。
 */
function queryBuilder(response: { data?: any; error?: any }) {
  const resolved = { data: response.data ?? null, error: response.error ?? null };
  const builder: Record<string, any> = {};
  const methods = [
    'select',
    'insert',
    'update',
    'delete',
    'eq',
    'order',
    'limit',
    'single',
  ];
  for (const m of methods) {
    builder[m] = vi.fn(() => builder);
  }
  // thenable にすることで await 可能にする
  builder.then = (onfulfilled: any, onrejected?: any) =>
    Promise.resolve(resolved).then(onfulfilled, onrejected);
  return builder;
}

function setupClient() {
  const client = { from: vi.fn() };
  mockedCreateClient.mockResolvedValue(client as any);
  return client;
}

// ---------- Tests ----------

describe('tables UseCase', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== getTables ====================
  describe('getTables', () => {
    describe('正常系', () => {
      it('テーブルが複数存在する場合、table_number昇順で返ること', async () => {
        // Arrange
        const tables = [
          makeTable({ table_number: 1 }),
          makeTable({ table_number: 2, id: 'table-2' }),
          makeTable({ table_number: 3, id: 'table-3' }),
        ];
        const builder = queryBuilder({ data: tables });
        const client = setupClient();
        client.from.mockReturnValue(builder);

        // Act
        const result = await getTables('store-1');

        // Assert
        expect(result).toEqual(tables);
        expect(builder.order).toHaveBeenCalledWith('table_number', {
          ascending: true,
        });
      });

      it('テーブルが0件の場合、空配列が返ること', async () => {
        // Arrange
        const builder = queryBuilder({ data: [] });
        const client = setupClient();
        client.from.mockReturnValue(builder);

        // Act
        const result = await getTables('store-1');

        // Assert
        expect(result).toEqual([]);
      });

      it('自店舗のテーブルのみが返ること', async () => {
        // Arrange
        const builder = queryBuilder({ data: [makeTable({ store_id: 'my-store' })] });
        const client = setupClient();
        client.from.mockReturnValue(builder);

        // Act
        await getTables('my-store');

        // Assert
        expect(client.from).toHaveBeenCalledWith('tables');
        expect(builder.eq).toHaveBeenCalledWith('store_id', 'my-store');
      });
    });

    describe('異常系', () => {
      it('Supabaseからエラーが返された場合、エラーが返ること', async () => {
        // Arrange
        const dbError = { message: 'DB connection failed', code: '500' };
        const builder = queryBuilder({ error: dbError });
        const client = setupClient();
        client.from.mockReturnValue(builder);

        // Act & Assert
        await expect(getTables('store-1')).rejects.toEqual(dbError);
      });
    });
  });

  // ==================== createTable ====================
  describe('createTable', () => {
    describe('正常系', () => {
      it('テーブルが追加され、is_activeがtrueで作成されること', async () => {
        // Arrange
        mockedGetStoreId.mockResolvedValue('store-1');
        const selectBuilder = queryBuilder({ data: [{ table_number: 2 }] });
        const insertBuilder = queryBuilder({ error: null });
        const client = setupClient();
        client.from
          .mockReturnValueOnce(selectBuilder)
          .mockReturnValueOnce(insertBuilder);

        // Act
        const result = await createTable();

        // Assert
        expect(result).toEqual({ error: null });
        expect(insertBuilder.insert).toHaveBeenCalledWith(
          expect.objectContaining({ is_active: true }),
        );
      });

      it('既存テーブルの最大番号+1が新しいテーブル番号になること', async () => {
        // Arrange
        mockedGetStoreId.mockResolvedValue('store-1');
        const selectBuilder = queryBuilder({ data: [{ table_number: 5 }] });
        const insertBuilder = queryBuilder({ error: null });
        const client = setupClient();
        client.from
          .mockReturnValueOnce(selectBuilder)
          .mockReturnValueOnce(insertBuilder);

        // Act
        await createTable();

        // Assert
        expect(insertBuilder.insert).toHaveBeenCalledWith(
          expect.objectContaining({ table_number: 6 }),
        );
      });

      it('トークンがUUID v4形式で自動生成されること', async () => {
        // Arrange
        mockedGetStoreId.mockResolvedValue('store-1');
        const selectBuilder = queryBuilder({ data: [] });
        const insertBuilder = queryBuilder({ error: null });
        const client = setupClient();
        client.from
          .mockReturnValueOnce(selectBuilder)
          .mockReturnValueOnce(insertBuilder);

        // Act
        await createTable();

        // Assert
        const insertArg = insertBuilder.insert.mock.calls[0][0];
        expect(insertArg.token).toMatch(UUID_V4_REGEX);
      });

      it('getStoreId()で取得した店舗IDがセットされること', async () => {
        // Arrange
        mockedGetStoreId.mockResolvedValue('store-xyz');
        const selectBuilder = queryBuilder({ data: [] });
        const insertBuilder = queryBuilder({ error: null });
        const client = setupClient();
        client.from
          .mockReturnValueOnce(selectBuilder)
          .mockReturnValueOnce(insertBuilder);

        // Act
        await createTable();

        // Assert
        expect(mockedGetStoreId).toHaveBeenCalled();
        expect(insertBuilder.insert).toHaveBeenCalledWith(
          expect.objectContaining({ store_id: 'store-xyz' }),
        );
      });
    });

    describe('境界値', () => {
      it('テーブルが0件の場合、テーブル番号1で作成されること', async () => {
        // Arrange
        mockedGetStoreId.mockResolvedValue('store-1');
        const selectBuilder = queryBuilder({ data: [] });
        const insertBuilder = queryBuilder({ error: null });
        const client = setupClient();
        client.from
          .mockReturnValueOnce(selectBuilder)
          .mockReturnValueOnce(insertBuilder);

        // Act
        await createTable();

        // Assert
        expect(insertBuilder.insert).toHaveBeenCalledWith(
          expect.objectContaining({ table_number: 1 }),
        );
      });

      it('テーブル番号に欠番がある場合（1,3,5）、最大番号+1（6）で採番されること', async () => {
        // Arrange — SELECTはtable_number降順limit(1)なので最大値のみ返る
        mockedGetStoreId.mockResolvedValue('store-1');
        const selectBuilder = queryBuilder({ data: [{ table_number: 5 }] });
        const insertBuilder = queryBuilder({ error: null });
        const client = setupClient();
        client.from
          .mockReturnValueOnce(selectBuilder)
          .mockReturnValueOnce(insertBuilder);

        // Act
        await createTable();

        // Assert
        expect(insertBuilder.insert).toHaveBeenCalledWith(
          expect.objectContaining({ table_number: 6 }),
        );
      });
    });

    describe('異常系', () => {
      it('INSERT時にSupabaseエラーが発生した場合、エラーが返ること', async () => {
        // Arrange
        mockedGetStoreId.mockResolvedValue('store-1');
        const selectBuilder = queryBuilder({ data: [] });
        const insertBuilder = queryBuilder({
          error: { message: 'insert failed' },
        });
        const client = setupClient();
        client.from
          .mockReturnValueOnce(selectBuilder)
          .mockReturnValueOnce(insertBuilder);

        // Act
        const result = await createTable();

        // Assert
        expect(result.error).toBeTruthy();
      });
    });
  });

  // ==================== deleteTable ====================
  describe('deleteTable', () => {
    describe('正常系', () => {
      it('指定したIDのテーブルが削除されること', async () => {
        // Arrange
        const builder = queryBuilder({
          data: [makeTable({ id: 'del-target' })],
        });
        const client = setupClient();
        client.from.mockReturnValue(builder);

        // Act
        const result = await deleteTable('del-target');

        // Assert
        expect(result).toEqual({ error: null });
        expect(client.from).toHaveBeenCalledWith('tables');
        expect(builder.delete).toHaveBeenCalled();
        expect(builder.eq).toHaveBeenCalledWith('id', 'del-target');
      });
    });

    describe('異常系', () => {
      it('存在しないIDを指定した場合、エラーが返ること', async () => {
        // Arrange — 削除対象が0件
        const builder = queryBuilder({ data: [] });
        const client = setupClient();
        client.from.mockReturnValue(builder);

        // Act
        const result = await deleteTable('non-existent-id');

        // Assert
        expect(result.error).toBeTruthy();
      });

      it('DELETE時にSupabaseエラーが発生した場合、エラーが返ること', async () => {
        // Arrange
        const builder = queryBuilder({
          error: { message: 'delete failed' },
        });
        const client = setupClient();
        client.from.mockReturnValue(builder);

        // Act
        const result = await deleteTable('table-1');

        // Assert
        expect(result.error).toBeTruthy();
      });
    });
  });

  // ==================== toggleTableStatus ====================
  describe('toggleTableStatus', () => {
    describe('正常系', () => {
      it('is_activeがtrueのテーブルをトグルした場合、falseに更新されること', async () => {
        // Arrange
        const selectBuilder = queryBuilder({
          data: { is_active: true },
        });
        const updateBuilder = queryBuilder({ error: null });
        const client = setupClient();
        client.from
          .mockReturnValueOnce(selectBuilder)
          .mockReturnValueOnce(updateBuilder);

        // Act
        const result = await toggleTableStatus('table-1');

        // Assert
        expect(result).toEqual({ error: null });
        expect(updateBuilder.update).toHaveBeenCalledWith({
          is_active: false,
        });
      });

      it('is_activeがfalseのテーブルをトグルした場合、trueに更新されること', async () => {
        // Arrange
        const selectBuilder = queryBuilder({
          data: { is_active: false },
        });
        const updateBuilder = queryBuilder({ error: null });
        const client = setupClient();
        client.from
          .mockReturnValueOnce(selectBuilder)
          .mockReturnValueOnce(updateBuilder);

        // Act
        const result = await toggleTableStatus('table-1');

        // Assert
        expect(result).toEqual({ error: null });
        expect(updateBuilder.update).toHaveBeenCalledWith({
          is_active: true,
        });
      });
    });

    describe('異常系', () => {
      it('存在しないIDを指定した場合、エラーが返ること', async () => {
        // Arrange — single()でデータなし → fetchError
        const builder = queryBuilder({
          data: null,
          error: { message: 'Row not found', code: 'PGRST116' },
        });
        const client = setupClient();
        client.from.mockReturnValue(builder);

        // Act
        const result = await toggleTableStatus('non-existent-id');

        // Assert
        expect(result.error).toBeTruthy();
      });

      it('UPDATE時にSupabaseエラーが発生した場合、エラーが返ること', async () => {
        // Arrange
        const selectBuilder = queryBuilder({
          data: { is_active: true },
        });
        const updateBuilder = queryBuilder({
          error: { message: 'update failed' },
        });
        const client = setupClient();
        client.from
          .mockReturnValueOnce(selectBuilder)
          .mockReturnValueOnce(updateBuilder);

        // Act
        const result = await toggleTableStatus('table-1');

        // Assert
        expect(result.error).toBeTruthy();
      });
    });
  });
});
