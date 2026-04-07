# お客様側 カート + 注文送信 詳細仕様

Step 06 (`docs/steps/06-customer-cart.md`) の詳細仕様。カート確認画面と注文確定フロー、注文完了画面の最小実装までを対象とする。

## 概要・目的

メニュー画面で `useCart` に積まれた商品を確認・調整し、`create_order` RPC で DB に注文を作成、完了画面に遷移するまでの一連のフローを実装する。`useCart` 自体は Step 05 で実装済みのため本 Step では変更しない。

## 前提（既存実装の確認）

- `src/hooks/useCart.ts` は実装済み。公開 API:
  - `add(item)` / `decrement(menuItemId)` / `remove(menuItemId)` / `clear()` / `getQuantity(menuItemId)`
  - 値: `items` / `totalQuantity` / `totalAmount`
  - localStorage キー: `qr-order:cart:{token}`、SSR セーフ（初回 [] → effect で復元）
- `create_order(p_store_id, p_table_id, p_items)` RPC 実装済み。`tables.is_active = false` 時は `RAISE EXCEPTION 'テーブルは現在クローズ中です'`。合計金額もサーバー側で算出。
- `src/lib/use-cases/customer-menu.ts` の `getOrderPageData(token)` がトークンからテーブル/店舗/メニュー解決を行い、`kind: 'not_found' | 'closed' | 'ok'` を返す。
- `FloatingCartBar` は `/order/${token}/cart` へのリンクを既に持つ。
- 仕様書（steps/06）の `addItem / updateQuantity / removeItem / totalCount` という命名は **既存実装に揃える**（仕様書側の文言と差異あり）。

## 機能要件

### F1. カート確認画面 `/order/[token]/cart`

**サーバーコンポーネント (`page.tsx`)**

- `params.token` から `getOrderPageData(token)` を呼び出す。
- `kind === 'not_found'` → `<InvalidTokenView />` を表示（既存コンポーネント再利用）。
- `kind === 'closed'` → `<ClosedView />` を表示。
- `kind === 'ok'` → 以下を props として `CartView`（クライアントコンポーネント）に渡す:
  - `token`
  - `storeId`（`getOrderPageData` が返す table.store_id）
  - `tableId`
  - `tableNumber`
- `dynamic = 'force-dynamic'`（既存メニューページ同様）。

  > **補足**: 現在の `getOrderPageData` の戻り値に `store_id` / `table.id` が含まれていない場合は、含めるよう拡張する（`customer-menu.ts` 側）。

**クライアントコンポーネント (`CartView`)**

- `useCart(token)` でカート状態を取得。
- 表示要素:
  - ヘッダー: 「カート / テーブル {tableNumber}番」、戻る（`/order/{token}`）リンク。
  - カート空: 「カートに商品がありません」+ 「メニューに戻る」リンク（注文ボタンは表示しない）。
  - カート非空: 各商品を `<CartItem>` で一覧表示 → 合計金額 → 「注文を確定する」ボタン。
- 「注文を確定する」ボタンは画面下部に固定表示（`FloatingCartBar` と同じ視覚スタイル）。
- 注文確定中はボタン disabled + ラベル「送信中…」+ スピナー。
- エラーメッセージ領域（後述 F3）。

### F2. `CartItem` コンポーネント

- props: `{ item: CartItem; onIncrement(): void; onDecrement(): void; onRemove(): void }`
- 表示: 商品名 / 単価 / 小計 / `[-][N][+]` ボタン。
- `[-]` 押下で `decrement`。数量が 1 のときに押すと `decrement`（reducer 側で 0 にならず削除される実装）。
- 数量直接入力 UI は **作らない**（誤入力リスク回避）。
- 別途「削除」アイコン（ゴミ箱）は不要。`[-]` 連打で削除可。
  - ただし複数個ある状態で一気に消したいケース用に「この商品を削除」テキストリンクは置く（任意、最小では省略可）。MVP では省略。

### F3. 注文確定フロー

1. ユーザーが「注文を確定する」を押下。
2. ボタンを即座に `disabled` にし、`isSubmitting = true` を立てる（二重送信防止）。エラー表示はクリア。
3. `getSupabaseBrowserClient().rpc('create_order', { p_store_id, p_table_id, p_items })` を呼ぶ。
   - `p_items` は `cart.items.map(i => ({ menu_item_id: i.menu_item_id, name: i.name, price: i.price, quantity: i.quantity }))`。
4. **成功時**:
   - `cart.clear()` で localStorage を空にする。
   - `router.replace('/order/{token}/complete')` で完了画面に遷移（戻る防止）。
5. **失敗時**:
   - `error.message?.includes('クローズ')` の場合: 「現在このテーブルでは注文を受け付けていません。スタッフへお声がけください。」
   - それ以外: 「注文の送信に失敗しました。電波状況をご確認のうえ、もう一度お試しください。」
   - カートは保持し、`isSubmitting = false` に戻してボタンを再度押せるようにする。
6. クライアント側の事前 `is_active` チェックは **行わない**（RPC が真実の源）。

### F4. 注文完了画面 `/order/[token]/complete`（最小実装）

- サーバーコンポーネント。`getOrderPageData(token)` で `not_found` のみガードし、`closed` でも完了画面は表示する（クローズ後でも完了通知は見せる）。
- 内容:
  - 大きく「ご注文ありがとうございました」
  - 「商品をお席までお持ちします。少々お待ちください。」
  - 「メニューに戻る」リンク（`/order/{token}`）
- 注文番号や注文内容のサマリーは本 Step では出さない（Step 07 で本実装）。

## 非機能要件

- **二重送信防止**: ボタン押下 → 即 disabled。`isSubmitting` ステートで管理し、try/finally でも復旧。
- **localStorage の不整合**: 注文成功時のみ `clear()`。失敗時は維持。`router.replace` 完了後にユーザーが戻るボタンを押しても空のカート画面が出る挙動でよい。
- **アクセシビリティ**: `[-][+]` ボタンに `aria-label`（例: 「{商品名} を1つ減らす / 増やす」）。エラーメッセージは `role="alert"`。
- **スタイル**: お客様側カラーパレット（背景 `#F5F0EB` / テキスト `#3C2415` / アクセント `#8B6914`）を使用。

## 技術的な実装方針

### レイヤー分割

- ビュー層: `CartView`（クライアント）と `CartItem`。
- ロジック: 注文送信は `CartView` 内に inline で書かず、`src/lib/use-cases/customer-cart.ts` に `submitOrder` ヘルパーを切り出す:
  ```ts
  export type SubmitOrderInput = {
    storeId: string;
    tableId: string;
    items: CartItem[];
  };
  export type SubmitOrderResult =
    | { kind: 'ok'; orderId: string }
    | { kind: 'closed' }
    | { kind: 'error'; message: string };

  export async function submitOrder(
    client: SupabaseClient,
    input: SubmitOrderInput,
  ): Promise<SubmitOrderResult>;
  ```
  - `client.rpc('create_order', ...)` を呼び、エラーメッセージを解析して判別済みユニオンを返す純関数的な薄いラッパー。
  - これにより UI 層は `switch (result.kind)` だけで分岐でき、テストもしやすい。
- `getOrderPageData` の戻り値を必要に応じて拡張し、`store_id` と `table.id` を含める（既に含まれていれば不要）。

### バリデーション

- 送信前に `cart.items.length > 0` をクライアントでチェック（空ならボタンは元々 disabled なので追加チェックは保険）。
- 価格・数量はすべて整数前提。`useCart` 側で担保されているため再検証はしない。

### テスト方針

- 純粋関数のみ単体テスト対象とする:
  - `submitOrder` のエラー分類（`createMockSupabaseClient` 的なスタブで RPC 戻り値を差し替え、`closed` / `error` / `ok` に振り分けられることを検証）。
- React コンポーネント (`CartView` / `CartItem`) と Server Component はテストを書かない（手動動作確認）。
- 既存 `cart-reducer` のテストはそのまま維持。

## 対象ファイル一覧

| ファイル | 操作 | 内容 |
|---------|------|------|
| `src/app/order/[token]/cart/page.tsx` | 新規 | Server Component。`getOrderPageData` を呼び `CartView` に props 渡し |
| `src/app/order/[token]/cart/_components/CartView.tsx` | 新規 | Client Component。`useCart` + `submitOrder` 呼び出し + UI |
| `src/app/order/[token]/complete/page.tsx` | 新規 | Server Component。完了画面（最小） |
| `src/components/order/CartItem.tsx` | 新規 | カート行コンポーネント |
| `src/lib/use-cases/customer-cart.ts` | 新規 | `submitOrder` ヘルパー（RPC ラッパー + エラー分類） |
| `src/lib/use-cases/__tests__/customer-cart.test.ts` | 新規 | `submitOrder` 単体テスト |
| `src/lib/use-cases/customer-menu.ts` | 編集（条件付き） | `getOrderPageData` の戻り値に `store_id` / `table.id` を追加（未含有なら） |
| `docs/steps/06-customer-cart.md` | 編集 | useCart API 名称差異の注記、完了画面を本 Step に含む旨を反映 |
| `docs/steps/README.md` | 編集 | Step 06 ステータスを「作業中」に更新 |

## MVP スコープ

- 含む: F1〜F4 すべて。
- 含まない（Step 07 以降）:
  - 完了画面での注文番号 / 注文内容サマリー表示
  - 注文履歴・キャンセル機能
  - オフライン時のキューイング、再送ロジック

## 未決定事項・今後の検討事項

- `getOrderPageData` が現状 `store_id` / `table.id` を返しているか未確認。実装時に確認し、不足していれば拡張する。
- エラー時のメッセージ文言（特にネットワーク系）はプロダクト側でレビューが必要。
- 完了画面のデザイン詳細は Step 07 で確定。
