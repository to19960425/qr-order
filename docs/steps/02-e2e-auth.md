# Step 02-E2E: 認証フローの E2E テスト

Step 02（認証）の派生タスク。Playwright で認証フローの E2E テストを実装する。

## ゴール

- 認証保護・ログイン・ログアウトの基本フローが自動テストで保証される
- テスト用アカウントの管理方法が確立される

---

## 前提

- Step 02 の実装が完了していること
- Supabase にテスト用アカウントが作成済みであること
- `@playwright/test` はインストール済み

---

## タスク

### E2E-1 Playwright 初期設定

- [ ] `npx playwright install` でブラウザをインストール
- [ ] `playwright.config.ts` を作成
  - `baseURL: 'http://localhost:3000'`
  - `webServer` で `npm run dev` を自動起動
  - テスト用ブラウザ: Chromium のみ（MVP 段階）

### E2E-2 テスト用環境変数

- [ ] `.env.test` にテスト用アカウント情報を定義
  ```
  TEST_ADMIN_EMAIL=xxx@example.com
  TEST_ADMIN_PASSWORD=xxx
  ```
- [ ] `.gitignore` に `.env.test` を追加
- [ ] テストからは `process.env` で読み込む

### E2E-3 認証フロー E2E テスト

- [ ] `e2e/auth.spec.ts` を作成

#### テストケース

1. **未認証リダイレクト**
   - `/admin/orders` にアクセス
   - `/admin/login` にリダイレクトされることを確認

2. **ログイン成功**
   - `/admin/login` にアクセス
   - メールアドレス・パスワードを入力してログイン
   - `/admin/orders` に遷移することを確認
   - 「注文ダッシュボード」が表示されることを確認

3. **ログイン失敗**
   - `/admin/login` にアクセス
   - 間違ったパスワードでログイン
   - 「メールアドレスまたはパスワードが正しくありません」が表示されることを確認
   - ページが `/admin/login` のままであることを確認

4. **サイドバーナビゲーション**
   - ログイン後、サイドバーの各リンク（注文・メニュー・席）をクリック
   - 対応するページに遷移することを確認

5. **ログアウト**
   - ログイン後、サイドバーの「ログアウト」をクリック
   - `/admin/login` に戻ることを確認

6. **認証済みでログインページアクセス**
   - ログイン後、`/admin/login` に直接アクセス
   - `/admin/orders` にリダイレクトされることを確認

### E2E-4 動作確認

- [ ] `npx playwright test e2e/auth.spec.ts` で全テストが通る

---

## 対象ファイル

| ファイル | 操作 |
|---------|------|
| `playwright.config.ts` | 新規 |
| `e2e/auth.spec.ts` | 新規 |
| `.env.test` | 新規 |

---

## 備考

- Step 09 に包括的なテスト計画があるが、認証フローは基盤機能のため先行して実装する
- Step 09 実装時は、ここで作成した設定・テストをベースに拡張する
