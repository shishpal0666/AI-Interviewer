import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Upload from './pages/Upload'
import Interview from './pages/Interview'
import Dashboard from './pages/Dashboard'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <div className="app-nav">
        <Link to="/upload">Upload</Link>
        <Link to="/interview">Interview</Link>
        <Link to="/dashboard">Dashboard</Link>
      </div>
      <main>
        <Routes>
          <Route path="/upload" element={<Upload />} />
          <Route path="/interview" element={<Interview />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/" element={<Upload />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}

export default App
