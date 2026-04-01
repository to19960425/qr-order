# Step 06: お客様側 - カート + 注文送信

カート管理（useCart フック）、カート確認画面、注文確定フローを実装する。

## ゴール

- カートの追加・削除・数量変更が localStorage で永続化される
- カート確認画面で注文内容を確認・調整できる
- 注文確定で DB に注文が作成される

---

## タスク

### 6.1 useCart フック

- [ ] `src/hooks/useCart.ts` を作成
  - `useState` + `localStorage` でカート状態を管理
  - テーブルトークンごとにカートを分離（キー: `cart_{token}`）
  - 提供する関数:
    - `addItem(item)` — カートに追加（既存なら数量+1）
    - `removeItem(menuItemId)` — カートから削除
    - `updateQuantity(menuItemId, quantity)` — 数量変更（0なら削除）
    - `clearCart()` — カート全クリア
  - 提供する値:
    - `items` — カート内のアイテム配列
    - `totalCount` — 合計点数
    - `totalAmount` — 合計金額
  - ブラウザリロード時に localStorage から復元

### 6.2 カート確認画面

- [ ] `src/app/order/[token]/cart/page.tsx` を作成
  - カート内の商品一覧
  - 各商品の数量変更 [-][N][+]
  - 数量0で商品を削除
  - 合計金額表示
  - 「注文を確定する」ボタン
  - カートが空の場合: 「カートに商品がありません」+ メニューに戻るリンク
- [ ] `src/components/order/CartItem.tsx` を作成
  - 商品名、価格、数量を表示
  - [-][N][+] コントロール

### 6.3 注文確定フロー

- [ ] 「注文を確定する」ボタンの実装:
  1. ボタンを即座に disabled にする（二重送信防止）
  2. スピナーを表示
  3. クライアント Supabase で `create_order` RPC を呼び出し
     ```typescript
     supabase.rpc('create_order', {
       p_store_id: storeId,
       p_table_id: tableId,
       p_items: cartItems.map(item => ({
         menu_item_id: item.id,
         name: item.name,
         price: item.price,
         quantity: item.quantity
       }))
     })
     ```
  4. 成功 → localStorage のカートをクリア → `/order/[token]/complete` に遷移
  5. 失敗 → エラーメッセージ表示、カートは保持
- [ ] テーブルクローズチェック（クライアント側ガード）
  - 注文確定前に `is_active` を再チェック
  - クローズ中: 「現在このテーブルでは注文を受け付けていません」を表示

### 6.4 動作確認

- [ ] メニュー画面でカートに追加 → カート画面に反映される
- [ ] カート画面で数量変更が動作する
- [ ] ブラウザリロード後もカートが保持される
- [ ] 注文確定で DB に orders + order_items が作成される
- [ ] 注文確定後にカートがクリアされる
- [ ] 注文確定後に完了画面に遷移する
- [ ] テーブルクローズ中に注文しようとするとエラーが表示される
- [ ] 二重送信防止が機能する

---

## 対象ファイル

| ファイル | 操作 |
|---------|------|
| `src/hooks/useCart.ts` | 新規 |
| `src/app/order/[token]/cart/page.tsx` | 新規 |
| `src/components/order/CartItem.tsx` | 新規 |
| `src/components/order/MenuCard.tsx` | 編集（useCart との連携） |
| `src/components/order/FloatingCartBar.tsx` | 編集（useCart との連携） |
