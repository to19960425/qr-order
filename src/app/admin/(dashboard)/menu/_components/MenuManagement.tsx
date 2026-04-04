'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { categorySchema } from '@/lib/validations/menu';
import { createCategoryAction } from '../actions';
import { CategorySection } from './CategorySection';
import { MenuItemFormDialog } from './MenuItemFormDialog';
import { PlusIcon, Loader2Icon } from 'lucide-react';
import type { Database } from '@/types/database';

type Category = Database['public']['Tables']['categories']['Row'];
type MenuItem = Database['public']['Tables']['menu_items']['Row'];

type MenuManagementProps = {
  categories: Category[];
  menuItemsByCategory: Record<string, MenuItem[]>;
};

export function MenuManagement({ categories, menuItemsByCategory }: MenuManagementProps) {
  // カテゴリ追加
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [isCategoryPending, startCategoryTransition] = useTransition();

  // メニューアイテムモーダル
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [dialogCategoryId, setDialogCategoryId] = useState('');

  function handleAddCategory() {
    const parsed = categorySchema.safeParse({ name: newCategoryName });
    if (!parsed.success) {
      setCategoryError(parsed.error.issues[0].message);
      return;
    }
    setCategoryError(null);
    const formData = new FormData();
    formData.set('name', newCategoryName);
    startCategoryTransition(async () => {
      const result = await createCategoryAction(formData);
      if (result.error) {
        setCategoryError(result.error);
      } else {
        setNewCategoryName('');
        setShowCategoryInput(false);
      }
    });
  }

  function handleCategoryKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCategory();
    } else if (e.key === 'Escape') {
      setShowCategoryInput(false);
      setNewCategoryName('');
      setCategoryError(null);
    }
  }

  function openAddDialog(categoryId: string) {
    setEditingItem(null);
    setDialogCategoryId(categoryId);
    setDialogOpen(true);
  }

  function openEditDialog(item: MenuItem) {
    setEditingItem(item);
    setDialogCategoryId(item.category_id);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      {categories.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="mb-4 text-muted-foreground">
            まずカテゴリを追加しましょう
          </p>
        </div>
      ) : (
        categories.map((cat, i) => (
          <CategorySection
            key={cat.id}
            category={cat}
            items={menuItemsByCategory[cat.id] ?? []}
            index={i}
            total={categories.length}
            onAddMenuItem={openAddDialog}
            onEditMenuItem={openEditDialog}
          />
        ))
      )}

      {/* カテゴリ追加 */}
      <div className="space-y-2">
        {showCategoryInput ? (
          <div className="flex items-center gap-2">
            <Input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={handleCategoryKeyDown}
              placeholder="カテゴリ名を入力"
              className="h-8 w-56"
              maxLength={50}
              autoFocus
            />
            <Button
              size="sm"
              onClick={handleAddCategory}
              disabled={isCategoryPending}
            >
              {isCategoryPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                '追加'
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowCategoryInput(false);
                setNewCategoryName('');
                setCategoryError(null);
              }}
            >
              キャンセル
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={() => setShowCategoryInput(true)}
          >
            <PlusIcon className="size-4" />
            カテゴリを追加
          </Button>
        )}
        {categoryError && (
          <p className="text-xs text-destructive">{categoryError}</p>
        )}
      </div>

      {/* メニューアイテム追加・編集モーダル */}
      {categories.length > 0 && (
        <MenuItemFormDialog
          key={editingItem?.id ?? `new-${dialogCategoryId}`}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          categories={categories}
          defaultCategoryId={dialogCategoryId || categories[0].id}
          editItem={editingItem}
        />
      )}
    </div>
  );
}
