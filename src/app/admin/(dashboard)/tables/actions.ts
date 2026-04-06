'use server';

import { revalidatePath } from 'next/cache';
import {
  createTable,
  deleteTable,
  toggleTableStatus,
} from '@/lib/use-cases/tables';

type ActionResult = { error: string | null };

const TABLES_PATH = '/admin/tables';

export async function createTableAction(): Promise<ActionResult> {
  const result = await createTable();
  if (!result.error) revalidatePath(TABLES_PATH);
  return result;
}

export async function deleteTableAction(id: string): Promise<ActionResult> {
  if (!id) return { error: '不正なリクエストです' };
  const result = await deleteTable(id);
  if (!result.error) revalidatePath(TABLES_PATH);
  return result;
}

export async function toggleTableStatusAction(
  id: string,
): Promise<ActionResult> {
  if (!id) return { error: '不正なリクエストです' };
  const result = await toggleTableStatus(id);
  if (!result.error) revalidatePath(TABLES_PATH);
  return result;
}
