// 进程内滑动窗口限流,单实例部署够用;多实例需换 Redis
interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

// 定期清理过期时间戳,防内存膨胀（每 10 分钟;最大窗口为 24h,据此判定过期）
const MAX_WINDOW_MS = 24 * 3600 * 1000;
if (typeof setInterval !== 'undefined') {
  const cleaner = setInterval(
    () => {
      const now = Date.now();
      for (const [key, bucket] of buckets) {
        bucket.timestamps = bucket.timestamps.filter((t) => now - t < MAX_WINDOW_MS);
        if (bucket.timestamps.length === 0) buckets.delete(key);
      }
    },
    10 * 60 * 1000,
  );
  if (typeof cleaner.unref === 'function') cleaner.unref();
}

/**
 * 固定窗口内最多 max 次,命中限流返回 false。
 * @param key 限流键,如 `send-code:email:a@b.com`
 * @param max 窗口内最大次数
 * @param windowMs 窗口时长
 */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);
  if (bucket.timestamps.length >= max) {
    buckets.set(key, bucket);
    return false;
  }
  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return true;
}

/** 从请求头取客户端 IP（经 nginx 反代时看 x-forwarded-for） */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}
