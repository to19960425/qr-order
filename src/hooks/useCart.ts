'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addItem,
  decrementItem,
  removeItem,
  calcTotals,
  type CartItem,
  type CartState,
} from './cart-reducer';

const STORAGE_KEY_PREFIX = 'qr-order:cart:';

export function storageKey(token: string): string {
  return `${STORAGE_KEY_PREFIX}${token}`;
}

function isValidCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.menu_item_id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.price === 'number' &&
    typeof v.quantity === 'number' &&
    (v.image_url === null || typeof v.image_url === 'string')
  );
}

function safeRead(token: string): CartState {
  try {
    if (typeof window === 'undefined') return [];
    const raw = window.localStorage.getItem(storageKey(token));
    if (raw == null) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(isValidCartItem)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function safeWrite(token: string, state: CartState): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(storageKey(token), JSON.stringify(state));
  } catch {
    // localStorage 利用不可（プライベートモード等）はメモリ上の state のみで動作
  }
}

export function useCart(token: string) {
  // SSR / hydration mismatch 回避: 初回レンダリングは [] で確定し、effect で復元する
  const [items, setItems] = useState<CartState>([]);

  useEffect(() => {
    setItems(safeRead(token));
  }, [token]);

  const mutate = useCallback(
    (fn: (prev: CartState) => CartState) => {
      setItems((prev) => {
        const next = fn(prev);
        safeWrite(token, next);
        return next;
      });
    },
    [token],
  );

  const add = useCallback(
    (item: Omit<CartItem, 'quantity'>) => mutate((prev) => addItem(prev, item)),
    [mutate],
  );
  const decrement = useCallback(
    (menuItemId: string) => mutate((prev) => decrementItem(prev, menuItemId)),
    [mutate],
  );
  const remove = useCallback(
    (menuItemId: string) => mutate((prev) => removeItem(prev, menuItemId)),
    [mutate],
  );
  const clear = useCallback(() => mutate(() => []), [mutate]);

  const getQuantity = useCallback(
    (menuItemId: string): number =>
      items.find((i) => i.menu_item_id === menuItemId)?.quantity ?? 0,
    [items],
  );

  const { totalQuantity, totalAmount } = useMemo(
    () => calcTotals(items),
    [items],
  );

  return {
    items,
    totalQuantity,
    totalAmount,
    getQuantity,
    add,
    decrement,
    remove,
    clear,
  };
}
