# Step 03 詳細仕様: 管理画面 - メニュー管理

## 概要・目的

管理画面でカテゴリとメニューアイテムのCRUD、画像アップロード、並び替えを実装する。
将来的なバックエンド分離（PHP等）を見据え、ビジネスロジックをServer Actionsに直接書かず、UseCase層・バリデーション層・ユーティリティに切り出す。

---

## アーキテクチャ方針

### レイヤー構成

```
UI (Client Component)
  → Server Actions (薄いアダプター: FormData受け取り + revalidatePath)
    → UseCase (ビジネスロジック: バリデーション呼び出し + DB操作)
      → zod schemas (バリデーション: 純粋関数、テスト対象)
      → sort-order (並び替え: 純粋関数、テスト対象)
      → validateImageFile (画像検証: 純粋関数、テスト対象)
      → Supabase client (DB操作)
```

### 設計判断

| 項目 | 決定 | 理由 |
|------|------|------|
| バリデーション | zod スキーマ | 型安全、Server Actions/将来のAPI Routes両方で再利用可能 |
| DB操作 | Server Actions → UseCase | MVPはServer Actionsで素早く実装。ビジネスロジックはUseCaseに切り出し、将来バックエンド分離時に移植可能 |
| 並び替え | 汎用 swap 関数 | カテゴリ・メニューアイテム両方で再利用 |
| 画像バリデーション | 純粋関数として切り出し | Storage操作はServer Action内に残す。ファイルパス生成（uuid.ext）はインライン |
| store_id | stores テーブルから先頭1件取得 | 1店舗MVPのため。user-store紐付けテーブルは作らない |
| エラーハンドリング | Server Actionの戻り値 `{ error?: string }` | useActionState と相性が良い |
| テスト方針 | 純粋関数のみユニットテスト | UseCase・Server ActionsはDB/フレームワーク依存のためE2Eで検証 |

---

## ファイル構成

### 新規作成

| ファイル | 役割 |
|---------|------|
| `src/lib/validations/menu.ts` | menuItemSchema, categorySchema (zod) |
| `src/lib/validations/image.ts` | validateImageFile, 定数定義 |
| `src/lib/sort-order.ts` | swapSortOrder, canMove (汎用) |
| `src/lib/store.ts` | getStoreId() |
| `src/lib/use-cases/menu.ts` | カテゴリ・メニューアイテムのCRUD UseCase |
| `src/app/admin/(dashboard)/menu/actions.ts` | Server Actions (薄いアダプター) |
| `src/app/admin/(dashboard)/menu/page.tsx` | メニュー管理ページ (Server Component、既存スタブを置換) |
| `src/app/admin/(dashboard)/menu/_components/*.tsx` | Client Components (一覧、フォーム、画像アップロード等) |

### shadcn/ui コンポーネント追加

| コンポーネント | 用途 |
|-------------|------|
| Dialog | メニューアイテム追加・編集モーダル |
| Select | カテゴリ選択 |
| (必要に応じて追加) | |

### テストファイル

| ファイル | テスト対象 |
|---------|----------|
| `src/lib/validations/__tests__/menu.test.ts` | menuItemSchema, categorySchema |
| `src/lib/validations/__tests__/image.test.ts` | validateImageFile |
| `src/lib/__tests__/sort-order.test.ts` | swapSortOrder, canMove |

> 既存の `src/app/admin/(dashboard)/menu/__tests__/` 配下のテストファイル（6ファイル）は削除する。UIコンポーネントのテストはshadcn/uiのテストと重複するため。

---

## 機能要件

### 1. バリデーション (`src/lib/validations/menu.ts`)

#### menuItemSchema

```typescript
import { z } from 'zod';

export const menuItemSchema = z.object({
  name: z.string()
    .min(1, '名前は必須です')
    .max(50, '50文字以内で入力してください'),
  price: z.number()
    .int('整数で入力してください')
    .positive('1円以上で入力してください')
    .max(1_000_000, '100万円以下で入力してください'),
  category_id: z.string().uuid('カテゴリを選択してください'),
  description: z.string().max(500, '500文字以内で入力してください').optional(),
});

export type MenuItemInput = z.infer<typeof menuItemSchema>;
```

#### categorySchema

```typescript
export const categorySchema = z.object({
  name: z.string()
    .min(1, 'カテゴリ名は必須です')
    .max(50, '50文字以内で入力してください'),
});

export type CategoryInput = z.infer<typeof categorySchema>;
```

### 2. 画像バリデーション (`src/lib/validations/image.ts`)

```typescript
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export type ImageValidationResult =
  | { valid: true }
  | { valid: false; error: string };

export function validateImageFile(file: { size: number; type: string }): ImageValidationResult {
  if (file.size > MAX_IMAGE_SIZE) {
    return { valid: false, error: '5MB以下のファイルを選択してください' };
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as typeof ALLOWED_IMAGE_TYPES[number])) {
    return { valid: false, error: 'JPEG, PNG, WebPのみ対応しています' };
  }
  return { valid: true };
}
```

> 引数を `{ size: number; type: string }` にすることで、テスト時にFileオブジェクトを作らなくてよい。

### 3. 並び替えロジック (`src/lib/sort-order.ts`)

```typescript
type Sortable = { id: string; sort_order: number };

/**
 * 指定indexのアイテムをdirection方向に1つ移動した新配列を返す。
 * sort_orderの値を入れ替える。元の配列は変更しない。
 */
export function swapSortOrder<T extends Sortable>(
  items: T[],
  index: number,
  direction: 'up' | 'down',
): T[];

/**
 * 指定位置のアイテムが移動可能かどうかを判定する。
 */
export function canMove(
  index: number,
  total: number,
  direction: 'up' | 'down',
): boolean;
```

#### 仕様

- `swapSortOrder`: 隣接する2アイテムの `sort_order` 値を入れ替えた新しい配列を返す
- `canMove`: 先頭の `up` と末尾の `down` は `false`、それ以外は `true`
- アイテムが0件または1件の場合、`canMove` は常に `false`

### 4. store_id 取得 (`src/lib/store.ts`)

```typescript
export async function getStoreId(): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('stores')
    .select('id')
    .limit(1)
    .single();
  if (!data) throw new Error('Store not found');
  return data.id;
}
```

### 5. UseCase層 (`src/lib/use-cases/menu.ts`)

各UseCaseは以下の責務を持つ:
1. バリデーション（zodスキーマ呼び出し）
2. DB操作（Supabaseクライアント経由）
3. 関連処理（画像削除、カスケード削除等）

#### カテゴリ操作

| UseCase | 処理内容 |
|---------|---------|
| `getCategories(storeId)` | カテゴリ一覧をsort_order順で取得 |
| `createCategory(storeId, input)` | categorySchemaでバリデーション → INSERT。sort_orderは既存の最大値+1 |
| `updateCategory(categoryId, input)` | categorySchemaでバリデーション → UPDATE |
| `deleteCategory(categoryId)` | DELETE（DB側のON DELETE CASCADEで配下menu_itemsも削除。画像があれば画像も削除） |
| `reorderCategories(storeId, categoryId, direction)` | swapSortOrderで新しい並び順を計算 → 2件UPDATE |

#### メニューアイテム操作

| UseCase | 処理内容 |
|---------|---------|
| `getMenuItemsByCategory(storeId)` | カテゴリ別にメニューアイテムを取得（sort_order順） |
| `createMenuItem(storeId, input, imageFile?)` | menuItemSchemaでバリデーション → 画像があればStorage upload → INSERT |
| `updateMenuItem(menuItemId, input, imageFile?)` | menuItemSchemaでバリデーション → 画像があれば旧画像削除+新画像upload → UPDATE |
| `deleteMenuItem(menuItemId)` | 画像があればStorage削除 → DELETE |
| `reorderMenuItems(categoryId, menuItemId, direction)` | swapSortOrderで新しい並び順を計算 → 2件UPDATE |

### 6. Server Actions (`src/app/admin/(dashboard)/menu/actions.ts`)

薄いアダプター。FormData → UseCase呼び出し → revalidatePath。

```typescript
'use server';

import { revalidatePath } from 'next/cache';
// UseCaseをimportして呼び出す

export async function createMenuItemAction(formData: FormData) {
  // FormData → オブジェクト変換
  // UseCase呼び出し
  // エラー時: return { error: string }
  // 成功時: revalidatePath('/admin/menu'); return { error: null }
}
```

戻り値の型:

```typescript
type ActionResult = { error: string | null };
```

### 7. UI構成

#### ページ構成 (`src/app/admin/(dashboard)/menu/page.tsx`)

Server Componentとして、カテゴリ + メニューアイテムを取得し、Client Componentに渡す。

#### Client Components (`_components/`)

| コンポーネント | 役割 |
|-------------|------|
| `MenuManagement.tsx` | メイン管理画面。カテゴリセクション + メニューアイテム一覧 |
| `CategorySection.tsx` | カテゴリ1件分のセクション（カテゴリ名表示・編集、配下メニュー一覧） |
| `MenuItemCard.tsx` | メニューアイテム1件の表示（サムネイル、名前、価格、説明抜粋） |
| `MenuItemFormDialog.tsx` | メニューアイテム追加・編集モーダル（Dialog使用） |
| `ImageUpload.tsx` | ファイル選択UI + プレビュー + クライアント側バリデーション |

#### 表示仕様

- カテゴリはsort_order昇順で表示
- 各カテゴリセクション内にメニューアイテムをsort_order昇順でリスト表示
- 各メニューアイテム: 画像サムネイル、名前、価格（formatPrice）、説明（抜粋）
- 画像がないアイテムにはプレースホルダーを表示
- 各カテゴリセクション内に「メニューを追加」ボタン

#### 削除時の確認ダイアログ

- カテゴリ削除: 「この操作は取り消せません。配下のメニューも削除されます」
- メニューアイテム削除: 「このメニューを削除しますか？」

#### 並び替え

- カテゴリ・メニューアイテムそれぞれに↑↓ボタン
- 先頭の↑と末尾の↓はdisabled
- ボタン押下でServer Action呼び出し → revalidatePath

### 8. 画像アップロードフロー

1. クライアント: ファイル選択 → `validateImageFile()` でクライアント側バリデーション
2. クライアント: プレビュー表示
3. フォーム送信: FormDataに画像ファイルを含めてServer Actionに送信
4. Server Action → UseCase: 画像をSupabase Storage (`menu-images` バケット) にアップロード
   - ファイル名: `${crypto.randomUUID()}.${拡張子}` (インライン生成)
5. UseCase: アップロード後のURLを `menu_items.image_url` に保存
6. 編集時: 既存画像のプレビュー表示。新しい画像をアップロードした場合、旧画像をStorageから削除

---

## テスト対象（純粋関数のみ）

### テスト対象一覧

| 関数/スキーマ | ファイル | テスト観点 |
|-------------|---------|----------|
| `menuItemSchema` | `src/lib/validations/menu.ts` | 正常系、名前空文字、名前51文字、価格0/負数/小数/100万超 |
| `categorySchema` | `src/lib/validations/menu.ts` | 正常系、名前空文字、名前51文字 |
| `validateImageFile` | `src/lib/validations/image.ts` | 各形式OK、GIF/SVG拒否、5MB超、5MBちょうど |
| `swapSortOrder` | `src/lib/sort-order.ts` | 下移動、上移動、sort_order値の入れ替え |
| `canMove` | `src/lib/sort-order.ts` | 先頭up=false、末尾down=false、中間=true、0件、1件 |

### テストしないもの

| 対象 | 理由 |
|------|------|
| UseCase関数 | DB依存。E2Eで検証 |
| Server Actions | Next.jsフレームワーク依存。E2Eで検証 |
| UIコンポーネント | shadcn/uiの振る舞いテストになるため不要 |

---

## 未決定事項・今後の検討事項

| 項目 | 備考 |
|------|------|
| メニュー説明の最大文字数 | 暫定500文字。必要に応じて調整 |
| menu-images バケットのRLS/ポリシー | Supabase Storage側のアクセス制御。別途設定が必要 |
| カテゴリ削除時の配下メニュー画像の一括削除 | DB側はON DELETE CASCADEで削除されるが、Storageの画像は個別に削除が必要。UseCase内で実装する |
| 複数店舗対応時のstore_id取得方法 | 現在はstoresテーブルから先頭1件取得。将来はuser-store紐付けテーブルの追加が必要 |
