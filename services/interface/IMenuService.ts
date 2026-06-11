export interface MenuItem {
    sortOrder: number;
    name: string;
    iconClass: string;
    subMenuItems?: MenuItem[];
    path: string;
}

export interface IMenuService {
    getMenuItems(): MenuItem[];
    home(sortOrder: number): MenuItem;
    profile(sortOrder: number): MenuItem;
    settings(sortOrder: number): MenuItem;
    pledges(sortOrder: number): MenuItem;
}