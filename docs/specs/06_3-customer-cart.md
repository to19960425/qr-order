# お客様側 カート + 注文送信 詳細仕様（v3 / 確定版）

`docs/specs/06_2-customer-cart.md` を踏まえた追加ヒアリングの結果を反映した実装用確定版。Step 06 (`docs/steps/06-customer-cart.md`) の実装はこの v3 に従う。v2 との差分は「確認ダイアログの追加」「空カート遷移時の挙動明示」「テスト厳密度の確定」など。

## 概要・目的

`useCart` に積まれた商品を確認・調整し、`create_order` RPC で DB に注文を作成、完了画面に遷移するまでの一連のフローを実装する。`useCart` 自体は Step 05 で実装済みのため変更しない。

## 前提（v2 からの引継ぎ）

- `src/hooks/useCart.ts`: `add` / `decrement` / `remove` / `clear` / `getQuantity` / `items` / `totalQuantity` / `totalAmount`。localStorage キー `qr-order:cart:{token}`、SSR セーフ。
- `getOrderPageData(token)` は `kind: 'not_found' | 'closed' | 'open'` を返し、`closed`/`open` は `table: { id, store_id, table_number }` を含む（拡張不要）。
- `create_order(p_store_id, p_table_id, p_items)` は `RETURNS uuid`。`is_active = false` で `RAISE EXCEPTION 'テーブルは現在クローズ中です'`。合計金額はサーバー算出。
- `FloatingCartBar` は画面下部固定で `/order/${token}/cart` への Link を持つ。

## 機能要件

### F1. カート確認画面 `/order/[token]/cart`

**Server Component (`page.tsx`)**

- `dynamic = 'force-dynamic'`
- `getOrderPageData(token)` を呼び `kind` で分岐:
  - `'not_found'` → `<InvalidTokenView />`
  - `'closed'` → `<ClosedView />`（**localStorage は破棄しない**: 再オープン時に作業継続できる方が体験良）
  - `'open'` → `<CartView token storeId tableId tableNumber />`

**Client Component `CartView`**

- `useCart(token)` でカート取得。
- ヘッダー: 「カート / テーブル {tableNumber}番」+ 戻るリンク（`/order/{token}`）。**v2 で確定: テーブル番号を出す**（メニュー画面と一貫性）。
- カート空: 「カートに商品がありません」+「メニューに戻る」リンク。注文ボタンは描画しない。
- カート非空: `<CartItem>` 一覧 → 合計金額 → 画面下部固定の「注文を確定する」ボタン。
- 送信中: ボタン disabled、ラベル「送信中…」+ スピナー。
- エラー領域は `role="alert"`。
- **`FloatingCartBar` はカート画面では描画しない**（自身へのリンクで冗長）。
- **空カート遷移時の挙動**: 画面表示中に数量を全部減らして空になった場合、空表示に切り替えるだけ（自動遷移なし、トーストなし）。ユーザーが「メニューに戻る」リンクで自分で戻る。

### F2. `CartItem` コンポーネント

- `props: { item: CartItem; onIncrement(): void; onDecrement(): void }`
- 表示: 商品名 / 単価 / 小計 / `[-][N][+]`。
- `[-]` 連打で 1→0 になるタイミングで `useCart` reducer 側が削除する既存挙動に乗る。
- 数量直接入力 UI、ゴミ箱、削除リンクは MVP では不要。
- `aria-label`: 「{商品名}を1つ減らす / 増やす」。

### F3. 注文確定フロー

1. 「注文を確定する」押下。
2. **`window.confirm('この内容で注文しますか？')` を表示**。キャンセルなら何もせず終了（`isSubmitting` も触らない）。
3. OK の場合、`isSubmitting = true` を立て、エラー表示をクリア。ボタンは即 disabled。
4. `submitOrder(client, { storeId, tableId, items })` を呼ぶ（F5）。
5. **成功 (`kind: 'ok'`)**:
   - `cart.clear()`
   - `router.replace('/order/{token}/complete')`
   - `orderId` は本 Step では捨てる（Step 07 で再設計）。
6. **closed (`kind: 'closed'`)**: 「現在このテーブルでは注文を受け付けていません。スタッフへお声がけください。」を表示。カート保持。
7. **error (`kind: 'error'`)**: 「注文の送信に失敗しました。電波状況をご確認のうえ、もう一度お試しください。」を表示。カート保持。
8. `try/finally` で `isSubmitting = false` を確実に戻す。
9. 事前 `is_active` チェックは行わない（RPC が真実の源）。

> **confirm と isSubmitting の順序（確定）**: 案A — `if (!confirm(...)) return;` の後に `isSubmitting=true` を立てる。confirm がモーダルダイアログなので二重押下リスクは実質無視できる。

### F4. 注文完了画面 `/order/[token]/complete`（最小実装）

- Server Component。`getOrderPageData(token)` で `not_found` のみガード（`closed` でも完了画面は表示）。
- 内容:
  - 「ご注文ありがとうございました」
  - 「商品をお席までお持ちします。少々お待ちください。」
  - 「メニューに戻る」リンク（`/order/{token}`）
- `orderId` / 注文サマリーは出さない（Step 07）。URL クエリも sessionStorage も使わない。

### F5. `submitOrder` ヘルパー

`src/lib/use-cases/customer-cart.ts`:

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
- `p_items` は **`{ menu_item_id, name, price, quantity }` の 4 キーのみ** に整形（余剰プロパティを渡さない）。
- `error` あり & `error.message` に `'クローズ'` を含む → `{ kind: 'closed' }`（**確定: 文字列マッチ**）。
- それ以外の `error` → `{ kind: 'error', message: error.message }`。
- 成功時 `data` (uuid) を `orderId` として `{ kind: 'ok', orderId: data }`。

## 非機能要件

- **二重送信防止**: confirm OK 後に即 disabled、`isSubmitting` で管理、`try/finally` で復旧。
- **localStorage 整合**: 成功時のみ `clear()`。`closed`/`error` 時は保持。
- **アクセシビリティ**: `[-][+]` に `aria-label`、エラーは `role="alert"`。
- **スタイル**: 背景 `#F5F0EB` / テキスト `#3C2415` / アクセント `#8B6914`。

## テスト方針

`submitOrder` のみ単体テスト対象。手書きの最小スタブを使う:

```ts
const rpc = vi.fn().mockResolvedValue({ data: 'order-uuid', error: null });
const client = { rpc } as unknown as SupabaseClient;
```

ケース:

- 成功 → `{ kind: 'ok', orderId: 'order-uuid' }`
- `rpc` が `'create_order'` と正しい引数で呼ばれる
- **`p_items` の各要素が `{ menu_item_id, name, price, quantity }` の 4 キーちょうどであること（厳密検証）** — `toEqual` で完全一致を確認。`useCart` に項目追加された際に検出できるようにする。
- error.message に「クローズ」を含む → `{ kind: 'closed' }`
- その他エラー → `{ kind: 'error', message }`

React コンポーネント / Server Component / `window.confirm` を含むフローはテストしない（手動確認）。既存 `cart-reducer` / `useCart` テストは維持。

## 対象ファイル一覧

| ファイル | 操作 | 内容 |
|---------|------|------|
| `src/app/order/[token]/cart/page.tsx` | 新規 | Server Component。`getOrderPageData` を呼び `kind` で分岐 |
| `src/app/order/[token]/cart/_components/CartView.tsx` | 新規 | Client Component。`useCart` + `submitOrder` + UI + `window.confirm` |
| `src/components/order/CartItem.tsx` | 新規 | カート行コンポーネント `[-][N][+]` |
| `src/app/order/[token]/complete/page.tsx` | 新規 | Server Component。完了画面（最小） |
| `src/lib/use-cases/customer-cart.ts` | 新規 | `submitOrder` ヘルパー |
| `src/lib/use-cases/__tests__/customer-cart.test.ts` | 新規 | `submitOrder` 単体テスト（厳密検証） |
| `docs/steps/06-customer-cart.md` | 編集 | useCart API 名称差異の注記、判別タグを `'open'` に修正、完了画面を本 Step に含む旨、確認ダイアログ追加を反映 |
| `docs/steps/README.md` | 編集 | Step 06 を「作業中」に更新 |
| `docs/README.md` | 編集 | 本仕様書 (`06_3-customer-cart.md`) のエントリを追加 |

`src/lib/use-cases/customer-menu.ts` の拡張は不要。

## MVP スコープ

含む: F1〜F5 すべて。

含まない（Step 07 以降）:

- 完了画面での注文番号 / 注文内容サマリー表示
- 注文履歴・キャンセル機能
- オフライン時のキューイング、再送
- SQLSTATE ベースのエラー判別（MVP は文字列マッチ）
- カスタムモーダルでの確認 UI（MVP は `window.confirm`）

## 未決定事項・今後の検討事項

- Step 07 で `orderId` を完了画面に伝える方法は Step 07 着手時に決定。`submitOrder` の戻り値型は `orderId` を保持したまま。
- エラーメッセージ文言（特にネットワーク系）はプロダクト側でレビュー要。
- 完了画面のデザイン詳細は Step 07 で確定。
