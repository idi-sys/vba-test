'use client'

import { SessionState, INITIAL_STATE, LS_KEY, scoreLabel, scoreBadge } from '../lib/types'

export default function ResultsPhase({
  state, setState,
}: {
  state: SessionState
  setState: React.Dispatch<React.SetStateAction<SessionState>>
}) {
  function exportCSV() {
    const headers = ['Student', ...state.stimulusItems.map((s, i) => s.title || `Stimulus ${i + 1}`)]
    const rows = state.students.map(student => {
      const cols = state.stimulusItems.map(stimulus => {
        const s = state.scores.find(sc => sc.studentId === student.id && sc.stimulusId === stimulus.id)
        return s ? scoreLabel(s) : '—'
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
                        {s.type === 'dropdown' ? 'word list' : s.type === 'orf' ? 'oral reading' : 'question'}
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

        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
          {[
            { color: 'bg-emerald-100', label: '✓ Correct (MCQ)' },
            { color: 'bg-rose-100', label: '✗ Wrong / errors' },
            { color: 'bg-indigo-100', label: 'Number (word list)' },
            { color: 'bg-amber-100', label: 'Some errors (ORF)' },
            { color: 'bg-slate-100', label: 'A = Absent / NR' },
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
