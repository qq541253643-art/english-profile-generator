export interface BioPhrase {
  en: string
  zh: string
}

export interface NewsBioTopic extends BioPhrase {
  key: string
}

export const lifestyleBioOpeners: BioPhrase[] = [
  { en: 'Taking life one good day at a time.', zh: '认真过好每一天。' },
  { en: 'Always curious and usually optimistic.', zh: '永远保持好奇，也常常保持乐观。' },
  { en: 'Keeping things simple and genuine.', zh: '喜欢简单而真诚的生活。' },
  { en: 'Collecting moments instead of things.', zh: '更愿意收藏瞬间，而不是物品。' },
  { en: 'Learning, growing, and enjoying the process.', zh: '一边学习成长，一边享受过程。' },
  { en: 'Here for good energy and honest conversations.', zh: '喜欢积极的能量和真诚的交谈。' },
  { en: 'Making room for the things that matter.', zh: '把时间留给真正重要的事情。' },
  { en: 'Noticing the beauty in ordinary days.', zh: '留意平凡日子里的美好。' },
  { en: 'Building a life that feels like my own.', zh: '努力过上真正属于自己的生活。' },
  { en: 'Equal parts thoughtful and spontaneous.', zh: '既认真思考，也享受随性而为。' },
  { en: 'Choosing progress over perfection.', zh: '相比完美，更看重一点点进步。' },
  { en: 'Finding my rhythm and enjoying the view.', zh: '寻找自己的节奏，也享受沿途风景。' },
]

export const lifestyleBioClosers: BioPhrase[] = [
  { en: 'Still figuring out the rest.', zh: '其余的事情还在慢慢探索。' },
  { en: 'Good people make everything better.', zh: '好的人让一切变得更美好。' },
  { en: 'Always open to a new story.', zh: '随时欢迎新的故事发生。' },
  { en: 'Small moments matter most.', zh: '微小的瞬间往往最重要。' },
  { en: 'Kindness goes a long way.', zh: '相信善意总能带来长久的影响。' },
  { en: 'One day at a time.', zh: '一步一步过好当下。' },
  { en: 'Keeping the best memories close.', zh: '把最好的回忆留在身边。' },
  { en: 'New places are always welcome.', zh: '永远期待去往新的地方。' },
  { en: 'Here for the journey.', zh: '享受这一段旅程。' },
  { en: 'Finding reasons to smile.', zh: '每天都在寻找微笑的理由。' },
  { en: 'There is always more to discover.', zh: '生活里总有更多值得发现。' },
  { en: 'Making today count.', zh: '认真对待今天。' },
]

export const newsBioLeads: BioPhrase[] = [
  { en: 'A clear guide to', zh: '清晰解读' },
  { en: 'Making sense of', zh: '读懂' },
  { en: 'Explaining', zh: '解读' },
  { en: 'Unpacking', zh: '深入拆解' },
  { en: 'Following', zh: '持续关注' },
  { en: 'Tracking', zh: '追踪' },
  { en: 'Covering', zh: '聚焦' },
  { en: 'Looking closely at', zh: '深入观察' },
  { en: 'Understanding', zh: '理解' },
  { en: 'Connecting the dots on', zh: '串联线索，解读' },
  { en: 'Taking a clearer look at', zh: '清晰梳理' },
  { en: 'Keeping up with', zh: '紧跟' },
]

export const newsBioTopics: NewsBioTopic[] = [
  { key: 'breaking-news', en: 'breaking news', zh: '实时新闻' },
  { key: 'us-news', en: 'U.S. national news', zh: '美国国家新闻' },
  { key: 'world-news', en: 'world news', zh: '国际新闻' },
  { key: 'politics-policy', en: 'politics and public policy', zh: '政治与公共政策' },
  { key: 'economy-society', en: 'the economy and society', zh: '经济与社会动态' },
  { key: 'developing-stories', en: 'major developing stories', zh: '持续发展的重大事件' },
  { key: 'daily-headlines', en: "today's headlines", zh: '每日新闻热点' },
  { key: 'public-affairs', en: 'the events shaping public life', zh: '影响公共生活的重要事件' },
]

export const newsBioAngles: BioPhrase[] = [
  { en: 'with the essential background.', zh: '，补充必要背景。' },
  { en: 'without the noise.', zh: '，过滤噪音，直达重点。' },
  { en: 'one story at a time.', zh: '，一次讲清一个故事。' },
  { en: 'from facts to impact.', zh: '，从事实讲到影响。' },
  { en: 'with the bigger picture in view.', zh: '，看清事件全貌。' },
  { en: 'through concise explainers.', zh: '，用简洁方式讲明白。' },
  { en: 'with the details that matter.', zh: '，关注真正重要的细节。' },
  { en: 'from multiple angles.', zh: '，提供多角度解读。' },
  { en: 'with calm, useful analysis.', zh: '，带来冷静实用的分析。' },
  { en: 'so the key points are easy to follow.', zh: '，让关键信息更容易掌握。' },
  { en: 'with context before opinion.', zh: '，先讲背景，再谈观点。' },
  { en: 'in clear, everyday language.', zh: '，用清楚易懂的语言说明。' },
]
