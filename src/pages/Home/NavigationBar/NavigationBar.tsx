import './navigation-bar.css'

function NavigationBar() {
  return (
    <nav className="sidebar">
      <a href="#" className="logo">UCC<span>App</span></a>

      <div className="sidebar-links">
        <a href="#" className="active">Home</a>
        <a href="#">Features</a>
        <a href="#">Pricing</a>
        <a href="#">About</a>
      </div>

      <div className="sidebar-bottom">
        <button className="btn-ghost">Log Out</button>
      </div>
    </nav>
  )
}

export default NavigationBar