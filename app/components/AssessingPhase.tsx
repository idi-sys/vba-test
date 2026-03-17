'use client'

import { useState, useEffect, useRef } from 'react'
import { SessionState, Score, formatSecs, parseWords } from '../lib/types'

// ── Audience display components ───────────────────────────────────────────────

function WordGrid({ words }: { words: string[] }) {
  const cols = words.length <= 9 ? 3 : words.length <= 16 ? 4 : 5
  return (
    <div className="w-full max-w-2xl">
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {words.map((word, i) => (
          <div key={i}
            className="flex items-center justify-center rounded-2xl border-2 border-slate-300 bg-white/95 px-4 py-5 text-center shadow-sm">
            <span className="text-xl font-bold text-slate-900 leading-tight">{word}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PassageDisplay({ text }: { text: string }) {
  return (
    <div className="w-full max-w-2xl rounded-2xl bg-[#fdf8ec] p-8 shadow-inner">
      <p className="text-xl leading-9 text-slate-800 font-medium">{text}</p>
    </div>
  )
}

function McqDisplay({ title, text, imageUrl }: { title: string; text: string; imageUrl?: string }) {
  return (
    <div className="w-full max-w-2xl bg-white rounded-2xl p-10 shadow-sm flex flex-col items-start gap-4">
      {text && <p className="text-lg text-slate-600 leading-8">{text}</p>}
      <p className="text-4xl font-extrabold text-slate-900 leading-tight">{title}</p>
      {imageUrl && <img src={imageUrl} alt="" className="max-h-64 rounded-xl object-contain" />}
    </div>
  )
}

// ── Question window scoring components ────────────────────────────────────────

function DropdownScoring({
  words, value, onChange,
}: {
  words: string[]
  value: number | ''
  onChange: (v: number | '') => void
}) {
  return (
    <div className="space-y-3">
      <p className="text-white/80 text-sm font-semibold leading-snug">
        Q. Mark the number of words read correctly by the student
      </p>
      <select
        value={value}
        onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        className="w-full rounded-xl bg-white text-slate-900 px-4 py-3 text-base appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
      >
        <option value="">Select…</option>
        {Array.from({ length: words.length + 1 }, (_, i) => (
          <option key={i} value={i}>{i}</option>
        ))}
      </select>
    </div>
  )
}

function OrfScoring({
  words, mode, incorrectWords, lastWordIndex, onToggleIncorrect, onSetStopPoint,
}: {
  words: string[]
  mode: 'error_marking' | 'stop_point'
  incorrectWords: Set<number>
  lastWordIndex: number | null
  onToggleIncorrect: (i: number) => void
  onSetStopPoint: (i: number) => void
}) {
  const isErrorMode = mode === 'error_marking'
  return (
    <div className="space-y-3">
      <p className="text-white/80 text-sm font-semibold leading-snug">
        {isErrorMode
          ? 'Q. Mark words incorrectly read'
          : 'Q. Mark till where the student has read'}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {words.map((word, i) => {
          const isIncorrect = incorrectWords.has(i)
          const isStop = lastWordIndex === i
          const highlight = isErrorMode ? isIncorrect : isStop
          return (
            <button key={i}
              onClick={() => isErrorMode ? onToggleIncorrect(i) : onSetStopPoint(i)}
              className={`px-2.5 py-1.5 rounded-lg text-sm font-medium border transition active:scale-95 ${
                highlight
                  ? 'bg-rose-500 border-rose-400 text-white'
                  : 'bg-white/10 border-white/20 text-white/80 hover:bg-white/20'
              }`}>
              {word}
            </button>
          )
        })}
      </div>
      {isErrorMode && incorrectWords.size > 0 && (
        <p className="text-rose-300 text-xs">
          {incorrectWords.size} word{incorrectWords.size > 1 ? 's' : ''} marked incorrect
        </p>
      )}
      {!isErrorMode && lastWordIndex !== null && (
        <p className="text-amber-300 text-xs">
          Stopped at word {lastWordIndex + 1}: &ldquo;{words[lastWordIndex]}&rdquo;
        </p>
      )}
    </div>
  )
}

function McqScoring({
  title, answer, value, onChange,
}: {
  title: string
  answer?: string
  value: 'correct' | 'wrong' | 'no_response' | null
  onChange: (v: 'correct' | 'wrong' | 'no_response') => void
}) {
  const options: { val: 'correct' | 'wrong' | 'no_response'; label: string }[] = [
    { val: 'correct', label: 'correct' },
    { val: 'wrong', label: 'wrong' },
    { val: 'no_response', label: 'no response' },
  ]
  return (
    <div className="space-y-4">
      <div>
        <p className="text-white/80 text-sm font-semibold leading-snug">{title}</p>
        {answer && <p className="text-amber-300 text-xs mt-1 italic">Answer — {answer}</p>}
      </div>
      <div className="space-y-2">
        {options.map(opt => (
          <button key={opt.val} onClick={() => onChange(opt.val)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition ${
              value === opt.val
                ? opt.val === 'correct' ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                  : opt.val === 'wrong' ? 'border-rose-400 bg-rose-500/20 text-rose-300'
                  : 'border-slate-400 bg-slate-500/20 text-slate-300'
                : 'border-white/15 text-white/60 hover:border-white/30 hover:text-white/80'
            }`}>
            <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
              value === opt.val
                ? opt.val === 'correct' ? 'border-emerald-400 bg-emerald-400'
                  : opt.val === 'wrong' ? 'border-rose-400 bg-rose-400'
                  : 'border-slate-400 bg-slate-400'
                : 'border-white/30'
            }`}>
              {value === opt.val && <span className="w-2 h-2 rounded-full bg-white" />}
            </span>
            <span className="text-sm font-medium">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AssessingPhase({
  state, setState, recordScore,
}: {
  state: SessionState
  setState: React.Dispatch<React.SetStateAction<SessionState>>
  recordScore: (score: Omit<Score, 'studentId' | 'stimulusId'>) => void
}) {
  const totalStimuli = state.stimulusItems.length
  const totalStudents = state.students.length
  const student = state.students[state.currentStudentIndex]
  const stimIdx = Math.min(state.currentStimulusIndex, totalStimuli - 1)
  const stimulus = state.stimulusItems[stimIdx]
  const allStimuliDone = state.currentStimulusIndex >= totalStimuli
  const isLastStudent = state.currentStudentIndex === totalStudents - 1

  // Keep a ref to latest scores so the reset effect can read them without
  // adding state.scores to its dependency array (which would cause infinite loops).
  const scoresRef = useRef(state.scores)
  scoresRef.current = state.scores

  // Session elapsed timer
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // ORF timer state
  const timerDuration = stimulus?.timerDurationSecs ?? 60
  const [timerStatus, setTimerStatus] = useState<'idle' | 'running' | 'paused'>('idle')
  const [timerRemaining, setTimerRemaining] = useState(timerDuration)
  const [orfMode, setOrfMode] = useState<'error_marking' | 'stop_point'>('error_marking')

  // Per-stimulus scoring state
  const [dropdownValue, setDropdownValue] = useState<number | ''>('')
  const [incorrectWords, setIncorrectWords] = useState<Set<number>>(new Set())
  const [lastWordIndex, setLastWordIndex] = useState<number | null>(null)
  const [mcqResult, setMcqResult] = useState<'correct' | 'wrong' | 'no_response' | null>(null)

  // Reset local scoring state and restore any existing score when student/stimulus changes
  useEffect(() => {
    setTimerStatus('idle')
    setTimerRemaining(stimulus?.timerDurationSecs ?? 60)
    setOrfMode('error_marking')

    const existing = scoresRef.current.find(
      s => s.studentId === student?.id && s.stimulusId === stimulus?.id
    )
    setDropdownValue(existing?.dropdownValue ?? '')
    setIncorrectWords(new Set(existing?.incorrectWords ?? []))
    setLastWordIndex(existing?.lastWordIndex ?? null)
    setMcqResult(existing?.mcqResult ?? null)
  }, [state.currentStimulusIndex, state.currentStudentIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  // ORF countdown
  useEffect(() => {
    if (timerStatus !== 'running') return
    if (timerRemaining <= 0) { setTimerStatus('idle'); return }
    const id = setInterval(() => setTimerRemaining(r => {
      if (r <= 1) { setTimerStatus('idle'); return 0 }
      return r - 1
    }), 1000)
    return () => clearInterval(id)
  }, [timerStatus, timerRemaining])

  function startTimer() {
    setOrfMode('stop_point')
    setTimerStatus('running')
  }

  function pauseTimer() {
    setTimerStatus(s => s === 'running' ? 'paused' : 'running')
  }

  function stopTimer() {
    setTimerStatus('idle')
    setTimerRemaining(0)
  }

  function toggleIncorrectWord(idx: number) {
    setIncorrectWords(prev => {
      const next = new Set(prev)
      if (next.has(idx)) { next.delete(idx) } else { next.add(idx) }
      return next
    })
  }

  function setStopPoint(idx: number) {
    setLastWordIndex(prev => prev === idx ? null : idx)
  }

  function buildScore(): Omit<Score, 'studentId' | 'stimulusId'> | null {
    if (!stimulus) return null
    if (stimulus.type === 'dropdown') return { dropdownValue: dropdownValue === '' ? 0 : dropdownValue }
    if (stimulus.type === 'orf') return { incorrectWords: Array.from(incorrectWords), lastWordIndex }
    if (stimulus.type === 'mcq' && mcqResult) return { mcqResult }
    return null
  }

  function submitAndNext() {
    const score = buildScore()
    if (score) recordScore(score)
    goNext()
  }

  function markAbsent() {
    recordScore({ absent: true })
    goNext()
  }

  function goNext() {
    if (allStimuliDone) return
    setState(prev => ({ ...prev, currentStimulusIndex: prev.currentStimulusIndex + 1 }))
  }

  function goPrev() {
    if (state.currentStimulusIndex === 0) return
    setState(prev => ({ ...prev, currentStimulusIndex: prev.currentStimulusIndex - 1 }))
  }

  function goToStudent(idx: number) {
    setState(prev => ({ ...prev, currentStudentIndex: idx, currentStimulusIndex: 0 }))
  }

  function nextStudent() {
    const next = state.currentStudentIndex + 1
    if (next < totalStudents)
      setState(prev => ({ ...prev, currentStudentIndex: next, currentStimulusIndex: 0 }))
    else
      setState(prev => ({ ...prev, phase: 'results' }))
  }

  const words = stimulus ? parseWords(stimulus.text) : []

  const canSubmit = stimulus && (
    stimulus.type === 'dropdown' ? dropdownValue !== ''
    : stimulus.type === 'orf' ? true
    : mcqResult !== null
  )

  // Count how many stimuli a student has scored
  function studentProgress(studentId: number): number {
    return state.scores.filter(s => s.studentId === studentId).length
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-[#1a1a2e] overflow-hidden">

      {/* Very top bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#111] border-b border-white/10 text-xs text-white/60 flex-none">
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-1.5 hover:text-white/90 transition">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            SHOW TASKBAR
          </button>
          <span className="text-white/20">|</span>
          <button className="flex items-center gap-1.5 hover:text-white/90 transition">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            DISPLAY SETTINGS ▾
          </button>
        </div>
        <button
          onClick={() => setState(prev => ({ ...prev, phase: 'setup' }))}
          className="flex items-center gap-1.5 hover:text-white/90 transition font-medium"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          END SLIDE SHOW
        </button>
      </div>

      {/* Timer + student review bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a2e] border-b border-white/10 flex-none gap-4">
        {/* Elapsed timer */}
        <div className="flex items-center gap-2 text-white flex-none">
          <span className="text-base font-mono font-semibold tabular-nums">{formatSecs(elapsed)}</span>
          <button onClick={() => setElapsed(0)} className="text-white/40 hover:text-white transition">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Student review pills — clickable to jump */}
        <div className="flex items-center gap-1 overflow-x-auto flex-1 py-0.5">
          {state.students.map((s, i) => {
            const done = studentProgress(s.id)
            const isCurrent = i === state.currentStudentIndex
            const isComplete = done >= totalStimuli
            return (
              <button
                key={s.id}
                onClick={() => goToStudent(i)}
                title={`${s.name} — ${done}/${totalStimuli} scored`}
                className={`flex-none flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                  isCurrent
                    ? 'bg-indigo-500 text-white'
                    : isComplete
                    ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                    : 'bg-white/10 text-white/50 hover:bg-white/20 hover:text-white/80'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full flex-none ${
                  isCurrent ? 'bg-white' : isComplete ? 'bg-emerald-400' : 'bg-white/30'
                }`} />
                {s.name.split(' ')[0]}
                {done > 0 && !isCurrent && (
                  <span className="opacity-60">{done}/{totalStimuli}</span>
                )}
              </button>
            )
          })}
        </div>

        <div className="text-white/30 text-xs flex-none">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">

        {/* Left — Audience Display */}
        <div className="flex flex-col flex-1 min-w-0 bg-[#2a2a3e]">
          <div className="px-4 py-2 text-xs font-medium text-white/40 tracking-widest uppercase border-b border-white/10 flex-none">
            Audience Display
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col">
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              {stimulus?.type === 'dropdown' && <WordGrid words={words} />}
              {stimulus?.type === 'orf' && <PassageDisplay text={stimulus.text} />}
              {stimulus?.type === 'mcq' && (
                <McqDisplay title={stimulus.title} text={stimulus.text} imageUrl={stimulus.imageUrl} />
              )}
            </div>

            {/* Slide nav + ORF timer */}
            <div className="flex items-center justify-between px-6 py-3 border-t border-white/10 flex-none">
              <div className="flex items-center gap-3">
                <button onClick={goPrev} disabled={state.currentStimulusIndex === 0}
                  className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:border-white/40 disabled:opacity-30 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-white/50 text-sm">
                  Slide {allStimuliDone ? totalStimuli : state.currentStimulusIndex + 1} of {totalStimuli}
                </span>
                <button onClick={goNext} disabled={allStimuliDone}
                  className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:border-white/40 disabled:opacity-30 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* ORF timer button */}
              {stimulus?.type === 'orf' && !allStimuliDone && (
                <div>
                  {timerStatus === 'idle' && timerRemaining === timerDuration && (
                    <button onClick={startTimer}
                      className="flex items-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-semibold text-sm rounded-full transition active:scale-95">
                      start timer
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  )}
                  {(timerStatus !== 'idle' || timerRemaining < timerDuration) && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-slate-900 rounded-full">
                      <span className="font-mono font-bold text-sm tabular-nums">{formatSecs(timerRemaining)}</span>
                      <button onClick={pauseTimer} className="hover:opacity-70 transition">
                        {timerStatus === 'running'
                          ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" /></svg>
                          : <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        }
                      </button>
                      <button onClick={stopTimer} className="w-4 h-4 rounded-full bg-rose-500 hover:bg-rose-400 transition flex-shrink-0" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right — Question Window */}
        <div className="w-80 xl:w-96 flex-none flex flex-col bg-[#3a3a4e] border-l border-white/10">

          {/* Video placeholder */}
          <div className="p-3 border-b border-white/10 flex-none">
            <p className="text-xs text-white/40 font-medium mb-2">Teacher/Student Live Video</p>
            <div className="relative rounded-lg overflow-hidden bg-[#f5f0e8] aspect-video flex items-center justify-center">
              <div className="text-center text-slate-400">
                <svg className="w-10 h-10 mx-auto mb-1 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="text-xs opacity-50">Video feed</span>
              </div>
              <div className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col gap-1.5">
                {[
                  <svg key="cam" className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
                  <svg key="mic" className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>,
                  <svg key="phone" className="w-3.5 h-3.5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" /></svg>,
                ].map((icon, i) => (
                  <div key={i} className="w-6 h-6 rounded bg-white/80 flex items-center justify-center shadow-sm">
                    {icon}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Student info */}
          <div className="px-4 py-3 border-b border-white/10 flex-none">
            <p className="text-white/90 font-semibold text-sm">{student?.name}</p>
            <p className="text-white/40 text-xs mt-0.5">
              Student {state.currentStudentIndex + 1} of {totalStudents}
              {' · '}Slide {allStimuliDone ? totalStimuli : state.currentStimulusIndex + 1} of {totalStimuli}
            </p>
          </div>

          {/* Scoring UI */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {!allStimuliDone && stimulus ? (
              <>
                {stimulus.type === 'dropdown' && (
                  <DropdownScoring words={words} value={dropdownValue} onChange={setDropdownValue} />
                )}
                {stimulus.type === 'orf' && (
                  <OrfScoring
                    words={words}
                    mode={orfMode}
                    incorrectWords={incorrectWords}
                    lastWordIndex={lastWordIndex}
                    onToggleIncorrect={toggleIncorrectWord}
                    onSetStopPoint={setStopPoint}
                  />
                )}
                {stimulus.type === 'mcq' && (
                  <McqScoring
                    title={stimulus.title}
                    answer={stimulus.answer}
                    value={mcqResult}
                    onChange={setMcqResult}
                  />
                )}
              </>
            ) : (
              <div className="text-center py-6 space-y-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-white/70 text-sm font-medium">All slides scored for {student?.name}</p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="px-4 py-3 border-t border-white/10 space-y-2 flex-none">
            {!allStimuliDone ? (
              <>
                <button
                  onClick={submitAndNext}
                  disabled={!canSubmit}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition active:scale-[0.98] ${
                    canSubmit
                      ? 'bg-indigo-500 hover:bg-indigo-400 text-white'
                      : 'bg-white/10 text-white/30 cursor-not-allowed'
                  }`}
                >
                  {state.currentStimulusIndex + 1 >= totalStimuli ? 'Save & Finish Student' : 'Save & Next →'}
                </button>
                <button onClick={markAbsent}
                  className="w-full py-2 rounded-xl text-xs font-medium text-white/40 border border-white/10 hover:border-white/20 hover:text-white/60 transition">
                  Mark Absent
                </button>
              </>
            ) : (
              <button onClick={nextStudent}
                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-indigo-500 hover:bg-indigo-400 text-white transition active:scale-[0.98]">
                {isLastStudent ? 'View Results →' : 'Next Student →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
