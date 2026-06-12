
import { Routes, Route } from 'react-router-dom'
import Login from './pages/Auth/Login/Login'
import Home from './pages/Home/Home/Home'
import Pledges from './pages/Pledges/Pledges'
import Signup from './pages/Auth/SignUp/Signup'
import Members from './pages/Members/Members';

function App() {

  return (
   <>
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/home" element={<Home />} />
      <Route path="/members" element={<Members />} />
      <Route path="/pledges" element={<Pledges />} />
      <Route path="/signup" element={<Signup />} />
    </Routes>
   </>
  )
}

export default App
