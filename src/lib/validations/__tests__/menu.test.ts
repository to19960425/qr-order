import { describe, it, expect } from 'vitest';
import { menuItemSchema, categorySchema } from '../menu';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getFieldError(result: { success: false; error: { issues: any[] } }, field: string): string | undefined {
  return result.error.issues.find((i: any) => i.path[0] === field)?.message;
}

describe('menuItemSchema', () => {
  const validInput = {
    name: 'ブレンドコーヒー',
    price: 500,
    category_id: '550e8400-e29b-41d4-a716-446655440000',
  };

  describe('正常系', () => {
    it('名前・価格・カテゴリIDを指定した場合、バリデーションが成功すること', () => {
      const result = menuItemSchema.safeParse(validInput);

      expect(result.success).toBe(true);
    });

    it('説明を含めた場合でも、バリデーションが成功すること', () => {
      const result = menuItemSchema.safeParse({
        ...validInput,
        description: '香り豊かなブレンドコーヒー',
      });

      expect(result.success).toBe(true);
    });

    it('説明が未指定の場合、バリデーションが成功すること', () => {
      const result = menuItemSchema.safeParse(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBeUndefined();
      }
    });
  });

  describe('name バリデーション', () => {
    it('名前が空文字の場合、エラーメッセージが返ること', () => {
      const result = menuItemSchema.safeParse({ ...validInput, name: '' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldError(result, 'name')).toBe('名前は必須です');
      }
    });

    it('名前が50文字ちょうどの場合、バリデーションが成功すること', () => {
      const result = menuItemSchema.safeParse({
        ...validInput,
        name: 'あ'.repeat(50),
      });

      expect(result.success).toBe(true);
    });

    it('名前が51文字の場合、エラーメッセージが返ること', () => {
      const result = menuItemSchema.safeParse({
        ...validInput,
        name: 'あ'.repeat(51),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldError(result, 'name')).toBe('50文字以内で入力してください');
      }
    });
  });

  describe('price バリデーション', () => {
    it('価格が1の場合、バリデーションが成功すること', () => {
      const result = menuItemSchema.safeParse({ ...validInput, price: 1 });

      expect(result.success).toBe(true);
    });

    it('価格が0の場合、エラーメッセージが返ること', () => {
      const result = menuItemSchema.safeParse({ ...validInput, price: 0 });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldError(result, 'price')).toBe('1円以上で入力してください');
      }
    });

    it('価格が負の数の場合、エラーメッセージが返ること', () => {
      const result = menuItemSchema.safeParse({ ...validInput, price: -100 });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldError(result, 'price')).toBe('1円以上で入力してください');
      }
    });

    it('価格が小数の場合、エラーメッセージが返ること', () => {
      const result = menuItemSchema.safeParse({ ...validInput, price: 99.5 });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldError(result, 'price')).toBe('整数で入力してください');
      }
    });

    it('価格が1000000の場合、バリデーションが成功すること', () => {
      const result = menuItemSchema.safeParse({ ...validInput, price: 1_000_000 });

      expect(result.success).toBe(true);
    });

    it('価格が1000001の場合、エラーメッセージが返ること', () => {
      const result = menuItemSchema.safeParse({ ...validInput, price: 1_000_001 });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldError(result, 'price')).toBe('100万円以下で入力してください');
      }
    });
  });

  describe('category_id バリデーション', () => {
    it('有効なUUID形式の場合、バリデーションが成功すること', () => {
      const result = menuItemSchema.safeParse(validInput);

      expect(result.success).toBe(true);
    });

    it('UUID形式でない文字列の場合、エラーメッセージが返ること', () => {
      const result = menuItemSchema.safeParse({
        ...validInput,
        category_id: 'not-a-uuid',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldError(result, 'category_id')).toBe('カテゴリを選択してください');
      }
    });

    it('空文字の場合、エラーメッセージが返ること', () => {
      const result = menuItemSchema.safeParse({
        ...validInput,
        category_id: '',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldError(result, 'category_id')).toBe('カテゴリを選択してください');
      }
    });
  });

  describe('description バリデーション', () => {
    it('説明が500文字ちょうどの場合、バリデーションが成功すること', () => {
      const result = menuItemSchema.safeParse({
        ...validInput,
        description: 'あ'.repeat(500),
      });

      expect(result.success).toBe(true);
    });

    it('説明が501文字の場合、エラーメッセージが返ること', () => {
      const result = menuItemSchema.safeParse({
        ...validInput,
        description: 'あ'.repeat(501),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldError(result, 'description')).toBe('500文字以内で入力してください');
      }
    });
  });
});

describe('categorySchema', () => {
  describe('正常系', () => {
    it('カテゴリ名を指定した場合、バリデーションが成功すること', () => {
      const result = categorySchema.safeParse({ name: 'コーヒー' });

      expect(result.success).toBe(true);
    });
  });

  describe('name バリデーション', () => {
    it('カテゴリ名が空文字の場合、エラーメッセージが返ること', () => {
      const result = categorySchema.safeParse({ name: '' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldError(result, 'name')).toBe('カテゴリ名は必須です');
      }
    });

    it('カテゴリ名が50文字ちょうどの場合、バリデーションが成功すること', () => {
      const result = categorySchema.safeParse({ name: 'あ'.repeat(50) });

      expect(result.success).toBe(true);
    });

    it('カテゴリ名が51文字の場合、エラーメッセージが返ること', () => {
      const result = categorySchema.safeParse({ name: 'あ'.repeat(51) });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldError(result, 'name')).toBe('50文字以内で入力してください');
      }
    });
  });
});
