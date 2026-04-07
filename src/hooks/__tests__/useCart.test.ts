import { describe, it } from 'vitest';

describe('useCart', () => {
  describe('初期化・SSR対応', () => {
    // hydration mismatch 回避
    it.todo('初回レンダリング時、localStorageを参照せず空配列を返すこと');
    // マウント後の復元
    it.todo('マウント後のuseEffect内で、localStorageに保存されたカート状態が復元されること');
    // tokenごとの分離
    it.todo('異なるtokenでフックを呼び出した時、ストレージキー「qr-order:cart:{token}」で別々に管理されること');
  });

  describe('localStorage 永続化', () => {
    // add/decrement/remove/clear 後の永続化
    it.todo('addを実行した時、最新のカート状態がlocalStorageに書き込まれること');
    it.todo('decrementを実行した時、最新のカート状態がlocalStorageに書き込まれること');
    it.todo('removeを実行した時、最新のカート状態がlocalStorageに書き込まれること');
    it.todo('clearを実行した時、localStorageの該当キーが空配列で更新されること');
  });

  describe('壊れた永続データのフォールバック', () => {
    // 不正 JSON
    it.todo('localStorageに不正なJSONが保存されている時、空配列から開始すること');
    // スキーマ不整合
    it.todo('localStorageのデータがCartItemスキーマに合致しない時、空配列から開始すること');
  });

  describe('localStorage 利用不可環境', () => {
    // プライベートモード等
    it.todo('localStorage.setItemが例外を投げる時、エラーをスローせずメモリ上のstateで動作すること');
    it.todo('localStorage.getItemが例外を投げる時、空配列から開始すること');
  });

  describe('公開API', () => {
    // getQuantity
    it.todo('カートに存在するmenu_item_idをgetQuantityで問い合わせた時、そのquantityが返ること');
    it.todo('カートに存在しないmenu_item_idをgetQuantityで問い合わせた時、0が返ること');
    // 集計値
    it.todo('itemsが更新された時、totalQuantityとtotalAmountが再計算されて返ること');
  });
});
