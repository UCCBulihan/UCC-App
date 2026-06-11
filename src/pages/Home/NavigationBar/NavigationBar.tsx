
import {NavLink} from 'react-router-dom'
import { MenuService } from '../../../../services/MenuService';
import './navigation-bar.css'


const menuService = new MenuService();


function NavigationBar() {

  const menuItems = menuService.getMenuItems();

  return (
    <nav className="sidebar">
      <a href="#" className="logo">UCC<span>App</span></a>

      <div className="sidebar-links">
       {menuItems.map(item => (
        <NavLink
          key={item.sortOrder}
          to={item.path}
          className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}
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
  )
}

export default NavigationBar