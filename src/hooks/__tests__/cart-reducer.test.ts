import { describe, it, expect } from 'vitest';
import {
  addItem,
  decrementItem,
  removeItem,
  calcTotals,
  type CartItem,
  type CartState,
} from '../cart-reducer';

function makeItemInput(
  overrides: Partial<Omit<CartItem, 'quantity'>> = {},
): Omit<CartItem, 'quantity'> {
  return {
    menu_item_id: overrides.menu_item_id ?? 'item-1',
    name: overrides.name ?? 'カフェラテ',
    price: overrides.price ?? 650,
    image_url: overrides.image_url ?? 'https://example.com/latte.jpg',
  };
}

function makeCartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    menu_item_id: overrides.menu_item_id ?? 'item-1',
    name: overrides.name ?? 'カフェラテ',
    price: overrides.price ?? 650,
    quantity: overrides.quantity ?? 1,
    image_url: overrides.image_url ?? 'https://example.com/latte.jpg',
  };
}

describe('cart-reducer', () => {
  describe('addItem', () => {
    describe('正常系', () => {
      it('カートが空の状態で新規アイテムを追加した時、quantity=1のアイテムが1件含まれる状態になること', () => {
        // Arrange
        const state: CartState = [];
        const input = makeItemInput({ menu_item_id: 'item-1' });

        // Act
        const result = addItem(state, input);

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({ ...input, quantity: 1 });
      });

      it('既存アイテムと異なるmenu_item_idを追加した時、別エントリとして末尾に追加されること', () => {
        // Arrange
        const state: CartState = [makeCartItem({ menu_item_id: 'item-1' })];
        const input = makeItemInput({ menu_item_id: 'item-2', name: '紅茶' });

        // Act
        const result = addItem(state, input);

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0].menu_item_id).toBe('item-1');
        expect(result[1]).toEqual({ ...input, quantity: 1 });
      });

      it('既存のmenu_item_idを追加した時、該当エントリのquantityが+1されること', () => {
        // Arrange
        const state: CartState = [
          makeCartItem({ menu_item_id: 'item-1', quantity: 2 }),
        ];

        // Act
        const result = addItem(state, makeItemInput({ menu_item_id: 'item-1' }));

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].quantity).toBe(3);
      });

      it('既存アイテムを追加した時、配列内の並び順が保持されること', () => {
        // Arrange
        const state: CartState = [
          makeCartItem({ menu_item_id: 'item-1' }),
          makeCartItem({ menu_item_id: 'item-2' }),
          makeCartItem({ menu_item_id: 'item-3' }),
        ];

        // Act
        const result = addItem(state, makeItemInput({ menu_item_id: 'item-2' }));

        // Assert
        expect(result.map((i) => i.menu_item_id)).toEqual([
          'item-1',
          'item-2',
          'item-3',
        ]);
      });

      it('新規アイテム追加時、name・price・image_urlがスナップショットとして保持されること', () => {
        // Arrange
        const state: CartState = [];
        const input = makeItemInput({
          menu_item_id: 'item-1',
          name: 'カフェラテ',
          price: 650,
          image_url: 'https://example.com/latte.jpg',
        });

        // Act
        const result = addItem(state, input);

        // Assert
        expect(result[0].name).toBe('カフェラテ');
        expect(result[0].price).toBe(650);
        expect(result[0].image_url).toBe('https://example.com/latte.jpg');
      });
    });

    describe('境界値', () => {
      it('同一menu_item_idを複数回連続追加した時、quantityが回数分加算されること', () => {
        // Arrange
        const input = makeItemInput({ menu_item_id: 'item-1' });

        // Act
        let state: CartState = [];
        state = addItem(state, input);
        state = addItem(state, input);
        state = addItem(state, input);
        state = addItem(state, input);

        // Assert
        expect(state).toHaveLength(1);
        expect(state[0].quantity).toBe(4);
      });
    });

    describe('イミュータビリティ', () => {
      it('addItemを実行した時、引数のstate配列が変更されないこと', () => {
        // Arrange
        const original: CartState = [
          makeCartItem({ menu_item_id: 'item-1', quantity: 1 }),
        ];
        const snapshot = JSON.parse(JSON.stringify(original));

        // Act
        addItem(original, makeItemInput({ menu_item_id: 'item-1' }));
        addItem(original, makeItemInput({ menu_item_id: 'item-2' }));

        // Assert
        expect(original).toEqual(snapshot);
      });
    });
  });

  describe('decrementItem', () => {
    describe('正常系', () => {
      it('quantityが2以上のアイテムをdecrementした時、quantityが-1されること', () => {
        // Arrange
        const state: CartState = [
          makeCartItem({ menu_item_id: 'item-1', quantity: 3 }),
        ];

        // Act
        const result = decrementItem(state, 'item-1');

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].quantity).toBe(2);
      });
    });

    describe('境界値', () => {
      it('quantityが1のアイテムをdecrementした時、該当アイテムがカートから削除されること', () => {
        // Arrange
        const state: CartState = [
          makeCartItem({ menu_item_id: 'item-1', quantity: 1 }),
          makeCartItem({ menu_item_id: 'item-2', quantity: 2 }),
        ];

        // Act
        const result = decrementItem(state, 'item-1');

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].menu_item_id).toBe('item-2');
      });

      it('カートに1件しかないquantity=1のアイテムをdecrementした時、空配列になること', () => {
        // Arrange
        const state: CartState = [
          makeCartItem({ menu_item_id: 'item-1', quantity: 1 }),
        ];

        // Act
        const result = decrementItem(state, 'item-1');

        // Assert
        expect(result).toEqual([]);
      });
    });

    describe('異常系', () => {
      it('存在しないmenu_item_idをdecrementした時、stateが変化しないこと', () => {
        // Arrange
        const state: CartState = [
          makeCartItem({ menu_item_id: 'item-1', quantity: 2 }),
        ];

        // Act
        const result = decrementItem(state, 'nonexistent');

        // Assert
        expect(result).toEqual(state);
      });
    });

    describe('イミュータビリティ', () => {
      it('decrementItemを実行した時、引数のstate配列が変更されないこと', () => {
        // Arrange
        const original: CartState = [
          makeCartItem({ menu_item_id: 'item-1', quantity: 2 }),
          makeCartItem({ menu_item_id: 'item-2', quantity: 1 }),
        ];
        const snapshot = JSON.parse(JSON.stringify(original));

        // Act
        decrementItem(original, 'item-1');
        decrementItem(original, 'item-2');

        // Assert
        expect(original).toEqual(snapshot);
      });
    });
  });

  describe('removeItem', () => {
    describe('正常系', () => {
      it('指定menu_item_idのアイテムが存在する時、quantityに関わらず該当アイテムが削除されること', () => {
        // Arrange
        const state: CartState = [
          makeCartItem({ menu_item_id: 'item-1', quantity: 5 }),
        ];

        // Act
        const result = removeItem(state, 'item-1');

        // Assert
        expect(result).toEqual([]);
      });

      it('複数アイテムがある状態で1件削除した時、残りのアイテムは保持されること', () => {
        // Arrange
        const state: CartState = [
          makeCartItem({ menu_item_id: 'item-1' }),
          makeCartItem({ menu_item_id: 'item-2' }),
          makeCartItem({ menu_item_id: 'item-3' }),
        ];

        // Act
        const result = removeItem(state, 'item-2');

        // Assert
        expect(result.map((i) => i.menu_item_id)).toEqual(['item-1', 'item-3']);
      });
    });

    describe('異常系', () => {
      it('存在しないmenu_item_idをremoveした時、stateが変化しないこと', () => {
        // Arrange
        const state: CartState = [
          makeCartItem({ menu_item_id: 'item-1' }),
        ];

        // Act
        const result = removeItem(state, 'nonexistent');

        // Assert
        expect(result).toEqual(state);
      });
    });

    describe('イミュータビリティ', () => {
      it('removeItemを実行した時、引数のstate配列が変更されないこと', () => {
        // Arrange
        const original: CartState = [
          makeCartItem({ menu_item_id: 'item-1' }),
          makeCartItem({ menu_item_id: 'item-2' }),
        ];
        const snapshot = JSON.parse(JSON.stringify(original));

        // Act
        removeItem(original, 'item-1');

        // Assert
        expect(original).toEqual(snapshot);
      });
    });
  });

  describe('calcTotals', () => {
    describe('正常系', () => {
      it('quantity=2、price=500のアイテム1件の時、totalQuantity=2、totalAmount=1000であること', () => {
        // Arrange
        const state: CartState = [
          makeCartItem({ price: 500, quantity: 2 }),
        ];

        // Act
        const result = calcTotals(state);

        // Assert
        expect(result).toEqual({ totalQuantity: 2, totalAmount: 1000 });
      });

      it('複数アイテムがある時、totalQuantityとtotalAmountがそれぞれの合計になること', () => {
        // Arrange
        const state: CartState = [
          makeCartItem({ menu_item_id: 'a', price: 500, quantity: 2 }), // 1000
          makeCartItem({ menu_item_id: 'b', price: 300, quantity: 3 }), // 900
          makeCartItem({ menu_item_id: 'c', price: 1200, quantity: 1 }), // 1200
        ];

        // Act
        const result = calcTotals(state);

        // Assert
        expect(result).toEqual({ totalQuantity: 6, totalAmount: 3100 });
      });
    });

    describe('境界値', () => {
      it('カートが空の時、totalQuantity=0、totalAmount=0であること', () => {
        // Act
        const result = calcTotals([]);

        // Assert
        expect(result).toEqual({ totalQuantity: 0, totalAmount: 0 });
      });

      it('price=0のアイテムが含まれる時、totalAmountに影響しないこと', () => {
        // Arrange
        const state: CartState = [
          makeCartItem({ menu_item_id: 'a', price: 500, quantity: 2 }),
          makeCartItem({ menu_item_id: 'b', price: 0, quantity: 5 }),
        ];

        // Act
        const result = calcTotals(state);

        // Assert
        expect(result.totalAmount).toBe(1000);
        expect(result.totalQuantity).toBe(7);
      });
    });
  });
});
