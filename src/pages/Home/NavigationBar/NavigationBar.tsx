import { useState, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth';
import { MenuService } from '../../../../services/MenuService';
import type { MenuItem } from '../../../../services/interface/IMenuService';
// ⚠️ Adjust these paths to wherever useUserAccess.ts / firebase.ts actually
// live in your project (they should sit next to each other).
import { useUserAccess } from '../../../firebase/useUserAccess';
import { auth } from '../../../firebase/firebase';
import LogoutModal from './LogoutModal';
import './navigation-bar.css'

const menuService = new MenuService();

export default function NavigationBar() {
  const { userAccess, loading } = useUserAccess();
  const menuItems = menuService.getMenuItems(userAccess ?? undefined);
  const [isOpen, setIsOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<number[]>([]);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogoutClick = () => setShowLogoutModal(true);

  const handleLogoutCancel = () => {
    if (loggingOut) return; // don't allow closing mid-request
    setShowLogoutModal(false);
  };

  const handleLogoutConfirm = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await signOut(auth);
      // Matches the "/" route in App.tsx (Login page)
      navigate('/', { replace: true });
    } catch (error) {
      console.error('[NavigationBar] signOut error:', error);
      setLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  // Auto-expand parent if current route matches a sub-menu item
  useEffect(() => {
    menuItems.forEach(item => {
      if (item.subMenuItems?.some(sub => location.pathname.startsWith(sub.path))) {
        setExpandedItems(prev => prev.includes(item.sortOrder) ? prev : [...prev, item.sortOrder]);
      }
    });
  }, [location.pathname, menuItems]);

  const toggleExpand = (sortOrder: number) => {
    setExpandedItems(prev =>
      prev.includes(sortOrder)
        ? prev.filter(id => id !== sortOrder)
        : [...prev, sortOrder]
    );
  };

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

  const renderMenuItem = (item: MenuItem) => {
    const hasSubMenu = item.subMenuItems && item.subMenuItems.length > 0;
    const isExpanded = expandedItems.includes(item.sortOrder);

    if (hasSubMenu) {
      return (
        <div key={item.sortOrder} className="sidebar-group">
          <button
            className={`sidebar-link sidebar-group-toggle ${isExpanded ? 'expanded' : ''}`}
            onClick={() => toggleExpand(item.sortOrder)}
            aria-expanded={isExpanded}
          >
            <i className={`${item.iconClass} icon`}></i>
            <span>{item.name}</span>
            <i className={`fa-solid fa-chevron-down submenu-chevron ${isExpanded ? 'rotated' : ''}`}></i>
          </button>

          {isExpanded && (
            <div className="submenu">
              {item.subMenuItems!.map(sub => (
                <NavLink
                  key={sub.sortOrder}
                  to={sub.path}
                  className={({ isActive }) => isActive ? 'sidebar-link submenu-link active' : 'sidebar-link submenu-link'}
                  onClick={handleNavClick}
                  end
                >
                  <i className={`${sub.iconClass} icon`}></i>
                  <span>{sub.name}</span>
                </NavLink>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <NavLink
        key={item.sortOrder}
        to={item.path}
        className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}
        onClick={handleNavClick}
      >
        <i className={`${item.iconClass} icon`}></i>
        <span>{item.name}</span>
      </NavLink>
    );
  };

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

      {isOpen && (
        <div className="sidebar-overlay" onClick={handleOverlayClick} />
      )}

      <nav className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar-header">
          <a href="#" className="logo">UCC <span>App</span></a>
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
          {loading ? null : menuItems.map(renderMenuItem)}
        </div>

        <div className="sidebar-bottom">
          <button
            className="btn-ghost"
            onClick={handleLogoutClick}
          >
            Log Out
          </button>
        </div>
      </nav>

      <LogoutModal
        isOpen={showLogoutModal}
        loading={loggingOut}
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
      />
    </>
  );
}