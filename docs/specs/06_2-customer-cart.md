# お客様側 カート + 注文送信 詳細仕様（v2）

`docs/specs/06_1-customer-cart.md` のヒアリング結果を反映した確定版。Step 06 (`docs/steps/06-customer-cart.md`) の実装に用いる。差分があるのは「既存実装に揃えた判別タグ名」「テスト戦略」「closed 時の挙動」「orderId の扱い」など。

## 概要・目的

メニュー画面で `useCart` に積まれた商品を確認・調整し、`create_order` RPC で DB に注文を作成、完了画面に遷移するまでの一連のフローを実装する。`useCart` 自体は Step 05 で実装済みのため変更しない。

## 前提（コードベース調査結果）

- `src/hooks/useCart.ts`: `add` / `decrement` / `remove` / `clear` / `getQuantity` / `items` / `totalQuantity` / `totalAmount`。localStorage キー `qr-order:cart:{token}`、SSR セーフ。
- `src/lib/use-cases/customer-menu.ts` の `getOrderPageData(token)` は **既に `kind: 'not_found' | 'closed' | 'open'`** を返し、`closed`/`open` のいずれも `table: { id, store_id, table_number }` を含む。**仕様書 v1 の `'ok'` 表記は誤りで、本仕様では `'open'` を採用**。`customer-menu.ts` の拡張は不要。
- `supabase/migrations/001_initial.sql` の `create_order(p_store_id, p_table_id, p_items)` は `RETURNS uuid`（注文 ID 単体）。`tables.is_active = false` のとき `RAISE EXCEPTION 'テーブルは現在クローズ中です'`。合計金額はサーバー側で算出。
- `order_items.menu_item_id` は `REFERENCES menu_items(id)` で `ON DELETE` 未指定。物理削除時のみ FK 違反になり得る（汎用エラー扱い）。
- `src/components/order/FloatingCartBar.tsx` は画面下部固定で `/order/${token}/cart` への Link を持つ。

## 機能要件

### F1. カート確認画面 `/order/[token]/cart`

**サーバーコンポーネント (`page.tsx`)**

- `dynamic = 'force-dynamic'`。
- `params.token` から `getOrderPageData(token)` を呼ぶ。
- `kind === 'not_found'` → `<InvalidTokenView />`（既存）。
- `kind === 'closed'` → `<ClosedView />`（既存）。**カート localStorage は破棄しない**（理由: クローズはスタッフ操作で一時的・非ユーザー起因。再オープン時に作業継続できる方が体験が良い）。
- `kind === 'open'` → `<CartView token={token} storeId={table.store_id} tableId={table.id} tableNumber={table.table_number} />` を描画。

**クライアントコンポーネント `CartView`**

- `useCart(token)` でカートを取得。
- レイアウト:
  - ヘッダー: 「カート / テーブル {tableNumber}番」、戻るリンク（`/order/{token}`）。
  - カート空: 「カートに商品がありません」+「メニューに戻る」リンク。注文ボタンは描画しない。
  - カート非空: `<CartItem>` 一覧 → 合計金額 → 画面下部固定の「注文を確定する」ボタン（`FloatingCartBar` と同じ視覚スタイル）。
- 送信中: ボタン disabled、ラベル「送信中…」+ スピナー。
- エラー領域は `role="alert"`。
- **`FloatingCartBar` はカート画面では描画しない**（自身へのリンクで冗長になるため）。

### F2. `CartItem` コンポーネント

- `props: { item: CartItem; onIncrement(): void; onDecrement(): void }`
- 表示: 商品名 / 単価 / 小計 / `[-][N][+]`。
- `[-]` 連打で 1 → 0 になるタイミングで `useCart` reducer 側が削除する既存挙動に乗る。
- 数量直接入力 UI、ゴミ箱アイコン、テキストリンク削除はいずれも MVP では不要。
- `aria-label`: 「{商品名}を1つ減らす / 増やす」。

### F3. 注文確定フロー

1. 「注文を確定する」押下 → 即 `disabled` + `isSubmitting = true`。エラー表示クリア。
2. `submitOrder(client, { storeId, tableId, items })` を呼び出す（F5 参照）。
3. **成功 (`kind: 'ok'`)**:
   - `cart.clear()`
   - `router.replace('/order/{token}/complete')`
   - **戻り値の `orderId` は本 Step では使用せず捨てる**（Step 07 でサマリー表示する際に再設計）。
4. **closed (`kind: 'closed'`)**: 「現在このテーブルでは注文を受け付けていません。スタッフへお声がけください。」を表示。カートは保持。
5. **error (`kind: 'error'`)**: 「注文の送信に失敗しました。電波状況をご確認のうえ、もう一度お試しください。」を表示。カートは保持。
6. `try/finally` で `isSubmitting = false` を確実に戻す。
7. 事前 `is_active` チェックは行わない（RPC が真実の源）。

### F4. 注文完了画面 `/order/[token]/complete`（最小実装）

- Server Component。`getOrderPageData(token)` で `not_found` のみガード（`closed` でも完了画面は表示する）。
- 内容:
  - 「ご注文ありがとうございました」
  - 「商品をお席までお持ちします。少々お待ちください。」
  - 「メニューに戻る」リンク（`/order/{token}`）
- `orderId` も注文サマリーも本 Step では出さない（Step 07）。
- URL クエリも sessionStorage も使わない。

### F5. `submitOrder` ヘルパー

`src/lib/use-cases/customer-cart.ts` に純関数的なラッパーを置く。

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CartItem } from '@/hooks/useCart';

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

実装方針:

- `client.rpc('create_order', { p_store_id, p_table_id, p_items })` を呼ぶ。
- `p_items = input.items.map(i => ({ menu_item_id: i.menu_item_id, name: i.name, price: i.price, quantity: i.quantity }))`
- `error` あり & `error.message` に `'クローズ'` を含む → `{ kind: 'closed' }`。
- それ以外の `error` → `{ kind: 'error', message: error.message }`。
- 成功時 `data` (uuid) を `orderId` として `{ kind: 'ok', orderId: data }`。

UI 層は `switch (result.kind)` で分岐するだけになる。`orderId` は受け取るが Step 06 では使用しない（捨てる）。将来 Step 07 で利用予定のため戻り値型からは外さない。

## 非機能要件

- **二重送信防止**: ボタン押下 → 即 disabled、`isSubmitting` で管理、`try/finally` で復旧。
- **localStorage 整合**: 成功時のみ `clear()`。`closed`/`error` 時は保持。`router.replace` 後に戻る操作で空カート画面が出る挙動でよい。
- **アクセシビリティ**: `[-][+]` に `aria-label`、エラーは `role="alert"`。
- **スタイル**: 背景 `#F5F0EB` / テキスト `#3C2415` / アクセント `#8B6914`。

## 技術的な実装方針

### レイヤー分割

- ビュー層: `CartView`（Client）/ `CartItem`。
- ロジック層: `submitOrder` を `customer-cart.ts` に切り出し、UI から RPC 詳細を隠蔽。
- データ取得層: `customer-menu.ts` の `getOrderPageData` をそのまま再利用。

### バリデーション

- 送信前に `cart.items.length > 0` をクライアントでチェック（保険）。
- 価格・数量は整数前提。`useCart` 側で担保。

### テスト方針

- 単体テスト対象は `submitOrder` のみ。
- スタブは **手書きの最小スタブ** を使用:
  ```ts
  const rpc = vi.fn().mockResolvedValue({ data: 'order-uuid', error: null });
  const client = { rpc } as unknown as SupabaseClient;
  ```
  既存の `@/test/supabase-mock` (queryBuilder/makeClient) は select チェーン用で、RPC 専用の `submitOrder` には過剰なため使わない。
- ケース:
  - 成功 → `{ kind: 'ok', orderId: 'order-uuid' }` + `rpc` が正しい引数で呼ばれる
  - エラー message に「クローズ」を含む → `{ kind: 'closed' }`
  - その他エラー → `{ kind: 'error', message }`
  - `p_items` が `menu_item_id`/`name`/`price`/`quantity` のみに整形されること
- React コンポーネント / Server Component はテストしない（手動確認）。
- 既存 `cart-reducer` / `useCart` テストはそのまま維持。

## 対象ファイル一覧

| ファイル | 操作 | 内容 |
|---------|------|------|
| `src/app/order/[token]/cart/page.tsx` | 新規 | Server Component。`getOrderPageData` を呼び `kind` で分岐し `CartView` に props を渡す |
| `src/app/order/[token]/cart/_components/CartView.tsx` | 新規 | Client Component。`useCart` + `submitOrder` 呼び出し + UI |
| `src/components/order/CartItem.tsx` | 新規 | カート行コンポーネント（`[-][N][+]`） |
| `src/app/order/[token]/complete/page.tsx` | 新規 | Server Component。完了画面（最小） |
| `src/lib/use-cases/customer-cart.ts` | 新規 | `submitOrder` ヘルパー |
| `src/lib/use-cases/__tests__/customer-cart.test.ts` | 新規 | `submitOrder` 単体テスト（手書きスタブ） |
| `docs/steps/06-customer-cart.md` | 編集 | useCart API 名称差異の注記、判別タグを `'open'` に修正、完了画面を本 Step に含む旨を反映 |
| `docs/steps/README.md` | 編集 | Step 06 を「作業中」に更新 |
| `docs/README.md` | 編集 | 本仕様書 (`06_2-customer-cart.md`) のエントリを追加 |

`src/lib/use-cases/customer-menu.ts` の拡張は **不要**（既に `store_id` / `table.id` を返している）。

## MVP スコープ

- 含む: F1〜F5 すべて。
- 含まない（Step 07 以降）:
  - 完了画面での注文番号 / 注文内容サマリー表示
  - 注文履歴・キャンセル機能
  - オフライン時のキューイング、再送
  - SQLSTATE ベースのエラー判別（MVP は文字列マッチ）

## 未決定事項・今後の検討事項

- Step 07 で `orderId` を完了画面に伝える方法（URL クエリ / sessionStorage / Server Component で再フェッチ）は Step 07 着手時に決定。`submitOrder` の戻り値型は将来を見据えて `orderId` を含めたまま保持する。
- エラーメッセージ文言（特にネットワーク系）はプロダクト側でレビューが必要。
- 完了画面のデザイン詳細は Step 07 で確定。
