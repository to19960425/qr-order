# QRコード注文アプリ - 仕様書

SPEC.md（旧）・IMPLEMENTATION_SPEC.md・IMPLEMENTATION_DECISIONS.md を統合した最終仕様書。

---

## 1. プロジェクト概要

喫茶店の各席に設置されたQRコードを読み込み、スマホのブラウザからメニューを閲覧・注文できるWebアプリ。
特定の1店舗（喫茶店）専用。支払いはレジで直接行う。アプリのインストールは不要。

### 開発モチベーション

- Next.js / Supabase の学習とポートフォリオ作成
- 実際の喫茶店での実運用も視野に入れる

### ゴール範囲

Phase 1（MVP）のみ。Phase 2以降は運用後に判断する。

---

## 2. 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | Next.js 15 (App Router) + TypeScript |
| スタイリング | Tailwind CSS + shadcn/ui |
| バックエンド/DB | Supabase (PostgreSQL) |
| リアルタイム通知 | Supabase Realtime |
| 画像ストレージ | Supabase Storage |
| デプロイ | Vercel + Supabase Cloud |
| QRコード生成 | qrcode (npm) |
| PDF生成 | jsPDF (npm) |
| テスト | Vitest + React Testing Library（単体）、Playwright（E2E） |

---

## 3. ターゲット店舗プロファイル

| 項目 | 値 |
|---|---|
| 業態 | 喫茶店 |
| テーブル数 | 6〜15席 |
| メニュー規模 | 中規模（20〜50品）、カテゴリ4〜6 |
| 注文回数 | 少ない（1〜2回/テーブル） |
| 滞在時間 | 2〜3時間程度（長時間滞在もあり得る） |
| 客単価 | 割高（喫茶店価格帯） |
| 外国人客 | 少ない（日本語のみでOK） |

---

## 4. ユーザーと認証

| ユーザー | 認証方式 |
|---|---|
| お客様 | 認証なし（QRコードのトークンで席を識別） |
| 店舗スタッフ | Supabase Auth（メール/パスワード）、**単一アカウント** |

- 管理画面は**PCとタブレット両方**で使用（レスポンシブ対応必須）
- スタッフのITリテラシーは**一般レベル**（直感的でシンプルなUI必須）

### 認証方式

- **Next.js Middleware** (`middleware.ts`) で `/admin/*` へのアクセスを一括保護
- Supabase 公式推奨パターン（`@supabase/ssr`）に準拠
- ページ描画前にリダイレクトするため、未認証コンテンツのフラッシュが発生しない
- 管理者アカウントは Supabase Dashboard から手動作成

```typescript
// middleware.ts
export const config = {
  matcher: ['/admin/((?!login).*)'],
}
```

---

## 5. 設計判断サマリー

| 項目 | 決定 | 理由 |
|---|---|---|
| 同時アクセス | 端末ごとに独立 | 喫茶店は1-2名利用が多く、共有カートの実装コストに見合わない |
| 注文キャンセル | アプリ内キャンセル不可 | 口頭でスタッフに依頼。シンプルさ優先 |
| セッション管理 | スタッフが手動で開閉 | 来店時にオープン、会計後にクローズ。一般的なQRオーダーの主流方式 |
| 注文ステータス | 新規→完了の2段階 | 喫茶店規模では細かいステータス管理は不要 |
| メモ欄 | **MVPから除外** | 口頭でスタッフに伝える方が自然。Phase 2で必要なら追加 |
| お客様側ステータス表示 | **MVPから除外** | 小規模喫茶店ではスタッフが直接料理を運ぶ。Phase 2で検討 |
| 会計フロー | お支払いはレジにて | 会計依頼機能なし。支払いは完全にレジ対応 |
| 追加注文 | 完了画面から再注文可能 | QR再読みでも新規注文可能 |
| メニュー画像 | 必須（全品に写真） | 喫茶店は見た目が重要。写真前提のUI設計 |
| 品切れ管理 | DB設計に含めるがUI実装は後回し | `is_available` フラグは持つが、MVPでは全品提供可能前提 |
| 通知 | 画面更新＋通知音 | ブラウザ自動再生ポリシーに注意が必要 |
| マルチ店舗 | 1店舗専用 | DB設計で `store_id` は持つが、マルチテナント機能は不要 |
| 多言語 | 日本語のみ | Phase 2以降で検討 |

---

## 6. アーキテクチャ方針

### データ取得・更新パターン

**Server Components + クライアントSupabase併用**

| 処理 | 方式 | 理由 |
|---|---|---|
| 初期データ取得（メニュー、テーブル情報） | Server Components で `server.ts` 経由 | SSRで高速表示 |
| 注文送信 | クライアントから `client.ts` 経由で RPC 呼び出し | トランザクション保護 |
| リアルタイム監視（注文ダッシュボード） | クライアントで Supabase Realtime | ブラウザ側でしか使えない機能 |
| 管理画面のCRUD（メニュー、テーブル） | クライアントから `client.ts` 経由 | リアルタイムと統一的なパターン |

```
src/lib/supabase/
├── client.ts   # createBrowserClient() — クライアントコンポーネントで使用
└── server.ts   # createServerClient() — Server Components / Route Handlers で使用
```

---

## 7. 画面設計

### 7.1 お客様側（モバイル前提）

#### デザイン方針

- **ナチュラル・温かみ系**
- カラー: `#F5F0EB`（背景）、`#3C2415`（テキスト）、`#8B6914`（アクセント）
- フォント: 丸みのあるセリフ体
- 喫茶店の落ち着いた雰囲気に合うデザイン

#### A. メニュー画面 `/order/[token]`

**データ取得フロー:**

1. Server Component で token からテーブル情報を取得
2. `tables.is_active = false` の場合 → 営業時間外画面を表示
3. `tables.is_active = true` の場合 → カテゴリ + メニューアイテムを取得してレンダリング

```
┌─────────────────────────┐
│  ☕ テーブル 5            │
├─────────────────────────┤
│ [コーヒー][紅茶][フード][デザート] ← カテゴリタブ（横スクロール）
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │  [写真が大きく表示]  │ │
│ │                     │ │
│ │  カフェラテ          │ │
│ │  ブラジル産豆の...   │ │
│ │  ¥650          [+]  │ │
│ └─────────────────────┘ │
├─────────────────────────┤
│ 🛒 カート（3点） ¥1,650  │ ← フローティングバー
│      [注文を確認する]    │
└─────────────────────────┘
```

**メニューカードの状態:**

```
■ カートに未追加時:
┌─────────────────────┐
│  [写真が大きく表示]  │
│                     │
│  カフェラテ          │
│  ブラジル産豆の...   │
│  ¥650          [+]  │
└─────────────────────┘

■ カートに追加済み:
┌─────────────────────┐
│  [写真が大きく表示]  │
│                 [x2]│
│  カフェラテ          │
│  ブラジル産豆の...   │
│  ¥650      [-][2][+]│
└─────────────────────┘
```

- カートに未追加: [+] ボタンのみ
- カートに追加済み: 右上に数量バッジ、価格横に [-][N][+] コントロール
- [-] で数量が0になったらカートから削除

**フローティングカートバー:**

- 画面下部に常時表示（カートが空でも表示するが、ボタンは disabled）
- 表示内容: `🛒 カート（N点） ¥X,XXX [注文を確認する]`
- カートの合計点数と合計金額をリアルタイム反映

**ローディング:** 画面中央にシンプルなスピナー

#### B. カート確認画面 `/order/[token]/cart`

```
┌─────────────────────────┐
│  ← 注文内容の確認        │
├─────────────────────────┤
│ カフェラテ      x2 ¥1,300│
│   [-] [2] [+]           │
│ チーズケーキ    x1   ¥550│
│   [-] [1] [+]           │
├─────────────────────────┤
│ 合計           ¥1,850    │
├─────────────────────────┤
│    [注文を確定する]       │
└─────────────────────────┘
```

- 各商品の数量変更: [-] [N] [+] ボタン
- 数量が0になったら商品をカートから削除
- 合計金額をリアルタイム計算
- メモ欄なし

#### C. 注文確定フロー

```
[注文を確定する] ボタンタップ
    ↓
ボタンを即座に disabled にする（二重送信防止）
スピナーを表示
    ↓
クライアント Supabase で RPC (create_order) を呼び出し
    ↓
┌─ 成功 → /order/[token]/complete に遷移
│          localStorage のカートをクリア
│
└─ 失敗 → エラーメッセージ表示
           「注文に失敗しました。もう一度お試しください」
           [もう一度試す] ボタンを表示
           カートは保持される
```

#### D. 注文完了画面 `/order/[token]/complete`

```
┌─────────────────────────┐
│                         │
│    注文を受け付けました    │
│                         │
│  [追加注文する]           │
│                         │
│  お支払いはレジにて       │
│  お願いいたします         │
└─────────────────────────┘
```

- **静的ページ**（データ取得不要）
- 注文番号・金額は表示しない（小規模喫茶店では不要）
- 「追加注文する」→ `/order/[token]` にリダイレクト（カートは空の状態）

#### E. 営業時間外画面

- `tables.is_active = false` の場合に表示
- 「現在注文を受け付けていません」のメッセージのみ
- 他のページへの導線なし

### 7.2 店舗管理側（PC + タブレット）

#### レイアウト

**サイドバーナビゲーション（PC・タブレット両方で常時表示、アイコン+ラベル）:**

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

- 折りたたみやハンバーガーメニューは不要

#### F. ログイン `/admin/login`

- メール + パスワード入力
- Supabase Auth の `signInWithPassword` を使用
- ログイン成功 → `/admin/orders` にリダイレクト
- ログイン失敗 → エラーメッセージ表示
- 認証済みでアクセス → `/admin/orders` にリダイレクト

#### G. 注文ダッシュボード `/admin/orders`

**2カラムレイアウト:**

```
┌──────────────────┬───────────────────────┐
│ 新規注文 (3)     │ 完了済み              │
├──────────────────┤                       │
│ #45              │ #41 テーブル1 14:15   │
│ テーブル3 14:32  │ #40 テーブル5 13:50   │
│ ──────           │                       │
│ カフェラテ x2    │                       │
│ チーズケーキ x1  │                       │
│ ¥1,850           │                       │
│ [完了にする]     │                       │
├──────────────────┤                       │
│ #44              │                       │
│ テーブル7 14:28  │                       │
│ ...              │                       │
└──────────────────┴───────────────────────┘
```

| 左カラム: 新規注文 | 右カラム: 完了済み |
|---|---|
| リアルタイム更新 | 当日分のみ表示（0:00〜現在） |
| 新着順（新しいものが上） | 完了時刻の新しいものが上 |
| [完了にする] ボタン | ステータス変更不可（read-only） |

**リアルタイム更新:**

- Supabase Realtime で `orders` テーブルの INSERT / UPDATE を監視
- 新規注文が入ったら左カラムに即時追加

**通知音の実装:**

1. ダッシュボード初回表示時に「通知を有効にする」ボタンを表示
2. ボタンタップで `AudioContext` を初期化（ユーザーインタラクション取得）
3. 以降の新規注文で `/public/notification.mp3` を再生
4. 通知有効状態は `localStorage` に保存し、次回アクセス時は自動で有効化を試みる

**[完了にする] ボタン:**

- タップで `orders.status` を `'completed'` に UPDATE（`updated_at` も自動更新）
- UI上で即座に左カラムから右カラムへ移動

#### H. メニュー管理 `/admin/menu`

- カテゴリ別にメニューアイテムを表示
- メニューアイテムの追加・編集・削除（**モーダル形式**、ページ遷移なし）
- カテゴリの追加・編集・削除（**メニュー管理ページ内に統合**）
- カテゴリとメニューアイテムの並び替え（↑↓ ボタン）

**画像アップロード:**

- アップロード先: Supabase Storage（バケット名: `menu-images`、パブリック）
- ファイル命名: `{uuid}.{拡張子}`
- バリデーション: ファイルサイズ上限 5MB、許可形式 JPEG / PNG / WebP
- リサイズ・圧縮はしない（MVPではそのまま保存）

**並び替え:**

- 各カテゴリ / メニューアイテムに ↑↓ ボタン
- ボタンタップで `sort_order` を入れ替え
- 先頭の ↑ と末尾の ↓ は disabled

**削除:**

- 確認ダイアログを表示（「この操作は取り消せません」）
- カテゴリ削除時: 配下のメニューアイテムもカスケード削除（DB側の ON DELETE CASCADE）

#### I. 席管理 `/admin/tables`

- テーブル一覧表示（テーブル番号、ステータス）
- テーブルの追加・削除
- テーブルの開閉切り替え（`is_active` トグル）
- QRコード生成・PDFダウンロード

**テーブル追加:**

- 自動採番（既存テーブルの最大番号 + 1）

**テーブル開閉:**

- トグルスイッチで `is_active` を切り替え
- オープン: お客様が注文可能
- クローズ: QRコードを読んでも「注文を受け付けていません」画面を表示

**QRコード:**

- ライブラリ: `qrcode`（npm）
- URL: `{NEXT_PUBLIC_APP_URL}/order/{table_token}`
- クライアント側でQRコードをCanvas/SVGに描画

**PDF:**

- ライブラリ: `jsPDF`（npm）
- クライアント側で生成・ダウンロード
- 内容: テーブル番号 + QRコード画像
- 個別テーブルごとにPDFダウンロード

**トークン:**

- テーブル作成時にUUID v4で生成、**固定**（開閉で再生成しない）
- QRコードを印刷して席に貼る運用のため、変更すると再印刷が必要

---

## 8. データベース設計

### テーブル定義

```sql
-- 店舗（1店舗専用だが、DB設計としてはstore_idを持つ）
CREATE TABLE stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 席
CREATE TABLE tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  table_number int NOT NULL,
  token uuid UNIQUE DEFAULT gen_random_uuid(),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(store_id, table_number)
);

-- カテゴリ
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- メニュー
CREATE TABLE menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price int NOT NULL,
  image_url text,
  is_available boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 注文
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  table_id uuid REFERENCES tables(id) ON DELETE SET NULL,
  order_number serial,
  status text DEFAULT 'new' CHECK (status IN ('new', 'completed')),
  total_amount int NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 注文明細（注文時点のスナップショット）
CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES menu_items(id),
  name text NOT NULL,
  price int NOT NULL,
  quantity int NOT NULL DEFAULT 1
);
```

### updated_at 自動更新トリガー

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

### 注文作成 RPC

```sql
CREATE FUNCTION create_order(
  p_store_id uuid,
  p_table_id uuid,
  p_items jsonb
) RETURNS uuid AS $$
DECLARE
  v_order_id uuid;
  v_total int;
  v_is_active boolean;
BEGIN
  SELECT is_active INTO v_is_active
  FROM tables WHERE id = p_table_id;

  IF NOT v_is_active THEN
    RAISE EXCEPTION 'テーブルは現在クローズ中です';
  END IF;

  SELECT SUM(
    (item->>'price')::int * (item->>'quantity')::int
  ) INTO v_total
  FROM jsonb_array_elements(p_items) item;

  INSERT INTO orders (store_id, table_id, status, total_amount)
  VALUES (p_store_id, p_table_id, 'new', v_total)
  RETURNING id INTO v_order_id;

  INSERT INTO order_items (order_id, menu_item_id, name, price, quantity)
  SELECT
    v_order_id,
    (item->>'menu_item_id')::uuid,
    item->>'name',
    (item->>'price')::int,
    (item->>'quantity')::int
  FROM jsonb_array_elements(p_items) item;

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### ステータス遷移

```
new（新規） → completed（完了）
```

### 注文番号

- `orders.order_number` は `serial` 型で通し番号
- 日次リセットなし
- お客様側には表示しない
- 管理画面の注文ダッシュボードで表示

### RLS（Row Level Security）ポリシー

| テーブル | anon（未認証） | authenticated（管理者） |
|---|---|---|
| `stores` | SELECT | ALL |
| `categories` | SELECT | ALL |
| `menu_items` | SELECT（`is_available = true`） | ALL |
| `tables` | SELECT（`token` 指定のみ） | ALL |
| `orders` | INSERT は `create_order` RPC 経由 | ALL |
| `order_items` | INSERT は `create_order` RPC 経由 | ALL |

### テーブルクローズ時の二重ガード

- **DB側**: `create_order` RPC 内で `tables.is_active` を検証（確実なガード）
- **クライアント側**: 注文確定ボタン押下時にも `is_active` をチェック（UX的なガード）
- エラーメッセージ: 「現在このテーブルでは注文を受け付けていません」

---

## 9. カート管理

- ブラウザの `useState` + `localStorage` で管理
- テーブルトークンごとにカートを分離
- DBにカートは保存しない（注文確定時のみDBへ書き込み）
- カートへの追加/削除/数量変更
- ブラウザリロード対応（localStorage永続化）

---

## 10. Supabase Storage

- バケット名: `menu-images`（パブリック）
- ファイル命名: `{uuid}.{拡張子}`
- メニュー画像は機密情報ではないため、パブリックアクセスで問題なし

---

## 11. QRコード

### URL構造

```
{NEXT_PUBLIC_APP_URL}/order/{table_token}
```

- `table_token` はUUID v4（推測不可能）
- トークンから席→店舗を特定
- テーブルがクローズ中の場合は「注文を受け付けていません」を表示

---

## 12. セッション管理（テーブル開閉）

```
来店 → スタッフがテーブルを「オープン」
  ↓
お客様がQRを読み取って注文
  ↓
会計完了 → スタッフがテーブルを「クローズ」
```

- `tables.is_active` フラグで制御
- クローズ中にQRを読んだ場合: 「現在注文を受け付けていません」画面を表示

---

## 13. トップページ

- `/` にアクセスした場合: 「QRコードを読み取って注文してください」等のシンプルな案内ページ
- 管理者向けのログインリンクは配置しない（`/admin/login` は直接アクセス）

---

## 14. デプロイ・環境

| 項目 | 構成 |
|---|---|
| フロントエンド | Vercel |
| バックエンド/DB | Supabase Cloud |
| ローカル開発 | Supabase Cloud を直接使用（Docker不要） |

### 環境変数

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
NEXT_PUBLIC_APP_URL=https://xxx.vercel.app
```

### 管理者アカウントのセットアップ

1. Supabase Dashboard にログイン
2. Authentication > Users に移動
3. 「Add user」からメールアドレスとパスワードを入力して作成

---

## 15. テスト方針

| 種別 | ツール | 対象 |
|---|---|---|
| 単体テスト | Vitest + React Testing Library | カート管理ロジック（useCart）、ユーティリティ関数、コンポーネントの基本表示 |
| E2Eテスト | Playwright | 注文フロー全体、管理画面フロー |

- 単体テストを先行して実装
- E2Eテストは全機能完成後に追加

---

## 16. MVP（Phase 1）スコープ

### 含まれるもの

- [x] お客様: QRコード読み取り → メニュー表示（カード型・写真大きめ）
- [x] お客様: カテゴリタブでの絞り込み
- [x] お客様: カートに追加（数量変更）
- [x] お客様: 注文確認 → 注文送信
- [x] お客様: 注文完了画面（確認メッセージ + 追加注文ボタン）
- [x] お客様: 営業時間外（テーブルクローズ中）の案内画面
- [x] 管理: ログイン（単一アカウント）
- [x] 管理: 注文ダッシュボード（リアルタイム更新 + 通知音）
- [x] 管理: 注文ステータス変更（新規→完了）
- [x] 管理: メニューCRUD（画像アップロード含む）
- [x] 管理: カテゴリ管理
- [x] 管理: 席管理（追加・削除・開閉）
- [x] 管理: QRコード生成・PDF印刷

### 含まれないもの（Phase 2以降）

- 品切れ管理UI
- メモ欄（note）
- お客様側ステータス表示
- メニューカスタマイズ（構造化オプション）
- 多言語対応
- マルチ店舗対応
- PWA対応
- レシートプリンター連携
- LINE通知連携
- 日別売上サマリー

---

## 17. ディレクトリ構成

```
qr-order/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                          # トップページ（QR読み取り案内）
│   │   ├── order/
│   │   │   └── [token]/
│   │   │       ├── page.tsx                  # メニュー一覧
│   │   │       ├── cart/
│   │   │       │   └── page.tsx              # カート確認
│   │   │       └── complete/
│   │   │           └── page.tsx              # 注文完了（静的）
│   │   └── admin/
│   │       ├── layout.tsx                    # サイドバーナビ
│   │       ├── orders/
│   │       │   └── page.tsx                  # 注文ダッシュボード
│   │       ├── menu/
│   │       │   └── page.tsx                  # メニュー管理（カテゴリ管理含む）
│   │       ├── tables/
│   │       │   └── page.tsx                  # 席管理・QR生成
│   │       └── login/
│   │           └── page.tsx                  # ログイン
│   ├── components/
│   │   ├── ui/                               # shadcn/ui コンポーネント群
│   │   ├── order/                            # 注文関連コンポーネント
│   │   │   ├── MenuCard.tsx
│   │   │   ├── CartItem.tsx
│   │   │   ├── CategoryTabs.tsx
│   │   │   └── FloatingCartBar.tsx
│   │   └── admin/                            # 管理画面コンポーネント
│   │       ├── OrderCard.tsx
│   │       ├── OrderBoard.tsx
│   │       └── Sidebar.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                     # ブラウザ用クライアント
│   │   │   └── server.ts                     # サーバー用クライアント
│   │   └── utils.ts                          # ユーティリティ（cn関数、価格フォーマット等）
│   ├── hooks/
│   │   ├── useCart.ts                        # カート状態管理（localStorage）
│   │   └── useRealtimeOrders.ts              # リアルタイム注文監視
│   ├── middleware.ts                          # 認証ミドルウェア
│   └── types/
│       └── database.ts                       # Supabase型定義（自動生成）
├── supabase/
│   ├── migrations/
│   │   └── 001_initial.sql                   # テーブル作成 + RLS + RPC
│   └── seed.sql                              # 初期データ
├── public/
│   └── notification.mp3                      # 通知音
├── docs/
│   ├── README.md
│   ├── SPEC.md                               # 本ドキュメント
│   └── steps/                                # 実装ステップ
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── next.config.ts
├── components.json                           # shadcn/ui 設定
├── vitest.config.ts
├── playwright.config.ts
├── .env.local.example
└── .gitignore
```

---

## 18. 開発順序

1. **Supabase セットアップ** - プロジェクト作成、テーブル作成、RLS設定、初期データ投入
2. **認証** - Middleware + ログインページ
3. **管理画面: メニュー管理** - CRUD + 画像アップロード + カテゴリ管理
4. **管理画面: 席管理** - テーブルCRUD + 開閉機能 + QRコード生成
5. **お客様側: メニュー表示** - カテゴリタブ + カード型レイアウト
6. **お客様側: カート + 注文送信** - localStorage管理 + 注文確定
7. **お客様側: 注文完了** - 静的完了ページ
8. **管理画面: 注文ダッシュボード** - リアルタイム更新 + 通知音 + ステータス変更
9. **テスト** - 単体テスト + E2Eテスト
10. **デプロイ** - Vercel + Supabase Cloud

---

## 19. 未決定事項・今後の検討事項

| 項目 | 補足 |
|---|---|
| メニュー画像のリサイズ・圧縮 | MVPでは行わない。表示速度に問題が出たら Phase 2 で対応 |
| 注文のレート制限 | RLSでの基本制御のみ。悪意あるアクセスが問題になったら対応 |
| テーブルクローズ時の既存注文の扱い | クローズしても過去の注文データは残る。リセットの要否は運用後に判断 |
| 通知音が鳴らない場合のフォールバック | ビジュアル通知（バッジ、画面フラッシュ等）を Phase 2 で検討 |
| 売上集計・レポート | Phase 2 以降。DB にデータはあるので後から集計可能 |
| 通知音ファイルの調達 | フリー素材から選定。ファイルサイズは小さくする |
| カスタムドメインの取得時期 | 本番運用開始前に取得。QRコード印刷前に確定が必要 |
| `create_order` RPC のセキュリティレビュー | `SECURITY DEFINER` 使用のため、anon呼び出し可否の精査が必要 |
| Supabase Storage バケット作成 | マイグレーションとは別に Dashboard or CLI で作成 |
