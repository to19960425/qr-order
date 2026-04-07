# お客様側 メニュー表示 詳細仕様

Step 05（`docs/steps/05-customer-menu.md`）の詳細仕様。SPEC.md §7.1 を前提とし、実装時の判断事項を確定する。

---

## 1. 概要・目的

QRコードを読み取ったお客様が、テーブルに紐づくメニューを閲覧し、カートに追加できるようにする。
本仕様の範囲は **メニュー表示 + カート状態管理（`useCart` hook）まで**。カート確認画面・注文送信は Step 06 で扱う。

### ゴール

- `tables.token` からテーブルを識別し、店舗のメニューを表示する
- `tables.is_active = false` のとき営業時間外画面を表示する
- カテゴリ単位でメニューを絞り込める
- 各メニューの [+] / [-][N][+] でカート操作できる（カートは `localStorage` 永続化）
- フローティングカートバーに点数・合計金額がリアルタイムで反映される

---

## 2. 機能要件

### 2.1 トップページ `/`

- お客様向けカラー（背景 `#F5F0EB` / テキスト `#3C2415` / アクセント `#8B6914`）の静的ページ
- 文言: 「QRコードを読み取って注文してください」
- DB アクセスなし（障害点を増やさない）
- 管理者ログインへの導線は配置しない

### 2.2 メニュー画面 `/order/[token]`

#### データ取得（Server Component）

1. `params.token` で `tables` を検索（`token` カラム、UUID）
2. テーブルが見つからない → **専用エラー画面**を表示（後述 2.4）
3. `tables.is_active = false` → **営業時間外画面**を表示（後述 2.3）
4. `tables.is_active = true` → カテゴリと「店舗の `is_available = true` のメニューアイテム」を取得

#### キャッシュ戦略

- **`export const dynamic = 'force-dynamic'`** を指定する
- 理由: スタッフの `is_active` トグルやメニュー更新が**即座に**お客様画面に反映されないと、クローズ中テーブルから注文できてしまう等の整合性問題が起きる。喫茶店規模ではアクセス頻度が低くパフォーマンス影響は無視できる。

#### 取得データの構造（Client Component に渡す形）

```ts
type OrderPageData = {
  table: { id: string; table_number: number; store_id: string };
  categories: Array<{ id: string; name: string; sort_order: number }>;
  menuItemsByCategory: Record<string, MenuItem[]>; // categoryId → items（sort_order 昇順）
};
```

- `is_available = false` のアイテムは **Server 側の `.eq('is_available', true)` で完全に除外**する（SPEC §8 RLS と整合、MVP では品切れ UI 実装なし）
- `categories` は `sort_order` 昇順
- 空カテゴリ（メニューが 1 件もないカテゴリ）も**そのままタブに表示する**（運用上の混乱を避けるため非表示にしない）

#### 画面構成

```
┌─────────────────────────┐
│  ☕ テーブル {table_number}        ヘッダー（sticky）
├─────────────────────────┤
│ [コーヒー][紅茶][フード][デザート]   カテゴリタブ（横スクロール、sticky）
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │   MenuCard          │ │  選択中カテゴリのアイテムのみ表示
│ │   ...               │ │
│ └─────────────────────┘ │
├─────────────────────────┤
│ 🛒 カート（N点） ¥X,XXX  │  FloatingCartBar（fixed bottom）
│      [注文を確認する]    │
└─────────────────────────┘
```

### 2.3 営業時間外画面

- `tables.is_active = false` のときに表示
- 文言: 「現在注文を受け付けていません」
- お客様カラーパレット適用、他ページへの導線なし
- HTTP ステータス 200（404 ではない）

### 2.4 無効 token / テーブル未発見画面

- `tables` 検索で 0 件のときに表示
- お客様カラーパレットを適用した**専用エラー画面**（Next.js 標準 404 は使わない）
- 文言: 「QRコードが正しく読み取れませんでした。お手数ですがスタッフにお声がけください。」
- 営業時間外画面とは**異なる文言**にする（原因切り分けのため）
- 実装: `notFound()` ではなく Server Component 内で分岐し、専用 UI をレンダリング

### 2.5 カテゴリタブ `CategoryTabs`

- 横スクロール可能なタブ UI（`overflow-x-auto`、スクロールバー非表示）
- **「すべて」タブは設けない**
- 初期選択: `categories[0]`（`sort_order` が最小のもの）
- カテゴリが 0 件のときは「メニューが登録されていません」を本文エリアに表示
- 選択中タブはアクセント色（`#8B6914`）で下線/塗り表現

### 2.6 メニューカード `MenuCard`

#### 表示要素

| 要素 | 仕様 |
|---|---|
| 画像 | `image_url` を `next/image` で表示。アスペクト比固定（例: 16:10） |
| 画像なし | プレースホルダー（☕ アイコン + 背景 `#F5F0EB` 系）を表示 |
| 名前 | 1行（はみ出しは省略） |
| 説明 | **`line-clamp-2`** で 2 行省略 |
| 価格 | `¥{price.toLocaleString('ja-JP')}` |
| ボタン | カート未追加: 右下に [+] のみ / 追加済み: 価格横に [-][N][+]、画像右上に数量バッジ |

#### 操作

- [+]: `useCart.add(menuItem)` 呼び出し（数量 +1）
- [-]: `useCart.decrement(menuItemId)` 呼び出し。0 になったらカートから削除
- 数量バッジ: 1 以上のときのみ表示

### 2.7 フローティングカートバー `FloatingCartBar`

- `position: fixed; bottom: 0;`、画面幅いっぱい
- カートが空: 「カートは空です」表示、ボタン disabled
- カートにアイテムあり: `🛒 カート（{totalQuantity}点） ¥{totalAmount.toLocaleString('ja-JP')}`
- 「注文を確認する」ボタン → `/order/[token]/cart` に遷移（実画面は Step 06 で実装するが、リンク自体は Step 05 で貼っておく）
- メニューカード一覧の最終行が隠れないよう、本文エリアの末尾に高さ分のスペーサー（`pb-24` 等）を確保

### 2.8 カート状態管理 `useCart` hook（Step 05 で実装）

#### スコープ判断

Step 05 で `useCart` まで実装する。理由: MenuCard の [+] ⇄ [-][N][+] 状態切替がカート状態と連動しており、Step 05 単独で動作確認するためには hook が必須。Step 06 では本 hook を再利用してカート確認画面と注文送信に集中する。

#### 仕様

- 配置: `src/hooks/useCart.ts`
- 永続化: `localStorage`
- ストレージキー: `qr-order:cart:{token}` （**テーブルトークンごとに分離**）
- 保存形式:
  ```ts
  type CartItem = {
    menu_item_id: string;
    name: string;       // 表示・将来の注文送信用にスナップショット
    price: number;      // スナップショット
    quantity: number;
    image_url: string | null;
  };
  type CartState = CartItem[];
  ```
- 公開 API:
  ```ts
  function useCart(token: string): {
    items: CartItem[];
    totalQuantity: number;
    totalAmount: number;
    getQuantity: (menuItemId: string) => number;
    add: (item: Omit<CartItem, 'quantity'>) => void;   // +1。既存があれば +1、なければ追加
    decrement: (menuItemId: string) => void;            // -1。0 になったら削除
    remove: (menuItemId: string) => void;
    clear: () => void;
  };
  ```
- SSR 対応: 初回レンダリング時は `[]` を返し、`useEffect` 内で `localStorage` から復元する（hydration mismatch 回避）
- 不正な JSON / スキーマ不整合は無視して `[]` から開始（壊れた状態に固執しない）

### 2.9 スタイリング

- 背景 `#F5F0EB` / テキスト `#3C2415` / アクセント `#8B6914`
- フォント: 既存の `src/app/layout.tsx` のフォント設定を流用（独自セリフ体導入は本ステップ外）
- お客様向けレイアウトは `src/app/order/[token]/layout.tsx` を新設し、お客様カラーを `body` レベルではなくレイアウト直下の wrapper で適用する（管理画面と背景色が混ざらないようにする）

---

## 3. エッジケース・エラー処理

| ケース | 挙動 |
|---|---|
| `params.token` が UUID 形式でない | `tables` 検索結果 0 件として 2.4 のエラー画面を表示 |
| `tables` 取得に失敗（DB エラー） | エラーをスロー → Next.js のエラーバウンダリで一般エラー画面 |
| カテゴリ 0 件 | タブエリアは空、本文に「メニューが登録されていません」 |
| カテゴリはあるが選択中カテゴリにアイテム 0 件 | 本文に「このカテゴリにはメニューがありません」 |
| `localStorage` 利用不可（プライベートモード等） | hook 内で try/catch、メモリ上の state のみで動作 |
| メニューが管理側で削除された後に古いカートが残っている | Step 05 では検証しない（注文送信時は Step 06 / RPC 側で扱う） |

---

## 4. 技術的な実装方針

### 4.1 ファイル分割

| ファイル | 種別 | 役割 |
|---|---|---|
| `src/app/page.tsx` | Server | トップ案内ページ（既存を上書き） |
| `src/app/order/[token]/layout.tsx` | Server | お客様カラーの wrapper |
| `src/app/order/[token]/page.tsx` | Server | データ取得 + 分岐 + Client へ受け渡し |
| `src/app/order/[token]/_components/MenuView.tsx` | Client | カテゴリタブ + メニュー一覧 + カートバーを束ねる |
| `src/app/order/[token]/_components/ClosedView.tsx` | Server | 営業時間外画面 |
| `src/app/order/[token]/_components/InvalidTokenView.tsx` | Server | 無効 token 画面 |
| `src/components/order/CategoryTabs.tsx` | Client | 横スクロールタブ |
| `src/components/order/MenuCard.tsx` | Client | カード（[+] / [-][N][+]） |
| `src/components/order/FloatingCartBar.tsx` | Client | 下部固定バー |
| `src/hooks/useCart.ts` | Client | カート状態管理 |
| `src/lib/use-cases/customer-menu.ts` | Server | `getOrderPageData(token)` を提供（テーブル取得 + メニュー取得を集約） |

### 4.2 UseCase 層

CLAUDE.md の方針に従い、ビジネスロジックは UseCase に切り出す。

```ts
// src/lib/use-cases/customer-menu.ts
export type OrderPageResult =
  | { kind: 'not_found' }
  | { kind: 'closed'; table: TablePublic }
  | { kind: 'open'; table: TablePublic; categories: Category[]; menuItemsByCategory: Record<string, MenuItem[]> };

export async function getOrderPageData(token: string): Promise<OrderPageResult>;
```

- `page.tsx` は kind による分岐と UI 振り分けのみ。データ取得ロジックを置かない。
- `is_available = true` のフィルタ・`sort_order` ソートは UseCase 内で実施。

### 4.3 純粋関数（テスト対象）

`useCart` の状態遷移は純粋関数化しユニットテスト対象にする。

```ts
// src/hooks/cart-reducer.ts
export function addItem(state: CartItem[], item: Omit<CartItem, 'quantity'>): CartItem[];
export function decrementItem(state: CartItem[], menuItemId: string): CartItem[];
export function removeItem(state: CartItem[], menuItemId: string): CartItem[];
export function calcTotals(state: CartItem[]): { totalQuantity: number; totalAmount: number };
```

`useCart` フック本体はこの reducer をラップし、`localStorage` 同期と React state 管理のみを担当する。

### 4.4 テスト方針

| 対象 | 種別 | 内容 |
|---|---|---|
| `cart-reducer.ts` | Vitest 単体 | add/decrement/remove/calcTotals の振る舞い |
| `useCart` の localStorage 復元 | Vitest + Testing Library | 初回マウントで復元、操作で永続化 |
| `MenuCard` の状態切替 | Vitest + Testing Library | 数量 0 ⇄ 1 で UI が [+] ⇄ [-][1][+] に切り替わる |
| `getOrderPageData` のフィルタ | Vitest（Supabase はモック or 統合） | `is_available=false` が除外される |
| お客様画面全体フロー | Playwright（Step 09 で実装） | 本ステップでは手動確認 |

---

## 5. 対象ファイル一覧

| ファイル | 操作 | 内容 |
|---|---|---|
| `src/app/page.tsx` | 修正 | デフォルトを上書きし、お客様向け案内ページに |
| `src/app/order/[token]/layout.tsx` | 新規 | お客様カラーの wrapper |
| `src/app/order/[token]/page.tsx` | 新規 | Server Component、`getOrderPageData` 呼び出し + 分岐 |
| `src/app/order/[token]/_components/MenuView.tsx` | 新規 | Client、タブ + 一覧 + バー統合 |
| `src/app/order/[token]/_components/ClosedView.tsx` | 新規 | 営業時間外画面 |
| `src/app/order/[token]/_components/InvalidTokenView.tsx` | 新規 | 無効 token 画面 |
| `src/components/order/CategoryTabs.tsx` | 新規 | 横スクロールタブ |
| `src/components/order/MenuCard.tsx` | 新規 | メニューカード |
| `src/components/order/FloatingCartBar.tsx` | 新規 | フローティングバー |
| `src/hooks/useCart.ts` | 新規 | カート hook |
| `src/hooks/cart-reducer.ts` | 新規 | カート状態の純粋関数 |
| `src/hooks/__tests__/cart-reducer.test.ts` | 新規 | reducer ユニットテスト |
| `src/lib/use-cases/customer-menu.ts` | 新規 | お客様向けデータ取得 UseCase |
| `src/lib/use-cases/__tests__/customer-menu.test.ts` | 新規（任意） | UseCase テスト |

---

## 6. MVP スコープ

### 含む

- 上記 2.1〜2.9 すべて
- `useCart` hook と reducer の単体テスト

### 含まない（後続ステップ / Phase 2）

- カート確認画面 `/order/[token]/cart`（Step 06）
- 注文送信（Step 06）
- 品切れ表示 UI（Phase 2）
- メニュー画像のリサイズ・遅延ロード最適化（Phase 2）
- お客様向け独自フォント導入

---

## 7. 未決定事項

| 項目 | 補足 |
|---|---|
| 画像なし時のプレースホルダーアイコンの具体デザイン | 実装時に Lucide の `Coffee` 等を流用予定 |
| ヘッダーのテーブル番号表示の有無 | SPEC §7.1 に記載があるため表示する方針だが、デザイン次第で sticky の扱いを調整 |
| `revalidatePath('/order/...')` の併用 | `force-dynamic` で十分なため当面は併用しない。パフォーマンス問題が出たら再検討 |
