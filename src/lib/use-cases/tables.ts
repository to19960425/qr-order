import { createClient } from '@/lib/supabase/server';
import { getStoreId } from '@/lib/store';
import type { Database } from '@/types/database';

type Table = Database['public']['Tables']['tables']['Row'];

export async function getTables(storeId: string): Promise<Table[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tables')
    .select('*')
    .eq('store_id', storeId)
    .order('table_number', { ascending: true });
  if (error) throw error;
  return data;
}

export async function createTable(): Promise<{ error: string | null }> {
  const [storeId, supabase] = await Promise.all([
    getStoreId(),
    createClient(),
  ]);

  const { data: existing } = await supabase
    .from('tables')
    .select('table_number')
    .eq('store_id', storeId)
    .order('table_number', { ascending: false })
    .limit(1);

  const nextNumber =
    existing && existing.length > 0 ? existing[0].table_number + 1 : 1;

  const { error } = await supabase.from('tables').insert({
    store_id: storeId,
    table_number: nextNumber,
    token: crypto.randomUUID(),
    is_active: true,
  });

  if (error) return { error: '保存に失敗しました。もう一度お試しください' };
  return { error: null };
}

export async function deleteTable(
  id: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tables')
    .delete()
    .eq('id', id)
    .select();

  if (error) return { error: '削除に失敗しました。もう一度お試しください' };
  if (!data || data.length === 0)
    return { error: 'テーブルが見つかりません' };
  return { error: null };
}

export async function toggleTableStatus(
  id: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { data, error: fetchError } = await supabase
    .from('tables')
    .select('is_active')
    .eq('id', id)
    .single();

  if (fetchError || !data)
    return { error: 'テーブルが見つかりません' };

  const { error } = await supabase
    .from('tables')
    .update({ is_active: !data.is_active })
    .eq('id', id);

  if (error) return { error: '更新に失敗しました。もう一度お試しください' };
  return { error: null };
}
