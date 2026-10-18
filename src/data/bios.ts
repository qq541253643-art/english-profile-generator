export interface BioTemplate {
  en: (name: string, interest: string) => string
  zh: (name: string, interest: string) => string
}

export const bioTemplates: BioTemplate[] = [
  {
    en: (name, interest) => `${name} • finding small joys in ${interest} and slow weekends.`,
    zh: (name, interest) => `${name} • 在${interest}和悠闲周末里发现小确幸。`,
  },
  {
    en: (_name, interest) => `Curious mind, kind heart, usually making time for ${interest}.`,
    zh: (_name, interest) => `保持好奇，心怀善意，也总会为${interest}留出时间。`,
  },
  {
    en: (_name, interest) => `Documenting everyday life, one ${interest} moment at a time.`,
    zh: (_name, interest) => `记录日常，收集每一个与${interest}有关的瞬间。`,
  },
  {
    en: (_name, interest) => `Here for honest stories, fresh ideas, and a little more ${interest}.`,
    zh: (_name, interest) => `喜欢真诚的故事、新鲜的想法，还有多一点${interest}。`,
  },
  {
    en: (_name, interest) => `Keeping life simple: good people, new places, and ${interest}.`,
    zh: (_name, interest) => `把生活过得简单：好的伙伴、新的地方，以及${interest}。`,
  },
  {
    en: (_name, interest) => `Learning as I go. Currently into ${interest} and better mornings.`,
    zh: (_name, interest) => `边走边学，最近喜欢${interest}，也在练习过好每个早晨。`,
  },
  {
    en: (_name, interest) => `A soft spot for ${interest}, thoughtful conversations, and sunny afternoons.`,
    zh: (_name, interest) => `偏爱${interest}、认真的交谈和阳光正好的下午。`,
  },
  {
    en: (_name, interest) => `Making ordinary days feel memorable through ${interest}.`,
    zh: (_name, interest) => `用${interest}让平凡的日子变得值得记住。`,
  },
]
