# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

喫茶店向けQRコード注文Webアプリ（1店舗専用MVP）。Next.js (App Router) + TypeScript + Tailwind CSS + Supabase。

## ガイドライン

- お客様側UIのカラー: 背景 `#F5F0EB`、テキスト `#3C2415`、アクセント `#8B6914`（ナチュラル・温かみ系）
- 詳細な仕様は `docs/SPEC.md` を参照すること
- `docs/`配下のドキュメントを追加・削除・移動した場合は、`docs/README.md` のインデックスも更新すること
- 各ステップの作業を開始・完了した際は、`docs/steps/README.md` の進捗テーブルのステータスを更新すること（未着手 → 作業中 → 完了）

## コマンド

```bash
npm run dev          # 開発サーバー起動
npm run build        # プロダクションビルド
npm run lint         # ESLint実行
```

## アーキテクチャ

### レイヤー方針

- ビジネスロジックはServer Actions / API Routeに直接書かず、UseCase層（`src/lib/use-cases/`）に切り出す
- Server Actions / API Routeは薄いアダプター（入力変換 + UseCase呼び出し + revalidate）に留める
- バリデーションはzodスキーマとして`src/lib/validations/`に定義し、クライアント/サーバー両方で再利用する
- 純粋関数（バリデーション、ソート等）はユニットテスト対象。UseCase・Server ActionsはE2Eで検証

### ディレクトリ構成

- `src/app/order/[token]/` — お客様側画面。tokenはテーブルのUUID、認証なし
- `src/app/admin/` — 店舗スタッフ管理画面。Supabase Auth（単一アカウント）で認証
- `src/lib/supabase/` — `client.ts`（ブラウザ用）と`server.ts`（サーバー用）を使い分け
- `src/hooks/useCart.ts` — カートは`localStorage`で管理、DBには保存しない
- `src/hooks/useRealtimeOrders.ts` — Supabase Realtimeで`orders`テーブル変更を監視

## 注意事項

- **価格は円単位の整数（int）**。小数や文字列で扱わないこと
- **`order_items`には注文時点の`name`と`price`をスナップショット保存する**。menu_itemsへのJOINで現在価格を表示してはならない
- 注文ステータスは `new` → `completed` の2段階のみ。中間ステータスを追加しないこと
- `tables.is_active`でテーブル開閉を制御。クローズ中のQR読み取りは「注文を受け付けていません」画面を表示
- 管理画面の通知音はブラウザ自動再生ポリシーの制約あり。初回にユーザー操作（「通知を有効にする」ボタン等）で再生許可を取得する必要がある
