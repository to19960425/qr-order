# QRコード喫茶店注文アプリ

喫茶店の各席に設置されたQRコードを読み込み、スマホのブラウザからメニューを閲覧・注文できるWebアプリ。

## 技術スタック

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Supabase (PostgreSQL / Auth / Realtime / Storage)
- Vercel

## ドキュメント

- [仕様書](docs/SPEC.md)

## セットアップ

```bash
npm install
cp .env.local.example .env.local  # 環境変数を設定
npm run dev
```
