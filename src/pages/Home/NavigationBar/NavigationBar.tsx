import './navigation-bar.css';

function NavigationBar() {
  return (
    <>
      <nav>
        <a href="#" className="logo">UCC<span>App</span></a>

        <div className="nav-links">
          <a href="#" className="active">Home</a>
          <a href="#">Features</a>
          <a href="#">Pricing</a>
          <a href="#">About</a>
        </div>
{/* 
        <div className="nav-right">
          <button className="btn-ghost">Log in</button>
          <button className="btn-primary">Sign up</button>
        </div> */}

        <button className="hamburger" id="hamburger">☰</button>
      </nav>

      <div className="mobile-menu" id="mobile-menu">
        <a href="#">Home</a>
        <a href="#">Features</a>
        <a href="#">Pricing</a>
        <a href="#">About</a>
        <div className="divider"></div>
        <div className="mobile-btns">
          <button className="btn-ghost">Log in</button>
          <button className="btn-primary">Sign up</button>
        </div>
      </div>
    </>
  );
}

export default NavigationBar;