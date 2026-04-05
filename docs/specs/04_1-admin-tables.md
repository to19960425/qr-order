# Step 04 詳細仕様: 管理画面 - 席管理

## 概要・目的

管理画面でテーブルのCRUD、開閉切り替え、QRコード生成、PDFダウンロードを実装する。
喫茶店のテーブルにQRコード付きPOPを設置し、お客様がスマートフォンで読み取って注文できるようにすることが最終目的。

---

## アーキテクチャ方針

### レイヤー構成

```
UI (Client Component: TableManagement)
  → Server Actions (薄いアダプター: 直接引数受け取り + revalidatePath)
    → UseCase (ビジネスロジック: DB操作)
      → Supabase client (DB操作)

QRコード生成・PDF生成はクライアント側で完結（Server Actions不要）
```

### 設計判断

| 項目 | 決定 | 理由 |
|------|------|------|
| レイアウト | テーブル形式（横一列） | 情報量が少なく一覧性重視。番号・ステータス・操作を横並び |
| QR表示 | モーダル（Dialog） | 一覧のスクロール量を抑えつつ、大きくQRを確認可能。PDFダウンロードボタンもモーダル内に配置 |
| 番号採番 | 最大番号 + 1 | 欠番を許容。シンプルで、物理テーブルの番号札との対応もしやすい |
| トークン | UUID v4 | URL推測不可能な一意識別子。crypto.randomUUID()を使用 |
| 開閉トグル | shadcn/ui Switch（base-nova スタイル、`npx shadcn add switch` で追加） | 既存コンポーネント（button, dialog等）と同じ Base UI React ベース。統一感を維持 |
| 削除ガード | shadcn/ui AlertDialog | カスタムUIで統一感のある削除確認ダイアログ。`npx shadcn add alert-dialog` で追加 |
| QR生成URL | `NEXT_PUBLIC_APP_URL` 環境変数。未設定時は `window.location.origin` にフォールバック | 開発/本番両対応 |
| QR生成方式 | `qrcode.toDataURL()` で Data URL を生成。モーダル表示（`<img>`タグ）とPDF埋め込み（`jsPDF.addImage`）で共通利用 | 実装がシンプル。SVGとData URLの二重管理を回避 |
| PDF生成 | クライアント側で `jsPDF` を使用。テキストは英語（日本語フォント埋め込み不要） | サーバーリソース不要。バンドルサイズ増加なし |
| 一括PDFダウンロード | MVPスコープ外 | 10〜30席規模では個別DLで十分 |
| Server Actions | 直接引数パターン（FormData不使用） | テーブル操作は入力が単純（追加はパラメータなし、削除・トグルはIDのみ）。FormDataの構築・パースが不要で可読性が高い |
| バリデーション | Zod スキーマ不要 | ユーザー入力がない（自動採番・自動トークン生成）ため、バリデーション層は不要 |
| テスト方針 | UseCase層のユニットテスト + E2Eで検証。QR/PDFはクライアント処理のため手動確認 | メニュー管理と同じ方針。UseCase層のロジック（採番、CRUD）はユニットテストで検証 |
| 操作フィードバック | useTransition + isPending でボタンの disabled/ローディング表示。成功時はトースト通知なし、エラー時はインラインメッセージ表示 | 成功はrevalidatePathによる一覧更新で十分。エラーはテーブル一覧上部にメッセージ表示 |
| クローズ中テーブルの表示 | 行全体のopacity低下 | 一目でオープン/クローズを識別可能。ただしボタンは全て操作可能 |
| テーブル追加上限 | 設けない | 10〜30席規模の喫茶店で誤操作リスクは低い。運用後に必要なら検討 |
| 同時実行制御 | MVPでは対策なし | 1店舗・1管理者のMVPで実用上問題なし。将来必要になったら UNIQUE制約 + リトライで対応 |

---

## 機能要件

### 4.1 テーブル一覧表示

- Server Component でテーブル一覧を `table_number` 昇順で取得
- Client Component (`TableManagement`) にデータを渡す
- テーブル形式で一覧表示

**テーブルカラム:**

| カラム | 内容 |
|--------|------|
| # | テーブル番号 |
| ステータス | Switch トグル + 「オープン」/「クローズ」ラベル |
| QRコード | 「QR表示」ボタン → モーダル |
| 操作 | 「削除」ボタン |

- テーブルが0件の場合: 「テーブルがありません。追加してください。」の空状態メッセージ
- ヘッダー部に「テーブルを追加」ボタンを配置
- **クローズ中のテーブル**: 行全体のopacityを低下させ、視覚的に区別する（ただしボタンは全て操作可能）

### 4.2 テーブル追加

- 「テーブルを追加」ボタンクリックで即座に新規テーブルを作成（フォーム入力なし）
- テーブル番号: 既存の最大 `table_number` + 1（テーブルが0件の場合は1）
- トークン: `crypto.randomUUID()` で生成
- `store_id`: `getStoreId()` で取得（1店舗MVP）
- `is_active`: デフォルト `true`（オープン状態）
- 作成後、一覧を自動更新（`revalidatePath`）

### 4.3 テーブル削除

- 「削除」ボタンクリックで AlertDialog を表示
  - タイトル: 「テーブルの削除」
  - メッセージ: 「テーブル{番号}を削除しますか？」
  - アクションボタン: 「削除」（destructive）、「キャンセル」
- 確認後、`tables` テーブルから DELETE
- 紐づく `orders.table_id` は ON DELETE SET NULL で自動的にNULLになる
- 削除後、一覧を自動更新

### 4.4 テーブル開閉切り替え

- shadcn/ui の Switch コンポーネントでトグル
- `is_active` を `true`（オープン）/ `false`（クローズ）で切り替え
- 視覚的フィードバック:
  - オープン: Switch ON + 緑系テキスト「オープン」 + 行のopacity通常
  - クローズ: Switch OFF + グレー系テキスト「クローズ」 + 行全体のopacity低下
- 操作中は Switch を disabled にし、楽観的更新は行わない（サーバー応答を待つ）
- `useTransition` + `isPending` パターンで非同期処理中の状態管理

### 4.5 QRコード表示（モーダル）

- 「QR表示」ボタンクリックで Dialog を開く
- モーダル内容:
  - テーブル番号（見出し）
  - QRコード（Data URL を `<img>` タグで表示、十分な大きさ）
  - 「PDFダウンロード」ボタン
- QRコードURL: `{NEXT_PUBLIC_APP_URL}/order/{table_token}`
  - `NEXT_PUBLIC_APP_URL` が未設定の場合: `window.location.origin` を使用
- `qrcode.toDataURL()` で Data URL として生成（モーダル表示・PDF埋め込み共通）
- **クローズ中のテーブルでもQR表示・PDFダウンロード可能**（テーブル開局前のPOP印刷に対応）

### 4.6 PDFダウンロード

- モーダル内の「PDFダウンロード」ボタンでクライアント側生成・ダウンロード
- **PDFレイアウト（A6サイズ: 105mm x 148mm）:**

```
┌─────────────────────┐
│                     │
│      Table {番号}    │  ← 大きめフォント（英語）
│                     │
│    ┌───────────┐    │
│    │           │    │
│    │  QR Code  │    │  ← 中央配置、大きめ
│    │           │    │
│    └───────────┘    │
│                     │
│  Scan QR code       │  ← 案内文（英語固定）
│  to order           │
│                     │
└─────────────────────┘
```

- ファイル名: `table-{番号}.pdf`
- フォント: jsPDF デフォルト（Helvetica等）。**テキストは全て英語**（日本語フォント埋め込み不要、バンドルサイズ増加なし）
- QRコード画像: `qrcode.toDataURL()` で生成した Data URL を `jsPDF.addImage()` で埋め込み

### 4.7 エラーハンドリング

- 成功時: トースト通知なし。`revalidatePath` による一覧更新がフィードバック
- エラー時: テーブル一覧の上部にインラインエラーメッセージを表示
  - エラーメッセージは次の操作成功時、またはユーザーの手動クリアで消える
- 操作中（isPending）: ボタンを disabled にしてローディング表示

---

## 非機能要件

### パフォーマンス

- テーブル数: 10〜30席程度を想定
- ページネーション不要
- QRコード生成はクライアント側で行うため、一覧表示時のサーバー負荷は軽微

### セキュリティ

- 管理画面のため認証必須（既存のSupabase Auth）
- テーブルの操作はすべて `store_id` でスコープ（他店舗のテーブルを操作不可）

---

## 対象ファイル一覧

### 新規作成

| ファイル | 役割 |
|---------|------|
| `src/app/admin/(dashboard)/tables/actions.ts` | Server Actions（テーブル追加・削除・開閉切り替え）。直接引数パターン |
| `src/app/admin/(dashboard)/tables/_components/TableManagement.tsx` | テーブル一覧のClient Component（メイン）。インラインエラー表示含む |
| `src/app/admin/(dashboard)/tables/_components/QRCodeModal.tsx` | QRコード表示モーダル + PDFダウンロードボタン |
| `src/lib/use-cases/tables.ts` | UseCase層（getTables, createTable, deleteTable, toggleTableStatus） |
| `src/lib/use-cases/__tests__/tables.test.ts` | UseCase層のユニットテスト |
| `src/components/ui/switch.tsx` | shadcn/ui Switch コンポーネント（`npx shadcn add switch` で追加） |
| `src/components/ui/alert-dialog.tsx` | shadcn/ui AlertDialog コンポーネント（`npx shadcn add alert-dialog` で追加） |

### 変更

| ファイル | 変更内容 |
|---------|---------|
| `src/app/admin/(dashboard)/tables/page.tsx` | プレースホルダーを実装に置き換え。Server Componentとしてテーブル一覧を取得しClient Componentに渡す |

### 変更なし（参照のみ）

| ファイル | 参照理由 |
|---------|---------|
| `src/lib/supabase/server.ts` | UseCase層からサーバー用Supabaseクライアントを利用 |
| `src/lib/store.ts` | `getStoreId()` で店舗IDを取得 |
| `src/types/database.ts` | tables テーブルの型定義を参照 |
| `src/components/ui/button.tsx` | ボタンコンポーネント |
| `src/components/ui/dialog.tsx` | QRコードモーダル用ダイアログ |

---

## MVPスコープ

### 含む

- テーブルのCRUD（追加・削除）
- 開閉切り替え（Switch トグル）
- QRコード生成・モーダル表示
- 個別テーブルのPDFダウンロード
- UseCase層のユニットテスト

### 含まない（将来検討）

- 全テーブル一括PDFダウンロード
- テーブル番号の手動編集・並び替え
- テーブルのグループ化（フロア分け等）
- 削除時の未完了注文チェック
- QRコードのデザインカスタマイズ（ロゴ埋め込み等）
- PDF内容のカスタマイズ（店舗名・案内文の編集）
- 同時実行制御（table_number の UNIQUE 制約 + リトライ）

---

## 未決定事項・今後の検討事項

| 項目 | 詳細 | 判断タイミング |
|------|------|--------------|
| QRコードサイズ | モーダル内・PDF内の最適なQRコードサイズ | 実装時に実機で確認 |
