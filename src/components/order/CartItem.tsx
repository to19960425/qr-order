'use client';

import { Minus, Plus } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import type { CartItem as CartItemType } from '@/hooks/cart-reducer';

type Props = {
  item: CartItemType;
  onIncrement: () => void;
  onDecrement: () => void;
};

export function CartItem({ item, onIncrement, onDecrement }: Props) {
  const subtotal = item.price * item.quantity;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-cafe-foreground/10 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-cafe-foreground">
          {item.name}
        </p>
        <p className="mt-0.5 text-xs text-cafe-foreground/60">
          {formatPrice(item.price)}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onDecrement}
          aria-label={`${item.name}を1つ減らす`}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-cafe-foreground/20 text-cafe-foreground active:opacity-70"
        >
          <Minus size={16} />
        </button>
        <span
          className="w-6 text-center text-sm font-semibold tabular-nums"
          aria-label={`数量 ${item.quantity}`}
        >
          {item.quantity}
        </span>
        <button
          type="button"
          onClick={onIncrement}
          aria-label={`${item.name}を1つ増やす`}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-cafe-accent text-white active:opacity-80"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="w-20 text-right text-sm font-semibold tabular-nums text-cafe-foreground">
        {formatPrice(subtotal)}
      </div>
    </div>
  );
}
