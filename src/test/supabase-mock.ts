/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi } from 'vitest';

/**
 * Supabase クエリビルダーを模倣する thenable オブジェクト。
 * チェインメソッドは self を返し、await すると指定 response に解決する。
 */
export function queryBuilder(response: { data?: any; error?: any }) {
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
    'maybeSingle',
  ];
  for (const m of methods) {
    builder[m] = vi.fn(() => builder);
  }
  builder.then = (onfulfilled: any, onrejected?: any) =>
    Promise.resolve(resolved).then(onfulfilled, onrejected);
  return builder;
}

export type Builder = ReturnType<typeof queryBuilder>;

/**
 * テーブル名 → builder のディスパッチを行うクライアントモック。
 * 同一テーブルが複数回参照される場合は配列で順番に消費する。
 */
export function makeClient(byTable: Record<string, Builder | Builder[]>) {
  const queues: Record<string, Builder[]> = {};
  for (const [name, b] of Object.entries(byTable)) {
    queues[name] = Array.isArray(b) ? [...b] : [b];
  }
  return {
    from: vi.fn((name: string) => {
      const q = queues[name];
      if (!q || q.length === 0) {
        throw new Error(`unexpected from(${name})`);
      }
      return q.length === 1 ? q[0] : q.shift()!;
    }),
  };
}
