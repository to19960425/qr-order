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

export const categorySchema = z.object({
  name: z.string()
    .min(1, 'カテゴリ名は必須です')
    .max(50, '50文字以内で入力してください'),
});

export type CategoryInput = z.infer<typeof categorySchema>;
