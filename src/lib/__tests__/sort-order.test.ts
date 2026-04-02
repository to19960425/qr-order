import { describe, it, expect } from 'vitest';
import { swapSortOrder, canMove } from '../sort-order';

describe('swapSortOrder', () => {
  const items = [
    { id: 'a', sort_order: 0 },
    { id: 'b', sort_order: 1 },
    { id: 'c', sort_order: 2 },
  ];

  describe('下方向への移動', () => {
    // 先頭アイテムを下に移動
    it('index=0, direction=down の場合、0番目と1番目のsort_orderが入れ替わること', () => {
      const result = swapSortOrder(items, 0, 'down');

      expect(result[0].sort_order).toBe(1);
      expect(result[1].sort_order).toBe(0);
      expect(result[2].sort_order).toBe(2);
    });

    // 中間アイテムを下に移動
    it('3件中index=1, direction=down の場合、1番目と2番目のsort_orderが入れ替わること', () => {
      const result = swapSortOrder(items, 1, 'down');

      expect(result[0].sort_order).toBe(0);
      expect(result[1].sort_order).toBe(2);
      expect(result[2].sort_order).toBe(1);
    });
  });

  describe('上方向への移動', () => {
    // 末尾アイテムを上に移動
    it('index=末尾, direction=up の場合、末尾と末尾-1のsort_orderが入れ替わること', () => {
      const result = swapSortOrder(items, 2, 'up');

      expect(result[1].sort_order).toBe(2);
      expect(result[2].sort_order).toBe(1);
    });

    // 中間アイテムを上に移動
    it('3件中index=1, direction=up の場合、1番目と0番目のsort_orderが入れ替わること', () => {
      const result = swapSortOrder(items, 1, 'up');

      expect(result[0].sort_order).toBe(1);
      expect(result[1].sort_order).toBe(0);
    });
  });

  describe('イミュータビリティ', () => {
    // 元の配列を変更しない
    it('元の配列が変更されないこと', () => {
      const original = [
        { id: 'a', sort_order: 0 },
        { id: 'b', sort_order: 1 },
      ];
      const originalCopy = JSON.parse(JSON.stringify(original));

      swapSortOrder(original, 0, 'down');

      expect(original).toEqual(originalCopy);
    });
  });

  describe('sort_order値の正確性', () => {
    // 連番でないsort_orderの入れ替え
    it('sort_orderが連番でない場合(例: 0,5,10)でも、対象2件の値が正しく入れ替わること', () => {
      const gappedItems = [
        { id: 'a', sort_order: 0 },
        { id: 'b', sort_order: 5 },
        { id: 'c', sort_order: 10 },
      ];

      const result = swapSortOrder(gappedItems, 0, 'down');

      expect(result[0].sort_order).toBe(5);
      expect(result[1].sort_order).toBe(0);
      expect(result[2].sort_order).toBe(10);
    });
  });
});

describe('canMove', () => {
  describe('移動可能な場合', () => {
    // 中間アイテムは上下どちらも可能
    it('3件中index=1, direction=up の場合、true が返ること', () => {
      expect(canMove(1, 3, 'up')).toBe(true);
    });

    it('3件中index=1, direction=down の場合、true が返ること', () => {
      expect(canMove(1, 3, 'down')).toBe(true);
    });
  });

  describe('移動不可能な場合', () => {
    // 先頭の上移動
    it('index=0, direction=up の場合、false が返ること', () => {
      expect(canMove(0, 3, 'up')).toBe(false);
    });

    // 末尾の下移動
    it('index=末尾, direction=down の場合、false が返ること', () => {
      expect(canMove(2, 3, 'down')).toBe(false);
    });
  });

  describe('エッジケース', () => {
    // 0件
    it('total=0 の場合、どの方向でも false が返ること', () => {
      expect(canMove(0, 0, 'up')).toBe(false);
      expect(canMove(0, 0, 'down')).toBe(false);
    });

    // 1件
    it('total=1 の場合、どの方向でも false が返ること', () => {
      expect(canMove(0, 1, 'up')).toBe(false);
      expect(canMove(0, 1, 'down')).toBe(false);
    });

    // 2件の先頭は下のみ
    it('total=2, index=0 の場合、down=true, up=false であること', () => {
      expect(canMove(0, 2, 'down')).toBe(true);
      expect(canMove(0, 2, 'up')).toBe(false);
    });

    // 2件の末尾は上のみ
    it('total=2, index=1 の場合、up=true, down=false であること', () => {
      expect(canMove(1, 2, 'up')).toBe(true);
      expect(canMove(1, 2, 'down')).toBe(false);
    });
  });
});
