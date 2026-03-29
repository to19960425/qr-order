# 実装仕様書

SPEC.md（全体仕様書）を前提とした、MVP実装のための詳細仕様。
ヒアリングで確定した技術的判断・UI詳細・エッジケースの処理方針をまとめる。

---

## 1. アーキテクチャ方針

### データ取得・更新パターン

**Server Components + クライアントSupabase併用**

| 処理 | 方式 | 理由 |
|---|---|---|
| 初期データ取得（メニュー、テーブル情報） | Server Components で `server.ts` 経由 | SSRで高速表示 |
| 注文送信 | クライアントから `client.ts` 経由で直接INSERT | RLSで保護。Server Actionsを介さずシンプルに |
| リアルタイム監視（注文ダッシュボード） | クライアントで Supabase Realtime | ブラウザ側でしか使えない機能 |
| 管理画面のCRUD（メニュー、テーブル） | クライアントから `client.ts` 経由 | リアルタイムと統一的なパターン |

```
src/lib/supabase/
├── client.ts   # createBrowserClient() — クライアントコンポーネントで使用
└── server.ts   # createServerClient() — Server Components / Route Handlers で使用
```

### UIライブラリ

- **shadcn/ui** をベースコンポーネントとして採用
- Tailwind CSS でカスタマイズ
- お客様側は SPEC.md のカラーパレット（背景 `#F5F0EB`、テキスト `#3C2415`、アクセント `#8B6914`）で上書き

### テスト

| 種別 | ツール | 対象 |
|---|---|---|
| 単体テスト | Vitest + React Testing Library | カート管理ロジック（useCart）、ユーティリティ関数、コンポーネントの基本表示 |
| E2Eテスト | Playwright | 注文フロー全体（メニュー表示→カート→注文確定）、管理画面ログイン→注文確認フロー |

---

## 2. SPEC.md からの変更点

ヒアリングにより、SPEC.md から以下を変更する。

| 項目 | SPEC.mdの記載 | 変更後 | 理由 |
|---|---|---|---|
| お客様側ステータス表示 | 受付済 → 提供済のリアルタイム表示 | **MVPから除外** | 小規模喫茶店では不要。スタッフが直接料理を運ぶ |
| メモ欄（note） | order_items.note カラムあり、カート画面で入力可能 | **UIもDBカラムも除外** | 口頭でスタッフに伝える方が自然。Phase 2で必要なら追加 |
| 注文完了画面 | 注文番号 + ステータス表示 + 追加注文ボタン | 注文番号 + **今回の注文金額** + 追加注文ボタン | ステータス表示を外した分、金額情報を充実 |
| 管理画面ナビゲーション | ヘッダーにリンク（ワイヤーフレーム） | **サイドバー** | タブレットでのタッチ操作性とページ拡張性 |

### 変更後のDBスキーマ（差分）

```sql
-- order_items から note カラムを削除
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  menu_item_id uuid references menu_items(id),
  name text not null,
  price int not null,
  quantity int not null default 1
  -- note カラムなし
);
```

---

## 3. お客様側 実装詳細

### 3.1 メニュー画面 `/order/[token]`

**データ取得フロー:**

1. Server Component で token からテーブル情報を取得
2. `tables.is_active = false` の場合 → 営業時間外画面を表示
3. `tables.is_active = true` の場合 → カテゴリ + メニューアイテムを取得してレンダリング

**カートへの追加:**

- 各メニューカードに [+] ボタン
- タップで1つカートに追加（トースト通知等は不要）
- カートに入っている商品のカードには数量バッジを表示（任意）

**フローティングカートバー:**

- 画面下部に常時表示（カートが空でも表示するが、ボタンは disabled）
- 表示内容: `🛒 カート（N点） ¥X,XXX [注文を確認する]`
- カートの合計点数と合計金額をリアルタイム反映

**ローディング:**

- メニュー初期読み込み中: 画面中央にシンプルなスピナー

### 3.2 カート確認画面 `/order/[token]/cart`

**機能:**

- 各商品の数量変更: [-] [N] [+] ボタン
- 数量が0になったら商品をカートから削除
- 合計金額をリアルタイム計算
- 「注文を確定する」ボタン

**メモ欄はなし**（SPEC.md から変更）

### 3.3 注文確定フロー

```
[注文を確定する] ボタンタップ
    ↓
ボタンを即座に disabled にする（二重送信防止）
スピナーを表示
    ↓
クライアント Supabase で orders + order_items を INSERT
    ↓
┌─ 成功 → /order/[token]/complete に遷移
│          localStorage のカートをクリア
│
└─ 失敗 → エラーメッセージ表示
           「注文に失敗しました。もう一度お試しください」
           [もう一度試す] ボタンを表示
           カートは保持される
```

**注文データの構成:**

```typescript
// orders テーブル
{
  store_id: string,
  table_id: string,
  status: 'new',
  total_amount: number  // カートから計算
}

// order_items テーブル（注文時点のスナップショット）
{
  order_id: string,
  menu_item_id: string,
  name: string,          // menu_items.name のコピー
  price: number,         // menu_items.price のコピー
  quantity: number
}
```

### 3.4 注文完了画面 `/order/[token]/complete`

**表示内容:**

```
注文を受け付けました
注文番号: #42
合計: ¥1,850

[追加注文する]

お支払いはレジにてお願いいたします
```

- 「追加注文する」→ `/order/[token]` にリダイレクト（カートは空の状態）
- ステータス表示なし（MVPから除外）

### 3.5 営業時間外画面

- `tables.is_active = false` の場合に表示
- 「現在注文を受け付けていません」のメッセージのみ
- 他のページへの導線なし

---

## 4. 管理画面 実装詳細

### 4.1 レイアウト

**サイドバーナビゲーション:**

```
┌────────┬─────────────────────────────┐
│ ☕      │                             │
│ QR Order│                             │
│        │                             │
│ 📋 注文 │   コンテンツエリア           │
│ 🍽 メニュー│                          │
│ 🪑 席   │                             │
│        │                             │
│        │                             │
│ ログアウト│                            │
└────────┴─────────────────────────────┘
```

- PC: サイドバー常時表示
- タブレット: サイドバー常時表示（幅を狭くする or アイコンのみ）
- 認証チェックは `src/app/admin/layout.tsx` で行う

### 4.2 ログイン `/admin/login`

- メール + パスワード入力
- Supabase Auth の `signInWithPassword` を使用
- ログイン成功 → `/admin/orders` にリダイレクト
- ログイン失敗 → エラーメッセージ表示
- 認証済みでアクセス → `/admin/orders` にリダイレクト

### 4.3 注文ダッシュボード `/admin/orders`

**2カラムレイアウト:**

| 左カラム: 新規注文 | 右カラム: 完了済み |
|---|---|
| リアルタイム更新 | 当日分のみ表示 |
| 新着順（新しいものが上） | 完了時刻の新しいものが上 |
| [完了にする] ボタン | ステータス変更不可（read-only） |

**リアルタイム更新:**

- Supabase Realtime で `orders` テーブルの INSERT / UPDATE を監視
- 新規注文が入ったら左カラムに即時追加
- **通知音を再生**（ブラウザ自動再生ポリシー対応が必要）

**通知音の実装:**

1. ダッシュボード初回表示時に「通知を有効にする」ボタンを表示
2. ボタンタップで `AudioContext` を初期化（ユーザーインタラクション取得）
3. 以降の新規注文で `/public/notification.mp3` を再生
4. 通知有効状態は `localStorage` に保存し、次回アクセス時は自動で有効化を試みる

**完了済み注文の表示範囲:**

- 当日（0:00〜現在）の完了済み注文のみ表示
- 日付が変わるとリセット（ページリロード時 or 自動更新）

**[完了にする] ボタン:**

- タップで `orders.status` を `'completed'` に UPDATE
- `orders.updated_at` も更新
- UI上で即座に左カラムから右カラムへ移動

### 4.4 メニュー管理 `/admin/menu`

**機能一覧:**

- カテゴリ別にメニューアイテムを表示
- メニューアイテムの追加・編集・削除
- カテゴリの追加・編集・削除
- カテゴリとメニューアイテムの並び替え（上下ボタン）

**画像アップロード:**

- アップロード先: Supabase Storage
- バリデーション:
  - ファイルサイズ上限: 5MB
  - 許可形式: JPEG, PNG, WebP
- リサイズ・圧縮はしない（MVPではそのまま保存）
- 画像URLは `menu_items.image_url` に保存

**並び替え:**

- 各カテゴリ / メニューアイテムに ↑↓ ボタンを配置
- ボタンタップで `sort_order` を入れ替え
- 先頭アイテムの ↑ と末尾アイテムの ↓ は disabled

**削除:**

- 確認ダイアログを表示（「この操作は取り消せません」）
- カテゴリ削除時: 配下のメニューアイテムもカスケード削除（DB側の ON DELETE CASCADE に依存）

### 4.5 席管理 `/admin/tables`

**機能一覧:**

- テーブル一覧表示（テーブル番号、ステータス）
- テーブルの追加・削除
- テーブルの開閉切り替え（is_active トグル）
- QRコード生成・PDFダウンロード

**テーブル開閉:**

- トグルスイッチまたはボタンで `is_active` を切り替え
- オープン: お客様が注文可能
- クローズ: QRコードを読んでも「注文を受け付けていません」画面を表示

**QRコード生成:**

- ライブラリ: `qrcode`（npm）
- URL: `https://{domain}/order/{table_token}`
- クライアント側でQRコードをCanvas/SVGに描画

**PDF生成:**

- ライブラリ: `jsPDF`（npm）
- クライアント側で生成・ダウンロード
- 内容: テーブル番号 + QRコード画像
- 個別テーブルごとにPDFダウンロード

**トークン:**

- テーブル作成時にUUID v4で生成
- **固定**（テーブル開閉で再生成しない）
- QRコードを印刷して席に貼る運用のため、変更すると再印刷が必要

---

## 5. セキュリティ

### RLS（Row Level Security）ポリシー

| テーブル | anon（未認証） | authenticated（管理者） |
|---|---|---|
| `stores` | SELECT | ALL |
| `categories` | SELECT | ALL |
| `menu_items` | SELECT（`is_available = true`） | ALL |
| `tables` | SELECT（`token` 指定のみ） | ALL |
| `orders` | INSERT（token検証付き） | ALL |
| `order_items` | INSERT（order に紐づく） | ALL |

**注文INSERT時のtoken検証:**

- お客様がINSERTする際、`table_id` に対応するテーブルの `is_active = true` であることをRLSまたはDB関数で検証
- クローズ中のテーブルへの注文は拒否

### 認証

- Supabase Auth（メール/パスワード）
- 単一アカウント
- JWT有効期限: デフォルト（1時間、リフレッシュトークンで自動更新）
- 管理画面の全ページで `src/app/admin/layout.tsx` にて認証チェック

---

## 6. インフラ・デプロイ

| 項目 | 構成 |
|---|---|
| フロントエンド | Vercel |
| バックエンド/DB | Supabase Cloud（本番のみ） |
| ローカル開発 | Supabase CLI でローカルDB |
| 環境変数 | `.env.local` に Supabase URL + anon key |

---

## 7. 対象ファイル一覧

SPEC.md のディレクトリ構成に基づき、作成が必要なファイルと役割を一覧化する。

### 設定・初期化

| ファイル | 種別 | 概要 |
|---|---|---|
| `package.json` | 新規 | 依存関係定義（Next.js, Tailwind, Supabase, shadcn/ui, qrcode, jsPDF, Vitest, Playwright） |
| `next.config.ts` | 新規 | Next.js設定 |
| `tailwind.config.ts` | 新規 | Tailwind設定（カスタムカラー定義含む） |
| `tsconfig.json` | 新規 | TypeScript設定 |
| `.env.local.example` | 新規 | 環境変数テンプレート（SUPABASE_URL, SUPABASE_ANON_KEY） |
| `.gitignore` | 新規 | Node, Next.js, 環境変数ファイルの除外 |
| `components.json` | 新規 | shadcn/ui 設定 |

### Supabase

| ファイル | 種別 | 概要 |
|---|---|---|
| `supabase/migrations/001_initial.sql` | 新規 | stores, tables, categories, menu_items, orders, order_items テーブル作成 + RLSポリシー |
| `supabase/seed.sql` | 新規 | 初期データ（店舗、カテゴリ、サンプルメニュー） |
| `src/lib/supabase/client.ts` | 新規 | `createBrowserClient()` — クライアント用Supabaseクライアント |
| `src/lib/supabase/server.ts` | 新規 | `createServerClient()` — Server Components / Route Handlers 用 |
| `src/types/database.ts` | 新規 | Supabase CLI で自動生成する型定義 |

### お客様側

| ファイル | 種別 | 概要 |
|---|---|---|
| `src/app/layout.tsx` | 新規 | ルートレイアウト（フォント、メタデータ） |
| `src/app/page.tsx` | 新規 | トップページ（リダイレクト or 案内） |
| `src/app/order/[token]/page.tsx` | 新規 | メニュー一覧ページ（Server Component → Client Componentに初期データ渡し） |
| `src/app/order/[token]/cart/page.tsx` | 新規 | カート確認・注文確定ページ |
| `src/app/order/[token]/complete/page.tsx` | 新規 | 注文完了ページ |
| `src/components/order/MenuCard.tsx` | 新規 | メニューカード（写真大きめ、[+]ボタン） |
| `src/components/order/CategoryTabs.tsx` | 新規 | カテゴリ横スクロールタブ |
| `src/components/order/FloatingCartBar.tsx` | 新規 | フローティングカートバー（点数・金額・確認ボタン） |
| `src/components/order/CartItem.tsx` | 新規 | カート内商品（数量変更UI） |
| `src/hooks/useCart.ts` | 新規 | カート状態管理（useState + localStorage、テーブルトークンごとに分離） |

### 管理画面

| ファイル | 種別 | 概要 |
|---|---|---|
| `src/app/admin/layout.tsx` | 新規 | 管理画面レイアウト（認証チェック + サイドバーナビ） |
| `src/app/admin/login/page.tsx` | 新規 | ログインページ |
| `src/app/admin/orders/page.tsx` | 新規 | 注文ダッシュボード（2カラム、リアルタイム） |
| `src/app/admin/menu/page.tsx` | 新規 | メニュー管理（CRUD + 画像アップロード + 並び替え） |
| `src/app/admin/tables/page.tsx` | 新規 | 席管理（CRUD + 開閉 + QR生成 + PDF） |
| `src/components/admin/OrderCard.tsx` | 新規 | 注文カード（テーブル番号、注文内容、[完了にする]ボタン） |
| `src/components/admin/OrderBoard.tsx` | 新規 | 注文ボード（2カラムレイアウト） |
| `src/components/admin/Sidebar.tsx` | 新規 | サイドバーナビゲーション |
| `src/hooks/useRealtimeOrders.ts` | 新規 | Supabase Realtime で orders テーブル監視 |

### 共通

| ファイル | 種別 | 概要 |
|---|---|---|
| `src/components/ui/` | 新規 | shadcn/ui コンポーネント群（Button, Dialog, Input, Toast 等） |
| `src/lib/utils.ts` | 新規 | ユーティリティ（価格フォーマット、cn関数等） |
| `public/notification.mp3` | 新規 | 通知音ファイル |

### テスト

| ファイル | 種別 | 概要 |
|---|---|---|
| `vitest.config.ts` | 新規 | Vitest 設定 |
| `playwright.config.ts` | 新規 | Playwright 設定 |
| `src/hooks/__tests__/useCart.test.ts` | 新規 | カート管理ロジックのテスト |
| `e2e/order-flow.spec.ts` | 新規 | 注文フローE2E（メニュー表示→カート→注文確定） |
| `e2e/admin-flow.spec.ts` | 新規 | 管理画面E2E（ログイン→注文確認→完了） |

---

## 8. 未決定事項・今後の検討事項

| 項目 | 補足 |
|---|---|
| メニュー画像のリサイズ・圧縮 | MVPでは行わない。表示速度に問題が出たら Phase 2 で対応 |
| 注文のレート制限 | RLSでの基本制御のみ。悪意あるアクセスが問題になったら対応 |
| テーブルクローズ時の既存注文の扱い | クローズしても過去の注文データは残る。リセットの要否は運用後に判断 |
| 通知音が鳴らない場合のフォールバック | ブラウザ制限で音が鳴らない場合、ビジュアル通知（バッジ、画面フラッシュ等）を検討 |
| 売上集計・レポート | Phase 2 以降。DB にデータはあるので後から集計可能 |
| メモ欄（note）の復活 | 運用後にニーズがあれば Phase 2 でDBカラム追加 + UI実装 |
| お客様側ステータス表示の復活 | 運用後に「まだかな」問題が出たら Phase 2 で対応 |
