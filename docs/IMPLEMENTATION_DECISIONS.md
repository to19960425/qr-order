# 実装判断書

SPEC.md / IMPLEMENTATION_SPEC.md を前提に、実装開始前のヒアリングで確定した技術的判断・UI詳細・エッジケース処理方針をまとめる。

---

## 1. SPEC.md / IMPLEMENTATION_SPEC.md からの変更点

| 項目 | 既存仕様の記載 | 変更後 | 理由 |
|---|---|---|---|
| 注文完了画面 | 注文番号 + 今回の注文金額 + 追加注文ボタン | **確認メッセージ + 追加注文ボタン + レジ案内のみ**（番号・金額なし） | 小規模喫茶店では注文番号で呼び出す運用がない。金額もレジで確認すれば十分 |
| 注文完了画面ルート | `/order/[token]/complete` にデータを渡す方式が未定 | **静的ページ**（データ取得不要） | 注文番号・金額を表示しないため、DBアクセス不要 |
| メニューカード | [+] ボタンのみ、数量バッジは任意 | カート追加済みの商品は **[-][N][+] コントロール + 数量バッジ** を表示 | カート画面に遷移せず数量調整できる方がUX向上 |
| 管理画面ナビゲーション | タブレットで「幅を狭くする or アイコンのみ」 | PC・タブレット両方で **常時表示（アイコン+ラベル）** | 喫茶店のテーブル数なら常時表示でも画面幅を圧迫しない |
| 開発環境 | Supabase CLI でローカルDB | **Supabase Cloud** を使用 | Docker不要でセットアップが簡単 |

### 変更後の注文完了画面

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

- 「追加注文する」→ `/order/[token]` にリダイレクト（カートは空の状態）
- データ取得なしの静的ページ

### 変更後のメニューカード

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

---

## 2. 技術的判断

### 2.1 Next.js バージョン

- **Next.js 15** を使用
- App Router の `params` / `searchParams` が Promise になる等の変更に対応する
- 学習目的を兼ねて最新版を採用

### 2.2 認証方式

- **Next.js Middleware** (`middleware.ts`) で `/admin/*` へのアクセスを一括保護
- Supabase 公式推奨パターンに準拠
- ページ描画前にリダイレクトするため、未認証コンテンツのフラッシュが発生しない

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'

export async function middleware(req) {
  const supabase = createServerClient(/* ... */)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user && req.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }
}

export const config = {
  matcher: ['/admin/((?!login).*)'],
}
```

### 2.3 注文INSERT方式

- **Supabase RPC（DB関数）** で `orders` + `order_items` をトランザクション内で一括作成
- クライアントからは `supabase.rpc('create_order', { ... })` を呼び出す
- トランザクション内で `tables.is_active` も検証し、クローズ中のテーブルへの注文を拒否

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
  -- テーブルの開閉状態を検証
  SELECT is_active INTO v_is_active
  FROM tables WHERE id = p_table_id;

  IF NOT v_is_active THEN
    RAISE EXCEPTION 'テーブルは現在クローズ中です';
  END IF;

  -- 合計金額を計算
  SELECT SUM(
    (item->>'price')::int * (item->>'quantity')::int
  ) INTO v_total
  FROM jsonb_array_elements(p_items) item;

  -- orders INSERT
  INSERT INTO orders (store_id, table_id, status, total_amount)
  VALUES (p_store_id, p_table_id, 'new', v_total)
  RETURNING id INTO v_order_id;

  -- order_items INSERT
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

### 2.4 テーブルクローズ時の二重ガード

- **DB側**: `create_order` RPC 内で `tables.is_active` を検証（確実なガード）
- **クライアント側**: 注文確定ボタン押下時にも `is_active` をチェックし、クローズ済みならエラーメッセージを表示（UX的なガード）
- エラーメッセージ: 「現在このテーブルでは注文を受け付けていません」

### 2.5 注文番号

- `orders.order_number` は `serial` 型で通し番号
- 日次リセットは行わない
- お客様側には表示しない（完了画面に番号なし）
- 管理画面の注文ダッシュボードでは引き続き表示する

### 2.6 テーブル番号

- テーブル追加時は **自動採番**（次の番号を自動付与）
- 既存テーブルの最大番号 + 1 を新規テーブル番号とする

---

## 3. Supabase Storage

### 画像バケット

- バケット名: `menu-images`
- アクセス: **パブリック**（認証なしで閲覧可能）
- メニュー画像は機密情報ではないため、パブリックアクセスで問題なし

### ファイル命名規則

- **UUIDプレフィックス**: `{uuid}.{拡張子}`（例: `550e8400-e29b-41d4-a716-446655440000.jpg`）
- 同名ファイルの上書きやキャッシュ問題を回避

### バリデーション（IMPLEMENTATION_SPEC.md から継承）

- ファイルサイズ上限: 5MB
- 許可形式: JPEG, PNG, WebP

---

## 4. 管理画面 UI詳細

### 4.1 サイドバー

- PC・タブレット両方で **常時表示**（アイコン + ラベル）
- 折りたたみやハンバーガーメニューは不要

### 4.2 メニュー管理

- メニューアイテムの追加・編集は **モーダル（ダイアログ）形式**
- メニュー一覧画面上にモーダルを表示し、ページ遷移なしで編集
- カテゴリ管理は **メニュー管理ページ内に統合**（`/admin/categories` は作成しない）

### 4.3 注文ダッシュボード

- 完了済み注文の表示範囲: **当日 0:00〜現在** の完了済み注文
- 深夜0時でリセット（喫茶店は深夜営業しない前提）

---

## 5. トップページ

- `/` にアクセスした場合: **シンプルな案内ページ** を表示
- 「QRコードを読み取って注文してください」等のメッセージ
- 管理者向けのログインリンクは配置しない（`/admin/login` は直接アクセス）

---

## 6. 管理者アカウント

- **手動で作成**: Supabase Dashboard の Authentication セクションから作成
- seed.sql やセットアップスクリプトは使用しない
- セットアップ手順をドキュメントに記載する

### セットアップ手順

1. Supabase Dashboard にログイン
2. Authentication > Users に移動
3. 「Add user」からメールアドレスとパスワードを入力して作成
4. `.env.local` に Supabase の URL と anon key を設定

---

## 7. デプロイ・環境

### 開発環境

- **Supabase Cloud** のプロジェクトを開発環境として使用
- Supabase CLI（Docker）は使用しない
- マイグレーションは Supabase Dashboard または CLI の `supabase db push` で適用

### ドメイン

- MVP時点では **Vercel デフォルトドメイン** (`*.vercel.app`) で開発
- QRコード生成時のドメインは **環境変数** `NEXT_PUBLIC_APP_URL` で管理
- 本番運用時にカスタムドメインに切り替え可能

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
NEXT_PUBLIC_APP_URL=https://xxx.vercel.app
```

---

## 8. テスト方針

- **単体テスト（Vitest + React Testing Library）を先行** して実装
  - `useCart` フック（カート追加・削除・数量変更・localStorage永続化）
  - ユーティリティ関数（価格フォーマット等）
  - コンポーネントの基本表示
- **E2Eテスト（Playwright）は全機能完成後** に追加
  - 注文フロー（メニュー表示→カート→注文確定）
  - 管理画面フロー（ログイン→注文確認→完了）

---

## 9. 対象ファイル一覧（追加・変更）

IMPLEMENTATION_SPEC.md のファイル一覧に対する追加・変更。

### 追加ファイル

| ファイル | 概要 |
|---|---|
| `src/middleware.ts` | Next.js Middleware。`/admin/*` の認証チェック |
| `supabase/migrations/001_initial.sql` 内に `create_order` RPC を追加 | 注文作成のDB関数（トランザクション保護） |

### 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `src/app/order/[token]/complete/page.tsx` | データ取得を削除。静的な確認メッセージのみ表示 |
| `src/components/order/MenuCard.tsx` | カート追加済み商品に [-][N][+] コントロールと数量バッジを追加 |
| `src/app/page.tsx` | QRコード読み取り案内のシンプルなページ |
| `src/app/admin/layout.tsx` | 認証チェックは Middleware に移管。サイドバーのみ担当 |
| `.env.local.example` | `NEXT_PUBLIC_APP_URL` を追加 |

### 不要になったファイル

| ファイル | 理由 |
|---|---|
| `src/app/admin/categories/page.tsx` | カテゴリ管理はメニュー管理ページ内に統合。専用ページ不要 |

---

## 10. 未決定事項・今後の検討事項

| 項目 | 補足 |
|---|---|
| 通知音ファイル (`notification.mp3`) の調達 | フリー素材から選定。ファイルサイズは小さくする |
| Supabase Cloud のプラン選定 | 無料プランで開始。制限に達したら有料プランに移行 |
| カスタムドメインの取得時期 | 本番運用開始前に取得。QRコード印刷前に確定が必要 |
| `create_order` RPC の RLS / SECURITY DEFINER 設計 | anon ユーザーが呼び出せるよう `SECURITY DEFINER` を使用するが、セキュリティレビューが必要 |
| Supabase Storage バケット作成 | マイグレーションとは別に、Supabase Dashboard または CLI で `menu-images` バケットを作成 |
