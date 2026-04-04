import { createClient } from '@/lib/supabase/server';

export async function getStoreId(): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('stores')
    .select('*')
    .limit(1);
  if (!data || data.length === 0) throw new Error('Store not found');
  return data[0].id;
}
