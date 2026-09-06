// 腾讯云 SES 发信。本地开发未配置凭据时降级为日志打印,方便联调。
// 需要在 SES 控制台完成:发信域名验证、创建验证码模板(变量 {{code}})、记录模板 ID

interface SendCodeMailOptions {
  to: string;
  code: string;
}

const SES_CONFIGURED = Boolean(
  process.env.TENCENT_SECRET_ID &&
    process.env.TENCENT_SECRET_KEY &&
    process.env.SES_FROM_EMAIL &&
    process.env.SES_TEMPLATE_ID,
);

export async function sendVerificationCodeMail({
  to,
  code,
}: SendCodeMailOptions): Promise<void> {
  if (!SES_CONFIGURED) {
    // 开发降级:不发真实邮件,日志可见即可登录
    console.log(`[mailer] SES 未配置,验证码降级到日志 → ${to}: ${code}`);
    return;
  }

  // 动态引入,未配置时连 SDK 都不加载
  const { ses } = await import('tencentcloud-sdk-nodejs-ses');
  const SesClient = ses.v20201002.Client;

  const client = new SesClient({
    credential: {
      secretId: process.env.TENCENT_SECRET_ID!,
      secretKey: process.env.TENCENT_SECRET_KEY!,
    },
    region: process.env.SES_REGION ?? 'ap-guangzhou',
    profile: { httpProfile: { endpoint: 'ses.tencentcloudapi.com' } },
  });

  await client.SendEmail({
    FromEmailAddress: process.env.SES_FROM_EMAIL!,
    Destination: [to],
    Subject: '新视野新闻登录验证码',
    Template: {
      TemplateID: Number(process.env.SES_TEMPLATE_ID),
      TemplateData: JSON.stringify({ code }),
    },
  });
}
