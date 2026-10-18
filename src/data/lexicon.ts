export const firstNames: Record<'male' | 'female', string[]> = {
  female: [
    'Emily', 'Olivia', 'Mia', 'Avery', 'Chloe', 'Sophie', 'Grace', 'Lily', 'Nora', 'Zoe',
    'Hannah', 'Claire', 'Audrey', 'Natalie', 'Julia', 'Brooke', 'Leah', 'Maya', 'Elena', 'Sadie',
  ],
  male: [
    'Ethan', 'Liam', 'Noah', 'Lucas', 'Owen', 'Miles', 'Henry', 'Caleb', 'Ryan', 'Dylan',
    'Nathan', 'Evan', 'Adam', 'Cole', 'Jack', 'Leo', 'Aaron', 'Ian', 'Connor', 'Julian',
  ],
}

export const lastNames = [
  'Miller', 'Davis', 'Wilson', 'Anderson', 'Thomas', 'Moore', 'Taylor', 'Martin', 'Clark', 'Walker',
  'Hall', 'Young', 'King', 'Wright', 'Hill', 'Green', 'Baker', 'Adams', 'Nelson', 'Carter',
]

export const nicknames: Record<'male' | 'female', string[]> = {
  female: ['em', 'liv', 'mimi', 'aves', 'chlo', 'soso', 'gracie', 'lils', 'nori', 'zee'],
  male: ['eth', 'li', 'noa', 'luke', 'owen', 'milo', 'hank', 'cal', 'ry', 'dyl'],
}

export const interests = [
  { key: 'coffee', username: ['coffee', 'latte', 'brews'], label: 'coffee', zh: '咖啡' },
  { key: 'books', username: ['reads', 'bookish', 'pages'], label: 'books', zh: '阅读' },
  { key: 'travel', username: ['roams', 'weekends', 'miles'], label: 'travel', zh: '旅行' },
  { key: 'fitness', username: ['moves', 'runs', 'active'], label: 'movement', zh: '运动' },
  { key: 'food', username: ['bites', 'eats', 'kitchen'], label: 'good food', zh: '美食' },
  { key: 'music', username: ['tunes', 'vinyl', 'sounds'], label: 'music', zh: '音乐' },
  { key: 'photo', username: ['frames', 'snaps', 'film'], label: 'photography', zh: '摄影' },
  { key: 'nature', username: ['trails', 'outside', 'wildflower'], label: 'the outdoors', zh: '户外' },
] as const

export const lifestyleWords = ['daily', 'days', 'home', 'notes', 'living', 'slow', 'studio', 'weekend']
