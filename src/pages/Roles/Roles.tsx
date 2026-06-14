import NavigationBar from '../Home/NavigationBar/NavigationBar'
import type { auth } from '../../firebase/firebase'

export default function Roles(){
    return(
        <div className="app-layout">
              <NavigationBar />
              <main className="main-content">
              </main>
        </div>
    )
}