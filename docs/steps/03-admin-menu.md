# Step 03: 管理画面 - メニュー管理

メニューアイテムとカテゴリのCRUD、画像アップロード、並び替え機能を実装する。

## ゴール

- カテゴリの追加・編集・削除ができる
- メニューアイテムの追加・編集・削除ができる
- メニュー画像をアップロードできる
- カテゴリ・メニューアイテムの並び替えができる

---

## タスク

### 3.1 メニュー管理ページの骨格

- [x] `src/app/admin/menu/page.tsx` を実装
  - Server Component でカテゴリ + メニューアイテムを取得
  - Client Component にデータを渡す構成
  - カテゴリごとにセクション分けして表示

### 3.2 カテゴリ管理

- [x] カテゴリ一覧表示
- [x] カテゴリ追加機能（インライン入力 or モーダル）
- [x] カテゴリ名の編集
- [x] カテゴリ削除（確認ダイアログ付き、「この操作は取り消せません。配下のメニューも削除されます」）
- [x] カテゴリの並び替え（↑↓ ボタン、`sort_order` を更新）

### 3.3 メニューアイテム一覧表示

- [x] カテゴリ別にメニューアイテムをリスト表示
  - 画像サムネイル、名前、価格、説明（抜粋）を表示
- [x] 「メニューを追加」ボタン（各カテゴリセクション内）

### 3.4 メニューアイテム追加・編集モーダル

- [x] shadcn/ui の Dialog コンポーネントを追加
- [x] フォームフィールド:
  - 名前（必須）
  - 説明（任意）
  - 価格（必須、整数）
  - カテゴリ選択（必須）
  - 画像アップロード
- [x] バリデーション:
  - 名前: 空文字チェック
  - 価格: 正の整数チェック
- [x] 追加時: `menu_items` に INSERT
- [x] 編集時: `menu_items` を UPDATE

### 3.5 画像アップロード

- [x] ファイル選択UI（プレビュー付き）
- [x] クライアント側バリデーション:
  - ファイルサイズ: 5MB以下
  - ファイル形式: JPEG, PNG, WebP
- [x] Supabase Storage（`menu-images` バケット）にアップロード
  - ファイル名: `{uuid}.{拡張子}`
- [x] アップロード後のURLを `menu_items.image_url` に保存
- [x] 編集時: 既存画像のプレビュー表示、新しい画像で上書き可能

### 3.6 メニューアイテム削除

- [x] 確認ダイアログ付き
- [x] `menu_items` から DELETE
- [x] Storage の画像も削除（画像がある場合）

### 3.7 メニューアイテムの並び替え

- [x] 並び替えロジック実装済み（`src/lib/sort-order.ts` + テスト）
- [x] 各メニューアイテムに ↑↓ ボタン（UI）
- [x] `sort_order` を入れ替えて UPDATE（DB連携）
- [x] 先頭アイテムの ↑ と末尾アイテムの ↓ は disabled

### 3.8 動作確認

- [ ] カテゴリのCRUDが正常に動作する
- [ ] メニューアイテムのCRUDが正常に動作する
- [ ] 画像のアップロード・表示が正常に動作する
- [ ] 並び替えが正常に動作する
- [ ] カテゴリ削除時に配下のメニューアイテムも削除される

---

## 対象ファイル

| ファイル | 操作 |
|---------|------|
| `src/app/admin/(dashboard)/menu/page.tsx` | 実装（仮ページを置き換え） |
| `src/app/admin/(dashboard)/menu/actions.ts` | 新規（Server Actions） |
| `src/app/admin/(dashboard)/menu/_components/*.tsx` | 新規（MenuManagement, CategorySection, MenuItemCard, MenuItemFormDialog, ImageUpload） |
| `src/lib/store.ts` | 新規（getStoreId） |
| `src/lib/use-cases/menu.ts` | 新規（UseCase層） |
| `src/components/ui/dialog.tsx` | 追加（shadcn/ui） |
| `src/components/ui/select.tsx` | 追加（shadcn/ui） |
| `src/components/ui/textarea.tsx` | 追加（shadcn/ui） |
| `src/types/database.ts` | 変更（Relationships, Views追加） |
| `supabase/config.toml` | 変更（menu-imagesバケット追加） |
