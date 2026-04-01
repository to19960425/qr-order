# Step 01: Supabase セットアップ

Next.js プロジェクトの初期化と Supabase のセットアップを行う。

## ゴール

- Next.js プロジェクトが起動できる
- Supabase にテーブル・RLS・RPC が作成されている
- シードデータが投入されている
- アプリから Supabase に接続できる

---

## タスク

### 1.1 Next.js プロジェクト初期化

- [ ] `npx create-next-app@latest` で Next.js 15 プロジェクトを作成
  - TypeScript: Yes
  - ESLint: Yes
  - Tailwind CSS: Yes
  - App Router: Yes
- [ ] 不要な初期ファイルを整理（デフォルトの page.tsx の内容をクリア等）

### 1.2 依存パッケージのインストール

- [ ] Supabase 関連: `@supabase/supabase-js`, `@supabase/ssr`
- [ ] UI: `shadcn/ui` の初期化（`npx shadcn@latest init`）
- [ ] QRコード: `qrcode`, `@types/qrcode`
- [ ] PDF: `jspdf`
- [ ] テスト: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`
- [ ] E2E: `playwright`（`npx playwright install`）

### 1.3 設定ファイル

- [ ] `tailwind.config.ts` にカスタムカラーを追加
  ```
  background: '#F5F0EB'
  foreground: '#3C2415'
  accent: '#8B6914'
  ```
- [ ] `.env.local.example` を作成（`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`）
- [ ] `.env.local` を作成し、Supabase Cloud の値を設定
- [ ] `vitest.config.ts` を作成
- [ ] `playwright.config.ts` を作成
- [ ] `.gitignore` に `.env.local` を追加確認

### 1.4 Supabase プロジェクト作成

- [ ] Supabase Dashboard で新規プロジェクトを作成
- [ ] プロジェクトURL と anon key を `.env.local` に設定

### 1.5 Supabase クライアント設定

- [ ] `src/lib/supabase/client.ts` を作成（`createBrowserClient()`）
- [ ] `src/lib/supabase/server.ts` を作成（`createServerClient()`）

### 1.6 データベースマイグレーション

- [ ] `supabase/migrations/001_initial.sql` を作成
  - `stores` テーブル
  - `tables` テーブル
  - `categories` テーブル
  - `menu_items` テーブル
  - `orders` テーブル（`table_id ON DELETE SET NULL`）
  - `order_items` テーブル
  - `updated_at` 自動更新トリガー
  - `create_order` RPC 関数
  - RLS ポリシー（全テーブル）
- [ ] Supabase Dashboard の SQL Editor で実行、またはCLIで `supabase db push`

### 1.7 Supabase Storage セットアップ

- [ ] Supabase Dashboard で `menu-images` バケットを作成（パブリック）

### 1.8 シードデータ投入

- [ ] `supabase/seed.sql` を作成
  - 店舗データ（1件）
  - カテゴリデータ（4〜6件: コーヒー、紅茶、フード、デザート等）
  - サンプルメニューアイテム（各カテゴリ3〜5件）
  - サンプルテーブル（3〜5席）
- [ ] SQL Editor で実行

### 1.9 型定義生成

- [ ] `src/types/database.ts` を Supabase CLI で自動生成
  ```bash
  npx supabase gen types typescript --project-id <project-id> > src/types/database.ts
  ```

### 1.10 ユーティリティ関数

- [ ] `src/lib/utils.ts` を作成
  - `cn()` 関数（shadcn/ui 標準）
  - 価格フォーマット関数（例: `1850` → `¥1,850`）

### 1.11 動作確認

- [ ] `npm run dev` でエラーなく起動
- [ ] Server Component から Supabase のデータ取得ができることを確認

---

## 対象ファイル

| ファイル | 操作 |
|---------|------|
| `package.json` | 新規（create-next-app で生成後、依存追加） |
| `next.config.ts` | 新規 |
| `tailwind.config.ts` | 編集（カスタムカラー追加） |
| `tsconfig.json` | 新規（create-next-app で生成） |
| `.env.local.example` | 新規 |
| `.env.local` | 新規（git管理外） |
| `.gitignore` | 編集 |
| `components.json` | 新規（shadcn/ui init で生成） |
| `vitest.config.ts` | 新規 |
| `playwright.config.ts` | 新規 |
| `src/lib/supabase/client.ts` | 新規 |
| `src/lib/supabase/server.ts` | 新規 |
| `src/lib/utils.ts` | 新規 |
| `src/types/database.ts` | 新規（自動生成） |
| `supabase/migrations/001_initial.sql` | 新規 |
| `supabase/seed.sql` | 新規 |
