import { useEffect, useState } from 'react'
import api from '../api'

export default function Dashboard() {
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchList() }, [])

  async function fetchList() {
    setLoading(true)
    try {
  const res = await api.get('/api/interviews/candidates')
      setCandidates(res.data.candidates || [])
    } catch (err) {
      console.error(err)
    } finally { setLoading(false) }
  }

  return (
    <div className="page dashboard-page">
      <h2>Dashboard - Completed Candidates</h2>
      {loading && <div>Loading...</div>}
      <ul>
        {candidates.map(c => (
          <li key={c.id}>
            <strong>{c.id}</strong> - {c.createdAt} - {c.numQuestions} Q - total: {c.totalScore} avg: {c.averageScore}
          </li>
        ))}
      </ul>
    </div>
  )
}
