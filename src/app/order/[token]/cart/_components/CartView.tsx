'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { CartItem } from '@/components/order/CartItem';
import { useCart } from '@/hooks/useCart';
import { createClient } from '@/lib/supabase/client';
import { submitOrder } from '@/lib/use-cases/customer-cart';
import { formatPrice } from '@/lib/utils';

type Props = {
  token: string;
  storeId: string;
  tableId: string;
  tableNumber: number;
};

export function CartView({ token, storeId, tableId, tableNumber }: Props) {
  const router = useRouter();
  const { items, totalAmount, add, decrement, clear } = useCart(token);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (items.length === 0) return;
    if (!window.confirm('この内容で注文しますか？')) return;

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const result = await submitOrder(createClient(), {
        storeId,
        tableId,
        items,
      });

      if (result.kind === 'ok') {
        clear();
        router.replace(`/order/${token}/complete`);
        return;
      }

      if (result.kind === 'closed') {
        setErrorMessage(
          '現在このテーブルでは注文を受け付けていません。スタッフへお声がけください。',
        );
        return;
      }

      setErrorMessage(
        '注文の送信に失敗しました。電波状況をご確認のうえ、もう一度お試しください。',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-cafe-foreground/10 bg-cafe-background px-4 py-3">
        <Link
          href={`/order/${token}`}
          aria-label="メニューに戻る"
          className="flex h-8 w-8 items-center justify-center rounded-full text-cafe-foreground active:opacity-70"
        >
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-base font-semibold text-cafe-foreground">
          カート / テーブル {tableNumber}番
        </h1>
      </header>

      <main className="px-4 pb-32 pt-4">
        {items.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-cafe-foreground/70">
              カートに商品がありません
            </p>
            <Link
              href={`/order/${token}`}
              className="mt-4 inline-block rounded-full bg-cafe-accent px-5 py-2 text-sm font-semibold text-white shadow active:opacity-80"
            >
              メニューに戻る
            </Link>
          </div>
        ) : (
          <>
            <div>
              {items.map((item) => (
                <CartItem
                  key={item.menu_item_id}
                  item={item}
                  onIncrement={() =>
                    add({
                      menu_item_id: item.menu_item_id,
                      name: item.name,
                      price: item.price,
                      image_url: item.image_url,
                    })
                  }
                  onDecrement={() => decrement(item.menu_item_id)}
                />
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-cafe-foreground/20 pt-4">
              <span className="text-sm font-medium text-cafe-foreground">
                合計
              </span>
              <span className="text-xl font-bold tabular-nums text-cafe-foreground">
                {formatPrice(totalAmount)}
              </span>
            </div>

            {errorMessage && (
              <p
                role="alert"
                className="mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {errorMessage}
              </p>
            )}
          </>
        )}
      </main>

      {items.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-cafe-foreground/10 bg-white shadow-[0_-2px_8px_rgba(60,36,21,0.08)]">
          <div className="mx-auto max-w-screen-md px-4 py-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-cafe-accent px-5 py-3 text-base font-semibold text-white shadow active:opacity-80 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  送信中…
                </>
              ) : (
                '注文を確定する'
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
