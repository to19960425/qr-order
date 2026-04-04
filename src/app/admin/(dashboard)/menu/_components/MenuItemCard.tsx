'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils';
import { canMove } from '@/lib/sort-order';
import {
  deleteMenuItemAction,
  reorderMenuItemAction,
  toggleMenuItemAvailabilityAction,
} from '../actions';
import {
  ChevronUpIcon,
  ChevronDownIcon,
  PencilIcon,
  Trash2Icon,
  Loader2Icon,
  ImageIcon,
} from 'lucide-react';
import type { Database } from '@/types/database';

type MenuItem = Database['public']['Tables']['menu_items']['Row'];

type MenuItemCardProps = {
  item: MenuItem;
  index: number;
  total: number;
  onEdit: (item: MenuItem) => void;
};

export function MenuItemCard({ item, index, total, onEdit }: MenuItemCardProps) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm('このメニューを削除しますか？')) return;
    const formData = new FormData();
    formData.set('menuItemId', item.id);
    startTransition(async () => { await deleteMenuItemAction(formData); });
  }

  function handleReorder(direction: 'up' | 'down') {
    const formData = new FormData();
    formData.set('categoryId', item.category_id);
    formData.set('menuItemId', item.id);
    formData.set('direction', direction);
    startTransition(async () => { await reorderMenuItemAction(formData); });
  }

  function handleToggleAvailability() {
    const formData = new FormData();
    formData.set('menuItemId', item.id);
    formData.set('isAvailable', String(!item.is_available));
    startTransition(async () => { await toggleMenuItemAvailabilityAction(formData); });
  }

  const unavailable = !item.is_available;

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border p-3 ${
        unavailable ? 'border-muted bg-muted/50 opacity-60' : 'bg-background'
      }`}
    >
      {/* サムネイル */}
      <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt={item.name}
            className="size-full object-cover"
          />
        ) : (
          <ImageIcon className="size-6 text-muted-foreground" />
        )}
      </div>

      {/* 情報 */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{item.name}</span>
          {unavailable && (
            <span className="shrink-0 rounded bg-muted-foreground/20 px-1.5 py-0.5 text-xs">
              停止中
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{formatPrice(item.price)}</p>
        {item.description && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {item.description}
          </p>
        )}
      </div>

      {/* 操作ボタン */}
      <div className="flex shrink-0 items-center gap-1">
        {isPending && <Loader2Icon className="size-4 animate-spin text-muted-foreground" />}

        <Button
          variant="ghost"
          size="icon-xs"
          onClick={handleToggleAvailability}
          disabled={isPending}
          title={unavailable ? '提供を再開' : '提供を停止'}
        >
          <span className="text-xs">{unavailable ? '再開' : '停止'}</span>
        </Button>

        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => handleReorder('up')}
          disabled={isPending || !canMove(index, total, 'up')}
        >
          <ChevronUpIcon className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => handleReorder('down')}
          disabled={isPending || !canMove(index, total, 'down')}
        >
          <ChevronDownIcon className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => onEdit(item)}
          disabled={isPending}
        >
          <PencilIcon className="size-3.5" />
        </Button>
        <Button
          variant="destructive"
          size="icon-xs"
          onClick={handleDelete}
          disabled={isPending}
        >
          <Trash2Icon className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
