# QRコード注文アプリ - 仕様書

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
| フロントエンド | Next.js (App Router) + TypeScript |
| スタイリング | Tailwind CSS |
| バックエンド/DB | Supabase (PostgreSQL) |
| リアルタイム通知 | Supabase Realtime |
| 画像ストレージ | Supabase Storage |
| デプロイ | Vercel + Supabase Cloud |
| QRコード生成 | qrcode (npm) |
| テスト | しっかりテストを書く方針（単体テスト + 主要フローのE2Eテスト） |

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

---

## 5. 設計判断サマリー

| 項目 | 決定 | 理由 |
|---|---|---|
| 同時アクセス | 端末ごとに独立 | 喫茶店は1-2名利用が多く、共有カートの実装コストに見合わない |
| 注文キャンセル | アプリ内キャンセル不可 | 口頭でスタッフに依頼。シンプルさ優先 |
| セッション管理 | スタッフが手動で開閉 | 来店時にオープン、会計後にクローズ。一般的なQRオーダーの主流方式 |
| 注文ステータス | 新規→完了の2段階 | 喫茶店規模では細かいステータス管理は不要 |
| カスタマイズ | なし（メモ欄で対応） | noteフィールドに自由記述。構造化オプションはPhase 2以降 |
| 会計フロー | お客様側に合計表示のみ | 会計依頼機能なし。支払いは完全にレジ対応 |
| 追加注文 | あれば便利程度 | QR再読みで新規注文可能。専用の導線はMVPでは低優先 |
| メニュー画像 | 必須（全品に写真） | 喫茶店は見た目が重要。写真前提のUI設計 |
| 品切れ管理 | DB設計に含めるがUI実装は後回し | is_availableフラグは持つが、MVPでは全品提供可能前提 |
| 通知 | 画面更新＋通知音 | ブラウザ自動再生ポリシーに注意が必要 |
| マルチ店舗 | 1店舗専用 | DB設計でstore_idは持つが、マルチテナント機能は不要 |
| 多言語 | 日本語のみ | Phase 2以降で検討 |
| お客様側ステータス表示 | 簡易表示（受付済/提供済） | 「まだかな」の不安を軽減 |

---

## 6. 画面設計

### 6.1 お客様側（モバイル前提）

#### デザイン方針

- **ナチュラル・温かみ系**
- カラー: `#F5F0EB`（背景）、`#3C2415`（テキスト）、`#8B6914`（アクセント）
- フォント: 丸みのあるセリフ体
- 喫茶店の落ち着いた雰囲気に合うデザイン

#### 画面一覧

**A. メニュー画面** `/order/[token]`

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
│ ┌─────────────────────┐ │
│ │  [写真が大きく表示]  │ │
│ │  ...                │ │
│ └─────────────────────┘ │
├─────────────────────────┤
│ 🛒 カート（3点） ¥1,650  │ ← フローティングバー
│      [注文を確認する]    │
└─────────────────────────┘
```

- カード型レイアウト（写真大きめ）
- カテゴリタブで絞り込み
- フローティングカートバーは常時表示

**B. カート・注文確認画面** `/order/[token]/cart`

```
┌─────────────────────────┐
│  ← 注文内容の確認        │
├─────────────────────────┤
│ カフェラテ      x2 ¥1,300│
│   [-] [2] [+]           │
│ チーズケーキ    x1   ¥550│
│   [-] [1] [+]           │
│ メモ: [ホットで]         │
├─────────────────────────┤
│ 合計           ¥1,850    │
├─────────────────────────┤
│    [注文を確定する]       │
└─────────────────────────┘
```

- 数量変更・削除可能
- 商品ごとにメモ（note）入力可能
- 合計金額表示

**C. 注文完了画面** `/order/[token]/complete`

```
┌─────────────────────────┐
│                         │
│    注文を受け付けました    │
│    注文番号: #42          │
│    ステータス: 受付済      │
│                         │
│  [追加注文する]           │
│                         │
│  お支払いはレジにて       │
│  お願いいたします         │
└─────────────────────────┘
```

- 注文番号表示
- 簡易ステータス表示（受付済 → 提供済）
- 追加注文への導線

**D. 営業時間外画面**（テーブルがクローズ中）

```
┌─────────────────────────┐
│                         │
│  現在注文を受け付けて     │
│  いません                │
│                         │
└─────────────────────────┘
```

### 6.2 店舗管理側（PC + タブレット、レスポンシブ）

#### 画面一覧

**E. ログイン画面** `/admin/login`

- メール/パスワード入力
- 単一アカウント

**F. 注文ダッシュボード** `/admin/orders`

```
┌──────────────────────────────────────────┐
│ 注文管理         [メニュー管理] [席管理]  │
├──────────────────┬───────────────────────┤
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

- 2カラム: 新規注文 / 完了済み
- 新規注文はリアルタイム更新 + **通知音**
- ワンタップで「完了」に変更
- タブレットでもタッチしやすいボタンサイズ

**G. メニュー管理** `/admin/menu`

- メニュー一覧（カテゴリ別）
- CRUD操作: 追加・編集・削除
- カテゴリ管理（追加・編集・削除・並び替え）
- 画像アップロード（Supabase Storage）
- 並び替え（sort_order）

**H. 席管理** `/admin/tables`

- テーブル一覧
- テーブルの追加・削除
- テーブルの開閉（オープン/クローズ切り替え）
- QRコード生成・印刷（PDF形式でダウンロード）

---

## 7. データベース設計

### テーブル定義

```sql
-- 店舗（1店舗専用だが、DB設計としてはstore_idを持つ）
create table stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz default now()
);

-- 席
create table tables (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores(id) on delete cascade,
  table_number int not null,
  token uuid unique default gen_random_uuid(),
  is_active boolean default true,    -- テーブル開閉フラグ
  created_at timestamptz default now(),
  unique(store_id, table_number)
);

-- カテゴリ
create table categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores(id) on delete cascade,
  name text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- メニュー
create table menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete cascade,
  store_id uuid references stores(id) on delete cascade,
  name text not null,
  description text,
  price int not null,                -- 円単位（整数）
  image_url text,
  is_available boolean default true, -- 品切れフラグ（MVP後に活用）
  sort_order int default 0,
  created_at timestamptz default now()
);

-- 注文
create table orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores(id) on delete cascade,
  table_id uuid references tables(id),
  order_number serial,
  status text default 'new' check (status in ('new', 'completed')),
  total_amount int not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 注文明細
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  menu_item_id uuid references menu_items(id),
  name text not null,                -- 注文時点のメニュー名を保存
  price int not null,                -- 注文時点の価格を保存
  quantity int not null default 1,
  note text                          -- 「ホットで」「ミルク多め」等
);
```

### ステータス遷移

```
new（新規） → completed（完了）
```

- お客様側表示: 受付済 → 提供済
- 店舗側表示: 新規 → 完了

### RLS（Row Level Security）

```sql
-- メニュー: is_available=true のものは誰でも閲覧可能
-- テーブル: is_active=true かつ token一致で注文作成可能
-- 注文: 未認証ユーザーはINSERTのみ
-- 管理者: 認証済みスタッフは自店舗の全データを操作可能
```

---

## 8. カート管理

- ブラウザの `useState` + `localStorage` で管理
- テーブルトークンごとにカートを分離
- DBにカートは保存しない（注文確定時のみDBへ書き込み）
- カートへの追加/削除/数量変更
- ブラウザリロード対応（localStorage永続化）

---

## 9. リアルタイム通知

### 仕組み

- Supabase Realtime で `orders` テーブルの変更を監視
- 新規注文時: 管理画面に即時反映 + **通知音**を再生
- ステータス変更時: お客様側の簡易ステータス表示を更新

### 通知音の注意点

- ブラウザの自動再生ポリシーにより、ユーザー操作なしで音声再生が制限される
- 管理画面初回アクセス時に「通知を有効にする」ボタンを設け、ユーザーインタラクションを取得する

---

## 10. QRコード

### URL構造

```
https://{domain}/order/{table_token}
```

- `table_token` はUUID v4（推測不可能）
- トークンから席→店舗を特定
- テーブルがクローズ中の場合は「注文を受け付けていません」を表示

### QRコード生成

- 管理画面の席管理ページから生成
- PDF形式でダウンロード・印刷可能

---

## 11. セッション管理（テーブル開閉）

### フロー

```
来店 → スタッフがテーブルを「オープン」
  ↓
お客様がQRを読み取って注文
  ↓
会計完了 → スタッフがテーブルを「クローズ」
```

- `tables.is_active` フラグで制御
- クローズ中にQRを読んだ場合: 「現在注文を受け付けていません」画面を表示
- オープン時に前回の注文が残っていないことを確認（クローズ時にテーブルの注文をリセットするかは運用判断）

---

## 12. MVP（Phase 1）スコープ

### 含まれるもの

- [x] お客様: QRコード読み取り → メニュー表示（カード型・写真大きめ）
- [x] お客様: カテゴリタブでの絞り込み
- [x] お客様: カートに追加（数量変更・メモ追加）
- [x] お客様: 注文確認 → 注文送信
- [x] お客様: 注文完了画面（注文番号 + 簡易ステータス表示）
- [x] お客様: テーブル合計金額表示
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
- メニューカスタマイズ（構造化オプション）
- 多言語対応
- マルチ店舗対応
- PWA対応
- レシートプリンター連携
- LINE通知連携
- 日別売上サマリー

---

## 13. ディレクトリ構成

```
qr-order/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── order/
│   │   │   └── [token]/
│   │   │       ├── page.tsx              # メニュー一覧
│   │   │       ├── cart/
│   │   │       │   └── page.tsx          # カート確認
│   │   │       └── complete/
│   │   │           └── page.tsx          # 注文完了
│   │   └── admin/
│   │       ├── layout.tsx                # 管理画面レイアウト（認証チェック）
│   │       ├── orders/
│   │       │   └── page.tsx              # 注文ダッシュボード
│   │       ├── menu/
│   │       │   └── page.tsx              # メニュー管理
│   │       ├── tables/
│   │       │   └── page.tsx              # 席管理・QR生成
│   │       └── login/
│   │           └── page.tsx              # ログイン
│   ├── components/
│   │   ├── ui/                           # 共通UIコンポーネント
│   │   ├── order/                        # 注文関連コンポーネント
│   │   │   ├── MenuCard.tsx
│   │   │   ├── CartItem.tsx
│   │   │   ├── CategoryTabs.tsx
│   │   │   └── FloatingCartBar.tsx
│   │   └── admin/                        # 管理画面コンポーネント
│   │       ├── OrderCard.tsx
│   │       └── OrderBoard.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                 # ブラウザ用クライアント
│   │   │   └── server.ts                 # サーバー用クライアント
│   │   └── utils.ts
│   ├── hooks/
│   │   ├── useCart.ts                    # カート状態管理
│   │   └── useRealtimeOrders.ts          # リアルタイム注文監視
│   └── types/
│       └── database.ts                   # Supabase型定義（自動生成）
├── supabase/
│   └── migrations/                       # DBマイグレーション
├── public/
│   └── notification.mp3                  # 通知音
├── docs/
│   └── SPEC.md                           # 本ドキュメント
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

---

## 14. 開発順序

1. **Supabase セットアップ** - テーブル作成、RLS設定、初期データ投入
2. **認証** - 管理画面ログイン（Supabase Auth + 単一アカウント）
3. **管理画面: メニュー管理** - CRUD + 画像アップロード + カテゴリ管理
4. **管理画面: 席管理** - テーブルCRUD + 開閉機能 + QRコード生成
5. **お客様側: メニュー表示** - カテゴリタブ + カード型レイアウト
6. **お客様側: カート + 注文送信** - localStorage管理 + 注文確定
7. **お客様側: 注文完了 + ステータス表示** - 注文番号 + リアルタイムステータス
8. **管理画面: 注文ダッシュボード** - リアルタイム更新 + 通知音 + ステータス変更
9. **テスト** - 単体テスト + E2Eテスト
10. **デプロイ** - Vercel + Supabase Cloud
