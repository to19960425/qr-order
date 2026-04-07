'use client';

import { Coffee, Minus, Plus } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import type { Database } from '@/types/database';

type MenuItem = Database['public']['Tables']['menu_items']['Row'];

type Props = {
  item: MenuItem;
  quantity: number;
  onAdd: () => void;
  onDecrement: () => void;
};

export function MenuCard({ item, quantity, onAdd, onDecrement }: Props) {
  const inCart = quantity > 0;

  return (
    <div className="overflow-hidden rounded-lg border border-cafe-foreground/10 bg-white shadow-sm">
      <div className="relative aspect-[16/10] w-full bg-cafe-background">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt={item.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-cafe-foreground/40">
            <Coffee size={48} />
          </div>
        )}
        {inCart && (
          <div className="absolute right-2 top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-cafe-accent px-2 text-sm font-bold text-white shadow">
            {quantity}
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="truncate text-base font-semibold">{item.name}</h3>
        {item.description && (
          <p className="mt-1 line-clamp-2 text-sm text-cafe-foreground/70">
            {item.description}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between">
          <span className="text-lg font-bold">{formatPrice(item.price)}</span>

          {inCart ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onDecrement}
                aria-label="数量を減らす"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-cafe-accent text-cafe-accent active:bg-cafe-accent/10"
              >
                <Minus size={18} />
              </button>
              <span className="min-w-6 text-center text-base font-semibold">
                {quantity}
              </span>
              <button
                type="button"
                onClick={onAdd}
                aria-label="数量を増やす"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-cafe-accent text-white active:opacity-80"
              >
                <Plus size={18} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onAdd}
              aria-label="カートに追加"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-cafe-accent text-white shadow active:opacity-80"
            >
              <Plus size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
