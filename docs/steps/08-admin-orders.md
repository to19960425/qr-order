# Step 08: 管理画面 - 注文ダッシュボード

リアルタイム更新の注文ダッシュボード、通知音、ステータス変更を実装する。

## ゴール

- 新規注文がリアルタイムで表示される
- 通知音が鳴る
- ワンタップで注文を完了にできる
- 完了済み注文が当日分のみ表示される

---

## タスク

### 8.1 useRealtimeOrders フック

- [ ] `src/hooks/useRealtimeOrders.ts` を作成
  - Supabase Realtime で `orders` テーブルの INSERT / UPDATE を監視
  - 新規注文の追加をリアルタイムに反映
  - ステータス変更をリアルタイムに反映
  - 注文データには `order_items` を含めて取得
  - コールバック: `onNewOrder` — 新規注文が追加されたときに呼ばれる（通知音用）

### 8.2 注文ダッシュボードページ

- [ ] `src/app/admin/orders/page.tsx` を実装
  - 2カラムレイアウト:
    - 左カラム: 新規注文（`status = 'new'`）
    - 右カラム: 完了済み（`status = 'completed'`、当日0:00〜現在）
  - 初回データは Server Component or クライアントで取得
  - 以降は Realtime で更新

### 8.3 注文カード

- [ ] `src/components/admin/OrderCard.tsx` を作成
  - 表示項目: 注文番号、テーブル番号、注文時刻、注文内容（品名 x 数量）、合計金額
  - 新規注文カード: [完了にする] ボタン付き
  - 完了済みカード: ステータス変更不可（read-only）
- [ ] `src/components/admin/OrderBoard.tsx` を作成
  - 2カラムレイアウトの管理

### 8.4 ステータス変更

- [ ] [完了にする] ボタンの実装
  - `orders.status` を `'completed'` に UPDATE
  - `updated_at` はトリガーで自動更新
  - UI上で即座に左カラムから右カラムへ移動

### 8.5 通知音

- [ ] 通知音の初期化UI
  - ダッシュボード上部に「通知を有効にする」ボタンを表示
  - ボタンタップで `AudioContext` を初期化（ブラウザ自動再生ポリシー対応）
  - 有効化状態を `localStorage` に保存
- [ ] 通知音の再生
  - 新規注文受信時に `/public/notification.mp3` を再生
  - 次回アクセス時は自動で有効化を試みる
- [ ] 通知音ファイルの配置
  - `/public/notification.mp3` にフリー素材の通知音を配置

### 8.6 完了済み注文の表示範囲

- [ ] 当日（0:00〜現在）の完了済み注文のみ表示
- [ ] 日付判定ロジックの実装

### 8.7 動作確認

- [ ] お客様側で注文 → ダッシュボードにリアルタイムで表示される
- [ ] 通知音が鳴る（有効化後）
- [ ] [完了にする] で右カラムに移動する
- [ ] 完了済み注文が当日分のみ表示される
- [ ] ページリロード後もデータが正しく表示される

---

## 対象ファイル

| ファイル | 操作 |
|---------|------|
| `src/hooks/useRealtimeOrders.ts` | 新規 |
| `src/app/admin/orders/page.tsx` | 実装（仮ページを置き換え） |
| `src/components/admin/OrderCard.tsx` | 新規 |
| `src/components/admin/OrderBoard.tsx` | 新規 |
| `public/notification.mp3` | 新規 |
