const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * 指定時刻の「当日 JST 0:00」に相当する UTC の Date を返す。
 * now を省略すると現在時刻を使用する。
 */
export function getTodayStartJST(now: Date = new Date()): Date {
  const jstMs = now.getTime() + JST_OFFSET_MS;
  const jstDate = new Date(jstMs);
  // JST日付の 0:00:00 を求めてからUTCに戻す
  const jstMidnight = Date.UTC(
    jstDate.getUTCFullYear(),
    jstDate.getUTCMonth(),
    jstDate.getUTCDate(),
  );
  return new Date(jstMidnight - JST_OFFSET_MS);
}

/**
 * UTC の ISO 文字列を JST の HH:mm 形式にフォーマットする。
 */
export function formatTimeJST(utcIso: string): string {
  const date = new Date(utcIso);
  const jstMs = date.getTime() + JST_OFFSET_MS;
  const jstDate = new Date(jstMs);
  const h = String(jstDate.getUTCHours()).padStart(2, '0');
  const m = String(jstDate.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}
