export const DAY_MS = 86_400_000;

/** Calendar-day difference in local time (so 23:59 → 00:01 counts as 尋日). */
export function calendarDaysAgo(ts: number, now: number): number {
  const a = new Date(ts);
  const b = new Date(now);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

export function relDay(ts: number, now: number): string {
  const d = calendarDaysAgo(ts, now);
  if (d <= 0) return '今日';
  if (d === 1) return '尋日';
  return `${d} 日前`;
}

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

export function weekdayLabel(now: number): string {
  return WEEKDAYS[new Date(now).getDay()]!;
}
