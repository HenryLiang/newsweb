// 开发/测试种子数据:node prisma/seed.js(或 npx prisma db seed)
// 幂等:可重复执行——种子用户按邮箱 upsert,其互动数据先清后建
// CMS 运行时互动数据挂到真实文章,否则用演示文章 ID

const { PrismaClient } = require('@prisma/client');
const { randomBytes, scryptSync } = require('crypto');
const prisma = new PrismaClient();

// 种子账号默认密码:newsweb123456(与 src/lib/password.ts 同一 scrypt 方案)
const SEED_PASSWORD = 'newsweb123456';
function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

const SEED_USERS = [
  { email: 'admin@newsweb.dev', nickname: '站长', role: 'admin' },
  { email: 'zhangsan@example.com', nickname: '张三', role: 'user' },
  { email: 'lihua@example.com', nickname: '李小花', role: 'user' },
  { email: 'wang@example.com', nickname: '科技迷小王', role: 'user' },
];

/** 尝试从 CMS 取真实文章,失败则回退演示数据 */
async function fetchArticles() {
  const base = process.env.CMS_API_BASE_URL ?? 'http://localhost:3001';
  try {
    const res = await fetch(`${base}/public/articles?pageSize=3`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(`CMS ${res.status}`);
    const data = await res.json();
    const articles = (data.data ?? []).map((a) => ({
      id: String(a.id),
      title: a.title,
    }));
    if (articles.length === 0) throw new Error('CMS 无文章');
    console.log(`✓ 已从 CMS 获取 ${articles.length} 篇真实文章`);
    return articles;
  } catch (err) {
    console.log(`⚠ CMS 不可用(${err.message}),互动数据挂到演示文章`);
    return [{ id: 'demo-article-1', title: '演示文章(CMS 未运行时占位)' }];
  }
}

async function main() {
  // 1. 种子用户(每次重跑重置密码,方便测试)
  const users = [];
  for (const u of SEED_USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { nickname: u.nickname, role: u.role, passwordHash: hashPassword(SEED_PASSWORD) },
      create: { ...u, passwordHash: hashPassword(SEED_PASSWORD) },
    });
    users.push(user);
    console.log(`✓ 用户 ${user.nickname} <${user.email}> (${user.role}) 密码 ${SEED_PASSWORD}`);
  }
  const [admin, zhangsan, lihua, wang] = users;

  const articles = await fetchArticles();
  const [a1, a2] = [articles[0], articles[1] ?? articles[0]];

  // 2. 清空种子用户旧互动数据(幂等)
  const seedIds = users.map((u) => u.id);
  await prisma.comment.deleteMany({ where: { userId: { in: seedIds } } });
  await prisma.like.deleteMany({ where: { userId: { in: seedIds } } });
  await prisma.favorite.deleteMany({ where: { userId: { in: seedIds } } });

  // 3. 点赞 + 收藏(upsert:CMS 不可用时 a2 与 a1 是同一篇)
  const like = (userId, articleId) =>
    prisma.like.upsert({
      where: { userId_articleId: { userId, articleId } },
      update: {},
      create: { userId, articleId },
    });
  const favorite = (userId, articleId, articleTitle) =>
    prisma.favorite.upsert({
      where: { userId_articleId: { userId, articleId } },
      update: {},
      create: { userId, articleId, articleTitle },
    });
  for (const u of [zhangsan, lihua, wang]) await like(u.id, a1.id);
  await like(zhangsan.id, a2.id);
  await favorite(zhangsan.id, a1.id, a1.title);
  await favorite(lihua.id, a1.id, a1.title);
  console.log(`✓ 点赞 4 条,收藏 2 条 → ${a1.title.slice(0, 20)}…`);

  // 4. 评论:已发布(带 AI 通过记录) + 一条回复 + 一条待审核
  const c1 = await prisma.comment.create({
    data: {
      userId: zhangsan.id,
      articleId: a1.id,
      content: '写得不错,信息量很大,先收藏了。',
      status: 'published',
    },
  });
  await prisma.commentModeration.create({
    data: { commentId: c1.id, aiVerdict: 'pass', reviewedBy: admin.id, reviewedAt: new Date() },
  });

  const c2 = await prisma.comment.create({
    data: {
      userId: lihua.id,
      articleId: a1.id,
      content: '同意楼上,这个角度之前还真没看到过。',
      status: 'published',
      parentId: c1.id,
    },
  });
  await prisma.commentModeration.create({
    data: { commentId: c2.id, aiVerdict: 'pass' },
  });

  const c3 = await prisma.comment.create({
    data: {
      userId: wang.id,
      articleId: a1.id,
      content: '持保留意见,感觉数据来源可以再核实一下。',
      status: 'pending',
    },
  });
  await prisma.commentModeration.create({
    data: { commentId: c3.id, aiVerdict: 'review', aiLabels: JSON.stringify(['SuspectedAd']) },
  });
  console.log('✓ 评论 3 条(2 已发布含 1 回复,1 待审核)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
