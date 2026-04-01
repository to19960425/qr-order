import { describe, it } from 'vitest';

describe('swapSortOrder', () => {
  describe('下方向への移動', () => {
    // 先頭アイテムを下に移動
    it.todo('index=0, direction=down の場合、0番目と1番目のsort_orderが入れ替わること');

    // 中間アイテムを下に移動
    it.todo('3件中index=1, direction=down の場合、1番目と2番目のsort_orderが入れ替わること');
  });

  describe('上方向への移動', () => {
    // 末尾アイテムを上に移動
    it.todo('index=末尾, direction=up の場合、末尾と末尾-1のsort_orderが入れ替わること');

    // 中間アイテムを上に移動
    it.todo('3件中index=1, direction=up の場合、1番目と0番目のsort_orderが入れ替わること');
  });

  describe('イミュータビリティ', () => {
    // 元の配列を変更しない
    it.todo('元の配列が変更されないこと');
  });

  describe('sort_order値の正確性', () => {
    // 連番でないsort_orderの入れ替え
    it.todo('sort_orderが連番でない場合(例: 0,5,10)でも、対象2件の値が正しく入れ替わること');
  });
});

describe('canMove', () => {
  describe('移動可能な場合', () => {
    // 中間アイテムは上下どちらも可能
    it.todo('3件中index=1, direction=up の場合、true が返ること');
    it.todo('3件中index=1, direction=down の場合、true が返ること');
  });

  describe('移動不可能な場合', () => {
    // 先頭の上移動
    it.todo('index=0, direction=up の場合、false が返ること');

    // 末尾の下移動
    it.todo('index=末尾, direction=down の場合、false が返ること');
  });

  describe('エッジケース', () => {
    // 0件
    it.todo('total=0 の場合、どの方向でも false が返ること');

    // 1件
    it.todo('total=1 の場合、どの方向でも false が返ること');

    // 2件の先頭は下のみ
    it.todo('total=2, index=0 の場合、down=true, up=false であること');

    // 2件の末尾は上のみ
    it.todo('total=2, index=1 の場合、up=true, down=false であること');
  });
});
