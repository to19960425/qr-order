# 実装ステップ一覧

[SPEC.md](../SPEC.md) に基づく実装ステップ。各フェーズをタスク単位に分解している。

## 進捗

| # | フェーズ | ステータス |
|---|---------|-----------|
| 01 | [Supabase セットアップ](01-setup.md) | [x] 完了 |
| 02 | [認証](02-auth.md) | [x] 完了 |
| 03 | [管理画面: メニュー管理](03-admin-menu.md) | [x] 完了 |
| 04 | [管理画面: 席管理](04-admin-tables.md) | [x] 完了 |
| 05 | [お客様側: メニュー表示](05-customer-menu.md) | [x] 完了 |
| 06 | [お客様側: カート + 注文送信](06-customer-cart.md) | [x] 完了 |
| 07 | [お客様側: 注文完了](07-customer-complete.md) | [x] 完了 |
| 08 | [管理画面: 注文ダッシュボード](08-admin-orders.md) | [x] 完了 |
| 09 | [テスト](09-testing.md) | [ ] 未着手 |
| 10 | [デプロイ](10-deploy.md) | [ ] 未着手 |

## 依存関係

```
01-setup ──→ 02-auth ──→ 03-admin-menu ──→ 04-admin-tables
                                                    │
05-customer-menu ←──────────────────────────────────┘
      │
06-customer-cart ──→ 07-customer-complete
      │
08-admin-orders ←───┘

09-testing（全機能完成後）
10-deploy（テスト完了後）
```
