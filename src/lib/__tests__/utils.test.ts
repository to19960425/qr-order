import { describe, it, expect } from "vitest";
import { formatPrice } from "../utils";

describe("formatPrice", () => {
  it("通常の価格をフォーマットできること", () => {
    expect(formatPrice(650)).toBe("¥650");
  });

  it("千以上の価格にカンマ区切りが入ること", () => {
    expect(formatPrice(1850)).toBe("¥1,850");
  });

  it("0の場合「¥0」を返すこと", () => {
    expect(formatPrice(0)).toBe("¥0");
  });

  it("大きな数値を正しくフォーマットできること", () => {
    expect(formatPrice(100000)).toBe("¥100,000");
  });
});
