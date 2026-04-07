'use client';

import { useState } from 'react';
import { CategoryTabs } from '@/components/order/CategoryTabs';
import { MenuCard } from '@/components/order/MenuCard';
import { FloatingCartBar } from '@/components/order/FloatingCartBar';
import { useCart } from '@/hooks/useCart';
import type { Database } from '@/types/database';

type Category = Database['public']['Tables']['categories']['Row'];
type MenuItem = Database['public']['Tables']['menu_items']['Row'];

type Props = {
  token: string;
  tableNumber: number;
  categories: Category[];
  menuItemsByCategory: Record<string, MenuItem[]>;
};

export function MenuView({
  token,
  tableNumber,
  categories,
  menuItemsByCategory,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(
    categories[0]?.id ?? null,
  );
  const { getQuantity, add, decrement, totalQuantity, totalAmount } =
    useCart(token);

  const items = selectedId ? (menuItemsByCategory[selectedId] ?? []) : [];

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-cafe-foreground/10 bg-cafe-background px-4 py-3">
        <h1 className="text-base font-semibold">
          ☕ テーブル {tableNumber}
        </h1>
      </header>

      <CategoryTabs
        categories={categories}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      <main className="px-4 pb-24 pt-4">
        {categories.length === 0 ? (
          <p className="py-12 text-center text-cafe-foreground/60">
            メニューが登録されていません
          </p>
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-cafe-foreground/60">
            このカテゴリにはメニューがありません
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {items.map((item) => (
              <MenuCard
                key={item.id}
                item={item}
                quantity={getQuantity(item.id)}
                onAdd={() =>
                  add({
                    menu_item_id: item.id,
                    name: item.name,
                    price: item.price,
                    image_url: item.image_url,
                  })
                }
                onDecrement={() => decrement(item.id)}
              />
            ))}
          </div>
        )}
      </main>

      <FloatingCartBar
        token={token}
        totalQuantity={totalQuantity}
        totalAmount={totalAmount}
      />
    </>
  );
}
