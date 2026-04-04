import { createClient } from '@/lib/supabase/server';
import { menuItemSchema, categorySchema } from '@/lib/validations/menu';
import { validateImageFile } from '@/lib/validations/image';
import { swapSortOrder, canMove } from '@/lib/sort-order';
import type { Database } from '@/types/database';

type Category = Database['public']['Tables']['categories']['Row'];
type MenuItem = Database['public']['Tables']['menu_items']['Row'];
type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// ---------- カテゴリ操作 ----------

export async function getCategories(storeId: string): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('store_id', storeId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data;
}

export async function createCategory(
  storeId: string,
  input: { name: string },
): Promise<{ error: string | null }> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { error: '入力内容に誤りがあります' };
  }

  const supabase = await createClient();
  const nextSortOrder = await getNextSortOrder(supabase, 'categories', 'store_id', storeId);

  const { error } = await supabase.from('categories').insert({
    store_id: storeId,
    name: parsed.data.name,
    sort_order: nextSortOrder,
  });
  if (error) return { error: '保存に失敗しました。もう一度お試しください' };
  return { error: null };
}

export async function updateCategory(
  categoryId: string,
  input: { name: string },
): Promise<{ error: string | null }> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { error: '入力内容に誤りがあります' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('categories')
    .update({ name: parsed.data.name })
    .eq('id', categoryId);
  if (error) return { error: '保存に失敗しました。もう一度お試しください' };
  return { error: null };
}

export async function deleteCategory(
  categoryId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  // 配下menu_itemsの画像をStorageから一括削除
  const { data: items } = await supabase
    .from('menu_items')
    .select('image_url')
    .eq('category_id', categoryId);

  const paths = (items ?? [])
    .map((item) => extractStoragePath(item.image_url))
    .filter((p): p is string => p !== null);

  // Storage削除とDB削除は独立しているため並列実行
  const [, { error }] = await Promise.all([
    paths.length > 0
      ? supabase.storage.from('menu-images').remove(paths)
      : Promise.resolve(),
    supabase.from('categories').delete().eq('id', categoryId),
  ]);

  if (error) return { error: '削除に失敗しました。もう一度お試しください' };
  return { error: null };
}

export async function reorderCategories(
  storeId: string,
  categoryId: string,
  direction: 'up' | 'down',
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('store_id', storeId)
    .order('sort_order', { ascending: true });

  if (!categories) return { error: '並び替えに失敗しました' };

  const index = categories.findIndex((c) => c.id === categoryId);
  if (index === -1 || !canMove(index, categories.length, direction)) {
    return { error: '並び替えに失敗しました' };
  }

  const swapped = swapSortOrder(categories, index, direction);
  const targetIndex = direction === 'up' ? index - 1 : index + 1;

  const [{ error: err1 }, { error: err2 }] = await Promise.all([
    supabase.from('categories').update({ sort_order: swapped[index].sort_order }).eq('id', swapped[index].id),
    supabase.from('categories').update({ sort_order: swapped[targetIndex].sort_order }).eq('id', swapped[targetIndex].id),
  ]);

  if (err1 || err2) return { error: '並び替えに失敗しました' };
  return { error: null };
}

// ---------- メニューアイテム操作 ----------

export async function getMenuItemsByCategory(
  storeId: string,
): Promise<Record<string, MenuItem[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('store_id', storeId)
    .order('sort_order', { ascending: true });
  if (error) throw error;

  const grouped: Record<string, MenuItem[]> = {};
  for (const item of data) {
    if (!grouped[item.category_id]) {
      grouped[item.category_id] = [];
    }
    grouped[item.category_id].push(item);
  }
  return grouped;
}

export async function createMenuItem(
  storeId: string,
  input: { name: string; price: number; category_id: string; description?: string },
  imageFile?: File | null,
): Promise<{ error: string | null }> {
  const parsed = menuItemSchema.safeParse(input);
  if (!parsed.success) {
    return { error: '入力内容に誤りがあります' };
  }

  const supabase = await createClient();

  const imageUrl = await processImageUpload(supabase, imageFile);
  if (imageUrl === false) return { error: '画像のアップロードに失敗しました' };

  const nextSortOrder = await getNextSortOrder(supabase, 'menu_items', 'category_id', parsed.data.category_id);

  const { error } = await supabase.from('menu_items').insert({
    store_id: storeId,
    category_id: parsed.data.category_id,
    name: parsed.data.name,
    price: parsed.data.price,
    description: parsed.data.description ?? null,
    image_url: imageUrl,
    sort_order: nextSortOrder,
  });
  if (error) return { error: '保存に失敗しました。もう一度お試しください' };
  return { error: null };
}

export async function updateMenuItem(
  menuItemId: string,
  input: { name: string; price: number; category_id: string; description?: string },
  imageFile?: File | null,
): Promise<{ error: string | null }> {
  const parsed = menuItemSchema.safeParse(input);
  if (!parsed.success) {
    return { error: '入力内容に誤りがあります' };
  }

  const supabase = await createClient();

  const { data: current } = await supabase
    .from('menu_items')
    .select('image_url, category_id, sort_order')
    .eq('id', menuItemId)
    .single();
  if (!current) return { error: 'メニューが見つかりません' };

  let imageUrl: string | null = current.image_url;

  if (imageFile && imageFile.size > 0) {
    const validation = validateImageFile({ size: imageFile.size, type: imageFile.type });
    if (!validation.valid) return { error: validation.error };

    // 旧画像削除と新画像アップロードを実行
    const oldPath = extractStoragePath(current.image_url);
    if (oldPath) {
      await supabase.storage.from('menu-images').remove([oldPath]);
    }
    const uploadResult = await uploadImage(supabase, imageFile);
    if (uploadResult.error) return { error: uploadResult.error };
    imageUrl = uploadResult.url;
  }

  // カテゴリ変更時は移動先カテゴリの末尾に配置
  let sortOrder = current.sort_order;
  if (parsed.data.category_id !== current.category_id) {
    sortOrder = await getNextSortOrder(supabase, 'menu_items', 'category_id', parsed.data.category_id);
  }

  const { error } = await supabase
    .from('menu_items')
    .update({
      name: parsed.data.name,
      price: parsed.data.price,
      category_id: parsed.data.category_id,
      description: parsed.data.description ?? null,
      image_url: imageUrl,
      sort_order: sortOrder,
    })
    .eq('id', menuItemId);
  if (error) return { error: '保存に失敗しました。もう一度お試しください' };
  return { error: null };
}

export async function deleteMenuItem(
  menuItemId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { data: item } = await supabase
    .from('menu_items')
    .select('image_url')
    .eq('id', menuItemId)
    .single();

  const path = extractStoragePath(item?.image_url ?? null);

  // Storage削除とDB削除を並列実行
  const [, { error }] = await Promise.all([
    path ? supabase.storage.from('menu-images').remove([path]) : Promise.resolve(),
    supabase.from('menu_items').delete().eq('id', menuItemId),
  ]);

  if (error) return { error: '削除に失敗しました。もう一度お試しください' };
  return { error: null };
}

export async function reorderMenuItems(
  categoryId: string,
  menuItemId: string,
  direction: 'up' | 'down',
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from('menu_items')
    .select('*')
    .eq('category_id', categoryId)
    .order('sort_order', { ascending: true });

  if (!items) return { error: '並び替えに失敗しました' };

  const index = items.findIndex((i) => i.id === menuItemId);
  if (index === -1 || !canMove(index, items.length, direction)) {
    return { error: '並び替えに失敗しました' };
  }

  const swapped = swapSortOrder(items, index, direction);
  const targetIndex = direction === 'up' ? index - 1 : index + 1;

  const [{ error: err1 }, { error: err2 }] = await Promise.all([
    supabase.from('menu_items').update({ sort_order: swapped[index].sort_order }).eq('id', swapped[index].id),
    supabase.from('menu_items').update({ sort_order: swapped[targetIndex].sort_order }).eq('id', swapped[targetIndex].id),
  ]);

  if (err1 || err2) return { error: '並び替えに失敗しました' };
  return { error: null };
}

export async function toggleMenuItemAvailability(
  menuItemId: string,
  isAvailable: boolean,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('menu_items')
    .update({ is_available: isAvailable })
    .eq('id', menuItemId);
  if (error) return { error: '更新に失敗しました。もう一度お試しください' };
  return { error: null };
}

// ---------- ヘルパー ----------

async function getNextSortOrder(
  supabase: SupabaseClient,
  table: 'categories' | 'menu_items',
  filterColumn: string,
  filterValue: string,
): Promise<number> {
  const { data } = await supabase
    .from(table)
    .select('sort_order')
    .eq(filterColumn, filterValue)
    .order('sort_order', { ascending: false })
    .limit(1);
  return data && data.length > 0 ? data[0].sort_order + 1 : 0;
}

/** 画像ファイルのバリデーションとアップロード。画像なしはnull、失敗はfalseを返す */
async function processImageUpload(
  supabase: SupabaseClient,
  imageFile?: File | null,
): Promise<string | null | false> {
  if (!imageFile || imageFile.size === 0) return null;

  const validation = validateImageFile({ size: imageFile.size, type: imageFile.type });
  if (!validation.valid) return false;

  const result = await uploadImage(supabase, imageFile);
  return result.error ? false : result.url;
}

function extractStoragePath(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  const match = imageUrl.match(/\/menu-images\/(.+)$/);
  return match ? match[1] : null;
}

async function uploadImage(
  supabase: SupabaseClient,
  file: File,
): Promise<{ url: string | null; error: string | null }> {
  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from('menu-images')
    .upload(fileName, file);
  if (error) {
    return { url: null, error: '画像のアップロードに失敗しました' };
  }

  const { data: urlData } = supabase.storage
    .from('menu-images')
    .getPublicUrl(fileName);

  return { url: urlData.publicUrl, error: null };
}
