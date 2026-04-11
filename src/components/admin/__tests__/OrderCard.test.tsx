import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderCard } from '../OrderCard';
import type { OrderWithItems } from '@/hooks/useRealtimeOrders';

function makeOrder(overrides: Partial<OrderWithItems> = {}): OrderWithItems {
  return {
    id: 'order-1',
    store_id: 'store-1',
    table_id: 'table-1',
    order_number: 45,
    status: 'new',
    total_amount: 1850,
    created_at: '2026-04-09T05:32:00Z', // JST 14:32
    updated_at: '2026-04-09T05:32:00Z',
    order_items: [
      { id: 'i1', name: 'カフェラテ', price: 500, quantity: 2 },
      { id: 'i2', name: 'チーズケーキ', price: 850, quantity: 1 },
    ],
    tables: { table_number: 3 },
    ...overrides,
  };
}

describe('OrderCard', () => {
  describe('表示項目', () => {
    it('注文番号が「#」付きで表示されること', () => {
      // Arrange & Act
      render(<OrderCard order={makeOrder()} />);

      // Assert
      expect(screen.getByText('#45')).toBeInTheDocument();
    });

    it('テーブル番号が「テーブル N」の形式で表示されること', () => {
      // Arrange & Act
      render(<OrderCard order={makeOrder()} />);

      // Assert
      expect(screen.getByText('テーブル 3')).toBeInTheDocument();
    });

    it('注文時刻がJST変換されたHH:mm形式で表示されること', () => {
      // Arrange & Act — UTC 05:32 = JST 14:32
      render(<OrderCard order={makeOrder()} />);

      // Assert
      expect(screen.getByText('14:32')).toBeInTheDocument();
    });

    it('注文内容が「品名 x数量」の形式で全アイテム分表示されること', () => {
      // Arrange & Act
      render(<OrderCard order={makeOrder()} />);

      // Assert
      expect(screen.getByText('カフェラテ x2')).toBeInTheDocument();
      expect(screen.getByText('チーズケーキ x1')).toBeInTheDocument();
    });

    it('合計金額が「¥」付きカンマ区切りで表示されること', () => {
      // Arrange & Act
      render(<OrderCard order={makeOrder()} />);

      // Assert
      expect(screen.getByText('¥1,850')).toBeInTheDocument();
    });
  });

  describe('新規注文カード', () => {
    it('status=newの場合、[完了にする]ボタンが表示されること', () => {
      // Arrange & Act
      render(<OrderCard order={makeOrder({ status: 'new' })} />);

      // Assert
      expect(screen.getByRole('button', { name: '完了にする' })).toBeInTheDocument();
    });

    it('status=newの場合、完了時刻が表示されないこと', () => {
      // Arrange & Act
      render(<OrderCard order={makeOrder({ status: 'new' })} />);

      // Assert — 「完了 HH:mm」形式のテキストが存在しないこと
      expect(screen.queryByText(/完了 \d{2}:\d{2}/)).not.toBeInTheDocument();
    });
  });

  describe('完了済みカード', () => {
    it('status=completedの場合、完了時刻がHH:mm形式で表示されること', () => {
      // Arrange — updated_at UTC 05:45 = JST 14:45
      const order = makeOrder({
        status: 'completed',
        updated_at: '2026-04-09T05:45:00Z',
      });

      // Act
      render(<OrderCard order={order} />);

      // Assert
      expect(screen.getByText(/完了 14:45/)).toBeInTheDocument();
    });

    it('status=completedの場合、[完了にする]ボタンが表示されないこと', () => {
      // Arrange & Act
      render(<OrderCard order={makeOrder({ status: 'completed' })} />);

      // Assert
      expect(screen.queryByRole('button', { name: '完了にする' })).not.toBeInTheDocument();
    });

    it('status=completedの場合、グレーアウト等の区別スタイルが適用されること', () => {
      // Arrange & Act
      const { container } = render(
        <OrderCard order={makeOrder({ status: 'completed' })} />,
      );

      // Assert — opacity or bg-gray 等のクラスで区別
      const card = container.firstElementChild;
      expect(card?.className).toMatch(/opacity|gray/);
    });
  });

  describe('ステータス変更操作', () => {
    it('[完了にする]ボタンタップ時、確認ダイアログが表示されること', async () => {
      // Arrange
      const spy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      render(<OrderCard order={makeOrder()} onComplete={vi.fn()} />);

      // Act
      await userEvent.click(screen.getByRole('button', { name: '完了にする' }));

      // Assert
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('確認ダイアログに「注文 #N を完了にしますか？」と表示されること', async () => {
      // Arrange
      const spy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      render(<OrderCard order={makeOrder({ order_number: 45 })} onComplete={vi.fn()} />);

      // Act
      await userEvent.click(screen.getByRole('button', { name: '完了にする' }));

      // Assert
      expect(spy).toHaveBeenCalledWith('注文 #45 を完了にしますか？');
      spy.mockRestore();
    });

    it('確認ダイアログでキャンセルした場合、ステータス変更が実行されないこと', async () => {
      // Arrange
      const spy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      const onComplete = vi.fn();
      render(<OrderCard order={makeOrder()} onComplete={onComplete} />);

      // Act
      await userEvent.click(screen.getByRole('button', { name: '完了にする' }));

      // Assert
      expect(onComplete).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('確認ダイアログで確認した場合、onCompleteコールバックが注文IDと共に呼ばれること', async () => {
      // Arrange
      const spy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      const onComplete = vi.fn();
      render(<OrderCard order={makeOrder({ id: 'order-99' })} onComplete={onComplete} />);

      // Act
      await userEvent.click(screen.getByRole('button', { name: '完了にする' }));

      // Assert
      expect(onComplete).toHaveBeenCalledWith('order-99');
      spy.mockRestore();
    });
  });

  describe('時刻のJST変換', () => {
    it('UTCのcreated_atがJST（UTC+9）に変換されてHH:mm形式で表示されること', () => {
      // Arrange — UTC 03:15 = JST 12:15
      const order = makeOrder({ created_at: '2026-04-09T03:15:00Z' });

      // Act
      render(<OrderCard order={order} />);

      // Assert
      expect(screen.getByText('12:15')).toBeInTheDocument();
    });

    it('UTCで日付を跨ぐ時刻（例: UTC 15:00 → JST 0:00）が正しく変換されること', () => {
      // Arrange — UTC 15:00 = JST 翌日 0:00
      const order = makeOrder({ created_at: '2026-04-08T15:00:00Z' });

      // Act
      render(<OrderCard order={order} />);

      // Assert
      expect(screen.getByText('00:00')).toBeInTheDocument();
    });
  });

  describe('エッジケース', () => {
    it('order_itemsが1件の場合、正しく表示されること', () => {
      // Arrange
      const order = makeOrder({
        order_items: [{ id: 'i1', name: 'エスプレッソ', price: 350, quantity: 1 }],
      });

      // Act
      render(<OrderCard order={order} />);

      // Assert
      expect(screen.getByText('エスプレッソ x1')).toBeInTheDocument();
    });

    it('order_itemsが複数件の場合、全件が表示されること', () => {
      // Arrange
      const order = makeOrder({
        order_items: [
          { id: 'i1', name: 'A', price: 100, quantity: 1 },
          { id: 'i2', name: 'B', price: 200, quantity: 2 },
          { id: 'i3', name: 'C', price: 300, quantity: 3 },
        ],
      });

      // Act
      render(<OrderCard order={order} />);

      // Assert
      expect(screen.getByText('A x1')).toBeInTheDocument();
      expect(screen.getByText('B x2')).toBeInTheDocument();
      expect(screen.getByText('C x3')).toBeInTheDocument();
    });

    it('合計金額が0円の場合、「¥0」と表示されること', () => {
      // Arrange
      render(<OrderCard order={makeOrder({ total_amount: 0 })} />);

      // Assert
      expect(screen.getByText('¥0')).toBeInTheDocument();
    });

    it('合計金額が100,000円の場合、「¥100,000」と正しくカンマ区切り表示されること', () => {
      // Arrange
      render(<OrderCard order={makeOrder({ total_amount: 100000 })} />);

      // Assert
      expect(screen.getByText('¥100,000')).toBeInTheDocument();
    });
  });
});
