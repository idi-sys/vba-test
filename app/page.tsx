'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { SessionState, Score, INITIAL_STATE, LS_KEY, isLegacyScore } from './lib/types'
import SetupPhase from './components/SetupPhase'
import AssessingPhase from './components/AssessingPhase'
import ResultsPhase from './components/ResultsPhase'

export default function VBAApp() {
  const [state, setState] = useState<SessionState>(INITIAL_STATE)
  const nextStimulusId = useRef(1)
  const hydrated = useRef(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as SessionState
        // Detect old format (scores had a numeric `score` field) — clear and start fresh
        const isLegacy = parsed.scores?.some(isLegacyScore)
        if (isLegacy) {
          localStorage.removeItem(LS_KEY)
        } else {
          setState(parsed)
          nextStimulusId.current =
            parsed.stimulusItems.reduce((m, s) => Math.max(m, s.id), 0) + 1
        }
      }
    } catch {
      localStorage.removeItem(LS_KEY)
    }
    hydrated.current = true
  }, [])

  useEffect(() => {
    if (!hydrated.current) return
    localStorage.setItem(LS_KEY, JSON.stringify(state))
  }, [state])

  const recordScore = useCallback((score: Omit<Score, 'studentId' | 'stimulusId'>) => {
    setState(prev => {
      if (prev.phase !== 'assessing') return prev
      const student = prev.students[prev.currentStudentIndex]
      const stimulus = prev.stimulusItems[prev.currentStimulusIndex]
      if (!student || !stimulus) return prev
      const scores = [
        ...prev.scores.filter(
          s => !(s.studentId === student.id && s.stimulusId === stimulus.id)
        ),
        { studentId: student.id, stimulusId: stimulus.id, ...score },
      ]
      return { ...prev, scores }
    })
  }, [])

  if (state.phase === 'setup')
    return <SetupPhase state={state} setState={setState} nextStimulusId={nextStimulusId} />
  if (state.phase === 'assessing')
    return <AssessingPhase state={state} setState={setState} recordScore={recordScore} />
  return <ResultsPhase state={state} setState={setState} />
}
