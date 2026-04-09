# ドキュメントインデックス

`docs/`配下のドキュメント一覧です。

## 仕様

| ファイル | 概要 |
|---------|------|
| [SPEC.md](SPEC.md) | QRコード注文アプリの統合仕様書（技術スタック、DB設計、画面設計、MVPスコープ等） |

## 詳細仕様

| ファイル | 概要 |
|---------|------|
| [specs/03_1-admin-menu.md](specs/03_1-admin-menu.md) | メニュー管理: アーキテクチャ、バリデーション、UseCase設計、UI仕様、画像アップロード、テスト方針 |
| [specs/04_1-admin-tables.md](specs/04_1-admin-tables.md) | 席管理: テーブルCRUD、開閉切り替え、QRコード生成、PDFダウンロード仕様 |
| [specs/05_1-customer-menu.md](specs/05_1-customer-menu.md) | お客様側メニュー表示: データ取得・カテゴリタブ・メニューカード・カートhook（useCart）仕様 |
| [specs/06_1-customer-cart.md](specs/06_1-customer-cart.md) | お客様側カート + 注文送信: カート画面、create_order RPC連携、完了画面（最小）仕様 |
| [specs/06_2-customer-cart.md](specs/06_2-customer-cart.md) | お客様側カート + 注文送信（v2 / 確定版）: 既存実装ズレを反映、submitOrder ヘルパー設計、テスト戦略 |
| [specs/06_3-customer-cart.md](specs/06_3-customer-cart.md) | お客様側カート + 注文送信（v3 / 実装用確定版）: 確認ダイアログ追加、空カート挙動明示、submitOrder テストの厳密検証方針 |
| [specs/07_1-customer-complete.md](specs/07_1-customer-complete.md) | お客様側注文完了: 文言調整（見出し＋サブテキスト）、支払い案内テキスト追加 |

## 実装ステップ

| ファイル | 概要 |
|---------|------|
| [steps/README.md](steps/README.md) | 実装ステップ一覧・進捗管理 |
| [steps/01-setup.md](steps/01-setup.md) | Supabase セットアップ |
| [steps/02-auth.md](steps/02-auth.md) | 認証 |
| [steps/02-e2e-auth.md](steps/02-e2e-auth.md) | 認証フローのE2Eテスト（Playwright） |
| [steps/03-admin-menu.md](steps/03-admin-menu.md) | 管理画面: メニュー管理 |
| [steps/04-admin-tables.md](steps/04-admin-tables.md) | 管理画面: 席管理 |
| [steps/05-customer-menu.md](steps/05-customer-menu.md) | お客様側: メニュー表示 |
| [steps/06-customer-cart.md](steps/06-customer-cart.md) | お客様側: カート + 注文送信 |
| [steps/07-customer-complete.md](steps/07-customer-complete.md) | お客様側: 注文完了 |
| [steps/08-admin-orders.md](steps/08-admin-orders.md) | 管理画面: 注文ダッシュボード |
| [steps/09-testing.md](steps/09-testing.md) | テスト |
| [steps/10-deploy.md](steps/10-deploy.md) | デプロイ |
