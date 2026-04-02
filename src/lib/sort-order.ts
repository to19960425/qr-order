type Sortable = { id: string; sort_order: number };

/**
 * 指定indexのアイテムをdirection方向に1つ移動した新配列を返す。
 * sort_orderの値を入れ替える。元の配列は変更しない。
 */
export function swapSortOrder<T extends Sortable>(
  items: T[],
  index: number,
  direction: 'up' | 'down',
): T[] {
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  const result = items.map((item) => ({ ...item }));

  const temp = result[index].sort_order;
  result[index].sort_order = result[targetIndex].sort_order;
  result[targetIndex].sort_order = temp;

  return result;
}

/**
 * 指定位置のアイテムが移動可能かどうかを判定する。
 */
export function canMove(
  index: number,
  total: number,
  direction: 'up' | 'down',
): boolean {
  if (total <= 1) return false;
  if (direction === 'up') return index > 0;
  return index < total - 1;
}
