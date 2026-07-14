import { Routes, Route } from 'react-router-dom'
import Login from './pages/Auth/Login/Login'
import Home from './pages/Home/Home/Home'
import Pledges from './pages/Pledges/Pledges'
import PledgesReport from './pages/Pledges/PledgesReport'
import Calendar from './pages/Calendar/Calendar';
import Ledger from './pages/Ledger/Ledger'
import Signup from './pages/Auth/SignUp/Signup'
import PledgesMembers from './pages/Members/Pledgers/PledgesMembers'
import AllMembers from './pages/Members/AllMembers/AllMembers'
import ArchivesMembers from './pages/Members/ArchivesMembers/ArchivesMembers'
import Visitation from './pages/Visitation/Visitation'
import Roles from './pages/Roles/Roles'
import { useAuthSync } from './firebase/useAuthSync';
import SundaySchool from './pages/SundaySchool/SundaySchool'
import Profile from './pages/Profile/Profile'
import SundaySchoolReport from './pages/SundaySchool/SundaySchoolReport'
import SundaySchoolLedger from './pages/SundaySchool/SundaySchoolLedger'
import SundaySchoolLineUp from './pages/SundaySchool/SundaySchoolLineUp'
import SundaySchoolAttendance from './pages/SundaySchool/SundaySchoolAttendance'
import Ongoing from './pages/Defaults/Ongoing'

function App() {
useAuthSync();
  return (
   <>
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/home" element={<Home />} />
      <Route path='/Calendar' element={<Calendar/>} />
      <Route path="/PledgesMembers" element={<PledgesMembers />} />
      <Route path="/AllMembers" element={<AllMembers />} />
      <Route path="/ArchivesMembers" element={<ArchivesMembers />} />
      <Route path="/pledges" element={<Pledges />} />
      <Route path="/pledges/report" element={<PledgesReport />} />
      <Route path="visitation/visitation" element={<Visitation/>} />
      <Route path='SundaySchool/SundaySchoolLedger' element ={<SundaySchoolLedger/>} />
      <Route path='SundaySchool/SundaySchoolAttendance' element ={<SundaySchoolAttendance/>} />
      <Route path='SundaySchool/SundaySchool' element ={<SundaySchool/>} />
      <Route path='SundaySchool/report' element ={<SundaySchoolReport/>} />
      <Route path='SundaySchool/SundaySchoolLineUp' element ={<SundaySchoolLineUp/>} />
      <Route path='/Profile' element={<Profile/>} />
      <Route path="/ledger" element={<Ledger />} />
      <Route path="/roles" element={<Roles />}/>
      <Route path="/signup" element={<Signup />} />

      <Route path="/Defaults/Ongoing" element={<Ongoing />} />

    </Routes>
   </>
  )
}

export default App
