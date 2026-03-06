'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Student { id: number; name: string }
interface StimulusItem { id: number; title: string; text: string; imageUrl?: string }
interface Score { studentId: number; stimulusId: number; score: number | null }

interface SessionState {
  phase: 'setup' | 'assessing' | 'results'
  sessionTitle: string
  students: Student[]
  stimulusItems: StimulusItem[]
  scores: Score[]
  currentStimulusIndex: number
  currentStudentIndex: number
}

const INITIAL_STATE: SessionState = {
  phase: 'setup',
  sessionTitle: '',
  students: [],
  stimulusItems: [],
  scores: [],
  currentStimulusIndex: 0,
  currentStudentIndex: 0,
}

const LS_KEY = 'vba-test-session'

// ── Preset stimulus items ─────────────────────────────────────────────────────

interface PresetBundle {
  label: string
  description: string
  items: Omit<StimulusItem, 'id'>[]
}

const STUDENT_PRESETS: { label: string; names: string[] }[] = [
  {
    label: 'Class A · 10 students',
    names: ['Aarav', 'Priya', 'Riya', 'Karan', 'Divya', 'Rohit', 'Ananya', 'Sonu', 'Neha', 'Vikram'],
  },
  {
    label: 'Class B · 12 students',
    names: ['Amar', 'Sunita', 'Deepak', 'Meena', 'Rahul', 'Lata', 'Suresh', 'Pooja', 'Manish', 'Geeta', 'Ajay', 'Kavya'],
  },
  {
    label: 'Class C · 8 students',
    names: ['Arjun', 'Nisha', 'Tarun', 'Sapna', 'Mohan', 'Rekha', 'Vijay', 'Usha'],
  },
]

const PRESETS: PresetBundle[] = [
  {
    label: 'Grade 2 — Word Reading',
    description: '3 word lists · increasing difficulty',
    items: [
      {
        title: 'List A — Sight Words',
        text: 'the\nand\nis\nto\nhe\nshe\nwe\nyou\nit\ngo\ndo\nmy\nno\nsaid\nwas\nare\nhave\nwith\nthey\nfor',
      },
      {
        title: 'List B — CVC Words',
        text: 'cat\nhat\nman\nsit\nhit\ncup\nbug\nhop\nbed\nlet\ndip\nfox\nmud\npig\njam\nbag\nfin\ncob\ndug\nwet',
      },
      {
        title: 'List C — Blends & Digraphs',
        text: 'flag\nslip\ngrab\nstep\ncrop\nfrost\nshop\nchip\nthink\nwhip\nshelf\nclam\nbring\nswim\ntruck\nblend\ncraft\npress\ngrand\nstrip',
      },
    ],
  },
  {
    label: 'Grade 3 — Oral Fluency',
    description: '2 passages · rate & accuracy',
    items: [
      {
        title: 'Passage 1 — The Mango Tree',
        text: "There was a big mango tree near Priya's house. Every summer, the tree gave sweet yellow mangoes. Priya and her friends would sit under the tree and share the fruit. One day, a strong wind blew and many mangoes fell to the ground. The children filled their baskets and ran home happily.",
      },
      {
        title: 'Passage 2 — Rain Day',
        text: 'The sky turned dark and grey. Big drops of rain began to fall. Ramu quickly covered his books with a plastic bag. He ran under a shop roof to stay dry. The rain fell harder and harder. Puddles formed in the road. Children splashed through them, laughing loud. When the rain stopped, the air smelled fresh and clean.',
      },
    ],
  },
  {
    label: 'Grade 4 — Reading Comprehension',
    description: '2 passages · literal & inferential Qs',
    items: [
      {
        title: 'Passage — The Water Cycle',
        text: 'Water on Earth is always moving. When the sun heats rivers, lakes, and oceans, water turns into vapour and rises into the sky. This is called evaporation. High in the sky the vapour cools and forms tiny water droplets, making clouds. When clouds collect enough water, it falls back to Earth as rain or snow — this is called precipitation. The water flows into rivers and soaks into the soil, beginning the cycle again.\n\nQuestions to ask:\n1. What causes evaporation?\n2. How are clouds formed?\n3. Why do you think this is called a "cycle"?',
      },
      {
        title: 'Passage — Rani Laxmi Bai',
        text: 'Rani Laxmi Bai was the queen of Jhansi, a small kingdom in central India. When the British tried to take over her kingdom, she refused to give it up. She learned to ride horses and fight with a sword. In 1857 she led her soldiers bravely against the British army. Though Jhansi fell, she escaped and continued to fight. She became a symbol of courage for all Indians.\n\nQuestions to ask:\n1. Why did Rani Laxmi Bai fight the British?\n2. Name two things she did to prepare for battle.\n3. What does the word "symbol" mean in this passage?',
      },
    ],
  },
  {
    label: 'Grade 5 — Letter Sound Fluency',
    description: '2 grids · consonants & vowel patterns',
    items: [
      {
        title: 'Grid A — Consonant Sounds',
        text: 'b  d  f  g  h  j  k  l  m  n\np  r  s  t  v  w  x  y  z  c\nch sh th wh ph ng ck qu tr cl\nbl fl sl gr pr dr br fr cr str',
      },
      {
        title: 'Grid B — Vowel Patterns',
        text: 'a   e   i   o   u\nai  ay  ea  ee  ie\noa  oo  ou  ow  ue\nau  aw  oi  oy  ar\ner  ir  ur  or  oor',
      },
    ],
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreChip(score: number | null) {
  if (score === null) return { bg: 'bg-slate-100', text: 'text-slate-500', label: 'A' }
  if (score <= 2) return { bg: 'bg-rose-50', text: 'text-rose-600', label: String(score) }
  if (score === 3) return { bg: 'bg-amber-50', text: 'text-amber-600', label: String(score) }
  return { bg: 'bg-emerald-50', text: 'text-emerald-600', label: String(score) }
}

function avg(nums: (number | null)[]): string {
  const valid = nums.filter((n): n is number => n !== null)
  if (!valid.length) return '—'
  return (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1)
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function VBAApp() {
  const [state, setState] = useState<SessionState>(INITIAL_STATE)
  const nextStimulusId = useRef(1)
  const hydrated = useRef(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as SessionState
        setState(parsed)
        nextStimulusId.current =
          parsed.stimulusItems.reduce((m, s) => Math.max(m, s.id), 0) + 1
      }
    } catch {}
    hydrated.current = true
  }, [])

  useEffect(() => {
    if (!hydrated.current) return
    localStorage.setItem(LS_KEY, JSON.stringify(state))
  }, [state])

  const scoreAndAdvance = useCallback((score: number | null) => {
    setState(prev => {
      if (prev.phase !== 'assessing') return prev
      const stimulus = prev.stimulusItems[prev.currentStimulusIndex]
      const student = prev.students[prev.currentStudentIndex]
      if (!stimulus || !student) return prev

      const scores = [
        ...prev.scores.filter(
          s => !(s.studentId === student.id && s.stimulusId === stimulus.id)
        ),
        { studentId: student.id, stimulusId: stimulus.id, score },
      ]

      // Advance through stimuli first, then move to next student
      const nextStimulus = prev.currentStimulusIndex + 1
      if (nextStimulus < prev.stimulusItems.length)
        return { ...prev, scores, currentStimulusIndex: nextStimulus }

      // All stimuli done for this student — stay here (UI shows "Next Student" button)
      return { ...prev, scores, currentStimulusIndex: nextStimulus }
    })
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (state.phase !== 'assessing') return
      const n = parseInt(e.key)
      if (n >= 1 && n <= 5) scoreAndAdvance(n)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [state.phase, scoreAndAdvance])

  if (state.phase === 'setup')
    return <SetupPhase state={state} setState={setState} nextStimulusId={nextStimulusId} />
  if (state.phase === 'assessing')
    return <AssessingPhase state={state} setState={setState} scoreAndAdvance={scoreAndAdvance} />
  return <ResultsPhase state={state} setState={setState} />
}

// ── SETUP PHASE ───────────────────────────────────────────────────────────────

function SetupPhase({
  state,
  setState,
  nextStimulusId,
}: {
  state: SessionState
  setState: React.Dispatch<React.SetStateAction<SessionState>>
  nextStimulusId: React.MutableRefObject<number>
}) {
  const [selectedClassIdx, setSelectedClassIdx] = useState<number | null>(null)
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set())
  const canStart = state.students.length > 0 && state.stimulusItems.length > 0

  function selectClass(idx: number) {
    const preset = STUDENT_PRESETS[idx]
    const students: Student[] = preset.names.map((name, i) => ({ id: i + 1, name }))
    const ids = new Set(students.map(s => s.id))
    setSelectedClassIdx(idx)
    setCheckedIds(ids)
    setState(prev => ({ ...prev, students }))
  }

  function toggleStudent(id: number) {
    setCheckedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      const preset = STUDENT_PRESETS[selectedClassIdx!]
      const allStudents: Student[] = preset.names.map((name, i) => ({ id: i + 1, name }))
      setState(s => ({ ...s, students: allStudents.filter(st => next.has(st.id)) }))
      return next
    })
  }

  function toggleAll() {
    if (selectedClassIdx === null) return
    const preset = STUDENT_PRESETS[selectedClassIdx]
    const allStudents: Student[] = preset.names.map((name, i) => ({ id: i + 1, name }))
    if (checkedIds.size === allStudents.length) {
      setCheckedIds(new Set())
      setState(prev => ({ ...prev, students: [] }))
    } else {
      setCheckedIds(new Set(allStudents.map(s => s.id)))
      setState(prev => ({ ...prev, students: allStudents }))
    }
  }

  function loadPreset(preset: PresetBundle) {
    const items: StimulusItem[] = preset.items.map(item => ({
      ...item,
      id: nextStimulusId.current++,
    }))
    setState(prev => ({ ...prev, stimulusItems: items }))
  }

  function addStimulus() {
    const id = nextStimulusId.current++
    setState(prev => ({
      ...prev,
      stimulusItems: [...prev.stimulusItems, { id, title: '', text: '' }],
    }))
  }

  function updateStimulus(id: number, patch: Partial<StimulusItem>) {
    setState(prev => ({
      ...prev,
      stimulusItems: prev.stimulusItems.map(s => (s.id === id ? { ...s, ...patch } : s)),
    }))
  }

  function removeStimulus(id: number) {
    setState(prev => ({ ...prev, stimulusItems: prev.stimulusItems.filter(s => s.id !== id) }))
  }

  function handleImageUpload(id: number, file: File) {
    const reader = new FileReader()
    reader.onload = e => updateStimulus(id, { imageUrl: e.target?.result as string })
    reader.readAsDataURL(file)
  }

  function start() {
    setState(prev => ({
      ...prev,
      phase: 'assessing',
      scores: [],
      currentStimulusIndex: 0,
      currentStudentIndex: 0,
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 shadow-lg mb-3">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">VBA Test</h1>
          <p className="text-slate-500 mt-1 text-sm">Video-Based Assessment — Setup</p>
        </div>

        {/* Session title */}
        <Card>
          <Label>Session title</Label>
          <input
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            placeholder="e.g. Grade 3 Fluency — March 2026"
            value={state.sessionTitle}
            onChange={e => setState(prev => ({ ...prev, sessionTitle: e.target.value }))}
          />
        </Card>

        {/* Students */}
        <Card>
          <Label>Students</Label>

          {/* Class picker */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            {STUDENT_PRESETS.map((preset, idx) => (
              <button
                key={preset.label}
                onClick={() => selectClass(idx)}
                className={`py-3 rounded-xl border-2 text-sm font-semibold transition ${
                  selectedClassIdx === idx
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'
                }`}
              >
                <span className="block">{preset.label.split('·')[0].trim()}</span>
                <span className="block text-xs font-normal text-slate-400 mt-0.5">
                  {preset.names.length} students
                </span>
              </button>
            ))}
          </div>

          {/* Student checklist */}
          {selectedClassIdx !== null && (() => {
            const preset = STUDENT_PRESETS[selectedClassIdx]
            const allStudents: Student[] = preset.names.map((name, i) => ({ id: i + 1, name }))
            const allChecked = checkedIds.size === allStudents.length
            return (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-500 font-medium">
                    {checkedIds.size} of {allStudents.length} selected
                  </p>
                  <button
                    onClick={toggleAll}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition"
                  >
                    {allChecked ? 'Deselect all' : 'Select all'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {allStudents.map(student => {
                    const checked = checkedIds.has(student.id)
                    return (
                      <button
                        key={student.id}
                        onClick={() => toggleStudent(student.id)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm transition ${
                          checked
                            ? 'border-indigo-200 bg-indigo-50 text-indigo-800'
                            : 'border-slate-200 bg-white text-slate-400 line-through'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border-2 transition ${
                          checked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                        }`}>
                          {checked && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </span>
                        {student.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </Card>

        {/* Stimulus items */}
        <Card>
          <div className="flex items-center justify-between">
            <Label>Stimulus Items</Label>
            <button
              onClick={addStimulus}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Stimulus
            </button>
          </div>

          {/* Presets */}
          <div className="mt-3 mb-1">
            <p className="text-xs text-slate-400 mb-2 font-medium">Load a preset:</p>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map(preset => (
                <button
                  key={preset.label}
                  onClick={() => loadPreset(preset)}
                  className="text-left px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50 transition group"
                >
                  <p className="text-xs font-semibold text-slate-700 group-hover:text-indigo-700 leading-tight">
                    {preset.label}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{preset.description}</p>
                </button>
              ))}
            </div>
          </div>

          {state.stimulusItems.length === 0 && (
            <p className="mt-2 text-sm text-slate-400 italic text-center py-2">
              Or add custom stimuli below.
            </p>
          )}

          <div className="mt-3 space-y-4">
            {state.stimulusItems.map((stimulus, idx) => (
              <div
                key={stimulus.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest">
                    Stimulus {idx + 1}
                  </span>
                  <button
                    onClick={() => removeStimulus(stimulus.id)}
                    className="text-xs text-rose-400 hover:text-rose-600 transition"
                  >
                    Remove
                  </button>
                </div>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  placeholder='Title — e.g. "Passage 1 — Fluency"'
                  value={stimulus.title}
                  onChange={e => updateStimulus(stimulus.id, { title: e.target.value })}
                />
                <textarea
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
                  rows={6}
                  placeholder="Paste the text passage here…"
                  value={stimulus.text}
                  onChange={e => updateStimulus(stimulus.id, { text: e.target.value })}
                />
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-500 hover:text-indigo-600 transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {stimulus.imageUrl ? 'Replace image' : 'Upload image'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) handleImageUpload(stimulus.id, file)
                      }}
                    />
                  </label>
                  {stimulus.imageUrl && (
                    <>
                      <span className="text-slate-300">|</span>
                      <button
                        onClick={() => updateStimulus(stimulus.id, { imageUrl: undefined })}
                        className="text-xs text-rose-400 hover:text-rose-600 transition"
                      >
                        Remove image
                      </button>
                    </>
                  )}
                </div>
                {stimulus.imageUrl && (
                  <img
                    src={stimulus.imageUrl}
                    alt="Preview"
                    className="mt-1 max-h-32 rounded-lg border border-slate-200 object-contain"
                  />
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Start button */}
        <button
          disabled={!canStart}
          onClick={start}
          className={`w-full py-3.5 rounded-xl text-white font-semibold text-base tracking-wide shadow-sm transition-all ${
            canStart
              ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 hover:shadow-indigo-300 hover:shadow-md active:scale-[0.99]'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
          }`}
        >
          Start Assessment →
        </button>

        {!canStart && (
          <p className="text-xs text-center text-slate-400">
            {state.students.length === 0 && state.stimulusItems.length === 0
              ? 'Add students and at least one stimulus to begin.'
              : state.students.length === 0
              ? 'Add students to begin.'
              : 'Add at least one stimulus to begin.'}
          </p>
        )}
      </div>
    </div>
  )
}

// ── ASSESSING PHASE ───────────────────────────────────────────────────────────

function AssessingPhase({
  state,
  setState,
  scoreAndAdvance,
}: {
  state: SessionState
  setState: React.Dispatch<React.SetStateAction<SessionState>>
  scoreAndAdvance: (score: number | null) => void
}) {
  const totalStimuli = state.stimulusItems.length
  const totalStudents = state.students.length
  const student = state.students[state.currentStudentIndex]
  const allStimuliDone = state.currentStimulusIndex >= totalStimuli
  // Show last stimulus on the left when all are done (for context)
  const stimulusIdx = allStimuliDone ? totalStimuli - 1 : state.currentStimulusIndex
  const stimulus = state.stimulusItems[stimulusIdx]
  const isLastStudent = state.currentStudentIndex === totalStudents - 1
  const studentProgressPct = (state.currentStudentIndex / totalStudents) * 100

  // Scores for the current student across all stimuli
  const studentScores = state.scores.filter(s => s.studentId === student?.id)

  function nextStudent() {
    const next = state.currentStudentIndex + 1
    if (next < totalStudents)
      setState(prev => ({ ...prev, currentStudentIndex: next, currentStimulusIndex: 0 }))
    else
      setState(prev => ({ ...prev, phase: 'results' }))
  }

  const scoreStyles = [
    'border-rose-300 text-rose-700 hover:bg-rose-50 hover:border-rose-400',
    'border-rose-200 text-rose-500 hover:bg-rose-50 hover:border-rose-300',
    'border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400',
    'border-emerald-300 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-400',
    'border-emerald-400 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-500',
  ]

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      {/* Top bar — student progress */}
      <div className="flex items-center justify-between px-5 py-3 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          <span className="text-white font-semibold text-sm">
            {state.sessionTitle || 'VBA Assessment'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {/* Student progress pips */}
          <div className="flex gap-1">
            {state.students.map((_, i) => (
              <span
                key={i}
                className={`w-4 h-1.5 rounded-full transition-colors ${
                  i < state.currentStudentIndex
                    ? 'bg-indigo-400'
                    : i === state.currentStudentIndex
                    ? 'bg-white'
                    : 'bg-slate-600'
                }`}
              />
            ))}
          </div>
          <span className="text-slate-400 text-xs">
            Student {state.currentStudentIndex + 1}/{totalStudents}
          </span>
          <button
            onClick={() => setState(prev => ({ ...prev, phase: 'setup' }))}
            className="text-slate-400 hover:text-white text-xs transition"
          >
            ← Setup
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT — Stimulus (changes per stimulus within a student) */}
        <div className="w-3/5 bg-white overflow-y-auto">
          <div className="p-8 space-y-5 max-w-2xl">
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-lg uppercase tracking-widest">
              Stimulus {stimulusIdx + 1} of {totalStimuli}
            </span>
            <h2 className="text-2xl font-bold text-slate-900 leading-tight">
              {stimulus.title || `Stimulus ${stimulusIdx + 1}`}
            </h2>
            {stimulus.text && (
              <p className="text-xl leading-9 text-slate-700 whitespace-pre-wrap font-serif tracking-wide">
                {stimulus.text}
              </p>
            )}
            {stimulus.imageUrl && (
              <img
                src={stimulus.imageUrl}
                alt="Stimulus"
                className="rounded-2xl border border-slate-100 shadow-sm max-w-full"
              />
            )}
          </div>
        </div>

        {/* RIGHT — Score current student across stimuli */}
        <div className="w-2/5 bg-slate-50 border-l border-slate-200 overflow-y-auto">
          <div className="p-5 space-y-4">
            {/* Student name + overall progress */}
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <h3 className="text-xl font-bold text-slate-900">{student.name}</h3>
                <span className="text-xs text-slate-400 font-medium">
                  {state.currentStudentIndex + 1} / {totalStudents}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${studentProgressPct}%` }}
                />
              </div>
            </div>

            {/* Stimulus progress pills for this student */}
            <div className="flex flex-wrap gap-2">
              {state.stimulusItems.map((item, i) => {
                const s = state.scores.find(
                  sc => sc.studentId === student.id && sc.stimulusId === item.id
                )
                const isCurrent = i === state.currentStimulusIndex && !allStimuliDone
                const chip = s ? scoreChip(s.score) : null
                return (
                  <div
                    key={item.id}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition ${
                      chip
                        ? `${chip.bg} ${chip.text} border-transparent`
                        : isCurrent
                        ? 'border-indigo-500 text-indigo-600 bg-white'
                        : 'border-slate-200 text-slate-400 bg-white'
                    }`}
                  >
                    {chip ? `${item.title || `S${i + 1}`}: ${chip.label}` : (item.title || `Stimulus ${i + 1}`)}
                  </div>
                )
              })}
            </div>

            {/* Score input or "done" state */}
            {!allStimuliDone ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
                <p className="text-xs text-slate-400 font-medium">
                  Scoring: <span className="text-slate-600 font-semibold">{stimulus.title || `Stimulus ${stimulusIdx + 1}`}</span>
                  <span className="ml-2 text-slate-300">· keyboard 1–5</span>
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((n, i) => (
                    <button
                      key={n}
                      onClick={() => scoreAndAdvance(n)}
                      className={`aspect-square flex items-center justify-center text-2xl font-bold rounded-xl border-2 bg-white transition-all active:scale-95 ${scoreStyles[i]}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => scoreAndAdvance(null)}
                  className="w-full py-2.5 text-sm text-slate-500 border border-dashed border-slate-300 rounded-xl hover:border-slate-400 hover:bg-slate-50 transition font-medium"
                >
                  Mark Absent
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-emerald-200 p-5 text-center shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-slate-700">
                  All stimuli scored for {student.name}
                </p>
                <button
                  onClick={nextStudent}
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition shadow-sm active:scale-[0.99]"
                >
                  {isLastStudent ? 'View Results →' : `Next Student →`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── RESULTS PHASE ─────────────────────────────────────────────────────────────

function ResultsPhase({
  state,
  setState,
}: {
  state: SessionState
  setState: React.Dispatch<React.SetStateAction<SessionState>>
}) {
  function exportCSV() {
    const headers = ['Student', ...state.stimulusItems.map((s, i) => s.title || `Stimulus ${i + 1}`), 'Avg']
    const rows = state.students.map(student => {
      const cols = state.stimulusItems.map(stimulus => {
        const s = state.scores.find(sc => sc.studentId === student.id && sc.stimulusId === stimulus.id)
        return s ? (s.score === null ? 'Absent' : String(s.score)) : '—'
      })
      const nums = state.stimulusItems.map(stimulus => {
        const s = state.scores.find(sc => sc.studentId === student.id && sc.stimulusId === stimulus.id)
        return s?.score ?? null
      })
      return [student.name, ...cols, avg(nums)]
    })
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${state.sessionTitle || 'vba-results'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function newSession() {
    localStorage.removeItem(LS_KEY)
    setState(INITIAL_STATE)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 pb-16">
      <div className="max-w-5xl mx-auto px-4 pt-10 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Results</h1>
            {state.sessionTitle && (
              <p className="text-slate-500 text-sm mt-0.5">{state.sessionTitle}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 transition shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </button>
            <button
              onClick={newSession}
              className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-white transition bg-white/60 shadow-sm"
            >
              New Session
            </button>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Students', value: state.students.length },
            { label: 'Stimuli', value: state.stimulusItems.length },
            {
              label: 'Overall Avg',
              value: avg(state.scores.map(s => s.score)),
            },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm text-center">
              <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-400 font-medium mt-0.5 uppercase tracking-widest">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 w-44">Student</th>
                  {state.stimulusItems.map((s, i) => (
                    <th key={s.id} className="text-center px-4 py-3.5 font-semibold text-slate-600 whitespace-nowrap">
                      {s.title || `Stimulus ${i + 1}`}
                    </th>
                  ))}
                  <th className="text-center px-4 py-3.5 font-semibold text-indigo-600 bg-indigo-50">Avg</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {state.students.map(student => {
                  const nums = state.stimulusItems.map(stimulus => {
                    const s = state.scores.find(sc => sc.studentId === student.id && sc.stimulusId === stimulus.id)
                    return s?.score ?? null
                  })
                  const average = avg(nums)

                  return (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-slate-800">{student.name}</td>
                      {state.stimulusItems.map(stimulus => {
                        const s = state.scores.find(
                          sc => sc.studentId === student.id && sc.stimulusId === stimulus.id
                        )
                        if (!s) return (
                          <td key={stimulus.id} className="px-4 py-3 text-center text-slate-300">—</td>
                        )
                        const chip = scoreChip(s.score)
                        return (
                          <td key={stimulus.id} className="px-4 py-3 text-center">
                            <span className={`inline-block text-xs font-bold px-3 py-1.5 rounded-full ${chip.bg} ${chip.text}`}>
                              {chip.label}
                            </span>
                          </td>
                        )
                      })}
                      <td className="px-4 py-3 text-center bg-indigo-50/50">
                        <span className="font-bold text-indigo-700">{average}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
          {[
            { color: 'bg-rose-100', label: '1–2 Needs support' },
            { color: 'bg-amber-100', label: '3 Developing' },
            { color: 'bg-emerald-100', label: '4–5 Proficient' },
            { color: 'bg-slate-100', label: 'A = Absent' },
          ].map(l => (
            <span key={l.label} className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${l.color}`} />
              {l.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Shared components ─────────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      {children}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{children}</p>
  )
}
