# Step 02: 認証

Next.js Middleware による管理画面の認証保護とログインページを実装する。

## ゴール

- `/admin/*`（`/admin/login` を除く）が未認証時にリダイレクトされる
- ログイン・ログアウトが機能する
- 管理画面のレイアウト（サイドバー）が表示される

---

## タスク

### 2.1 Middleware 作成

- [ ] `src/middleware.ts` を作成
  - `@supabase/ssr` の `createServerClient` を使用
  - `/admin/*`（`/admin/login` を除く）へのアクセスで `supabase.auth.getUser()` を呼び出し
  - 未認証の場合 `/admin/login` にリダイレクト
  - `matcher: ['/admin/((?!login).*)']` を設定

### 2.2 ルートレイアウト

- [ ] `src/app/layout.tsx` を作成
  - フォント設定（丸みのあるセリフ体）
  - メタデータ設定
  - Tailwind のグローバルスタイル適用

### 2.3 ログインページ

- [ ] `src/app/admin/login/page.tsx` を作成
  - メール + パスワード入力フォーム
  - Supabase Auth の `signInWithPassword` を使用
  - ログイン成功 → `/admin/orders` にリダイレクト
  - ログイン失敗 → エラーメッセージ表示（「メールアドレスまたはパスワードが正しくありません」）
  - 認証済みでアクセス → `/admin/orders` にリダイレクト
- [ ] shadcn/ui の Button, Input, Card コンポーネントを追加

### 2.4 管理画面レイアウト

- [ ] `src/app/admin/layout.tsx` を作成
  - サイドバーナビゲーションを含むレイアウト
  - 認証チェックは Middleware に委譲（layout では不要）
- [ ] `src/components/admin/Sidebar.tsx` を作成
  - ロゴ（☕ QR Order）
  - ナビリンク: 注文（📋）、メニュー（🍽）、席（🪑）
  - ログアウトボタン
  - 現在のパスに応じてアクティブ状態を表示
  - ログアウト: `supabase.auth.signOut()` → `/admin/login` にリダイレクト

### 2.5 管理者アカウント作成

- [ ] Supabase Dashboard の Authentication > Users からアカウントを作成

### 2.6 仮ページ作成

- [ ] `/admin/orders/page.tsx` に仮の「注文ダッシュボード」テキストを配置
- [ ] `/admin/menu/page.tsx` に仮の「メニュー管理」テキストを配置
- [ ] `/admin/tables/page.tsx` に仮の「席管理」テキストを配置

### 2.7 動作確認

- [ ] 未認証で `/admin/orders` にアクセス → `/admin/login` にリダイレクトされる
- [ ] ログイン成功 → `/admin/orders` に遷移する
- [ ] サイドバーのナビゲーションが機能する
- [ ] ログアウト → `/admin/login` に戻る

---

## 対象ファイル

| ファイル | 操作 |
|---------|------|
| `src/middleware.ts` | 新規 |
| `src/app/layout.tsx` | 新規 |
| `src/app/admin/login/page.tsx` | 新規 |
| `src/app/admin/layout.tsx` | 新規 |
| `src/components/admin/Sidebar.tsx` | 新規 |
| `src/app/admin/orders/page.tsx` | 新規（仮） |
| `src/app/admin/menu/page.tsx` | 新規（仮） |
| `src/app/admin/tables/page.tsx` | 新規（仮） |
