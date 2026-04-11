import { describe, it, expect } from 'vitest';
import { getTodayStartJST, formatTimeJST } from '../date-utils';

describe('JST当日判定ユーティリティ', () => {
  describe('当日JST 0:00の算出', () => {
    it('JST日中の場合、当日JST 0:00に相当するUTC時刻が返ること', () => {
      // Arrange — JST 14:00 = UTC 05:00
      const now = new Date('2026-04-09T05:00:00Z');

      // Act
      const result = getTodayStartJST(now);

      // Assert — 当日 JST 0:00 = UTC 前日 15:00
      expect(result.toISOString()).toBe('2026-04-08T15:00:00.000Z');
    });

    it('JST深夜（0:00〜8:59）の場合、当日JST 0:00が正しく算出されること', () => {
      // Arrange — JST 1:00 = UTC 16:00（前日）
      const now = new Date('2026-04-08T16:00:00Z');

      // Act
      const result = getTodayStartJST(now);

      // Assert — 当日 JST 0:00（4/9） = UTC 4/8 15:00
      expect(result.toISOString()).toBe('2026-04-08T15:00:00.000Z');
    });

    it('JST 0:00ちょうどの場合、当日0:00としてその時刻が返ること', () => {
      // Arrange — JST 0:00 = UTC 15:00（前日）
      const now = new Date('2026-04-08T15:00:00Z');

      // Act
      const result = getTodayStartJST(now);

      // Assert
      expect(result.toISOString()).toBe('2026-04-08T15:00:00.000Z');
    });
  });

  describe('日付境界', () => {
    it('UTC 14:59（JST 23:59）とUTC 15:00（JST翌日0:00）で異なる日のJST 0:00が返ること', () => {
      // Arrange
      const justBefore = new Date('2026-04-08T14:59:00Z'); // JST 23:59 (4/8)
      const justAfter = new Date('2026-04-08T15:00:00Z'); // JST 0:00 (4/9)

      // Act
      const resultBefore = getTodayStartJST(justBefore);
      const resultAfter = getTodayStartJST(justAfter);

      // Assert
      expect(resultBefore.toISOString()).toBe('2026-04-07T15:00:00.000Z'); // JST 4/8 0:00
      expect(resultAfter.toISOString()).toBe('2026-04-08T15:00:00.000Z'); // JST 4/9 0:00
      expect(resultBefore.getTime()).not.toBe(resultAfter.getTime());
    });

    it('月末跨ぎ（例: JST 4月1日0:00 = UTC 3月31日15:00）が正しく算出されること', () => {
      // Arrange — JST 4/1 02:00 = UTC 3/31 17:00
      const now = new Date('2026-03-31T17:00:00Z');

      // Act
      const result = getTodayStartJST(now);

      // Assert — JST 4/1 0:00 = UTC 3/31 15:00
      expect(result.toISOString()).toBe('2026-03-31T15:00:00.000Z');
    });

    it('年末跨ぎ（JST 1月1日0:00 = UTC 12月31日15:00）が正しく算出されること', () => {
      // Arrange — JST 1/1 03:00 = UTC 12/31 18:00
      const now = new Date('2025-12-31T18:00:00Z');

      // Act
      const result = getTodayStartJST(now);

      // Assert — JST 1/1 0:00 = UTC 12/31 15:00
      expect(result.toISOString()).toBe('2025-12-31T15:00:00.000Z');
    });
  });

  describe('時刻フォーマット（HH:mm）', () => {
    it('UTC時刻をJST変換しHH:mm形式の文字列にフォーマットできること', () => {
      // Arrange — UTC 05:32 = JST 14:32
      const utc = '2026-04-09T05:32:00Z';

      // Act
      const result = formatTimeJST(utc);

      // Assert
      expect(result).toBe('14:32');
    });

    it('1桁の時・分がゼロパディングされること（例: "09:05"）', () => {
      // Arrange — UTC 00:05 = JST 09:05
      const utc = '2026-04-09T00:05:00Z';

      // Act
      const result = formatTimeJST(utc);

      // Assert
      expect(result).toBe('09:05');
    });

    it('JST 0:00が「00:00」とフォーマットされること', () => {
      // Arrange — UTC 15:00 = JST 翌日 0:00
      const utc = '2026-04-08T15:00:00Z';

      // Act
      const result = formatTimeJST(utc);

      // Assert
      expect(result).toBe('00:00');
    });

    it('JST 23:59が「23:59」とフォーマットされること', () => {
      // Arrange — UTC 14:59 = JST 23:59
      const utc = '2026-04-08T14:59:00Z';

      // Act
      const result = formatTimeJST(utc);

      // Assert
      expect(result).toBe('23:59');
    });
  });
});
