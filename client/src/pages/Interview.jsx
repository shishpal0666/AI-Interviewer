import { useEffect, useState } from 'react'
import api from '../api'

export default function Interview() {
  const [session, setSession] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [timer, setTimer] = useState(600) 

  useEffect(() => {
    let t
    if (timer > 0) {
      t = setTimeout(() => setTimer(timer - 1), 1000)
    }
    return () => clearTimeout(t)
  }, [timer])

  async function start() {
    setLoading(true)
    try {
  const res = await api.post('/api/interviews/start-interview', {})
      setSession(res.data)
      setCurrentIndex(0)
      setAnswer('')
      setTimer(600)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function submit() {
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
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

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
