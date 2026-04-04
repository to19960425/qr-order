'use server';

import { revalidatePath } from 'next/cache';
import { getStoreId } from '@/lib/store';
import {
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  reorderMenuItems,
  toggleMenuItemAvailability,
} from '@/lib/use-cases/menu';

type ActionResult = { error: string | null };

const MENU_PATH = '/admin/menu';

function getString(formData: FormData, key: string): string {
  return (formData.get(key) as string) ?? '';
}

function getDirection(formData: FormData): 'up' | 'down' | null {
  const v = formData.get('direction');
  if (v === 'up' || v === 'down') return v;
  return null;
}

export async function createCategoryAction(formData: FormData): Promise<ActionResult> {
  const storeId = await getStoreId();
  const name = getString(formData, 'name');
  const result = await createCategory(storeId, { name });
  if (!result.error) revalidatePath(MENU_PATH);
  return result;
}

export async function updateCategoryAction(formData: FormData): Promise<ActionResult> {
  const categoryId = getString(formData, 'categoryId');
  const name = getString(formData, 'name');
  if (!categoryId) return { error: '不正なリクエストです' };
  const result = await updateCategory(categoryId, { name });
  if (!result.error) revalidatePath(MENU_PATH);
  return result;
}

export async function deleteCategoryAction(formData: FormData): Promise<ActionResult> {
  const categoryId = getString(formData, 'categoryId');
  if (!categoryId) return { error: '不正なリクエストです' };
  const result = await deleteCategory(categoryId);
  if (!result.error) revalidatePath(MENU_PATH);
  return result;
}

export async function reorderCategoryAction(formData: FormData): Promise<ActionResult> {
  const storeId = await getStoreId();
  const categoryId = getString(formData, 'categoryId');
  const direction = getDirection(formData);
  if (!categoryId || !direction) return { error: '不正なリクエストです' };
  const result = await reorderCategories(storeId, categoryId, direction);
  if (!result.error) revalidatePath(MENU_PATH);
  return result;
}

export async function createMenuItemAction(formData: FormData): Promise<ActionResult> {
  const storeId = await getStoreId();
  const input = {
    name: getString(formData, 'name'),
    price: Number(formData.get('price')),
    category_id: getString(formData, 'category_id'),
    description: getString(formData, 'description') || undefined,
  };
  const imageFile = formData.get('image') as File | null;
  const result = await createMenuItem(storeId, input, imageFile);
  if (!result.error) revalidatePath(MENU_PATH);
  return result;
}

export async function updateMenuItemAction(formData: FormData): Promise<ActionResult> {
  const menuItemId = getString(formData, 'menuItemId');
  if (!menuItemId) return { error: '不正なリクエストです' };
  const input = {
    name: getString(formData, 'name'),
    price: Number(formData.get('price')),
    category_id: getString(formData, 'category_id'),
    description: getString(formData, 'description') || undefined,
  };
  const imageFile = formData.get('image') as File | null;
  const result = await updateMenuItem(menuItemId, input, imageFile);
  if (!result.error) revalidatePath(MENU_PATH);
  return result;
}

export async function deleteMenuItemAction(formData: FormData): Promise<ActionResult> {
  const menuItemId = getString(formData, 'menuItemId');
  if (!menuItemId) return { error: '不正なリクエストです' };
  const result = await deleteMenuItem(menuItemId);
  if (!result.error) revalidatePath(MENU_PATH);
  return result;
}

export async function reorderMenuItemAction(formData: FormData): Promise<ActionResult> {
  const categoryId = getString(formData, 'categoryId');
  const menuItemId = getString(formData, 'menuItemId');
  const direction = getDirection(formData);
  if (!categoryId || !menuItemId || !direction) return { error: '不正なリクエストです' };
  const result = await reorderMenuItems(categoryId, menuItemId, direction);
  if (!result.error) revalidatePath(MENU_PATH);
  return result;
}

export async function toggleMenuItemAvailabilityAction(formData: FormData): Promise<ActionResult> {
  const menuItemId = getString(formData, 'menuItemId');
  if (!menuItemId) return { error: '不正なリクエストです' };
  const isAvailable = formData.get('isAvailable') === 'true';
  const result = await toggleMenuItemAvailability(menuItemId, isAvailable);
  if (!result.error) revalidatePath(MENU_PATH);
  return result;
}
