# 管理画面 - 注文ダッシュボード 詳細仕様書

## 概要・目的

店舗スタッフが注文をリアルタイムで確認・処理するための管理画面ダッシュボードを実装する。
新規注文の受信通知、ワンタップでのステータス変更、当日の完了済み注文一覧を提供し、
喫茶店のオペレーションを効率化する。

### 前提

- 1店舗専用MVP
- 注文ステータスは `new` → `completed` の2段階のみ
- `orders` テーブルは Supabase Realtime が有効化済み
- 管理画面は Supabase Auth で認証済みユーザーのみアクセス可能

---

## 機能要件

### 1. 注文ダッシュボード（2カラムレイアウト）

#### レイアウト構成

| カラム | 表示内容 | フィルタ条件 | 並び順 |
|--------|----------|-------------|--------|
| 左カラム（新規注文） | `status = 'new'` の注文 | なし（全件表示） | 古い順（受付順＝`created_at` ASC） |
| 右カラム（完了済み） | `status = 'completed'` の注文 | 当日 JST 0:00 以降 | 新しい順（`updated_at` DESC） |

#### レスポンシブ対応

- **タブレット横持ち以上（md: 768px〜）:** 2カラム横並び
- **スマホ縦持ち（〜767px）:** 1カラムにスタック（新規注文 → 完了済みの順に縦並び）

#### 空状態

- 新規注文が0件の場合: 「新規注文はありません」のテキストを表示
- 完了済み注文が0件の場合: 「完了済みの注文はありません」のテキストを表示

### 2. 注文カード

#### 表示項目

| 項目 | 表示形式 | データソース |
|------|---------|-------------|
| 注文番号 | `#45` | `orders.order_number` |
| テーブル番号 | `テーブル 3` | `tables.table_number`（JOIN） |
| 注文時刻 | `14:32` | `orders.created_at`（JST変換、HH:mm） |
| 注文内容 | `カフェラテ x2` | `order_items.name`, `order_items.quantity` |
| 合計金額 | `¥1,850` | `orders.total_amount` |
| 完了時刻（完了済みのみ） | `完了 14:45` | `orders.updated_at`（JST変換、HH:mm） |

#### 新規注文カード

- 上記の表示項目 + **[完了にする]** ボタン

#### 完了済みカード

- 上記の表示項目 + 完了時刻
- ステータス変更不可（read-only）
- 視覚的に新規注文と区別できるスタイル（例: 背景色をグレーアウト）

### 3. ステータス変更（完了にする）

#### フロー

1. [完了にする] ボタンをタップ
2. **確認ダイアログ表示**: 「注文 #45 を完了にしますか？」
3. ユーザーが確認
4. **楽観的更新**: 即座にUIを右カラムへ移動
5. バックグラウンドで Supabase の `orders.status` を `'completed'` に UPDATE
6. 成功: Realtime イベントで確認（UI は既に更新済み）
7. **失敗時**: ロールバック（左カラムに戻す）+ エラーメッセージ表示

#### 実装方式

- クライアントサイドから Supabase ブラウザクライアントで直接 UPDATE
- `updated_at` はDBトリガーで自動更新（手動更新不要）
- RLSは認証ユーザーに全操作を許可済み

### 4. リアルタイム更新

#### useRealtimeOrders フック

- Supabase Realtime で `orders` テーブルの INSERT / UPDATE を監視
- 初回データ取得もフック内で実施（クライアントサイドで統一）
- `order_items` を含めて取得（テーブル番号も JOIN）
- コールバック: `onNewOrder` — 新規注文 INSERT 時に呼び出し（通知音トリガー）

#### データ取得クエリ

```
orders (*, order_items(*), tables!inner(table_number))
  - 新規: status = 'new'
  - 完了: status = 'completed' AND created_at >= 当日JST 0:00
```

#### Realtime イベント処理

| イベント | 処理 |
|---------|------|
| INSERT（status = 'new'） | 新規注文リストに追加 + `onNewOrder` コールバック |
| UPDATE（status → 'completed'） | 新規注文リストから削除 → 完了済みリストに追加 |

#### 接続断リカバリ

- Supabase の自動再接続機能を利用
- 再接続時に全データを再取得して見落としを防止
- ステータスバナーは表示しない（MVPスコープ）

### 5. 通知音

#### 初期化フロー

1. ダッシュボード上部に **「通知を有効にする」バナー** を表示（未有効化時のみ）
2. バナーをタップ → `AudioContext` を初期化（ブラウザ自動再生ポリシー対応）
3. 有効化状態を `localStorage` に保存
4. バナーを非表示にする
5. 次回アクセス時: `localStorage` の状態を確認し、自動で `AudioContext` 初期化を試みる

#### 音の生成

- **Web Audio API** でビープ音をプログラム生成（外部ファイル不要）
- `OscillatorNode` を使用した短い通知音（例: 800Hz, 0.2秒）
- ライセンス問題なし

#### 無効化

- 明示的な無効化UIは設けない（MVPスコープ）
- ページリロードで `AudioContext` がリセットされるため、実質的にリロードで無効化可能
- `localStorage` をクリアすると次回から有効化バナーが再表示される

### 6. 当日判定ロジック

- **基準**: JST（UTC+9）の 0:00
- **実装**: `new Date()` から JST の当日0:00 を算出し、`created_at >= 当日0:00` でフィルタ
- **適用先**: 完了済み注文の表示範囲のみ（新規注文は全件表示）

---

## 技術的な実装方針

### アーキテクチャ

```
page.tsx（Client Component）
  └─ OrderBoard（2カラムレイアウト管理）
       ├─ 左カラム: OrderCard[] （新規注文）
       └─ 右カラム: OrderCard[] （完了済み）
  └─ useRealtimeOrders（データ取得 + Realtime監視）
  └─ 通知音バナー + AudioContext管理
```

### データフロー

1. **初回**: `useRealtimeOrders` フック内で `supabase.from('orders').select(...)` で取得
2. **以降**: Realtime チャンネルの `postgres_changes` で INSERT/UPDATE を受信
3. **ステータス変更**: クライアントから `supabase.from('orders').update(...)` → 楽観的更新 → Realtime で確認
4. **再接続**: チャンネルの `SUBSCRIBED` イベントで全データ再取得

### 注文データの型

```typescript
type OrderWithItems = {
  id: string
  store_id: string
  table_id: string
  order_number: number
  status: 'new' | 'completed'
  total_amount: number
  created_at: string
  updated_at: string
  order_items: {
    id: string
    name: string
    price: number
    quantity: number
  }[]
  tables: {
    table_number: number
  }
}
```

### 楽観的更新の実装

```
1. UIの状態を即座に更新（新規→完了に移動）
2. Supabase UPDATEを実行
3. 成功: 何もしない（Realtimeイベントは重複更新を無視）
4. 失敗: 状態をロールバック + エラーメッセージ
```

### 時刻表示

- DB内の `created_at` / `updated_at` は UTC
- 表示時に JST（UTC+9）に変換
- フォーマット: `HH:mm`（例: `14:32`）

---

## 対象ファイル一覧

| ファイル | 操作 | 変更内容 |
|---------|------|---------|
| `src/hooks/useRealtimeOrders.ts` | 新規作成 | Realtime監視 + 初回データ取得フック |
| `src/app/admin/(dashboard)/orders/page.tsx` | 置き換え | スタブからダッシュボード実装に置き換え |
| `src/components/admin/OrderCard.tsx` | 新規作成 | 注文カードコンポーネント |
| `src/components/admin/OrderBoard.tsx` | 新規作成 | 2カラムレイアウト管理コンポーネント |
| `src/lib/utils.ts` | 編集 | JST当日0:00算出ユーティリティ追加（必要に応じて） |

---

## MVPスコープ

### 含む

- 2カラムリアルタイム注文ダッシュボード
- 注文カード（注文番号、テーブル番号、時刻、内容、金額）
- ワンタップ（確認ダイアログ付き）でのステータス変更
- 楽観的UI更新
- Web Audio API による通知音
- 当日分の完了済み注文表示
- タブレット対応レスポンシブレイアウト
- 接続断時の自動再接続 + データ再取得

### 含まない（将来検討）

- 注文のフィルタリング・検索
- 注文履歴ページ（日付指定での過去注文閲覧）
- 売上集計・レポート
- 印刷機能（キッチンプリンター連携等）
- ステータスを `new` に戻す機能（undo）
- 接続状態のステータスバナー表示
- 通知音の明示的な無効化UI

---

## 未決定事項・今後の検討事項

- 通知音のビープ音パラメータ（周波数、長さ、音量）は実装時に調整
- 楽観的更新失敗時のエラーメッセージの具体的な文言
- 1日の注文数が極端に増えた場合のパフォーマンス対策（現時点では不要と判断）
