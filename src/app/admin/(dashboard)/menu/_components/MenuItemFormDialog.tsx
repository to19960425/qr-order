'use client';

import { useRef, useState, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImageUpload } from './ImageUpload';
import { menuItemSchema } from '@/lib/validations/menu';
import { createMenuItemAction, updateMenuItemAction } from '../actions';
import { Loader2Icon } from 'lucide-react';
import type { Database } from '@/types/database';

type Category = Database['public']['Tables']['categories']['Row'];
type MenuItem = Database['public']['Tables']['menu_items']['Row'];

type MenuItemFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  defaultCategoryId: string;
  editItem?: MenuItem | null;
};

type FieldErrors = Partial<Record<'name' | 'price' | 'category_id' | 'description', string>>;

export function MenuItemFormDialog({
  open,
  onOpenChange,
  categories,
  defaultCategoryId,
  editItem,
}: MenuItemFormDialogProps) {
  const isEdit = !!editItem;
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [categoryId, setCategoryId] = useState(editItem?.category_id ?? defaultCategoryId);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});
    setServerError(null);

    const form = e.currentTarget;
    const name = (form.elements.namedItem('name') as HTMLInputElement).value;
    const priceStr = (form.elements.namedItem('price') as HTMLInputElement).value;
    const description = (form.elements.namedItem('description') as HTMLTextAreaElement).value;

    const price = Number(priceStr);
    const parsed = menuItemSchema.safeParse({
      name,
      price: Number.isNaN(price) ? undefined : price,
      category_id: categoryId,
      description: description || undefined,
    });

    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof FieldErrors;
        if (!errors[field]) errors[field] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    const formData = new FormData();
    if (isEdit) formData.set('menuItemId', editItem.id);
    formData.set('name', parsed.data.name);
    formData.set('price', String(parsed.data.price));
    formData.set('category_id', parsed.data.category_id);
    if (parsed.data.description) formData.set('description', parsed.data.description);
    if (imageFile) formData.set('image', imageFile);

    startTransition(async () => {
      const action = isEdit ? updateMenuItemAction : createMenuItemAction;
      const result = await action(formData);
      if (result.error) {
        setServerError(result.error);
      } else {
        onOpenChange(false);
        resetForm();
      }
    });
  }

  function resetForm() {
    setFieldErrors({});
    setServerError(null);
    setImageFile(null);
    setCategoryId(defaultCategoryId);
    formRef.current?.reset();
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'メニューを編集' : 'メニューを追加'}</DialogTitle>
        </DialogHeader>

        {serverError && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {serverError}
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="menu-name">名前 *</Label>
            <Input
              id="menu-name"
              name="name"
              defaultValue={editItem?.name ?? ''}
              maxLength={50}
              aria-invalid={!!fieldErrors.name}
            />
            {fieldErrors.name && (
              <p className="text-xs text-destructive">{fieldErrors.name}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="menu-description">説明</Label>
            <Textarea
              id="menu-description"
              name="description"
              defaultValue={editItem?.description ?? ''}
              maxLength={500}
              rows={3}
            />
            {fieldErrors.description && (
              <p className="text-xs text-destructive">{fieldErrors.description}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="menu-price">価格 *</Label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">&yen;</span>
              <Input
                id="menu-price"
                name="price"
                type="number"
                defaultValue={editItem?.price ?? ''}
                min={1}
                max={1000000}
                aria-invalid={!!fieldErrors.price}
              />
            </div>
            {fieldErrors.price && (
              <p className="text-xs text-destructive">{fieldErrors.price}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>カテゴリ *</Label>
            <Select value={categoryId} onValueChange={(v) => { if (v) setCategoryId(v); }}>
              <SelectTrigger className="w-full" aria-invalid={!!fieldErrors.category_id}>
                <SelectValue placeholder="カテゴリを選択" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.category_id && (
              <p className="text-xs text-destructive">{fieldErrors.category_id}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>画像</Label>
            <ImageUpload
              currentImageUrl={editItem?.image_url}
              onFileChange={setImageFile}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              キャンセル
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2Icon className="size-4 animate-spin" />}
              {isEdit ? '保存' : '追加'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
