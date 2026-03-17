// ── Types ─────────────────────────────────────────────────────────────────────

export type StimulusType = 'dropdown' | 'orf' | 'mcq'

export interface Student { id: number; name: string }

export interface StimulusItem {
  id: number
  title: string
  type: StimulusType
  text: string
  imageUrl?: string
  answer?: string
  timerDurationSecs?: number
}

export interface Score {
  studentId: number
  stimulusId: number
  absent?: boolean
  skipped?: boolean        // orf: auto-stopped due to 4 consecutive errors
  dropdownValue?: number
  incorrectWords?: number[]
  lastWordIndex?: number | null
  mcqResult?: 'correct' | 'wrong' | 'no_response'
}

export interface SessionState {
  phase: 'setup' | 'assessing' | 'results'
  sessionTitle: string
  students: Student[]
  stimulusItems: StimulusItem[]
  scores: Score[]
  currentStimulusIndex: number
  currentStudentIndex: number
}

export const INITIAL_STATE: SessionState = {
  phase: 'setup',
  sessionTitle: '',
  students: [],
  stimulusItems: [],
  scores: [],
  currentStimulusIndex: 0,
  currentStudentIndex: 0,
}

export const LS_KEY = 'vba-test-session'

// ── Helpers ───────────────────────────────────────────────────────────────────

export function formatSecs(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export function parseWords(text: string): string[] {
  return text.split(/[\n,]+/).map(w => w.trim()).filter(Boolean)
}

export function scoreLabel(score: Score): string {
  if (score.absent) return 'A'
  if (score.mcqResult === 'correct') return '✓'
  if (score.mcqResult === 'wrong') return '✗'
  if (score.mcqResult === 'no_response') return 'NR'
  if (score.dropdownValue !== undefined) return String(score.dropdownValue)
  if (score.incorrectWords !== undefined) {
    const errs = score.incorrectWords.length
    const read = score.lastWordIndex !== null && score.lastWordIndex !== undefined
      ? `${score.lastWordIndex + 1} read`
      : ''
    const skip = score.skipped ? 'SKIP' : ''
    return [skip, read, errs > 0 ? `${errs}✗` : '0✗'].filter(Boolean).join(' · ')
  }
  return '—'
}

export function scoreBadge(score: Score): string {
  if (score.absent) return 'bg-slate-100 text-slate-400'
  if (score.mcqResult === 'correct') return 'bg-emerald-50 text-emerald-700'
  if (score.mcqResult === 'wrong') return 'bg-rose-50 text-rose-700'
  if (score.mcqResult === 'no_response') return 'bg-slate-100 text-slate-500'
  if (score.dropdownValue !== undefined) return 'bg-indigo-50 text-indigo-700'
  if (score.incorrectWords !== undefined)
    return score.incorrectWords.length === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
  return 'bg-slate-100 text-slate-400'
}

/** Returns true if a score object looks like the old format (had a numeric `score` field). */
export function isLegacyScore(s: unknown): boolean {
  return typeof s === 'object' && s !== null && 'score' in s
}

// ── Presets ───────────────────────────────────────────────────────────────────

export interface PresetBundle {
  label: string
  description: string
  items: Omit<StimulusItem, 'id'>[]
}

export const STUDENT_PRESETS: { label: string; names: string[] }[] = [
  { label: 'Class A · 10 students', names: ['Aarav','Priya','Riya','Karan','Divya','Rohit','Ananya','Sonu','Neha','Vikram'] },
  { label: 'Class B · 12 students', names: ['Amar','Sunita','Deepak','Meena','Rahul','Lata','Suresh','Pooja','Manish','Geeta','Ajay','Kavya'] },
  { label: 'Class C · 8 students', names: ['Arjun','Nisha','Tarun','Sapna','Mohan','Rekha','Vijay','Usha'] },
]

export const PRESETS: PresetBundle[] = [
  {
    label: 'Grade 2 — Word Reading',
    description: '3 word lists · dropdown scoring',
    items: [
      { type: 'dropdown', title: 'List A — Sight Words', text: 'the\nand\nis\nto\nhe\nshe\nwe\nyou\nit\ngo\ndo\nmy\nno\nsaid\nwas\nare\nhave\nwith\nthey\nfor' },
      { type: 'dropdown', title: 'List B — CVC Words', text: 'cat\nhat\nman\nsit\nhit\ncup\nbug\nhop\nbed\nlet\ndip\nfox\nmud\npig\njam\nbag\nfin\ncob\ndug\nwet' },
      { type: 'dropdown', title: 'List C — Blends', text: 'flag\nslip\ngrab\nstep\ncrop\nfrost\nshop\nchip\nthink\nwhip\nshelf\nclam\nbring\nswim\ntruck\nblend\ncraft\npress\ngrand\nstrip' },
    ],
  },
  {
    label: 'Grade 3 — Oral Fluency',
    description: '2 passages · ORF timer scoring',
    items: [
      { type: 'orf', title: 'Passage 1 — The Mango Tree', timerDurationSecs: 60, text: "There was a big mango tree near Priya's house. Every summer the tree gave sweet yellow mangoes. Priya and her friends would sit under the tree and share the fruit. One day a strong wind blew and many mangoes fell to the ground. The children filled their baskets and ran home happily." },
      { type: 'orf', title: 'Passage 2 — Rain Day', timerDurationSecs: 60, text: 'The sky turned dark and grey. Big drops of rain began to fall. Ramu quickly covered his books with a plastic bag. He ran under a shop roof to stay dry. The rain fell harder and harder. Puddles formed in the road. Children splashed through them laughing loud. When the rain stopped the air smelled fresh and clean.' },
    ],
  },
  {
    label: 'Grade 4 — Comprehension',
    description: '4 questions · MCQ scoring',
    items: [
      { type: 'mcq', title: 'What causes evaporation?', text: 'Water on Earth is always moving. When the sun heats rivers, lakes, and oceans, water turns into vapour and rises into the sky.', answer: 'The sun heating the water surface' },
      { type: 'mcq', title: 'How are clouds formed?', text: 'High in the sky the vapour cools and forms tiny droplets making clouds.', answer: 'Water vapour cools and condenses into droplets' },
      { type: 'mcq', title: 'Why did Rani Laxmi Bai fight?', text: 'When the British tried to take over her kingdom of Jhansi, she refused to give it up and led her soldiers bravely.', answer: 'To protect her kingdom from British takeover' },
      { type: 'mcq', title: 'What does "symbol" mean here?', text: 'She became a symbol of courage for all Indians.', answer: 'Something that represents an idea or quality' },
    ],
  },
  {
    label: 'Grade 5 — Letter Sounds',
    description: '2 grids · dropdown scoring',
    items: [
      { type: 'dropdown', title: 'Grid A — Consonants', text: 'b\nd\nf\ng\nh\nj\nk\nl\nm\nn\np\nr\ns\nt\nv\nw\nx\ny\nz\nc' },
      { type: 'dropdown', title: 'Grid B — Vowel Patterns', text: 'a\ne\ni\no\nu\nai\nay\nea\nee\nie\noa\noo\nou\now\nue\nau\naw\noi\noy\nar' },
    ],
  },
]
