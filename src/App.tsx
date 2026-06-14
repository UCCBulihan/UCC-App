
import { Routes, Route } from 'react-router-dom'
import Login from './pages/Auth/Login/Login'
import Home from './pages/Home/Home/Home'
import Pledges from './pages/Pledges/Pledges'
import PledgesReport from './pages/Pledges/PledgesReport'
import Ledger from './pages/Ledger/Ledger'
import Signup from './pages/Auth/SignUp/Signup'
import PledgesMembers from './pages/Members/Pledgers/Members';

function App() {

  return (
   <>
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/home" element={<Home />} />
      <Route path="/members" element={<PledgesMembers />} />
      <Route path="/pledges" element={<Pledges />} />
      <Route path="/pledges/report" element={<PledgesReport />} />
      <Route path="/ledger" element={<Ledger />} />
      <Route path="/signup" element={<Signup />} />
    </Routes>
   </>
  )
}

export default App
