import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Home } from './pages/Home'
import { Board } from './pages/Board'
import './index.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/board/:boardId" element={<Board />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
