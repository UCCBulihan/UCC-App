import type { IMenuService, MenuItem } from './interface/IMenuService';

export class MenuService implements IMenuService {
    private menuItems: MenuItem[] = [
        { sortOrder: 1, name: 'Home', iconClass: 'fa-solid fa-house', path: '/home' },

        { sortOrder: 2, name: 'Calendar', iconClass: 'fa-solid fa-calendar', path: '/calendar' },

        {
            sortOrder: 10, name: 'Members', iconClass: 'fa-solid fa-users', path: '',
            subMenuItems: [
                { sortOrder: 11, name: 'All Members', iconClass: 'fa-solid fa-list', path: '/AllMembers' },
                { sortOrder: 12, name: 'Pledgers', iconClass: 'fa-solid fa-hand-holding-heart', path: '/PledgesMembers' }
            ]
        },

        { sortOrder: 20, name: 'Roles', iconClass: 'fa-solid fa-user-shield', path: '/Roles' },

        {
            sortOrder: 30, name: 'Pledges', iconClass: 'fa-solid fa-hand-holding-heart', path: '/pledges',
            subMenuItems: [
                { sortOrder: 31, name: 'All Pledges', iconClass: 'fa-solid fa-list', path: '/pledges' },
                { sortOrder: 32, name: 'Report', iconClass: 'fa-solid fa-chart-bar', path: '/pledges/report' },
                { sortOrder: 33, name: 'Ledger', iconClass: 'fa-solid fa-book', path: '/ledger' }
            ]
        },

        {
            sortOrder: 40, name: 'Visitation', iconClass: 'fa-solid fa-house', path: '',
            subMenuItems: [
                { sortOrder: 41, name: 'All Visitations', iconClass: 'fa-solid fa-list', path: '/Visitation/Visitation' },
                { sortOrder: 42, name: 'Visitation Report', iconClass: 'fa-solid fa-chart-bar', path: '/Visitation/VisitationReport' }
            ]
        },

       {
            sortOrder: 50, name: 'Sunday School', iconClass: 'fa-solid fa-chalkboard-user', path: '',
            subMenuItems: [
                { sortOrder: 51, name: 'Line Up', iconClass: 'fa-solid fa-users-line', path: '/lineup' },
                { sortOrder: 52, name: 'Savings', iconClass: 'fa-solid fa-piggy-bank', path: '/SundaySchool/SundaySchool' },
                { sortOrder: 53, name: 'Ledger', iconClass: 'fa-solid fa-book', path: '/SundaySchoolLedger' },
                { sortOrder: 54, name: 'Report', iconClass: 'fa-solid fa-chart-bar', path: '/SundaySchool/report' },
            ]
        },

        { sortOrder: 60, name: 'Profile', iconClass: 'fa-solid fa-user', path: '/profile' },
        { sortOrder: 70, name: 'Settings', iconClass: 'fa-solid fa-gear', path: '/settings' }
    ];

    getMenuItems(): MenuItem[] {
        return this.menuItems;
    }

    private findMenuItem(sortOrder: number, items: MenuItem[] = this.menuItems): MenuItem | undefined {
        for (const item of items) {
            if (item.sortOrder === sortOrder) {
                return item;
            }
            if (item.subMenuItems) {
                const found = this.findMenuItem(sortOrder, item.subMenuItems);
                if (found) {
                    return found;
                }
            }
        }
        return undefined;
    }

    home(sortOrder: number): MenuItem {
        return this.findMenuItem(sortOrder) ?? this.menuItems[0];
    }

    members(sortOrder: number): MenuItem {
        return this.findMenuItem(sortOrder) ?? this.menuItems[0];
    }

    pledges(sortOrder: number): MenuItem {
        return this.findMenuItem(sortOrder) ?? this.menuItems[0];
    }

    profile(sortOrder: number): MenuItem {
        return this.findMenuItem(sortOrder) ?? this.menuItems[0];
    }

    settings(sortOrder: number): MenuItem {
        return this.findMenuItem(sortOrder) ?? this.menuItems[0];
    }

    sundaySchool(sortOrder: number): MenuItem {
        return this.findMenuItem(sortOrder) ?? this.menuItems[0];
    }

    visitation(sortOrder: number): MenuItem {
        return this.findMenuItem(sortOrder) ?? this.menuItems[0];
    }
}