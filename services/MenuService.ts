import type { IMenuService, MenuItem } from './interface/IMenuService';

export class MenuService implements IMenuService {
    private menuItems: MenuItem[] = [
        { sortOrder: 1, name: 'Home',     iconClass: 'fa-solid fa-house',               path: '/home' },
        { sortOrder: 2, name: 'Calendar', iconClass: 'fa-solid fa-calendar',               path: '/calendar' },
        { sortOrder: 10, name: 'Members', iconClass: 'fa-solid fa-users', path: '',
            subMenuItems: [
                { sortOrder: 11, name: 'All Members', iconClass: 'fa-solid fa-list',               path: '/AllMembers' },
                { sortOrder: 12, name: 'Pledgers',    iconClass: 'fa-solid fa-hand-holding-heart', path: '/PledgesMembers' }
            ]
        },

        {sortOrder: 20, name: 'Roles', iconClass:'fa-solid fa-user-shield', path:'/Roles' },

        { sortOrder: 30, name: 'Pledges',  iconClass: 'fa-solid fa-hand-holding-heart', path: '/pledges', subMenuItems: [
            { sortOrder: 31, name: 'All Pledges', iconClass: 'fa-solid fa-list',            path: '/pledges' },
            { sortOrder: 32, name: 'Report',      iconClass: 'fa-solid fa-chart-bar',       path: '/pledges/report' },
            { sortOrder: 33, name: 'Ledger',      iconClass: 'fa-solid fa-book',            path: '/ledger' }
        ]},

        
        { sortOrder: 40, name: 'Visitation', iconClass: 'fa-solid fa-house', path: '',
            subMenuItems: [
                { sortOrder: 41, name: 'All Visitations', iconClass: 'fa-solid fa-list', path: '/Visitation/Visitation' },
                { sortOrder: 42, name: 'Visitation Report', iconClass: 'fa-solid fa-chart-bar', path: '/Visitation/VisitationReport' }
            ]
         },
        { sortOrder: 41, name: 'Sunday School', iconClass: 'fa-solid fa-chalkboard-user', path: '/sunday-school' },
        { sortOrder: 42, name: 'Profile',  iconClass: 'fa-solid fa-user',               path: '/profile' },
        { sortOrder: 43, name: 'Settings', iconClass: 'fa-solid fa-gear',               path: '/settings' },
        
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

    sundaySchool(sortOrder: number): MenuItem {
        return this.menuItems.find(item => item.sortOrder === sortOrder) || this.menuItems[0];
    }

    visitation(sortOrder: number): MenuItem {
        return this.menuItems.find(item => item.sortOrder === sortOrder) || this.menuItems[0];
    }
}