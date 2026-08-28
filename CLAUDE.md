# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

newsweb 是中文新闻门户「新视野新闻」，纯展示层站点：所有内容来自同级目录的 newcms CMS 后端（`../newcms`，端口 3001）的 `/public/*` 只读 API，本仓库不含内容管理功能。UI 文案与代码注释均为中文，请保持一致。

## 常用命令

```bash
npm run dev        # 开发服务器，端口 3100（需先启动 ../newcms/backend 的 npm run start:dev）
npm run build      # 生产构建
npm run start      # 生产服务器，端口 3100
npm run lint       # next lint
npx tsc --noEmit   # 类型检查
```

没有测试套件。CMS 未启动时构建/渲染不会失败（数据层降级为空），但页面无内容——开发时通常需要 newcms 后端在跑。

## 环境变量（.env.local）

| 变量 | 说明 |
|---|---|
| `CMS_API_BASE_URL` | newcms 后端地址，默认 `http://localhost:3001` |
| `REVALIDATE_SECRET` | 与 newcms 侧 `NEWSWEB_REVALIDATE_SECRET` 一致的共享密钥 |
| `SITE_BASE_URL` | 可选，sitemap/robots 的站点绝对地址 |

## 架构

### 内容与缓存失效链路（核心契约，改动取数时必须保持）

数据流：newcms `/public/*` API → `src/lib/cms.ts`（唯一数据层）→ 全部 Server Component 页面。

发布后的即时刷新链路：

1. newcms 侧文章变更 → webhook（防抖 2s）`POST /api/revalidate`，body 为 `{articleId, tags, secret}`；
2. `src/app/api/revalidate/route.ts` 校验 secret 后 `revalidateTag('article-<id>')` + `revalidateTag('articles')` + `revalidatePath('/')`；
3. 与之对应，`cmsFetch` 给所有列表/聚合请求打 `articles` tag，文章详情额外打 `article-<id>`，专题详情打 `story-<id>`。

新增任何取数必须沿用同一 tag 约定，否则 webhook 精确刷新对它不生效。

### CMS 宕机降级契约

`cmsFetch` 在 CMS 失败/超时（5s）时返回 null，调用方兜底为空数据，从不抛错——保证构建与渲染不被 CMS 停机拖垮。详情页用 `generateStaticParams()` 返回 `[]` + `dynamicParams = true` 达到同样目的（构建不预渲染、运行时按需渲染）。不要引入「CMS 不可达即构建失败」的路径。

### 频道 = 标签映射

CMS 没有分类模型，只有平铺标签。频道定义集中在 `src/config/channels.ts`：每个频道 `tags: string[]`（OR 关系，逗号拼接传给 `tag=` 查询参数），`tags` 为空表示全部已发布文章。调整频道/标签只改这一个文件，不动 CMS。

### 渲染约定

- 页面全部是 React Server Component，仅 `HeadlineCarousel` 是 `'use client'`。
- 每个页面声明 `export const revalidate = 60`，与 fetch 层 ISR 周期一致。
- Next.js 15：`params` / `searchParams` 是 Promise，必须 `await`。
- 路径别名 `@/*` → `src/*`。

### 富文本与图片

- 文章正文是 CMS 输出的富文本 HTML，渲染前必须经 `DOMPurify.sanitize`（isomorphic-dompurify，FORBID script/style/iframe/form），再 `dangerouslySetInnerHTML`；排版样式在 `globals.css` 的 `.article-content`。
- 图片存于腾讯云 COS：`next.config.ts` 的 `remotePatterns` 只放行 `**.myqcloud.com` / `**.tencentcos.cn`。缩略图用 `src/lib/format.ts` 的 `thumb()` 追加 COS 数据万象 `imageMogr2` 参数；文章大图用原生 `<img>`（原图宽度未知，不适合 next/image）。
- 品牌色使用 CSS 变量 `var(--brand)`（`globals.css`），不要硬编码色值。

### 已知坑

- `next.config.ts` 的 `outputFileTracingRoot` 防止家目录其他 lockfile 干扰 Next 的 workspace root 推断，勿删。
- 生产部署时 newcms 的 nginx 需将 `/public/` 加入转发白名单，webhook 地址需公网/内网可达本站，两侧 secret 一致（详见 README）。
