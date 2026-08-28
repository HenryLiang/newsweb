# newsweb - 新闻资讯门户

类似腾讯网/网易的新闻资讯网站，内容由 [newcms](../newcms) 内容管理系统发布驱动。

- **技术栈**：Next.js 15（App Router）+ React 19 + TypeScript + Tailwind CSS v4
- **端口**：`3100`（避开 newcms 前端 3000 / 后端 3001）
- **内容更新**：ISR（60s）+ newcms 发布 webhook 即时刷新

## 快速开始

```bash
# 1. 启动 newcms 后端（公开 API /public/* 由本项目的改动提供）
cd ../newcms/backend && npm run start:dev

# 2. 启动本站
npm install
npm run dev
# 打开 http://localhost:3100
```

CMS 未启动时构建/渲染不会失败（数据层降级为空），但页面无内容。

## 环境变量（.env.local）

| 变量 | 说明 |
|---|---|
| `CMS_API_BASE_URL` | newcms 后端地址，默认 `http://localhost:3001` |
| `REVALIDATE_SECRET` | 与 newcms 的 `NEWSWEB_REVALIDATE_SECRET` 一致的共享密钥 |
| `SITE_BASE_URL` | 可选，sitemap/robots 的站点绝对地址 |

## 与 newcms 的对接

### 依赖的 newcms 改动（已实现在 ../newcms）

1. **公开只读 API**（`backend/src/public/`，无需认证，只返回已发布文章）：

   | 端点 | 说明 |
   |---|---|
   | `GET /public/articles?tag=&search=&storyId=&page=&pageSize=` | 已发布文章分页列表；`tag` 支持逗号分隔多标签 OR |
   | `GET /public/articles/:id` | 文章详情（含正文 HTML） |
   | `GET /public/tags` | 标签及文章数聚合 |
   | `GET /public/stories`、`GET /public/stories/:id` | 专题（选题 Story） |

2. **发布 webhook**（`backend/src/webhooks/`）：订阅文章变更事件（防抖 2s），
   已发布文章变更时 `POST {articleId, tags, secret}` 到
   `NEWSWEB_REVALIDATE_URL`（默认 `http://localhost:3100/api/revalidate`）。
   未配置这两个 env 时 webhook 静默关闭。

### 频道与标签映射

CMS 没有分类模型（只有平铺标签）。频道的映射在
[`src/config/channels.ts`](src/config/channels.ts)：

- 每个频道定义 `tags: string[]`，编辑发稿时打上对应标签（如“时政”“科技”），文章即进入该频道；
- 一个频道可映射多个标签（OR 关系）；
- 调整频道/标签只需改这一个文件，无需动 CMS。

### 生产部署注意

- newcms 生产 nginx 按路径白名单转发，**需将 `/public/` 加入白名单**；
- webhook 地址改为公网/内网可达的本站地址，两侧 secret 保持一致；
- 腾讯云 COS 图片为公有读，正文/封面图可直接渲染；站内缩略图走
  COS 数据万象 `imageMogr2/thumbnail` 参数。

## 页面一览

| 路由 | 页面 |
|---|---|
| `/` | 首页：头条轮播、焦点列表、要闻流、各频道分区、热点排行、热图、标签云 |
| `/channel/[slug]` | 频道页（分页） |
| `/article/[id]` | 文章详情：正文（消毒后的 HTML）、相关阅读、JSON-LD |
| `/search?q=` | 搜索 |
| `/tag/[tag]` | 标签聚合页 |
| `/topics`、`/topics/[id]` | 专题列表 / 详情（对应 CMS 选题 Story） |
| `/pics` | 图片新闻瀑布流 |
| `/api/revalidate` | webhook 接收端（校验 secret 后精确失效缓存） |
| `/sitemap.xml`、`/robots.txt` | SEO |

## 目录结构

```
src/
  app/                 # App Router 页面
  components/          # SiteHeader / ChannelNav / HeadlineCarousel / Sidebar 等
  config/channels.ts   # 频道 -> CMS 标签映射（唯一需要按编辑部习惯调整的文件）
  lib/cms.ts           # CMS 公开 API 客户端（ISR fetch，CMS 宕机降级为空）
  lib/format.ts        # 日期/相对时间/COS 缩略图 URL 工具
```
