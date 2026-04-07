import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCart, storageKey } from '../useCart';
import type { CartItem } from '../cart-reducer';

const TOKEN = 'token-aaa';
const KEY = storageKey(TOKEN);

function makeItemInput(
  overrides: Partial<Omit<CartItem, 'quantity'>> = {},
): Omit<CartItem, 'quantity'> {
  return {
    menu_item_id: overrides.menu_item_id ?? 'item-1',
    name: overrides.name ?? 'カフェラテ',
    price: overrides.price ?? 650,
    image_url: overrides.image_url ?? null,
  };
}

function seed(token: string, items: CartItem[]) {
  window.localStorage.setItem(storageKey(token), JSON.stringify(items));
}

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  window.localStorage.clear();
});

describe('useCart', () => {
  describe('初期化・SSR対応', () => {
    it('マウント後のuseEffect内で、localStorageに保存されたカート状態が復元されること', () => {
      // Arrange
      const stored: CartItem[] = [
        {
          menu_item_id: 'item-1',
          name: 'カフェラテ',
          price: 650,
          quantity: 2,
          image_url: null,
        },
      ];
      seed(TOKEN, stored);

      // Act
      const { result } = renderHook(() => useCart(TOKEN));

      // Assert
      expect(result.current.items).toEqual(stored);
      expect(result.current.totalQuantity).toBe(2);
      expect(result.current.totalAmount).toBe(1300);
    });

    it('異なるtokenでフックを呼び出した時、ストレージキー「qr-order:cart:{token}」で別々に管理されること', () => {
      // Arrange
      seed('token-A', [
        { menu_item_id: 'a', name: 'A', price: 100, quantity: 1, image_url: null },
      ]);
      seed('token-B', [
        { menu_item_id: 'b', name: 'B', price: 200, quantity: 3, image_url: null },
      ]);

      // Act
      const { result: resultA } = renderHook(() => useCart('token-A'));
      const { result: resultB } = renderHook(() => useCart('token-B'));

      // Assert
      expect(resultA.current.items[0].menu_item_id).toBe('a');
      expect(resultB.current.items[0].menu_item_id).toBe('b');
      expect(window.localStorage.getItem('qr-order:cart:token-A')).not.toBeNull();
      expect(window.localStorage.getItem('qr-order:cart:token-B')).not.toBeNull();
    });
  });

  describe('localStorage 永続化', () => {
    it('addを実行した時、最新のカート状態がlocalStorageに書き込まれること', () => {
      // Arrange
      const { result } = renderHook(() => useCart(TOKEN));

      // Act
      act(() => {
        result.current.add(makeItemInput({ menu_item_id: 'item-1' }));
      });

      // Assert
      const stored = JSON.parse(window.localStorage.getItem(KEY) ?? '[]');
      expect(stored).toEqual([
        {
          menu_item_id: 'item-1',
          name: 'カフェラテ',
          price: 650,
          quantity: 1,
          image_url: null,
        },
      ]);
    });

    it('decrementを実行した時、最新のカート状態がlocalStorageに書き込まれること', () => {
      // Arrange
      seed(TOKEN, [
        { menu_item_id: 'item-1', name: 'A', price: 100, quantity: 3, image_url: null },
      ]);
      const { result } = renderHook(() => useCart(TOKEN));

      // Act
      act(() => {
        result.current.decrement('item-1');
      });

      // Assert
      const stored = JSON.parse(window.localStorage.getItem(KEY) ?? '[]');
      expect(stored[0].quantity).toBe(2);
    });

    it('removeを実行した時、最新のカート状態がlocalStorageに書き込まれること', () => {
      // Arrange
      seed(TOKEN, [
        { menu_item_id: 'item-1', name: 'A', price: 100, quantity: 3, image_url: null },
      ]);
      const { result } = renderHook(() => useCart(TOKEN));

      // Act
      act(() => {
        result.current.remove('item-1');
      });

      // Assert
      const stored = JSON.parse(window.localStorage.getItem(KEY) ?? '[]');
      expect(stored).toEqual([]);
    });

    it('clearを実行した時、localStorageの該当キーが空配列で更新されること', () => {
      // Arrange
      seed(TOKEN, [
        { menu_item_id: 'item-1', name: 'A', price: 100, quantity: 3, image_url: null },
      ]);
      const { result } = renderHook(() => useCart(TOKEN));

      // Act
      act(() => {
        result.current.clear();
      });

      // Assert
      const stored = JSON.parse(window.localStorage.getItem(KEY) ?? 'null');
      expect(stored).toEqual([]);
    });
  });

  describe('壊れた永続データのフォールバック', () => {
    it('localStorageに不正なJSONが保存されている時、空配列から開始すること', () => {
      // Arrange
      window.localStorage.setItem(KEY, '{not json');

      // Act
      const { result } = renderHook(() => useCart(TOKEN));

      // Assert
      expect(result.current.items).toEqual([]);
    });

    it('localStorageのデータがCartItemスキーマに合致しない時、空配列から開始すること', () => {
      // Arrange
      window.localStorage.setItem(
        KEY,
        JSON.stringify([{ name: 'A', price: 100, quantity: '3' }]),
      );

      // Act
      const { result } = renderHook(() => useCart(TOKEN));

      // Assert
      expect(result.current.items).toEqual([]);
    });
  });

  describe('localStorage 利用不可環境', () => {
    it('localStorage.setItemが例外を投げる時、エラーをスローせずメモリ上のstateで動作すること', () => {
      // Arrange
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      const { result } = renderHook(() => useCart(TOKEN));

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.add(makeItemInput({ menu_item_id: 'item-1' }));
        });
      }).not.toThrow();
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].menu_item_id).toBe('item-1');
    });

    it('localStorage.getItemが例外を投げる時、空配列から開始すること', () => {
      // Arrange
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });

      // Act
      const { result } = renderHook(() => useCart(TOKEN));

      // Assert
      expect(result.current.items).toEqual([]);
    });
  });

  describe('公開API', () => {
    it('カートに存在するmenu_item_idをgetQuantityで問い合わせた時、そのquantityが返ること', () => {
      // Arrange
      seed(TOKEN, [
        { menu_item_id: 'item-1', name: 'A', price: 100, quantity: 4, image_url: null },
      ]);
      const { result } = renderHook(() => useCart(TOKEN));

      // Act & Assert
      expect(result.current.getQuantity('item-1')).toBe(4);
    });

    it('カートに存在しないmenu_item_idをgetQuantityで問い合わせた時、0が返ること', () => {
      // Arrange
      const { result } = renderHook(() => useCart(TOKEN));

      // Act & Assert
      expect(result.current.getQuantity('nonexistent')).toBe(0);
    });

    it('itemsが更新された時、totalQuantityとtotalAmountが再計算されて返ること', () => {
      // Arrange
      const { result } = renderHook(() => useCart(TOKEN));

      // Act
      act(() => {
        result.current.add(makeItemInput({ menu_item_id: 'item-1', price: 500 }));
        result.current.add(makeItemInput({ menu_item_id: 'item-1', price: 500 }));
        result.current.add(makeItemInput({ menu_item_id: 'item-2', price: 300 }));
      });

      // Assert
      expect(result.current.totalQuantity).toBe(3);
      expect(result.current.totalAmount).toBe(1300);
    });
  });
});
