'use client';

import type { OrderWithItems } from '@/hooks/useRealtimeOrders';
import { OrderCard } from './OrderCard';

type Props = {
  newOrders: OrderWithItems[];
  completedOrders: OrderWithItems[];
  onComplete: (orderId: string) => void;
};

export function OrderBoard({ newOrders, completedOrders, onComplete }: Props) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* 左カラム: 新規注文 */}
      <div data-testid="column-new">
        <h2 className="mb-4 text-lg font-bold">新規注文</h2>
        {newOrders.length === 0 ? (
          <p className="text-sm text-gray-500">新規注文はありません</p>
        ) : (
          <div className="space-y-4">
            {newOrders.map((order) => (
              <OrderCard key={order.id} order={order} onComplete={onComplete} />
            ))}
          </div>
        )}
      </div>

      {/* 右カラム: 完了済み */}
      <div data-testid="column-completed">
        <h2 className="mb-4 text-lg font-bold">完了済み</h2>
        {completedOrders.length === 0 ? (
          <p className="text-sm text-gray-500">完了済みの注文はありません</p>
        ) : (
          <div className="space-y-4">
            {completedOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
