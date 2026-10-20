import type { Hobby } from '@/types'

export const hobbies: Hobby[] = [
  { id: 'cooking', tag: 'depends_on: mood', title: 'Cooking', icon: 'cooking', line: 'Can cook like a chef. Just depends on the mood, and who’s doing the dishes.' },
  { id: 'chess', tag: 'lookahead: 10 moves (accuracy: TBD)', title: 'Chess', icon: 'chess', line: 'Already thinking 10 moves ahead. Unfortunately, sometimes they’re the wrong 10 moves.' },
  { id: 'garba', tag: 'certificate: pending', title: 'Garba', icon: 'garba', line: 'Currently dancing my way toward becoming a certified Garba legend. Certificate pending. Confidence unlimited.' },
  { id: 'gaming', tag: 'blame: lag', title: 'Gaming', icon: 'gaming', line: 'Competitive enough to blame lag. Self-aware enough to know it was probably my fault.' },
  { id: 'badminton', tag: 'unnecessary_dives: >0', title: 'Badminton', icon: 'badminton', line: 'Here for the rallies, the smashes, and the occasional completely unnecessary dive.' },
  { id: 'martial', tag: 'unnecessary_fights: 0', title: 'Martial Arts', icon: 'martial', line: 'Learning discipline, patience, and how not to pick unnecessary fights with life.' },
]
