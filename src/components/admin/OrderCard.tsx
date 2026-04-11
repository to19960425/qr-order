'use client';

import type { OrderWithItems } from '@/hooks/useRealtimeOrders';
import { formatTimeJST } from '@/lib/date-utils';
import { formatPrice } from '@/lib/utils';

type Props = {
  order: OrderWithItems;
  onComplete?: (orderId: string) => void;
};

export function OrderCard({ order, onComplete }: Props) {
  const isCompleted = order.status === 'completed';

  const handleComplete = () => {
    if (!window.confirm(`注文 #${order.order_number} を完了にしますか？`)) return;
    onComplete?.(order.id);
  };

  return (
    <div
      className={`rounded-lg border p-4 shadow-sm ${
        isCompleted ? 'bg-gray-50 opacity-60' : 'bg-white'
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-lg font-bold">#{order.order_number}</span>
        <span className="text-sm text-gray-600">テーブル {order.tables.table_number}</span>
      </div>

      <div className="mb-2 text-sm text-gray-500">{formatTimeJST(order.created_at)}</div>

      <ul className="mb-3 space-y-1">
        {order.order_items.map((item) => (
          <li key={item.id} className="text-sm">
            {item.name} x{item.quantity}
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between">
        <span className="font-semibold">
          {formatPrice(order.total_amount)}
        </span>

        {isCompleted ? (
          <span className="text-sm text-gray-500">完了 {formatTimeJST(order.updated_at)}</span>
        ) : (
          <button
            onClick={handleComplete}
            className="rounded bg-green-600 px-3 py-1 text-sm font-medium text-white hover:bg-green-700"
          >
            完了にする
          </button>
        )}
      </div>
    </div>
  );
}
