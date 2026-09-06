// 腾讯云 TMS(文本内容安全)评论审核。
// 策略:Pass → published;Block → rejected;Review/服务异常 → 保持 pending 转人工。
// 未配置凭据时降级为 error(等同服务异常,评论进人工队列)。

export interface ModerationResult {
  verdict: 'pass' | 'block' | 'review' | 'error';
  labels: string[]; // 命中的风险标签
}

const TMS_CONFIGURED = Boolean(
  process.env.TENCENT_SECRET_ID && process.env.TENCENT_SECRET_KEY,
);

const TIMEOUT_MS = 3000;

/** 审核文本,永不抛异常——任何失败都返回 error,由调用方转人工 */
export async function moderateText(content: string): Promise<ModerationResult> {
  if (!TMS_CONFIGURED) {
    console.log('[moderation] TMS 未配置,评论转人工队列');
    return { verdict: 'error', labels: [] };
  }

  try {
    const { tms } = await import('tencentcloud-sdk-nodejs-tms');
    const TmsClient = tms.v20201229.Client;
    const client = new TmsClient({
      credential: {
        secretId: process.env.TENCENT_SECRET_ID!,
        secretKey: process.env.TENCENT_SECRET_KEY!,
      },
      region: process.env.TMS_REGION ?? 'ap-guangzhou',
      profile: { httpProfile: { endpoint: 'tms.tencentcloudapi.com' } },
    });

    const result = (await Promise.race([
      // TMS 要求内容 Base64 编码
      client.TextModeration({
        Content: Buffer.from(content, 'utf-8').toString('base64'),
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('TMS 审核超时')), TIMEOUT_MS),
      ),
    ])) as { Suggestion?: string; Label?: string; SubLabel?: string };

    const labels = [result.Label, result.SubLabel].filter(
      (l): l is string => Boolean(l) && l !== 'Normal',
    );

    switch (result.Suggestion) {
      case 'Pass':
        return { verdict: 'pass', labels: [] };
      case 'Block':
        return { verdict: 'block', labels };
      default:
        // Review 及其他意外值都转人工
        return { verdict: 'review', labels };
    }
  } catch (err) {
    console.error('[moderation] TMS 调用失败,评论转人工队列', err);
    return { verdict: 'error', labels: [] };
  }
}
