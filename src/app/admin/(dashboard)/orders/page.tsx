'use client';

import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { OrderBoard } from '@/components/admin/OrderBoard';

export default function OrdersPage() {
  const { isEnabled, enableNotification, playNotification } = useNotificationSound();
  const { newOrders, completedOrders, isLoading, completeOrder } = useRealtimeOrders({
    onNewOrder: playNotification,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">注文ダッシュボード</h1>
        {!isEnabled && (
          <button
            onClick={enableNotification}
            className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100"
          >
            通知を有効にする
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-gray-500">読み込み中...</div>
      ) : (
        <OrderBoard
          newOrders={newOrders}
          completedOrders={completedOrders}
          onComplete={completeOrder}
        />
      )}
    </div>
  );
}
