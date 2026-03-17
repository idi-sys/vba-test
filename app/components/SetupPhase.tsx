'use client'

import { useState } from 'react'
import {
  SessionState, Student, StimulusItem, StimulusType,
  STUDENT_PRESETS, PRESETS, PresetBundle,
} from '../lib/types'

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">{children}</div>
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{children}</p>
}

const TYPE_LABELS: Record<StimulusType, string> = {
  dropdown: 'Word List',
  orf: 'Oral Reading',
  mcq: 'Question',
}

export default function SetupPhase({
  state, setState, nextStimulusId,
}: {
  state: SessionState
  setState: React.Dispatch<React.SetStateAction<SessionState>>
  nextStimulusId: React.RefObject<number>
}) {
  const [selectedClassIdx, setSelectedClassIdx] = useState<number | null>(null)
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set())
  const canStart = state.students.length > 0 && state.stimulusItems.length > 0

  function selectClass(idx: number) {
    const preset = STUDENT_PRESETS[idx]
    const students: Student[] = preset.names.map((name, i) => ({ id: i + 1, name }))
    setSelectedClassIdx(idx)
    setCheckedIds(new Set(students.map(s => s.id)))
    setState(prev => ({ ...prev, students }))
  }

  function toggleStudent(id: number) {
    setCheckedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      const preset = STUDENT_PRESETS[selectedClassIdx!]
      const all: Student[] = preset.names.map((name, i) => ({ id: i + 1, name }))
      setState(s => ({ ...s, students: all.filter(st => next.has(st.id)) }))
      return next
    })
  }

  function toggleAll() {
    if (selectedClassIdx === null) return
    const preset = STUDENT_PRESETS[selectedClassIdx]
    const all: Student[] = preset.names.map((name, i) => ({ id: i + 1, name }))
    if (checkedIds.size === all.length) {
      setCheckedIds(new Set()); setState(prev => ({ ...prev, students: [] }))
    } else {
      setCheckedIds(new Set(all.map(s => s.id))); setState(prev => ({ ...prev, students: all }))
    }
  }

  function loadPreset(preset: PresetBundle) {
    const items: StimulusItem[] = preset.items.map(item => ({
      ...item, id: nextStimulusId.current++,
    }))
    setState(prev => ({ ...prev, stimulusItems: items }))
  }

  function addStimulus() {
    const id = nextStimulusId.current++
    setState(prev => ({
      ...prev,
      stimulusItems: [...prev.stimulusItems, { id, title: '', type: 'mcq', text: '' }],
    }))
  }

  function updateStimulus(id: number, patch: Partial<StimulusItem>) {
    setState(prev => ({
      ...prev,
      stimulusItems: prev.stimulusItems.map(s => s.id === id ? { ...s, ...patch } : s),
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
      ...prev, phase: 'assessing', scores: [], currentStimulusIndex: 0, currentStudentIndex: 0,
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 shadow-lg mb-3">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
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
          <div className="mt-3 grid grid-cols-3 gap-2">
            {STUDENT_PRESETS.map((preset, idx) => (
              <button key={preset.label} onClick={() => selectClass(idx)}
                className={`py-3 rounded-xl border-2 text-sm font-semibold transition ${
                  selectedClassIdx === idx
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'
                }`}>
                <span className="block">{preset.label.split('·')[0].trim()}</span>
                <span className="block text-xs font-normal text-slate-400 mt-0.5">{preset.names.length} students</span>
              </button>
            ))}
          </div>

          {selectedClassIdx !== null && (() => {
            const preset = STUDENT_PRESETS[selectedClassIdx]
            const all: Student[] = preset.names.map((name, i) => ({ id: i + 1, name }))
            return (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-500 font-medium">{checkedIds.size} of {all.length} selected</p>
                  <button onClick={toggleAll} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition">
                    {checkedIds.size === all.length ? 'Deselect all' : 'Select all'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {all.map(student => {
                    const checked = checkedIds.has(student.id)
                    return (
                      <button key={student.id} onClick={() => toggleStudent(student.id)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm transition ${
                          checked
                            ? 'border-indigo-200 bg-indigo-50 text-indigo-800'
                            : 'border-slate-200 bg-white text-slate-400 line-through'
                        }`}>
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
            <button onClick={addStimulus}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Stimulus
            </button>
          </div>

          <div className="mt-3 mb-1">
            <p className="text-xs text-slate-400 mb-2 font-medium">Load a preset:</p>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map(preset => (
                <button key={preset.label} onClick={() => loadPreset(preset)}
                  className="text-left px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50 transition group">
                  <p className="text-xs font-semibold text-slate-700 group-hover:text-indigo-700 leading-tight">{preset.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{preset.description}</p>
                </button>
              ))}
            </div>
          </div>

          {state.stimulusItems.length === 0 && (
            <p className="mt-2 text-sm text-slate-400 italic text-center py-2">Or add custom stimuli below.</p>
          )}

          <div className="mt-3 space-y-4">
            {state.stimulusItems.map((stimulus, idx) => (
              <div key={stimulus.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest">Stimulus {idx + 1}</span>
                  <button onClick={() => removeStimulus(stimulus.id)}
                    className="text-xs text-rose-400 hover:text-rose-600 transition">Remove</button>
                </div>

                {/* Type picker */}
                <div className="flex gap-1.5">
                  {(['dropdown', 'orf', 'mcq'] as StimulusType[]).map(t => (
                    <button key={t} onClick={() => updateStimulus(stimulus.id, { type: t })}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition ${
                        stimulus.type === t
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'
                      }`}>
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>

                <input
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  placeholder={stimulus.type === 'mcq' ? 'Question text (shown to student)' : 'Title'}
                  value={stimulus.title}
                  onChange={e => updateStimulus(stimulus.id, { title: e.target.value })}
                />

                <textarea
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
                  rows={stimulus.type === 'dropdown' ? 4 : 5}
                  placeholder={
                    stimulus.type === 'dropdown' ? 'One word per line (or comma-separated)'
                    : stimulus.type === 'orf' ? 'Paste the reading passage here…'
                    : 'Context shown to student (optional)'
                  }
                  value={stimulus.text}
                  onChange={e => updateStimulus(stimulus.id, { text: e.target.value })}
                />

                {stimulus.type === 'mcq' && (
                  <input
                    className="w-full rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
                    placeholder="Correct answer (shown only to assessor)"
                    value={stimulus.answer ?? ''}
                    onChange={e => updateStimulus(stimulus.id, { answer: e.target.value })}
                  />
                )}

                {stimulus.type === 'orf' && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500 font-medium">Timer (seconds)</label>
                    <input
                      type="number"
                      className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                      value={stimulus.timerDurationSecs ?? 60}
                      min={10} max={300}
                      onChange={e => updateStimulus(stimulus.id, { timerDurationSecs: Number(e.target.value) })}
                    />
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-500 hover:text-indigo-600 transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {stimulus.imageUrl ? 'Replace image' : 'Upload image'}
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(stimulus.id, f) }} />
                  </label>
                  {stimulus.imageUrl && (
                    <>
                      <span className="text-slate-300">|</span>
                      <button onClick={() => updateStimulus(stimulus.id, { imageUrl: undefined })}
                        className="text-xs text-rose-400 hover:text-rose-600 transition">Remove image</button>
                    </>
                  )}
                </div>
                {stimulus.imageUrl && (
                  <img src={stimulus.imageUrl} alt="Preview"
                    className="max-h-32 rounded-lg border border-slate-200 object-contain" />
                )}
              </div>
            ))}
          </div>
        </Card>

        <button disabled={!canStart} onClick={start}
          className={`w-full py-3.5 rounded-xl text-white font-semibold text-base tracking-wide shadow-sm transition-all ${
            canStart
              ? 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99]'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}>
          Start Assessment →
        </button>

        {!canStart && (
          <p className="text-xs text-center text-slate-400">
            {state.students.length === 0 && state.stimulusItems.length === 0
              ? 'Add students and at least one stimulus to begin.'
              : state.students.length === 0 ? 'Add students to begin.'
              : 'Add at least one stimulus to begin.'}
          </p>
        )}
      </div>
    </div>
  )
}
