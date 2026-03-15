# QRコード飲食店注文アプリ - 構想ドキュメント

## 概要

飲食店の各席に設置されたQRコードを読み込み、スマホのブラウザからメニューを閲覧・注文できるWebアプリ。
支払いはレジで直接行う想定。アプリのインストールは不要。

## 技術スタック

| レイヤー | 技術 | 理由 |
|---|---|---|
| フロントエンド | Next.js (App Router) + TypeScript | React/TSの学習を兼ねる。SSR/RSCでSEO不要だがパフォーマンスに有利 |
| スタイリング | Tailwind CSS | モバイルファーストのUI構築が高速 |
| バックエンド/DB | Supabase (PostgreSQL) | 認証・DB・リアルタイム・ストレージが一体。無料枠で十分 |
| リアルタイム通知 | Supabase Realtime | DBの変更を自動検知してキッチン側にPush |
| 画像ストレージ | Supabase Storage | メニュー画像の保存 |
| デプロイ | Vercel | Next.jsとの相性最高。無料枠あり |
| QRコード生成 | qrcode (npm) | 管理画面でQR画像を生成・印刷 |

## ユーザーフロー

### お客様側

```
QRコード読み取り
    ↓
ブラウザで注文ページが開く（/order/{table_token}）
    ↓
メニュー一覧（カテゴリ別）
    ↓
商品をカートに追加（数量変更・メモ追加可能）
    ↓
注文内容確認
    ↓
注文送信
    ↓
注文完了画面（注文番号表示）
    ↓
同じセッション内で追加注文・注文履歴確認が可能
    ↓
支払いはレジにて
```

### 店舗スタッフ側

```
管理画面にログイン
    ↓
┌──────────────────────────────────────┐
│ 注文管理  │ メニュー管理 │ 席管理    │
│           │              │           │
│ 新着注文が│ メニュー追加 │ QRコード  │
│ リアルタイ│ 編集・削除   │ 生成・印刷│
│ ムで表示  │ カテゴリ管理 │ 席の追加  │
│           │ 品切れ切替   │ 削除      │
│ ステータス│ 画像アップ   │           │
│ 変更      │ ロード       │           │
└──────────────────────────────────────┘
```

## データベース設計

### ER図（概要）

```
stores (店舗)
  ├── tables (席)
  ├── categories (カテゴリ)
  │     └── menu_items (メニュー)
  └── orders (注文)
        └── order_items (注文明細)
```

### テーブル定義

```sql
-- 店舗
create table stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,  -- URL用の識別子
  created_at timestamptz default now()
);

-- 席
create table tables (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores(id) on delete cascade,
  table_number int not null,
  token uuid unique default gen_random_uuid(),  -- QRコードに埋め込むトークン
  is_active boolean default true,
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
  price int not null,               -- 円単位（整数で管理）
  image_url text,
  is_available boolean default true, -- 品切れフラグ
  sort_order int default 0,
  created_at timestamptz default now()
);

-- 注文
create table orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores(id) on delete cascade,
  table_id uuid references tables(id),
  order_number serial,              -- 店舗内の通し番号
  status text default 'new' check (status in ('new', 'confirmed', 'preparing', 'completed', 'cancelled')),
  total_amount int not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 注文明細
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  menu_item_id uuid references menu_items(id),
  name text not null,               -- 注文時点のメニュー名を保存
  price int not null,               -- 注文時点の価格を保存
  quantity int not null default 1,
  note text                         -- 「大盛り」「ネギ抜き」等
);
```

### RLS（Row Level Security）ポリシー

```sql
-- お客様: 自分の席のデータのみ読み取り・注文作成が可能
-- 店舗スタッフ: 自店舗のデータのみ操作可能
-- メニューは誰でも読み取り可能（公開データ）

-- メニュー: 誰でも閲覧可能
alter table menu_items enable row level security;
create policy "メニューは誰でも閲覧可" on menu_items
  for select using (is_available = true);

-- 注文: 認証済みスタッフは自店舗の注文を管理
-- 未認証ユーザー（お客様）はINSERTのみ可能
alter table orders enable row level security;
create policy "お客様は注文を作成可能" on orders
  for insert with check (true);
```

## 画面設計

### お客様側（モバイル前提）

#### 1. メニュー画面 `/order/[token]`

```
┌─────────────────────────┐
│  🍽 テーブル 5           │
├─────────────────────────┤
│ [ドリンク] [フード] [デザート]  ← カテゴリタブ
├─────────────────────────┤
│ ┌─────────┬───────────┐ │
│ │  画像   │ 生ビール  │ │
│ │         │ ¥550      │ │
│ │         │  [+]      │ │
│ └─────────┴───────────┘ │
│ ┌─────────┬───────────┐ │
│ │  画像   │ ハイボール│ │
│ │         │ ¥450      │ │
│ │         │  [+]      │ │
│ └─────────┴───────────┘ │
│            ...          │
├─────────────────────────┤
│ 🛒 カート（3点） ¥1,650 │ ← フローティングバー
│      [注文を確認する]   │
└─────────────────────────┘
```

#### 2. カート・注文確認画面

```
┌─────────────────────────┐
│  ← 注文内容の確認       │
├─────────────────────────┤
│ 生ビール     x2  ¥1,100 │
│   [-] [2] [+]           │
│ ハイボール   x1    ¥450  │
│   [-] [1] [+]           │
│ メモ: [大ジョッキで]    │
├─────────────────────────┤
│ 合計          ¥1,550    │
├─────────────────────────┤
│    [注文を確定する]      │
└─────────────────────────┘
```

#### 3. 注文完了画面

```
┌─────────────────────────┐
│                         │
│    注文を受け付けました   │
│    注文番号: #42         │
│                         │
│  [追加注文する]          │
│  [注文履歴を見る]        │
│                         │
│  お支払いはレジにて      │
│  お願いいたします        │
└─────────────────────────┘
```

### 店舗管理側（PC/タブレット前提）

#### 注文ダッシュボード `/admin/orders`

```
┌─────────────────────────────────────────────┐
│ 注文管理          [メニュー管理] [席管理]    │
├──────────┬──────────┬──────────┬────────────┤
│ 新規(3)  │確認済(2) │ 調理中(1)│ 完了       │
├──────────┼──────────┼──────────┤            │
│ #45      │ #43      │ #41      │            │
│ テーブル3│ テーブル7│ テーブル1│            │
│ 14:32    │ 14:28    │ 14:15    │            │
│ ────     │ ────     │ ────     │            │
│ 生ビールx2│ 唐揚げx1│ 刺身盛x1│            │
│ 枝豆x1   │ ご飯x2  │          │            │
│ ¥1,650   │ ¥1,100  │ ¥1,980   │            │
│          │          │          │            │
│[確認する]│[調理開始]│[完了]    │            │
└──────────┴──────────┴──────────┴────────────┘
```

## ディレクトリ構成

```
qr-order/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # LP（必要なら）
│   │   ├── order/
│   │   │   └── [token]/
│   │   │       ├── page.tsx            # メニュー一覧
│   │   │       ├── cart/
│   │   │       │   └── page.tsx        # カート確認
│   │   │       └── complete/
│   │   │           └── page.tsx        # 注文完了
│   │   └── admin/
│   │       ├── layout.tsx              # 管理画面レイアウト（認証チェック）
│   │       ├── orders/
│   │       │   └── page.tsx            # 注文ダッシュボード
│   │       ├── menu/
│   │       │   └── page.tsx            # メニュー管理
│   │       ├── tables/
│   │       │   └── page.tsx            # 席管理・QR生成
│   │       └── login/
│   │           └── page.tsx            # ログイン
│   ├── components/
│   │   ├── ui/                         # 共通UIコンポーネント
│   │   ├── order/                      # 注文関連コンポーネント
│   │   │   ├── MenuCard.tsx
│   │   │   ├── CartItem.tsx
│   │   │   └── CategoryTabs.tsx
│   │   └── admin/                      # 管理画面コンポーネント
│   │       ├── OrderCard.tsx
│   │       └── OrderBoard.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts               # ブラウザ用クライアント
│   │   │   └── server.ts               # サーバー用クライアント
│   │   └── utils.ts
│   ├── hooks/
│   │   ├── useCart.ts                  # カート状態管理
│   │   └── useRealtimeOrders.ts        # リアルタイム注文監視
│   └── types/
│       └── database.ts                 # Supabase型定義（自動生成）
├── supabase/
│   └── migrations/                     # DBマイグレーション
├── public/
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

## リアルタイム通知の実装方針

### キッチン側（注文受信）

```typescript
// hooks/useRealtimeOrders.ts
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useRealtimeOrders(storeId: string) {
  const [orders, setOrders] = useState<Order[]>([])
  const supabase = createClient()

  useEffect(() => {
    // 既存の注文を取得
    const fetchOrders = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('store_id', storeId)
        .in('status', ['new', 'confirmed', 'preparing'])
        .order('created_at', { ascending: false })
      setOrders(data ?? [])
    }
    fetchOrders()

    // リアルタイム監視
    const channel = supabase
      .channel('orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setOrders((prev) => [payload.new as Order, ...prev])
            // 通知音を鳴らす
            new Audio('/notification.mp3').play()
          }
          if (payload.eventType === 'UPDATE') {
            setOrders((prev) =>
              prev.map((o) => (o.id === payload.new.id ? payload.new as Order : o))
            )
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [storeId])

  return orders
}
```

## カート管理

ブラウザの `useState` + `localStorage` でセッション内のカート状態を管理。
DBにカートを保存する必要はない（注文確定時にのみDBへ書き込む）。

```typescript
// hooks/useCart.ts
// - カートへの追加/削除/数量変更
// - localStorage に永続化（ブラウザリロード対応）
// - テーブルトークンごとにカートを分離
```

## QRコードの設計

### URL構造

```
https://{domain}/order/{table_token}

例: https://qr-order.vercel.app/order/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

- `table_token` はUUID v4（推測不可能）
- トークンから席→店舗を特定
- トークンは管理画面から再生成可能（セキュリティ対策）

### QRコード生成・印刷

管理画面の席管理ページからQRコードを生成し、PDF形式でダウンロード・印刷可能にする。

## 認証

| ユーザー | 認証方式 |
|---|---|
| お客様 | 認証なし（QRコードのトークンで席を識別） |
| 店舗スタッフ | Supabase Auth（メール/パスワード） |

## MVP（最小構成）で作る範囲

### Phase 1: MVP

- [x] 席のQRコード読み取り → メニュー表示
- [x] カートに追加 → 注文送信
- [x] 管理画面: 注文一覧（リアルタイム更新）
- [x] 管理画面: メニューCRUD
- [x] 管理画面: 席管理・QRコード生成
- [x] 単一店舗対応

### Phase 2: 改善

- [ ] 注文通知音
- [ ] メニュー画像アップロード
- [ ] 注文履歴（お客様側）
- [ ] 品切れのリアルタイム反映
- [ ] 日別売上サマリー

### Phase 3: 拡張（必要に応じて）

- [ ] マルチ店舗対応
- [ ] PWA対応（ホーム画面に追加）
- [ ] 多言語対応（インバウンド向け）
- [ ] レシートプリンター連携
- [ ] LINE通知連携

## 開発環境セットアップ手順

```bash
# 1. プロジェクト作成
npx create-next-app@latest qr-order --typescript --tailwind --app --src-dir

# 2. Supabase CLI導入
npx supabase init
npx supabase start  # ローカルでSupabaseを起動

# 3. 依存パッケージ
npm install @supabase/supabase-js @supabase/ssr
npm install qrcode @types/qrcode

# 4. 環境変数（.env.local）
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# 5. 型定義の自動生成
npx supabase gen types typescript --local > src/types/database.ts
```

## コスト見積もり（無料枠）

| サービス | 無料枠 | 飲食店1店舗での想定 |
|---|---|---|
| Vercel | 月100GB帯域 | 十分 |
| Supabase | 500MB DB, 1GB Storage, 50万行読み取り/月 | 十分 |
| 独自ドメイン | 年間約1,500円 | 任意 |

**小規模な飲食店1店舗なら無料枠で運用可能。**
