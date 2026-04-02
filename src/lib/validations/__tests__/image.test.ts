import { describe, it, expect } from 'vitest';
import { validateImageFile, MAX_IMAGE_SIZE } from '../image';

describe('validateImageFile', () => {
  describe('正常系: 許可されたファイル形式', () => {
    it.each(['image/jpeg', 'image/png', 'image/webp'])(
      '%s のファイルを渡した場合、valid: true が返ること',
      (type) => {
        const result = validateImageFile({ size: 1024, type });

        expect(result).toEqual({ valid: true });
      },
    );
  });

  describe('ファイル形式の異常系', () => {
    it.each(['image/gif', 'image/svg+xml', 'image/bmp'])(
      '%s のファイルを渡した場合、valid: false とエラーメッセージが返ること',
      (type) => {
        const result = validateImageFile({ size: 1024, type });

        expect(result).toEqual({
          valid: false,
          error: 'JPEG, PNG, WebPのみ対応しています',
        });
      },
    );
  });

  describe('ファイルサイズ', () => {
    it('サイズが5MB(5242880バイト)ちょうどの場合、valid: true が返ること', () => {
      const result = validateImageFile({ size: MAX_IMAGE_SIZE, type: 'image/jpeg' });

      expect(result).toEqual({ valid: true });
    });

    it('サイズが5MB超(5242881バイト)の場合、valid: false とエラーメッセージが返ること', () => {
      const result = validateImageFile({ size: MAX_IMAGE_SIZE + 1, type: 'image/jpeg' });

      expect(result).toEqual({
        valid: false,
        error: '5MB以下のファイルを選択してください',
      });
    });

    // 0バイトでも形式が正しければ受理される
    it('サイズが0バイトでも形式が正しければ、valid: true が返ること', () => {
      const result = validateImageFile({ size: 0, type: 'image/png' });

      expect(result).toEqual({ valid: true });
    });
  });

  describe('複合条件', () => {
    // サイズチェックが形式チェックより先に実行される
    it('サイズ超過かつ不正な形式の場合、サイズのエラーメッセージが返ること', () => {
      const result = validateImageFile({
        size: MAX_IMAGE_SIZE + 1,
        type: 'image/gif',
      });

      expect(result).toEqual({
        valid: false,
        error: '5MB以下のファイルを選択してください',
      });
    });
  });
});
