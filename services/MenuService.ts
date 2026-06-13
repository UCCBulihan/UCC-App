import type { IMenuService, MenuItem } from './interface/IMenuService';

export class MenuService implements IMenuService {
    private menuItems: MenuItem[] = [
        { sortOrder: 1, name: 'Home',     iconClass: 'fa-solid fa-house',               path: '/home' },
        { sortOrder: 6, name: 'Members',  iconClass: 'fa-solid fa-users',               path: '/members' },
        { sortOrder: 16, name: 'Pledges',  iconClass: 'fa-solid fa-hand-holding-heart', path: '/pledges', subMenuItems: [
            { sortOrder: 17, name: 'All Pledges', iconClass: 'fa-solid fa-list',            path: '/pledges' },
            { sortOrder: 18, name: 'Report',      iconClass: 'fa-solid fa-chart-bar',       path: '/pledges/report' },
        ]},
        { sortOrder: 11, name: 'Profile',  iconClass: 'fa-solid fa-user',               path: '/profile' },
        { sortOrder: 21, name: 'Settings', iconClass: 'fa-solid fa-gear',               path: '/settings' },
    ];

    getMenuItems(): MenuItem[] {
        return this.menuItems;
    }

    home(sortOrder: number): MenuItem {
        return this.menuItems.find(item => item.sortOrder === sortOrder) || this.menuItems[0];
    }

    members(sortOrder: number): MenuItem {
        return this.menuItems.find(item => item.sortOrder === sortOrder) || this.menuItems[0];
    }

    pledges(sortOrder: number): MenuItem {
        return this.menuItems.find(item => item.sortOrder === sortOrder) || this.menuItems[0];
    }

    profile(sortOrder: number): MenuItem {
        return this.menuItems.find(item => item.sortOrder === sortOrder) || this.menuItems[0];
    }

    settings(sortOrder: number): MenuItem {
        return this.menuItems.find(item => item.sortOrder === sortOrder) || this.menuItems[0];
    }
}