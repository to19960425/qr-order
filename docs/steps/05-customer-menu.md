# Step 05: お客様側 - メニュー表示

QRコード読み取り後のメニュー一覧画面を実装する。

## ゴール

- QRコードのURLからテーブルを識別し、メニューを表示できる
- カテゴリタブで絞り込みができる
- テーブルがクローズ中の場合は営業時間外画面を表示する

---

## タスク

### 5.1 トップページ

- [ ] `src/app/page.tsx` を作成
  - 「QRコードを読み取って注文してください」の案内ページ
  - お客様向けカラー（背景 `#F5F0EB`、テキスト `#3C2415`）

### 5.2 メニュー画面（Server Component 部分）

- [ ] `src/app/order/[token]/page.tsx` を作成
  - Server Component で token からテーブル情報を取得
  - テーブルが見つからない場合 → 404 or エラー画面
  - `tables.is_active = false` → 営業時間外画面を表示
  - `tables.is_active = true` → カテゴリ + メニューアイテムを取得
  - 取得データを Client Component に渡す

### 5.3 営業時間外画面

- [ ] `tables.is_active = false` の場合に表示するUI
  - 「現在注文を受け付けていません」のメッセージ
  - 他のページへの導線なし
  - お客様向けカラーパレットを適用

### 5.4 カテゴリタブ

- [ ] `src/components/order/CategoryTabs.tsx` を作成
  - 横スクロール可能なタブUI
  - タブ選択でメニューアイテムをフィルタリング
  - 「すべて」タブを先頭に配置（任意）
  - `sort_order` 順に表示

### 5.5 メニューカード

- [ ] `src/components/order/MenuCard.tsx` を作成
  - 写真を大きく表示するカード型レイアウト
  - 表示項目: 画像、名前、説明（抜粋）、価格
  - カートに未追加時: [+] ボタンのみ
  - カートに追加済み: 右上に数量バッジ、価格横に [-][N][+] コントロール
  - [-] で数量が0になったらカートから削除

### 5.6 フローティングカートバー

- [ ] `src/components/order/FloatingCartBar.tsx` を作成
  - 画面下部に常時表示（position: fixed）
  - カートが空: ボタンを disabled に
  - カートにアイテムあり: 点数・合計金額を表示
  - 「注文を確認する」ボタン → `/order/[token]/cart` に遷移

### 5.7 お客様向けスタイリング

- [ ] お客様側ページ全体にカラーパレットを適用
  - 背景: `#F5F0EB`
  - テキスト: `#3C2415`
  - アクセント: `#8B6914`
- [ ] フォント設定（丸みのあるセリフ体）

### 5.8 動作確認

- [ ] `/order/{valid_token}` でメニューが表示される
- [ ] `/order/{invalid_token}` でエラー画面が表示される
- [ ] クローズ中のテーブルで営業時間外画面が表示される
- [ ] カテゴリタブで絞り込みが動作する
- [ ] メニューカードの [+] ボタンでカートに追加される
- [ ] フローティングカートバーに点数・金額が反映される

---

## 対象ファイル

| ファイル | 操作 |
|---------|------|
| `src/app/page.tsx` | 新規 |
| `src/app/order/[token]/page.tsx` | 新規 |
| `src/components/order/CategoryTabs.tsx` | 新規 |
| `src/components/order/MenuCard.tsx` | 新規 |
| `src/components/order/FloatingCartBar.tsx` | 新規 |
