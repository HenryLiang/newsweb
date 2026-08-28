/**
 * 频道 → CMS 标签映射。
 * CMS 没有分类模型，只有平铺标签；编辑发稿时打上这里的标签，
 * 文章即自动进入对应频道。tags 为空表示“全部已发布文章”。
 * 按编辑部实际打标习惯调整即可，无需改动 CMS。
 */
export interface Channel {
  slug: string;
  name: string;
  tags: string[];
}

export const CHANNELS: Channel[] = [
  { slug: 'top', name: '要闻', tags: [] },
  { slug: 'politics', name: '时政', tags: ['时政'] },
  { slug: 'finance', name: '财经', tags: ['财经'] },
  { slug: 'tech', name: '科技', tags: ['科技', 'AI'] },
  { slug: 'sports', name: '体育', tags: ['体育'] },
  { slug: 'ent', name: '娱乐', tags: ['娱乐'] },
  { slug: 'society', name: '社会', tags: ['社会'] },
  { slug: 'world', name: '国际', tags: ['国际'] },
];

export function getChannel(slug: string): Channel | undefined {
  return CHANNELS.find((c) => c.slug === slug);
}
