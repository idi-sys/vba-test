'use client'

import { SessionState, StimulusItem, Score, INITIAL_STATE, LS_KEY, scoreLabel, scoreBadge } from '../lib/types'

// ── WPM helpers ───────────────────────────────────────────────────────────────

function orfWpm(score: Score, stimulus: StimulusItem) {
  if (score.absent || score.lastWordIndex == null) return null
  const wordsRead = score.lastWordIndex + 1
  const errors = score.incorrectWords?.length ?? 0
  const mins = (stimulus.timerDurationSecs ?? 60) / 60
  return {
    wpm: Math.round(wordsRead / mins),
    cwpm: Math.round(Math.max(0, wordsRead - errors) / mins),
    wordsRead,
    errors,
  }
}

function avgWpm(scores: Score[], stimulus: StimulusItem): string {
  const vals = scores
    .map(s => orfWpm(s, stimulus))
    .filter((v): v is NonNullable<ReturnType<typeof orfWpm>> => v !== null)
  if (!vals.length) return '—'
  return Math.round(vals.reduce((a, b) => a + b.wpm, 0) / vals.length).toString()
}

function avgCwpm(scores: Score[], stimulus: StimulusItem): string {
  const vals = scores
    .map(s => orfWpm(s, stimulus))
    .filter((v): v is NonNullable<ReturnType<typeof orfWpm>> => v !== null)
  if (!vals.length) return '—'
  return Math.round(vals.reduce((a, b) => a + b.cwpm, 0) / vals.length).toString()
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ResultsPhase({
  state, setState,
}: {
  state: SessionState
  setState: React.Dispatch<React.SetStateAction<SessionState>>
}) {
  const orfStimuli = state.stimulusItems.filter(s => s.type === 'orf')

  function exportCSV() {
    const headers = [
      'Student',
      ...state.stimulusItems.flatMap(s =>
        s.type === 'orf'
          ? [`${s.title || 'ORF'} — WPM`, `${s.title || 'ORF'} — CWPM`, `${s.title || 'ORF'} — Errors`]
          : [s.title || 'Stimulus']
      ),
    ]
    const rows = state.students.map(student => {
      const cols = state.stimulusItems.flatMap(stimulus => {
        const s = state.scores.find(sc => sc.studentId === student.id && sc.stimulusId === stimulus.id)
        if (!s) return stimulus.type === 'orf' ? ['—', '—', '—'] : ['—']
        if (stimulus.type === 'orf') {
          const m = orfWpm(s, stimulus)
          return m ? [String(m.wpm), String(m.cwpm), String(m.errors)] : ['—', '—', '—']
        }
        return [scoreLabel(s)]
      })
      return [student.name, ...cols]
    })
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
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

  const totalScored = state.scores.filter(s => !s.absent).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 pb-16">
      <div className="max-w-5xl mx-auto px-4 pt-10 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Results</h1>
            {state.sessionTitle && <p className="text-slate-500 text-sm mt-0.5">{state.sessionTitle}</p>}
          </div>
          <div className="flex gap-2">
            <button onClick={exportCSV}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 transition shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </button>
            <button onClick={newSession}
              className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-white transition bg-white/60 shadow-sm">
              New Session
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Students', value: state.students.length },
            { label: 'Stimuli', value: state.stimulusItems.length },
            { label: 'Responses', value: totalScored },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm text-center">
              <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-400 font-medium mt-0.5 uppercase tracking-widest">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ORF WPM summary — one card per ORF stimulus */}
        {orfStimuli.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Oral Reading Fluency</h2>
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(orfStimuli.length, 3)}, 1fr)` }}>
              {orfStimuli.map(stimulus => {
                const stimScores = state.scores.filter(s => s.stimulusId === stimulus.id)
                const wpm = avgWpm(stimScores, stimulus)
                const cwpm = avgCwpm(stimScores, stimulus)
                return (
                  <div key={stimulus.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500 truncate mb-3">{stimulus.title}</p>
                    <div className="flex gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-slate-900">{wpm}</p>
                        <p className="text-xs text-slate-400 mt-0.5">avg WPM</p>
                      </div>
                      <div className="w-px bg-slate-100" />
                      <div className="text-center">
                        <p className="text-2xl font-bold text-emerald-600">{cwpm}</p>
                        <p className="text-xs text-slate-400 mt-0.5">avg CWPM</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Main results table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600 w-44">Student</th>
                  {state.stimulusItems.map((s, i) => (
                    <th key={s.id} className="text-center px-4 py-3.5 font-semibold text-slate-600 whitespace-nowrap">
                      <div>{s.title || `Stimulus ${i + 1}`}</div>
                      <div className="text-xs font-normal text-slate-400 normal-case tracking-normal">
                        {s.type === 'dropdown' ? 'word list'
                          : s.type === 'orf' ? 'WPM / CWPM'
                          : 'question'}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {state.students.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-800">{student.name}</td>
                    {state.stimulusItems.map(stimulus => {
                      const s = state.scores.find(
                        sc => sc.studentId === student.id && sc.stimulusId === stimulus.id
                      )
                      if (!s) return (
                        <td key={stimulus.id} className="px-4 py-3 text-center text-slate-300">—</td>
                      )
                      if (stimulus.type === 'orf') {
                        if (s.absent) return (
                          <td key={stimulus.id} className="px-4 py-3 text-center">
                            <span className="inline-block text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-400">A</span>
                          </td>
                        )
                        const m = orfWpm(s, stimulus)
                        return (
                          <td key={stimulus.id} className="px-4 py-3 text-center">
                            {m ? (
                              <div className="space-y-1">
                                <div className="flex items-center justify-center gap-1.5">
                                  <span className="text-xs font-bold text-slate-700">{m.wpm}</span>
                                  <span className="text-xs text-slate-400">/</span>
                                  <span className="text-xs font-bold text-emerald-600">{m.cwpm}</span>
                                </div>
                                <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                                  {m.errors > 0 && <span className="text-rose-400">{m.errors}✗</span>}
                                  {s.skipped && <span className="text-rose-400">skip</span>}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-300 text-xs">no stop point</span>
                            )}
                          </td>
                        )
                      }
                      return (
                        <td key={stimulus.id} className="px-4 py-3 text-center">
                          <span className={`inline-block text-xs font-bold px-3 py-1.5 rounded-full ${scoreBadge(s)}`}>
                            {scoreLabel(s)}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
          {[
            { color: 'bg-emerald-100', label: '✓ Correct (MCQ)' },
            { color: 'bg-rose-100', label: '✗ Wrong / errors' },
            { color: 'bg-indigo-100', label: 'Number (word list)' },
            { color: 'bg-slate-100', label: 'A = Absent / NR' },
          ].map(l => (
            <span key={l.label} className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${l.color}`} />
              {l.label}
            </span>
          ))}
          {orfStimuli.length > 0 && (
            <span className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">WPM</span> = words/min ·
              <span className="font-semibold text-emerald-600">CWPM</span> = correct words/min
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
