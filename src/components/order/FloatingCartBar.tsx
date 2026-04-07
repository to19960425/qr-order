'use client';

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

type Props = {
  token: string;
  totalQuantity: number;
  totalAmount: number;
};

export function FloatingCartBar({ token, totalQuantity, totalAmount }: Props) {
  const isEmpty = totalQuantity === 0;

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-cafe-foreground/10 bg-white shadow-[0_-2px_8px_rgba(60,36,21,0.08)]">
      <div className="mx-auto flex max-w-screen-md items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2 text-cafe-foreground">
          <ShoppingCart size={20} />
          {isEmpty ? (
            <span className="text-sm">カートは空です</span>
          ) : (
            <span className="text-sm font-medium">
              カート（{totalQuantity}点） {formatPrice(totalAmount)}
            </span>
          )}
        </div>

        {isEmpty ? (
          <button
            type="button"
            disabled
            className="rounded-full bg-cafe-accent/40 px-5 py-2 text-sm font-semibold text-white"
          >
            注文を確認する
          </button>
        ) : (
          <Link
            href={`/order/${token}/cart`}
            className="rounded-full bg-cafe-accent px-5 py-2 text-sm font-semibold text-white shadow active:opacity-80"
          >
            注文を確認する
          </Link>
        )}
      </div>
    </div>
  );
}
