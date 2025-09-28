import { useEffect, useState, useRef, useCallback } from 'react'
import api from '../api'

const difficultySeconds = { easy: 20, medium: 60, hard: 120 }

export default function Interview() {
  const [session, setSession] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [timer, setTimer] = useState(0)
  const autoSubmitting = useRef(false)


  useEffect(() => {
    let t
    if (timer > 0) {
      t = setTimeout(() => setTimer(timer - 1), 1000)
    }
    return () => clearTimeout(t)
  }, [timer])

  // Auto-submit when timer reaches 0 and we have a session + question
  const submitCb = useCallback(async () => {
    if (!session || !session.sessionId) return
    setLoading(true)
    try {
      const res = await api.post('/api/interviews/submit-answer', { sessionId: session.sessionId, questionIndex: currentIndex, answer })
      const { grade, nextQuestion, completed } = res.data
      const updated = { ...session }
      if (!updated.questions) updated.questions = []
      updated.questions[currentIndex] = { ...updated.questions[currentIndex], answer, grade }
      setSession(updated)

      if (completed) {
        alert('Interview completed')
      } else if (nextQuestion) {
        setCurrentIndex(nextQuestion.index)
        setAnswer('')
        // set timer for next question
        setTimer(difficultySeconds[nextQuestion.difficulty] || 60)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [session, currentIndex, answer])

  useEffect(() => {
    if (timer === 0 && session && session.questions && session.questions[currentIndex]) {
      if (autoSubmitting.current) return
      autoSubmitting.current = true
      submitCb().catch(e => console.error('auto-submit failed', e)).finally(() => { autoSubmitting.current = false })
    }
  }, [timer, session, currentIndex, submitCb])

  async function start() {
    setLoading(true)
    try {
      const res = await api.post('/api/interviews/start-interview', {})
      const data = res.data
      setSession(data)
      setCurrentIndex(0)
      setAnswer('')
      // set initial timer based on first question
      const first = data?.questions?.[0]
      setTimer(first ? (difficultySeconds[first.difficulty] || 60) : 60)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // submit is a wrapper that calls submitCb (used by manual button)
  function submit() { submitCb() }

  const currentQuestion = session?.questions ? session.questions[currentIndex] : null

  return (
    <div className="page interview-page">
      <h2>Interview</h2>
      {!session && <button onClick={start} disabled={loading}>{loading ? 'Starting...' : 'Start Interview'}</button>}

      {session && (
        <div>
          <div>Session: {session.sessionId}</div>
          <div>Timer: {Math.floor(timer/60)}:{String(timer%60).padStart(2,'0')}</div>

          {currentQuestion && (
            <div>
              <h3>Q{currentIndex + 1} ({currentQuestion.difficulty})</h3>
              <p>{currentQuestion.question}</p>
              <textarea value={answer} onChange={e => setAnswer(e.target.value)} rows={8} cols={80} />
              <div>
                <button onClick={submit} disabled={loading}>{loading ? 'Submitting...' : 'Submit Answer'}</button>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
