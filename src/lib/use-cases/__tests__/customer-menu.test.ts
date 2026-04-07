import { describe, it } from 'vitest';

describe('getOrderPageData', () => {
  describe('テーブル取得', () => {
    // 正常系
    it.todo('有効なtokenを指定した時、該当テーブルとそのstoreのメニューが返ること');
    // 0 件
    it.todo('該当テーブルが見つからない時、kind="not_found"が返ること');
    // UUID形式でない
    it.todo('tokenがUUID形式でない時、kind="not_found"が返ること');
    // DB エラー
    it.todo('tables取得でDBエラーが発生した時、エラーがスローされること');
  });

  describe('営業状態の判定', () => {
    // is_active=false
    it.todo('tables.is_activeがfalseの時、kind="closed"とtable情報が返ること');
    // is_active=false の時はメニューを取得しない（不要なクエリ削減）
    it.todo('tables.is_activeがfalseの時、メニュー取得クエリが実行されないこと');
    // is_active=true
    it.todo('tables.is_activeがtrueの時、kind="open"でcategoriesとmenuItemsByCategoryが返ること');
  });

  describe('メニューフィルタ', () => {
    // is_available=true のみ
    it.todo('menu_itemsを取得する時、is_available=trueのアイテムのみが返ること');
    it.todo('is_available=falseのアイテムは、結果のmenuItemsByCategoryに含まれないこと');
    // store_id 絞り込み
    it.todo('テーブルのstore_idと一致するメニューのみが返ること');
  });

  describe('ソート', () => {
    // カテゴリ
    it.todo('categoriesがsort_order昇順で並んで返ること');
    // メニューアイテム
    it.todo('menuItemsByCategory内の各配列がsort_order昇順で並んで返ること');
  });

  describe('空カテゴリの扱い', () => {
    // 空カテゴリも保持
    it.todo('メニューが0件のカテゴリがある時、そのカテゴリもcategoriesに含まれること');
    it.todo('メニューが0件のカテゴリのcategoryIdは、menuItemsByCategoryで空配列にマップされること');
  });

  describe('境界値', () => {
    // カテゴリ 0 件
    it.todo('店舗にカテゴリが1件もない時、categoriesが空配列で返ること');
    // メニュー 0 件
    it.todo('店舗にメニューが1件もない時、menuItemsByCategoryのすべてのキーが空配列であること');
  });
});
