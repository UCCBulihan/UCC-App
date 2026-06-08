
import { Routes, Route } from 'react-router-dom'
import Login from './pages/Auth/Login/Login'
import Home from './pages/Home/Home/Home'
import Pledges from './pages/Pledges/Pledges'


function App() {

  return (
   <>
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/home" element={<Home />} />
      <Route path="/pledges" element={<Pledges />} />
    </Routes>
   </>
  )
}

export default App
