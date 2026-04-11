'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getTodayStartJST } from '@/lib/date-utils';

export type OrderWithItems = {
  id: string;
  store_id: string;
  table_id: string | null;
  order_number: number;
  status: 'new' | 'completed';
  total_amount: number;
  created_at: string;
  updated_at: string;
  order_items: {
    id: string;
    name: string;
    price: number;
    quantity: number;
  }[];
  tables: {
    table_number: number;
  };
};

const ORDER_SELECT = '*, order_items(*), tables!inner(table_number)';

type UseRealtimeOrdersOptions = {
  onNewOrder?: () => void;
};

export function useRealtimeOrders(options: UseRealtimeOrdersOptions = {}) {
  const { onNewOrder } = options;
  const onNewOrderRef = useRef(onNewOrder);
  onNewOrderRef.current = onNewOrder;

  const [newOrders, setNewOrders] = useState<OrderWithItems[]>([]);
  const [completedOrders, setCompletedOrders] = useState<OrderWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // completeOrder で同期的にアクセスするための ref
  const newOrdersRef = useRef<OrderWithItems[]>([]);
  const hasLoadedRef = useRef(false);

  const supabaseRef = useRef(createClient());

  const fetchAll = useCallback(async () => {
    const supabase = supabaseRef.current;
    const todayStart = getTodayStartJST().toISOString();

    const [newResult, completedResult] = await Promise.all([
      supabase
        .from('orders')
        .select(ORDER_SELECT)
        .eq('status', 'new')
        .order('created_at', { ascending: true }),
      supabase
        .from('orders')
        .select(ORDER_SELECT)
        .eq('status', 'completed')
        .gte('created_at', todayStart)
        .order('updated_at', { ascending: false }),
    ]);

    if (newResult.data) {
      const data = newResult.data as unknown as OrderWithItems[];
      newOrdersRef.current = data;
      setNewOrders(data);
    }
    if (completedResult.data) {
      setCompletedOrders(completedResult.data as unknown as OrderWithItems[]);
    }
    hasLoadedRef.current = true;
    setIsLoading(false);
  }, []);

  const fetchOrder = useCallback(async (orderId: string): Promise<OrderWithItems | null> => {
    const supabase = supabaseRef.current;
    const { data } = await supabase
      .from('orders')
      .select(ORDER_SELECT)
      .eq('id', orderId)
      .single();
    return (data as unknown as OrderWithItems) ?? null;
  }, []);

  useEffect(() => {
    fetchAll();

    const supabase = supabaseRef.current;
    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes' as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        { event: '*', schema: 'public', table: 'orders' },
        async (payload: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          const { eventType, new: newRecord } = payload;

          if (eventType === 'INSERT' && newRecord.status === 'new') {
            const fullOrder = await fetchOrder(newRecord.id);
            if (fullOrder) {
              setNewOrders((prev) => {
                if (prev.some((o) => o.id === fullOrder.id)) return prev;
                const next = [...prev, fullOrder];
                newOrdersRef.current = next;
                return next;
              });
              onNewOrderRef.current?.();
            }
          }

          if (eventType === 'UPDATE' && newRecord.status === 'completed') {
            // 除去前にリレーション付きデータを確保
            const fullOrder = newOrdersRef.current.find((o) => o.id === newRecord.id);

            setNewOrders((prev) => {
              const next = prev.filter((o) => o.id !== newRecord.id);
              newOrdersRef.current = next;
              return next;
            });
            setCompletedOrders((prev) => {
              // 楽観的更新済み（既に completedOrders にある）
              if (prev.some((o) => o.id === newRecord.id)) return prev;
              if (fullOrder) {
                return [{ ...fullOrder, status: 'completed' as const, updated_at: newRecord.updated_at }, ...prev];
              }
              return prev;
            });
          }
        },
      )
      .subscribe((status: string) => {
        // 再接続時のみ再取得（初回は fetchAll() で取得済み）
        if (status === 'SUBSCRIBED' && hasLoadedRef.current) {
          fetchAll();
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll, fetchOrder]);

  const completeOrder = useCallback(
    async (orderId: string) => {
      const orderToMove = newOrdersRef.current.find((o) => o.id === orderId);
      if (!orderToMove) return null;

      const completed: OrderWithItems = {
        ...orderToMove,
        status: 'completed',
        updated_at: new Date().toISOString(),
      };
      const nextNew = newOrdersRef.current.filter((o) => o.id !== orderId);
      newOrdersRef.current = nextNew;
      setNewOrders(nextNew);
      setCompletedOrders((prev) => [completed, ...prev]);

      const supabase = supabaseRef.current;
      const { error } = await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', orderId);

      if (error) {
        newOrdersRef.current = [...newOrdersRef.current, orderToMove];
        setNewOrders((prev) => [...prev, orderToMove]);
        setCompletedOrders((prev) => prev.filter((o) => o.id !== orderId));
        return error;
      }

      return null;
    },
    [],
  );

  return { newOrders, completedOrders, isLoading, completeOrder };
}
