import type { IMenuService, MenuItem } from './interface/IMenuService';

export class MenuService implements IMenuService {
    private menuItems: MenuItem[] = [
        {sortOrder: 1, name: 'Home', iconClass: 'home-icon', path: '/home'},
        {sortOrder: 2, name: 'Profile', iconClass: 'profile-icon', path: '/profile'},
        {sortOrder: 3, name: 'Settings', iconClass: 'settings-icon', path: '/settings'},
        {sortOrder: 4, name: 'Pledges', iconClass: 'pledges-icon', path: '/pledges'}
    ];

    getMenuItems(): MenuItem[] {
        return this.menuItems;
    }

    pledges(sortOrder: number): MenuItem {
        return this.menuItems.find(item => item.sortOrder === sortOrder) || this.menuItems[0];
    }

    home(sortOrder: number): MenuItem {
        return this.menuItems.find(item => item.sortOrder === sortOrder) || this.menuItems[0];
    }

    profile(sortOrder: number): MenuItem {
        return this.menuItems.find(item => item.sortOrder === sortOrder) || this.menuItems[0];
    }

    settings(sortOrder: number): MenuItem {
        return this.menuItems.find(item => item.sortOrder === sortOrder) || this.menuItems[0];
    }
}