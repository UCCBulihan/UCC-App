import Cards from '../cards/Cards.tsx'
import NavigationBar from '../NavigationBar/NavigationBar.tsx'
import './home.css'

function Home() {
  return (
    <div className="app-layout">
      <NavigationBar />
      <main className="main-content">
        <Cards />
      </main>
    </div>
  )
}

export default Home