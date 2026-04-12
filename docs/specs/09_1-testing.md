# Step 09: テスト仕様書

## 概要・目的

既存の単体テスト群を補完し、E2Eテスト（Playwright）を新規追加することで、注文フロー・管理画面フローの品質を担保する。

### 現状の既存テスト

| ファイル | カバー範囲 |
|---------|-----------|
| `src/hooks/__tests__/useCart.test.ts` | カートフック全般（追加・削除・数量・合計・永続化・トークン分離） |
| `src/hooks/__tests__/cart-reducer.test.ts` | カートリデューサー（純粋関数テスト） |
| `src/hooks/__tests__/useRealtimeOrders.test.ts` | リアルタイム注文フック |
| `src/hooks/__tests__/useNotificationSound.test.ts` | 通知音フック |
| `src/lib/__tests__/date-utils.test.ts` | 日付ユーティリティ |
| `src/lib/__tests__/sort-order.test.ts` | ソート順ユーティリティ |
| `src/lib/validations/__tests__/menu.test.ts` | メニューバリデーション |
| `src/lib/validations/__tests__/image.test.ts` | 画像バリデーション |
| `src/lib/use-cases/__tests__/tables.test.ts` | テーブルUseCase |
| `src/lib/use-cases/__tests__/customer-menu.test.ts` | お客様メニューUseCase |
| `src/lib/use-cases/__tests__/customer-cart.test.ts` | お客様カートUseCase |
| `src/components/admin/__tests__/OrderCard.test.tsx` | 注文カードコンポーネント |
| `src/components/admin/__tests__/OrderBoard.test.tsx` | 注文ボードコンポーネント |
| `e2e/auth.spec.ts` | 管理画面認証フロー（ログイン・ナビゲーション・ログアウト） |

### 本ステップで実装する差分

Step 09のタスクリストに対して、以下が未実装：

| タスク | ステータス | 対応 |
|-------|----------|------|
| 9.1 useCart フック | 完了済み | 対応不要 |
| 9.2 utils.test.ts（formatPrice） | **未実装** | 新規作成 |
| 9.3 コンポーネントテスト | スキップ | E2Eでカバー（OrderCardは既存） |
| 9.4 E2E: 注文フロー | **未実装** | 新規作成 |
| 9.5 E2E: 管理画面フロー | **一部実装済み** | 注文ダッシュボード + メニュー管理を新規作成 |

---

## 機能要件（詳細）

### 1. 単体テスト: `formatPrice` 関数

**対象:** `src/lib/utils.ts` の `formatPrice(price: number): string`

```typescript
// 現在の実装
export function formatPrice(price: number): string {
  return `¥${price.toLocaleString("ja-JP")}`
}
```

**テストケース:**

| # | ケース | 入力 | 期待値 |
|---|-------|------|--------|
| 1 | 通常の価格 | `650` | `"¥650"` |
| 2 | 千以上（カンマ区切り） | `1850` | `"¥1,850"` |
| 3 | ゼロ | `0` | `"¥0"` |
| 4 | 大きな数値 | `100000` | `"¥100,000"` |

### 2. E2Eテスト: 注文フロー（`e2e/order-flow.spec.ts`）

お客様がQRコードからメニュー閲覧→カート追加→注文確定するフローをテストする。

#### 2.1 データ準備

- **globalSetup** でSupabase JSクライアント経由でテスト用データを投入
  - テスト用のアクティブなテーブル（`is_active: true`）を1件作成
  - テスト用のカテゴリを2件（例: 「ドリンク」「フード」）作成
  - テスト用のメニューアイテムを各カテゴリに2件ずつ作成
- **globalTeardown** でテストデータを削除（テスト用データのIDプレフィックスで識別）
- テスト用のテーブルトークン（UUID）は `.env.test` に定数として保持、またはglobalSetupで生成してファイル経由で受け渡す

#### 2.2 テストケース

| # | テスト名 | 操作 | 期待結果 |
|---|---------|------|---------|
| 1 | メニュー画面にアクセスし、メニューが表示される | `/order/{token}` にアクセス | メニューアイテムが表示される |
| 2 | カテゴリタブで絞り込みができる | カテゴリタブをクリック | 該当カテゴリのメニューのみ表示される |
| 3 | メニューをカートに追加できる | 「+」ボタンをクリック | FloatingCartBarに点数・金額が反映される |
| 4 | カート画面で数量変更ができる | カートバーをクリック→数量変更 | 数量・金額が更新される |
| 5 | 注文を確定し、完了画面が表示される | 「注文を確定する」→確認ダイアログで確定 | `/order/{token}/complete` に遷移し「注文を受け付けました」が表示される |
| 6 | 追加注文でメニュー画面に戻れる | 「メニューに戻る」リンクをクリック | `/order/{token}` に遷移する |

#### 2.3 注意事項

- 各テストは独立して実行可能にする（ただしフロー全体を1つの `test.describe` にまとめ、`serial` モードで順次実行するのは可）
- localStorageのカート状態はテストごとにクリアする
- 無効なトークンでアクセスした場合のテスト（「注文を受け付けていません」の表示）も含める

### 3. E2Eテスト: 管理画面フロー（`e2e/admin-flow.spec.ts`）

#### 3.1 認証

- `.env.test` の `TEST_ADMIN_EMAIL` / `TEST_ADMIN_PASSWORD` を使用して実ログイン
- `test.beforeEach` でログイン処理を共通化（`e2e/auth.spec.ts` と同パターン）

#### 3.2 注文ダッシュボードテスト

| # | テスト名 | 操作 | 期待結果 |
|---|---------|------|---------|
| 1 | 注文ダッシュボードが表示される | `/admin/orders` に遷移 | 「注文ダッシュボード」見出し、「新規注文」「完了済み」カラムが表示される |
| 2 | 注文を完了にできる | 新規注文の「完了にする」→確認ダイアログで確定 | 注文が「完了済み」カラムに移動する |

**前提:** 注文ダッシュボードテスト用の注文データは globalSetup のシードで投入する。

#### 3.3 メニュー管理テスト

| # | テスト名 | 操作 | 期待結果 |
|---|---------|------|---------|
| 1 | メニュー一覧が表示される | `/admin/menu` に遷移 | 既存メニューアイテムが表示される |
| 2 | メニューを追加できる | 追加フォームに入力→保存 | 新しいメニューが一覧に表示される |
| 3 | メニューを編集できる | 既存メニューの編集→保存 | 変更後の内容が表示される |
| 4 | メニューを削除できる | メニューの削除ボタン→確認 | メニューが一覧から消える |

**注意:** メニュー管理テストで作成したデータはテスト内でクリーンアップする（テスト後に削除）。

---

## 技術的な実装方針

### テスト基盤（設定済み）

- **Vitest**: `vitest.config.ts` で jsdom 環境、`@testing-library/jest-dom` 設定済み
- **Playwright**: `playwright.config.ts` で Chromium、`.env.test` 読み込み、dev サーバー自動起動設定済み

### E2Eシードデータ戦略

```
playwright.config.ts
├── globalSetup: e2e/global-setup.ts
│   ├── Supabase クライアント初期化（service_role key）
│   ├── テスト用テーブル作成（is_active: true）
│   ├── テスト用カテゴリ・メニューアイテム作成
│   ├── テスト用注文データ作成（注文ダッシュボード用）
│   └── テスト用トークンをファイル（e2e/.test-data.json）に書き出し
└── globalTeardown: e2e/global-teardown.ts
    └── テスト用データを削除
```

- シードデータには識別用のプレフィックス（例: `[E2E]`）を名前に付与し、クリーンアップを容易にする
- `e2e/.test-data.json` はテスト間でテーブルトークンやIDを共有するためのファイル（`.gitignore` に追加）
- Supabase の **service_role key** を `.env.test` に追加し、RLSをバイパスしてデータ投入する

### 環境変数（`.env.test` に追加が必要）

```
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
TEST_STORE_ID=<store_id>
```

### テスト間の独立性

- 各テストファイル（`order-flow.spec.ts` / `admin-flow.spec.ts`）は独立して実行可能
- 両方ともglobalSetupで投入されたシードデータを使用するが、相互に依存しない
- 注文フローテストが作成する注文と、管理画面テストが使用する注文は別データ

---

## 対象ファイル一覧

| ファイル | 操作 | 変更内容 |
|---------|------|---------|
| `src/lib/__tests__/utils.test.ts` | **新規** | `formatPrice` の単体テスト |
| `e2e/order-flow.spec.ts` | **新規** | お客様側注文フローE2Eテスト |
| `e2e/admin-flow.spec.ts` | **新規** | 管理画面（注文ダッシュボード + メニュー管理）E2Eテスト |
| `e2e/global-setup.ts` | **新規** | E2Eテスト用シードデータ投入 |
| `e2e/global-teardown.ts` | **新規** | E2Eテスト用データクリーンアップ |
| `playwright.config.ts` | **変更** | globalSetup / globalTeardown の設定追加 |
| `.env.test` | **変更** | `SUPABASE_SERVICE_ROLE_KEY`、`TEST_STORE_ID` を追加 |
| `.gitignore` | **変更** | `e2e/.test-data.json` を追加 |

---

## MVPスコープ

### 含める

- `formatPrice` の単体テスト
- 注文フローE2E（メニュー表示→カート→注文確定→完了→追加注文）
- 管理画面E2E（注文ダッシュボード表示・完了操作、メニューCRUD）
- E2Eシードデータ基盤（globalSetup / globalTeardown）

### 含めない（後回し）

- コンポーネント単体テスト（MenuCard / CartItem / FloatingCartBar）— E2Eでカバー
- 席管理E2E（QR生成含む）
- Supabase Realtime の動作テスト（リアルタイム更新の検証はunitテストで既にカバー）
- スナップショットテスト
- CI/CD パイプラインでのテスト実行設定

---

## 未決定事項・今後の検討事項

- **service_role key の取得**: `.env.test` に追加する `SUPABASE_SERVICE_ROLE_KEY` はSupabaseダッシュボードから取得が必要
- **TEST_STORE_ID**: テスト対象のストアIDの確認が必要
- **席管理E2E**: 次フェーズで `e2e/admin-flow.spec.ts` に追加する想定
- **CI環境でのE2E実行**: Playwright の CI 設定は Step 10（デプロイ）で対応予定
