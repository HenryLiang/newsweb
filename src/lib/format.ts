/** 展示层格式化工具。 */

/** "2026-08-28 10:00" 风格；时间部分可选。 */
export function formatDateTime(
  iso: string | null | undefined,
  withTime = true,
): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (!withTime) return date;
  return `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 相对时间："3分钟前" / "2小时前" / "3天前"，超过 7 天回退日期。 */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days <= 7) return `${days}天前`;
  return formatDateTime(iso, false);
}

/**
 * COS 图片 URL 追加数据万象缩放参数（腾讯云 imageMogr2）。
 * 非 COS URL 原样返回。已有查询串时用 & 拼接。
 */
export function thumb(
  url: string | null | undefined,
  spec = '300x200',
): string | null {
  if (!url) return null;
  if (!/(myqcloud\.com|tencentcos\.cn)/.test(url)) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}imageMogr2/thumbnail/${spec}/strip`;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
