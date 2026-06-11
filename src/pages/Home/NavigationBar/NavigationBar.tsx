import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { MenuService } from '../../../../services/MenuService';
import './navigation-bar.css'

const menuService = new MenuService();

function NavigationBar() {
  const menuItems = menuService.getMenuItems();
  const [isOpen, setIsOpen] = useState(false);

  // Close sidebar when route changes (on mobile)
  const handleNavClick = () => {
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  };

  // Close sidebar when clicking overlay
  const handleOverlayClick = () => setIsOpen(false);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <>
      {/* Hamburger button — fixed, only visible on mobile when sidebar is CLOSED */}
      {!isOpen && (
        <button
          className="hamburger"
          onClick={() => setIsOpen(true)}
          aria-label="Open navigation"
        >
          <span />
          <span />
          <span />
        </button>
      )}

      {/* Overlay — only shown on mobile when sidebar is open */}
      {isOpen && (
        <div className="sidebar-overlay" onClick={handleOverlayClick} />
      )}

      <nav className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
        {/* Sidebar header: logo + close button side by side on mobile */}
        <div className="sidebar-header">
          <a href="#" className="logo">UCC<span>App</span></a>
          <button
            className="sidebar-close"
            onClick={() => setIsOpen(false)}
            aria-label="Close navigation"
          >
            <span />
            <span />
          </button>
        </div>

        <div className="sidebar-links">
          {menuItems.map(item => (
            <NavLink
              key={item.sortOrder}
              to={item.path}
              className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}
              onClick={handleNavClick}
            >
              <i className={`${item.iconClass} icon`}></i>
              <span>{item.name}</span>
            </NavLink>
          ))}
        </div>

        <div className="sidebar-bottom">
          <button className="btn-ghost">Log Out</button>
        </div>
      </nav>
    </>
  );
}

export default NavigationBar;