# Step 03 詳細仕様: 管理画面 - メニュー管理

## 概要・目的

管理画面でカテゴリとメニューアイテムのCRUD、画像アップロード、並び替え、提供停止切り替えを実装する。
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
| バリデーション | zod スキーマ（要インストール） | 型安全、クライアント/サーバー両方で再利用可能 |
| エラーハンドリング | クライアント側: zodでフィールド単位表示。サーバー側: 単一文字列 `{ error: string \| null }` | クライアント側で即時フィードバック、サーバー側はシンプルに保つ |
| DB操作 | Server Actions → UseCase | MVPはServer Actionsで素早く実装。ビジネスロジックはUseCaseに切り出し |
| 並び替え | 汎用 swap 関数 | カテゴリ・メニューアイテム両方で再利用 |
| 画像バリデーション | 純粋関数として切り出し | Storage操作はServer Action内に残す |
| store_id | stores テーブルから先頭1件取得 | 1店舗MVPのため |
| テスト方針 | 純粋関数のみユニットテスト | UseCase・Server ActionsはDB/フレームワーク依存のためE2Eで検証 |
| UIコンポーネント | shadcn CLI (`npx shadcn@latest add`) でDialog, Select等を追加 | 既存のbase-novaスタイルと統一 |
| カテゴリ追加/編集 | インラインUI（モーダル不要） | カテゴリは名前のみなのでインラインが軽量 |
| Storageバケット | Public バケット | お客様側でも画像表示が必要。MVPではPublicで十分 |
| 操作中フィードバック | ボタンdisabled + スピナー | useTransitionでpending状態を管理 |

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
| `src/app/admin/(dashboard)/menu/_components/MenuManagement.tsx` | メイン管理画面 |
| `src/app/admin/(dashboard)/menu/_components/CategorySection.tsx` | カテゴリ1件分のセクション |
| `src/app/admin/(dashboard)/menu/_components/MenuItemCard.tsx` | メニューアイテム1件の表示 |
| `src/app/admin/(dashboard)/menu/_components/MenuItemFormDialog.tsx` | メニューアイテム追加・編集モーダル |
| `src/app/admin/(dashboard)/menu/_components/ImageUpload.tsx` | ファイル選択UI + プレビュー |

### 変更

| ファイル | 変更内容 |
|---------|---------|
| `src/app/admin/(dashboard)/menu/page.tsx` | スタブを置き換え、Server Componentとしてデータ取得 |
| `supabase/config.toml` | menu-images バケット設定を追加 |

### shadcn/ui コンポーネント追加

| コンポーネント | 用途 | インストールコマンド |
|-------------|------|-------------------|
| Dialog | メニューアイテム追加・編集モーダル | `npx shadcn@latest add dialog` |
| Select | カテゴリ選択 | `npx shadcn@latest add select` |
| (必要に応じて追加) | | |

### npm パッケージ追加

| パッケージ | 用途 |
|-----------|------|
| `zod` | バリデーションスキーマ |

### テストファイル

| ファイル | テスト対象 |
|---------|----------|
| `src/lib/validations/__tests__/menu.test.ts` | menuItemSchema, categorySchema |
| `src/lib/validations/__tests__/image.test.ts` | validateImageFile |
| `src/lib/__tests__/sort-order.test.ts` | swapSortOrder, canMove |

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
| `deleteCategory(categoryId)` | 配下menu_itemsの画像をStorageから一括削除 → DELETE（DB側のON DELETE CASCADEで配下menu_itemsも削除） |
| `reorderCategories(storeId, categoryId, direction)` | swapSortOrderで新しい並び順を計算 → 2件UPDATE |

#### メニューアイテム操作

| UseCase | 処理内容 |
|---------|---------|
| `getMenuItemsByCategory(storeId)` | カテゴリ別にメニューアイテムを取得（sort_order順） |
| `createMenuItem(storeId, input, imageFile?)` | menuItemSchemaでバリデーション → 画像があればStorage upload → INSERT。sort_orderは該当カテゴリ内の最大値+1 |
| `updateMenuItem(menuItemId, input, imageFile?)` | menuItemSchemaでバリデーション → 画像があれば旧画像削除+新画像upload → UPDATE。カテゴリ変更時は移動先カテゴリの末尾（最大sort_order+1）に配置 |
| `deleteMenuItem(menuItemId)` | 画像があればStorage削除 → DELETE |
| `reorderMenuItems(categoryId, menuItemId, direction)` | swapSortOrderで新しい並び順を計算 → 2件UPDATE |
| `toggleMenuItemAvailability(menuItemId, isAvailable)` | is_available を UPDATE |

### 6. Server Actions (`src/app/admin/(dashboard)/menu/actions.ts`)

薄いアダプター。FormData → UseCase呼び出し → revalidatePath。

```typescript
'use server';

import { revalidatePath } from 'next/cache';

// 戻り値の型
type ActionResult = { error: string | null };

export async function createMenuItemAction(formData: FormData): Promise<ActionResult> {
  // FormData → オブジェクト変換
  // UseCase呼び出し
  // エラー時: return { error: '入力内容に誤りがあります' } (単一文字列)
  // 成功時: revalidatePath('/admin/menu'); return { error: null }
}
```

> フィールド単位のバリデーションエラーはクライアント側（zod safeParse）で表示する。
> Server側は二重チェック（セキュリティ用）だが、エラーは単一文字列で返す。

### 7. UI構成

#### ページ構成 (`src/app/admin/(dashboard)/menu/page.tsx`)

Server Componentとして、カテゴリ + メニューアイテムを取得し、Client Componentに渡す。

#### Client Components (`_components/`)

| コンポーネント | 役割 |
|-------------|------|
| `MenuManagement.tsx` | メイン管理画面。カテゴリセクション + メニューアイテム一覧 |
| `CategorySection.tsx` | カテゴリ1件分のセクション。インライン編集、配下メニュー一覧 |
| `MenuItemCard.tsx` | メニューアイテム1件の表示（サムネイル、名前、価格、説明抜粋、提供状態） |
| `MenuItemFormDialog.tsx` | メニューアイテム追加・編集モーダル（Dialog使用） |
| `ImageUpload.tsx` | ファイル選択UI + プレビュー + クライアント側バリデーション |

#### 表示仕様

- カテゴリはsort_order昇順で表示
- 各カテゴリセクション内にメニューアイテムをsort_order昇順でリスト表示
- 各メニューアイテム: 画像サムネイル、名前、価格（`formatPrice()`使用）、説明（抜粋）
- 画像がないアイテムにはプレースホルダーを表示
- 各カテゴリセクション内に「メニューを追加」ボタン

#### 空状態の表示

| 状態 | 表示 |
|------|------|
| カテゴリが0件 | 「まずカテゴリを追加しましょう」+ カテゴリ追加UIを目立たせる |
| カテゴリ内のメニューが0件 | 「メニューを追加しましょう」+ 「メニューを追加」ボタン |

#### 提供状態（is_available）の表示

- **提供中**: 通常表示
- **停止中**: グレーアウト表示 + 「停止中」バッジ
- 切り替え方法: MenuItemCardにトグル操作（ボタン or スイッチ）

```
┌─────────────────────────────────────────┐
│ [img] ブレンドコーヒー  ¥500           │  ← 通常
│       香り豊かな...                      │
│                                         │
│ [img] カフェラテ    ¥550   [停止中]     │  ← グレーアウト + バッジ
│       エスプレッソ...  (薄色表示)        │
└─────────────────────────────────────────┘
```

#### カテゴリのインラインUI

**追加UI:**
- カテゴリ一覧の末尾に「＋ カテゴリを追加」ボタン
- ボタン押下でテキスト入力欄が展開
- 「追加」ボタンで確定、「キャンセル」ボタンまたはEscで閉じる

```
┌─────────────────────────────────────┐
│ ☕ コーヒー    [編集] [↑][↓][削除]   │
│ 🍵 お茶       [編集] [↑][↓][削除]   │
│ 🍰 デザート   [編集] [↑][↓][削除]   │
│                                     │
│ [＋ カテゴリを追加]                  │
│ ┌─────────────────┐ [追加][ｷｬﾝｾﾙ]  │
│ │ カテゴリ名を入力  │                │
│ └─────────────────┘                │
└─────────────────────────────────────┘
```

**編集UI:**
- カテゴリ名の横の「編集」ボタンを押すと、その場でテキスト入力に切り替わる
- Enter or 「保存」ボタンで確定、Escまたは「キャンセル」ボタンで元に戻る

```
通常時:
│ ☕ コーヒー    [編集] [↑][↓][削除] │

編集中:
│ [コーヒー________] [保存][ｷｬﾝｾﾙ]  │
```

#### 削除時の確認ダイアログ

- カテゴリ削除: 「この操作は取り消せません。配下のメニューも削除されます」
- メニューアイテム削除: 「このメニューを削除しますか？」
- ブラウザ標準の `confirm()` または shadcn AlertDialogを使用

#### 並び替え

- カテゴリ・メニューアイテムそれぞれに↑↓ボタン
- 先頭の↑と末尾の↓はdisabled
- ボタン押下でServer Action呼び出し → revalidatePath

#### メニューアイテムフォーム（Dialog内）

| フィールド | 必須 | 入力タイプ | 備考 |
|-----------|------|-----------|------|
| 名前 | ○ | テキスト入力 | max 50文字 |
| 説明 | × | テキストエリア | max 500文字 |
| 価格 | ○ | `type="number"` + 「¥」プレフィックス表示 | 正の整数、max 1,000,000 |
| カテゴリ | ○ | Select（ドロップダウン） | 既存カテゴリから選択 |
| 画像 | × | ファイル選択 + プレビュー | JPEG/PNG/WebP、5MB以下 |

#### 操作中のUIフィードバック

- Server Action実行中（保存、削除、並び替え、提供状態切り替え等）はボタンをdisabledにし、スピナーを表示
- `useTransition` でpending状態を管理

#### エラーハンドリングフロー

1. **クライアント側（フォーム送信前）**: zodスキーマで `safeParse` → フィールド単位でエラーメッセージを各フィールド下に表示
2. **サーバー側（Server Action）**: zodバリデーション（二重チェック） → 失敗時は `{ error: '入力内容に誤りがあります' }` を返す
3. **サーバー側（DB/Storageエラー）**: `{ error: '保存に失敗しました。もう一度お試しください' }` 等の単一文字列
4. **UI表示**: サーバーエラーはフォーム上部にアラートとして表示

### 8. 画像アップロードフロー

1. クライアント: ファイル選択 → `validateImageFile()` でクライアント側バリデーション
2. クライアント: プレビュー表示（FileReader or URL.createObjectURL）
3. フォーム送信: FormDataに画像ファイルを含めてServer Actionに送信
4. Server Action → UseCase: 画像をSupabase Storage (`menu-images` バケット) にアップロード
   - ファイル名: `${crypto.randomUUID()}.${拡張子}` (インライン生成)
5. UseCase: アップロード後のURLを `menu_items.image_url` に保存
6. 編集時: 既存画像のプレビュー表示。新しい画像をアップロードした場合、旧画像をStorageから削除

### 9. Supabase Storage設定

`supabase/config.toml` に以下を追加:

```toml
[storage.buckets.menu-images]
public = true
file_size_limit = "5MiB"
allowed_mime_types = ["image/jpeg", "image/png", "image/webp"]
```

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
| カテゴリ削除時のStorage画像一括削除の失敗時 | 画像削除が一部失敗してもDB削除は進める方針（孤立画像は許容） |
| 複数店舗対応時のstore_id取得方法 | 現在はstoresテーブルから先頭1件取得。将来はuser-store紐付けテーブルの追加が必要 |
| 画像リサイズ/最適化 | Supabase Image Transformation（Pro plan）は無効。MVPではオリジナルサイズのまま保存 |
| 確認ダイアログの実装方法 | `confirm()` vs shadcn AlertDialog。実装時に判断 |
