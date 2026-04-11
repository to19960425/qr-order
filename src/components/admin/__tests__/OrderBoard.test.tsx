import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { OrderBoard } from '../OrderBoard';
import type { OrderWithItems } from '@/hooks/useRealtimeOrders';

function makeOrder(overrides: Partial<OrderWithItems> = {}): OrderWithItems {
  return {
    id: 'order-1',
    store_id: 'store-1',
    table_id: 'table-1',
    order_number: 1,
    status: 'new',
    total_amount: 1000,
    created_at: '2026-04-09T05:00:00Z',
    updated_at: '2026-04-09T05:00:00Z',
    order_items: [
      { id: 'i1', name: 'カフェラテ', price: 500, quantity: 2 },
    ],
    tables: { table_number: 1 },
    ...overrides,
  };
}

const newOrder1 = makeOrder({ id: 'n1', order_number: 1, status: 'new', created_at: '2026-04-09T05:00:00Z' });
const newOrder2 = makeOrder({ id: 'n2', order_number: 2, status: 'new', created_at: '2026-04-09T06:00:00Z', tables: { table_number: 2 } });
const completedOrder1 = makeOrder({ id: 'c1', order_number: 3, status: 'completed', updated_at: '2026-04-09T05:30:00Z' });
const completedOrder2 = makeOrder({ id: 'c2', order_number: 4, status: 'completed', updated_at: '2026-04-09T06:30:00Z', tables: { table_number: 2 } });

describe('OrderBoard', () => {
  describe('2カラムレイアウト', () => {
    it('左カラムにstatus=newの注文が表示されること', () => {
      // Arrange & Act
      render(
        <OrderBoard
          newOrders={[newOrder1]}
          completedOrders={[]}
          onComplete={vi.fn()}
        />,
      );

      // Assert
      const leftColumn = screen.getByTestId('column-new');
      expect(within(leftColumn).getByText('#1')).toBeInTheDocument();
    });

    it('右カラムにstatus=completedの注文が表示されること', () => {
      // Arrange & Act
      render(
        <OrderBoard
          newOrders={[]}
          completedOrders={[completedOrder1]}
          onComplete={vi.fn()}
        />,
      );

      // Assert
      const rightColumn = screen.getByTestId('column-completed');
      expect(within(rightColumn).getByText('#3')).toBeInTheDocument();
    });

    it('左カラムの新規注文がcreated_at昇順で表示されること', () => {
      // Arrange & Act
      render(
        <OrderBoard
          newOrders={[newOrder1, newOrder2]}
          completedOrders={[]}
          onComplete={vi.fn()}
        />,
      );

      // Assert — props の順序がそのまま表示される（ソートはフック側の責務）
      const leftColumn = screen.getByTestId('column-new');
      const cards = within(leftColumn).getAllByText(/^#\d+$/);
      expect(cards[0].textContent).toBe('#1');
      expect(cards[1].textContent).toBe('#2');
    });

    it('右カラムの完了済み注文がupdated_at降順で表示されること', () => {
      // Arrange — completedOrder2 (updated later) を先に渡す
      render(
        <OrderBoard
          newOrders={[]}
          completedOrders={[completedOrder2, completedOrder1]}
          onComplete={vi.fn()}
        />,
      );

      // Assert
      const rightColumn = screen.getByTestId('column-completed');
      const cards = within(rightColumn).getAllByText(/^#\d+$/);
      expect(cards[0].textContent).toBe('#4');
      expect(cards[1].textContent).toBe('#3');
    });
  });

  describe('空状態', () => {
    it('新規注文が0件の場合、「新規注文はありません」のメッセージが表示されること', () => {
      // Arrange & Act
      render(
        <OrderBoard newOrders={[]} completedOrders={[completedOrder1]} onComplete={vi.fn()} />,
      );

      // Assert
      expect(screen.getByText('新規注文はありません')).toBeInTheDocument();
    });

    it('完了済み注文が0件の場合、「完了済みの注文はありません」のメッセージが表示されること', () => {
      // Arrange & Act
      render(
        <OrderBoard newOrders={[newOrder1]} completedOrders={[]} onComplete={vi.fn()} />,
      );

      // Assert
      expect(screen.getByText('完了済みの注文はありません')).toBeInTheDocument();
    });

    it('新規・完了済みともに0件の場合、両カラムに空状態メッセージが表示されること', () => {
      // Arrange & Act
      render(
        <OrderBoard newOrders={[]} completedOrders={[]} onComplete={vi.fn()} />,
      );

      // Assert
      expect(screen.getByText('新規注文はありません')).toBeInTheDocument();
      expect(screen.getByText('完了済みの注文はありません')).toBeInTheDocument();
    });
  });

  describe('カラムヘッダー', () => {
    it('左カラムに「新規注文」のヘッダーが表示されること', () => {
      // Arrange & Act
      render(
        <OrderBoard newOrders={[]} completedOrders={[]} onComplete={vi.fn()} />,
      );

      // Assert
      expect(screen.getByText('新規注文')).toBeInTheDocument();
    });

    it('右カラムに「完了済み」のヘッダーが表示されること', () => {
      // Arrange & Act
      render(
        <OrderBoard newOrders={[]} completedOrders={[]} onComplete={vi.fn()} />,
      );

      // Assert
      expect(screen.getByText('完了済み')).toBeInTheDocument();
    });
  });

  describe('ステータス変更時のカラム移動', () => {
    it('注文のステータスがcompletedに変わった時、左カラムから消え右カラムに表示されること', () => {
      // Arrange — 初回: 新規に1件
      const { rerender } = render(
        <OrderBoard newOrders={[newOrder1]} completedOrders={[]} onComplete={vi.fn()} />,
      );

      // Assert — 左カラムにある
      const leftBefore = screen.getByTestId('column-new');
      expect(within(leftBefore).getByText('#1')).toBeInTheDocument();

      // Act — ステータス変更後に再描画（新規→完了）
      const completedVersion = { ...newOrder1, status: 'completed' as const };
      rerender(
        <OrderBoard newOrders={[]} completedOrders={[completedVersion]} onComplete={vi.fn()} />,
      );

      // Assert — 右カラムに移動
      const leftAfter = screen.getByTestId('column-new');
      expect(within(leftAfter).queryByText('#1')).not.toBeInTheDocument();
      const rightAfter = screen.getByTestId('column-completed');
      expect(within(rightAfter).getByText('#1')).toBeInTheDocument();
    });
  });

  describe('複数注文の表示', () => {
    it('新規注文が複数ある場合、全件が左カラムに表示されること', () => {
      // Arrange & Act
      render(
        <OrderBoard newOrders={[newOrder1, newOrder2]} completedOrders={[]} onComplete={vi.fn()} />,
      );

      // Assert
      const leftColumn = screen.getByTestId('column-new');
      expect(within(leftColumn).getByText('#1')).toBeInTheDocument();
      expect(within(leftColumn).getByText('#2')).toBeInTheDocument();
    });

    it('完了済み注文が複数ある場合、全件が右カラムに表示されること', () => {
      // Arrange & Act
      render(
        <OrderBoard
          newOrders={[]}
          completedOrders={[completedOrder1, completedOrder2]}
          onComplete={vi.fn()}
        />,
      );

      // Assert
      const rightColumn = screen.getByTestId('column-completed');
      expect(within(rightColumn).getByText('#3')).toBeInTheDocument();
      expect(within(rightColumn).getByText('#4')).toBeInTheDocument();
    });
  });
});
