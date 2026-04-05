import { describe, it } from 'vitest';

describe('tables UseCase', () => {
  describe('getTables', () => {
    describe('正常系', () => {
      // テーブル一覧が正しい順序で返ることの検証
      it.todo('テーブルが複数存在する場合、table_number昇順で返ること');

      // データが存在しない場合の検証
      it.todo('テーブルが0件の場合、空配列が返ること');

      // 取得されるデータのスコープ検証
      it.todo('自店舗のテーブルのみが返ること');
    });

    describe('異常系', () => {
      // DBエラー時の振る舞い検証
      it.todo('Supabaseからエラーが返された場合、エラーが返ること');
    });
  });

  describe('createTable', () => {
    describe('正常系', () => {
      // 基本的なテーブル作成の検証
      it.todo('テーブルが追加され、is_activeがtrueで作成されること');

      // 自動採番ロジックの検証
      it.todo('既存テーブルの最大番号+1が新しいテーブル番号になること');

      // トークン生成の検証
      it.todo('トークンがUUID v4形式で自動生成されること');

      // store_idの設定検証
      it.todo('getStoreId()で取得した店舗IDがセットされること');
    });

    describe('境界値', () => {
      // 初回作成時の採番検証
      it.todo('テーブルが0件の場合、テーブル番号1で作成されること');

      // 欠番がある場合の採番検証（仕様: 欠番を許容し最大番号+1）
      it.todo('テーブル番号に欠番がある場合（1,3,5）、最大番号+1（6）で採番されること');
    });

    describe('異常系', () => {
      // DB INSERT失敗時の検証
      it.todo('INSERT時にSupabaseエラーが発生した場合、エラーが返ること');
    });
  });

  describe('deleteTable', () => {
    describe('正常系', () => {
      // 基本的な削除の検証
      it.todo('指定したIDのテーブルが削除されること');
    });

    describe('異常系', () => {
      // 存在しないテーブルの削除
      it.todo('存在しないIDを指定した場合、エラーが返ること');

      // DB DELETE失敗時の検証
      it.todo('DELETE時にSupabaseエラーが発生した場合、エラーが返ること');
    });
  });

  describe('toggleTableStatus', () => {
    describe('正常系', () => {
      // オープン→クローズの切り替え検証
      it.todo('is_activeがtrueのテーブルをトグルした場合、falseに更新されること');

      // クローズ→オープンの切り替え検証
      it.todo('is_activeがfalseのテーブルをトグルした場合、trueに更新されること');
    });

    describe('異常系', () => {
      // 存在しないテーブルのトグル
      it.todo('存在しないIDを指定した場合、エラーが返ること');

      // DB UPDATE失敗時の検証
      it.todo('UPDATE時にSupabaseエラーが発生した場合、エラーが返ること');
    });
  });
});
