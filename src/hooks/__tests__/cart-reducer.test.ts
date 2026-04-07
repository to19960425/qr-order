import { describe, it } from 'vitest';

describe('cart-reducer', () => {
  describe('addItem', () => {
    describe('正常系', () => {
      // 新規アイテム追加の基本パス
      it.todo('カートが空の状態で新規アイテムを追加した時、quantity=1のアイテムが1件含まれる状態になること');
      // 別IDのアイテムを追加した時
      it.todo('既存アイテムと異なるmenu_item_idを追加した時、別エントリとして末尾に追加されること');
      // 既存アイテムへのインクリメント
      it.todo('既存のmenu_item_idを追加した時、該当エントリのquantityが+1されること');
      // 順序保持
      it.todo('既存アイテムを追加した時、配列内の並び順が保持されること');
      // スナップショット保存
      it.todo('新規アイテム追加時、name・price・image_urlがスナップショットとして保持されること');
    });

    describe('境界値', () => {
      // 同一アイテムを連続追加
      it.todo('同一menu_item_idを複数回連続追加した時、quantityが回数分加算されること');
    });

    describe('イミュータビリティ', () => {
      // 純粋関数として元の state を破壊しない
      it.todo('addItemを実行した時、引数のstate配列が変更されないこと');
    });
  });

  describe('decrementItem', () => {
    describe('正常系', () => {
      // 通常のデクリメント
      it.todo('quantityが2以上のアイテムをdecrementした時、quantityが-1されること');
    });

    describe('境界値', () => {
      // 0 になったら削除
      it.todo('quantityが1のアイテムをdecrementした時、該当アイテムがカートから削除されること');
      // 削除後に空になる
      it.todo('カートに1件しかないquantity=1のアイテムをdecrementした時、空配列になること');
    });

    describe('異常系', () => {
      // 存在しない ID
      it.todo('存在しないmenu_item_idをdecrementした時、stateが変化しないこと');
    });

    describe('イミュータビリティ', () => {
      it.todo('decrementItemを実行した時、引数のstate配列が変更されないこと');
    });
  });

  describe('removeItem', () => {
    describe('正常系', () => {
      // 通常の削除
      it.todo('指定menu_item_idのアイテムが存在する時、quantityに関わらず該当アイテムが削除されること');
      // 他アイテム保持
      it.todo('複数アイテムがある状態で1件削除した時、残りのアイテムは保持されること');
    });

    describe('異常系', () => {
      // 存在しない ID
      it.todo('存在しないmenu_item_idをremoveした時、stateが変化しないこと');
    });

    describe('イミュータビリティ', () => {
      it.todo('removeItemを実行した時、引数のstate配列が変更されないこと');
    });
  });

  describe('calcTotals', () => {
    describe('正常系', () => {
      // 単一アイテム
      it.todo('quantity=2、price=500のアイテム1件の時、totalQuantity=2、totalAmount=1000であること');
      // 複数アイテム
      it.todo('複数アイテムがある時、totalQuantityとtotalAmountがそれぞれの合計になること');
    });

    describe('境界値', () => {
      // 空カート
      it.todo('カートが空の時、totalQuantity=0、totalAmount=0であること');
      // 0円商品
      it.todo('price=0のアイテムが含まれる時、totalAmountに影響しないこと');
    });
  });
});
