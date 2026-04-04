'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { canMove } from '@/lib/sort-order';
import { categorySchema } from '@/lib/validations/menu';
import {
  updateCategoryAction,
  deleteCategoryAction,
  reorderCategoryAction,
} from '../actions';
import { MenuItemCard } from './MenuItemCard';
import {
  ChevronUpIcon,
  ChevronDownIcon,
  PencilIcon,
  Trash2Icon,
  PlusIcon,
  CheckIcon,
  XIcon,
  Loader2Icon,
} from 'lucide-react';
import type { Database } from '@/types/database';

type Category = Database['public']['Tables']['categories']['Row'];
type MenuItem = Database['public']['Tables']['menu_items']['Row'];

type CategorySectionProps = {
  category: Category;
  items: MenuItem[];
  index: number;
  total: number;
  onAddMenuItem: (categoryId: string) => void;
  onEditMenuItem: (item: MenuItem) => void;
};

export function CategorySection({
  category,
  items,
  index,
  total,
  onAddMenuItem,
  onEditMenuItem,
}: CategorySectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(category.name);
  const [editError, setEditError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSaveEdit() {
    const parsed = categorySchema.safeParse({ name: editName });
    if (!parsed.success) {
      setEditError(parsed.error.issues[0].message);
      return;
    }
    setEditError(null);
    const formData = new FormData();
    formData.set('categoryId', category.id);
    formData.set('name', editName);
    startTransition(async () => {
      const result = await updateCategoryAction(formData);
      if (result.error) {
        setEditError(result.error);
      } else {
        setIsEditing(false);
      }
    });
  }

  function handleCancelEdit() {
    setIsEditing(false);
    setEditName(category.name);
    setEditError(null);
  }

  function handleDelete() {
    if (!confirm('この操作は取り消せません。配下のメニューも削除されます。')) return;
    const formData = new FormData();
    formData.set('categoryId', category.id);
    startTransition(async () => { await deleteCategoryAction(formData); });
  }

  function handleReorder(direction: 'up' | 'down') {
    const formData = new FormData();
    formData.set('categoryId', category.id);
    formData.set('direction', direction);
    startTransition(async () => { await reorderCategoryAction(formData); });
  }

  function handleEditKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  }

  return (
    <section className="space-y-3">
      {/* カテゴリヘッダー */}
      <div className="flex items-center gap-2">
        {isEditing ? (
          <>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleEditKeyDown}
              className="h-7 w-48"
              maxLength={50}
              autoFocus
            />
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={handleSaveEdit}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2Icon className="size-3.5 animate-spin" />
              ) : (
                <CheckIcon className="size-3.5" />
              )}
            </Button>
            <Button variant="ghost" size="icon-xs" onClick={handleCancelEdit}>
              <XIcon className="size-3.5" />
            </Button>
          </>
        ) : (
          <>
            <h3 className="text-base font-semibold">{category.name}</h3>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setIsEditing(true)}
              disabled={isPending}
            >
              <PencilIcon className="size-3.5" />
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
              variant="destructive"
              size="icon-xs"
              onClick={handleDelete}
              disabled={isPending}
            >
              <Trash2Icon className="size-3.5" />
            </Button>
            {isPending && <Loader2Icon className="size-4 animate-spin text-muted-foreground" />}
          </>
        )}
      </div>
      {editError && <p className="text-xs text-destructive">{editError}</p>}

      {/* メニューアイテム一覧 */}
      <div className="space-y-2 pl-2">
        {items.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            メニューを追加しましょう
          </p>
        ) : (
          items.map((item, i) => (
            <MenuItemCard
              key={item.id}
              item={item}
              index={i}
              total={items.length}
              onEdit={onEditMenuItem}
            />
          ))
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onAddMenuItem(category.id)}
          className="w-full"
        >
          <PlusIcon className="size-4" />
          メニューを追加
        </Button>
      </div>
    </section>
  );
}
