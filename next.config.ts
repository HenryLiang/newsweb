import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const projectDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // 家目录存在其他 lockfile 时，防止 Next 把 workspace root 误推断到别处。
  outputFileTracingRoot: projectDir,
  images: {
    // Article covers/body images live on Tencent COS (absolute URLs).
    remotePatterns: [
      { protocol: 'https', hostname: '**.myqcloud.com' },
      { protocol: 'https', hostname: '**.tencentcos.cn' },
    ],
  },
};

export default nextConfig;
