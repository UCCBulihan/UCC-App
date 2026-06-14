
import { Routes, Route } from 'react-router-dom'
import Login from './pages/Auth/Login/Login'
import Home from './pages/Home/Home/Home'
import Pledges from './pages/Pledges/Pledges'
import PledgesReport from './pages/Pledges/PledgesReport'
import Ledger from './pages/Ledger/Ledger'
import Signup from './pages/Auth/SignUp/Signup'
import PledgesMembers from './pages/Members/Pledgers/PledgesMembers'
import AllMembers from './pages/Members/AllMembers/AllMembers'
import Roles from './pages/Roles/Roles'

function App() {

  return (
   <>
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/home" element={<Home />} />
      <Route path="/PledgesMembers" element={<PledgesMembers />} />
      <Route path="/AllMembers" element={<AllMembers />} />
      <Route path="/pledges" element={<Pledges />} />
      <Route path="/pledges/report" element={<PledgesReport />} />
      <Route path="/ledger" element={<Ledger />} />
      <Route path="/roles" element={<Roles />}/>
      <Route path="/signup" element={<Signup />} />
    </Routes>
   </>
  )
}

export default App
