# 用户系统设计文档

> 状态：已定稿（2026-09-03 评审通过），P1、P2、P3 已完成。
> 决策记录：数据库 MySQL（与 newcms 同一实例、独立 `newsweb` schema）+ Prisma；邮件 腾讯云 SES；评论双审 = AI（腾讯云 TMS）先审后发 + 人工复审，AI 故障降级转人工队列。

## 一、目标与定位

newsweb 从纯展示站升级为可互动的新闻门户。核心原则：**内容归 newcms，用户数据归 newsweb 自建库**，两边只靠 articleId 关联，互不侵入。newcms 零改动，现有 ISR + webhook 刷新链路完全不受影响。

P1 功能：邮箱验证码登录、点赞、收藏、用户菜单、我的收藏页。
P2 功能：评论（TMS 先审后发 + 人工复审台 `/admin/comments`）。
P3 功能：订阅标签（频道页/标签页订阅按钮 + `/user/feed` 聚合信息流）、浏览历史（匿名 localStorage，登录后自动同步服务端，`/user/history`）。管理后台后续按需完善。

## 二、总体架构

```
┌─────────────┐   /public/* 只读内容   ┌──────────────┐
│   newcms    │ ◄───────────────────  │              │
│ (内容源,不动) │                       │   newsweb     │
└─────────────┘   webhook 即时刷新 ──► │   :3100       │
                                       │              │
                                       │ ├─ RSC 页面（内容,ISR 缓存不变）
                                       │ ├─ /api/* 用户接口（本方案新增）
                                       │ └─ Prisma Client
                                       └──────┬───────┘
                                              ▼
                                    MySQL（newsweb schema,与 newcms 同实例）
```

## 三、与 ISR 缓存的共存方式

现有页面全部保持静态 ISR（revalidate=60）不动，用户相关内容走客户端按需加载：

- **SiteHeader** 右侧挂客户端组件 `UserMenu`，mount 后请求 `GET /api/me`。
- **文章页互动区**：客户端组件 `ArticleActions`（点赞/收藏，含计数与"我是否已赞/已藏"），mount 后拉数据。
- **用户中心** `/user/*` 为私有页面：`export const dynamic = 'force-dynamic'`，服务端读 cookie 渲染，不缓存。
- 评论（P2）同理：文章页静态部分不动，`CommentSection` 客户端加载。

## 四、数据模型（Prisma）

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  nickname  String
  avatarUrl String?
  role      String   @default("user")   // user / admin
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  sessions      Session[]
  favorites     Favorite[]
  likes         Like[]
  comments      Comment[]
  subscriptions Subscription[]
}

model EmailCode {
  email     String   @id
  code      String
  expiresAt DateTime
  attempts  Int      @default(0)   // 防爆破,错 5 次作废
  createdAt DateTime @default(now())
}

model Session {
  token     String   @id              // crypto 随机 32 字节 hex
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime                  // 30 天滑动过期
  createdAt DateTime @default(now())
  @@index([userId])
}

model Favorite {
  userId       String
  articleId    String                 // CMS 文章 ID,无外键
  articleTitle String                 // 冗余标题快照,列表页免回查 CMS
  createdAt    DateTime @default(now())
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@id([userId, articleId])
}

model Like {
  userId    String
  articleId String
  createdAt DateTime @default(now())
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@id([userId, articleId])
  @@index([articleId])
}

model Subscription {
  userId    String
  tag       String                    // 对应 src/config/channels.ts 的 tags
  createdAt DateTime @default(now())
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@id([userId, tag])
}

model Comment {
  id        String   @id @default(cuid())
  userId    String
  articleId String
  parentId  String?
  content   String   @db.VarChar(500)
  status    String   @default("pending") // pending / published / rejected / deleted
  createdAt DateTime @default(now())
  user        User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  moderation  CommentModeration?
  @@index([articleId, status, createdAt])
}

model CommentModeration {
  commentId  String    @id
  comment    Comment   @relation(fields: [commentId], references: [id], onDelete: Cascade)
  aiVerdict  String?   // pass / block / error
  aiLabels   String?   // 命中标签 JSON
  reviewedBy String?
  reviewedAt DateTime?
  reviewNote String?
}
```

点赞数不冗余存储，`COUNT(*)` 实时算；量大了再加计数表。

## 五、认证：邮箱验证码（腾讯云 SES）+ 密码

- `POST /api/auth/send-code`：生成 6 位数字码，5 分钟有效；同一邮箱 60s 内只能发一次，每 IP 每日限 20 次（内存滑动窗口限流）。
- `POST /api/auth/verify`：校验码（错 5 次作废），邮箱即账号——首次验证自动注册。命中 `ADMIN_EMAILS` 环境变量的邮箱自动 `role=admin`。
- `POST /api/auth/login-password`：密码登录（并行方式）。防爆破限流（同邮箱 5 次/分、同 IP 20 次/分），错误话术统一为「邮箱或密码不正确」防账号枚举；未设密码的账号提示走验证码登录。
- 密码存储：scrypt 加盐哈希（Node 内置 crypto，无外部依赖），格式 `salt:hash`；强度要求 8-64 位且含字母+数字。登录后可在 `/user/settings` 设置/修改密码（已设密码需验证当前密码）、改昵称。
- 登录态：写 Session 表，cookie `nw_session`，`httpOnly + SameSite=Lax`（生产 +Secure），30 天滑动过期。
- `POST /api/auth/logout`：删 Session、清 cookie。
- 发信走腾讯云 SES SDK（`tencentcloud-sdk-nodejs-ses`，模板邮件）；本地开发未配 SES 凭据时降级为服务端日志打印验证码，方便联调。

## 六、API 一览

| 路由 | 方法 | 说明 |
|---|---|---|
| `/api/auth/send-code` | POST | 发验证码 `{email}` |
| `/api/auth/verify` | POST | 验证并登录 `{email, code}`，返回用户信息 |
| `/api/auth/logout` | POST | 登出 |
| `/api/me` | GET | 当前用户（未登录 401） |
| `/api/likes?articleId=` | GET | `{count, liked}`（未登录 liked=false） |
| `/api/likes` | POST/DELETE | 点赞/取消 `{articleId}` |
| `/api/favorites?articleId=` | GET | 我的收藏状态 / 无参时返回我的收藏列表 |
| `/api/favorites` | POST/DELETE | 收藏 `{articleId, articleTitle}` / 取消 |

P2 追加：`/api/comments`、`/api/subscriptions`、`/api/admin/comments`。

全部 zod 校验入参；写接口限流；需登录的接口统一 401。

## 七、评论双审（P2 实现，设计先行）

```
提交 → status=pending → 同步调腾讯云 TMS（超时 3s）
  ├─ pass  → published（立即可见）→ 进人工复核队列
  ├─ block → rejected（不可见,提示"评论未通过审核"）
  └─ 异常  → 保持 pending,等人工（不放行,不阻塞）
人工复审 /admin/comments（仅 admin）：待审 / 已发布(可下架) / 已拒绝(可翻案)
```

## 八、环境变量

| 变量 | 说明 |
|---|---|
| `DATABASE_URL` | MySQL 连接串（与 newcms 同一实例、独立 `newsweb` schema） |
| `TENCENT_SECRET_ID` / `TENCENT_SECRET_KEY` | 腾讯云 API 凭据（SES/TMS 共用） |
| `SES_REGION` | SES 地域，默认 `ap-guangzhou` |
| `SES_FROM_EMAIL` | 发件地址（需在 SES 控制台完成域名验证） |
| `SES_TEMPLATE_ID` | 验证码邮件模板 ID |
| `ADMIN_EMAILS` | 管理员邮箱，逗号分隔 |
| `TMS_REGION` | （P2）TMS 地域，默认 `ap-guangzhou` |

## 十、审核降级说明

TMS 未配置凭据或服务异常时，`moderateText` 返回 `error`，评论保持 `pending` 进入人工队列——本地开发不配 TMS 也能完整走通"提交 → 人工审核"流程。

## 九、合规提醒

评论属 UGC，上线前确认站点 ICP 备案状态及对评论功能的备案要求；双审机制 + 日志留存是基本义务。
