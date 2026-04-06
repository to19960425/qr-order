'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2Icon, PlusIcon, QrCodeIcon, Trash2Icon } from 'lucide-react';
import {
  createTableAction,
  deleteTableAction,
  toggleTableStatusAction,
} from '../actions';
import { QRCodeModal } from './QRCodeModal';
import type { Database } from '@/types/database';

type Table = Database['public']['Tables']['tables']['Row'];

interface TableManagementProps {
  tables: Table[];
}

export function TableManagement({ tables }: TableManagementProps) {
  const [error, setError] = useState<string | null>(null);
  const [addPending, startAddTransition] = useTransition();
  const [qrModal, setQrModal] = useState<{
    tableNumber: number;
    token: string;
  } | null>(null);

  function handleAdd() {
    startAddTransition(async () => {
      const result = await createTableAction();
      setError(result.error);
    });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {tables.length} テーブル
        </p>
        <Button onClick={handleAdd} disabled={addPending}>
          {addPending ? (
            <Loader2Icon className="animate-spin" data-icon="inline-start" />
          ) : (
            <PlusIcon data-icon="inline-start" />
          )}
          テーブルを追加
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
          <button
            className="ml-2 underline"
            onClick={() => setError(null)}
          >
            閉じる
          </button>
        </div>
      )}

      {/* Table list */}
      {tables.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          テーブルがありません。追加してください。
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">ステータス</th>
                <th className="px-4 py-3 font-medium">QRコード</th>
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {tables.map((table) => (
                <TableRow
                  key={table.id}
                  table={table}
                  onError={setError}
                  onShowQr={() =>
                    setQrModal({
                      tableNumber: table.table_number,
                      token: table.token,
                    })
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* QR Modal */}
      {qrModal && (
        <QRCodeModal
          open
          onOpenChange={(open) => {
            if (!open) setQrModal(null);
          }}
          tableNumber={qrModal.tableNumber}
          token={qrModal.token}
        />
      )}
    </div>
  );
}

function TableRow({
  table,
  onError,
  onShowQr,
}: {
  table: Table;
  onError: (error: string | null) => void;
  onShowQr: () => void;
}) {
  const [togglePending, startToggleTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();

  function handleToggle() {
    startToggleTransition(async () => {
      const result = await toggleTableStatusAction(table.id);
      onError(result.error);
    });
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteTableAction(table.id);
      onError(result.error);
    });
  }

  return (
    <tr
      className={`border-b last:border-b-0 ${
        !table.is_active ? 'opacity-50' : ''
      }`}
    >
      {/* Number */}
      <td className="px-4 py-3 font-medium">{table.table_number}</td>

      {/* Status toggle */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Switch
            checked={table.is_active}
            onCheckedChange={handleToggle}
            disabled={togglePending}
          />
          <span
            className={
              table.is_active
                ? 'text-green-700 dark:text-green-400'
                : 'text-muted-foreground'
            }
          >
            {table.is_active ? 'オープン' : 'クローズ'}
          </span>
          {togglePending && (
            <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" />
          )}
        </div>
      </td>

      {/* QR button */}
      <td className="px-4 py-3">
        <Button variant="outline" size="sm" onClick={onShowQr}>
          <QrCodeIcon data-icon="inline-start" />
          QR表示
        </Button>
      </td>

      {/* Delete */}
      <td className="px-4 py-3">
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                variant="destructive"
                size="sm"
                disabled={deletePending}
              />
            }
          >
            {deletePending ? (
              <Loader2Icon className="animate-spin" data-icon="inline-start" />
            ) : (
              <Trash2Icon data-icon="inline-start" />
            )}
            削除
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>テーブルの削除</AlertDialogTitle>
              <AlertDialogDescription>
                テーブル{table.table_number}を削除しますか？
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={handleDelete}
              >
                削除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </td>
    </tr>
  );
}
