import Cards from '../cards/Cards.tsx'
import NavigationBar from '../NavigationBar/NavigationBar.tsx'
import './home.css';

function Home() {

  return (
    <>
    <NavigationBar />
      <section>
        <Cards />
      </section>
    </>
  )
}

export default Home
