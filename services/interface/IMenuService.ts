export interface MenuItem {
    sortOrder: number;
    name: string;
    iconClass: string;
    subMenuItems?: MenuItem[];
    path: string;

    // Optional access restrictions.
    // - Omit both = visible to everyone.
    // - allowedRoles: user.role must match one of these (case-insensitive).
    // - allowedDepartments: user must belong to a department whose `name`
    //   (from the DEPARTMENTS collection) matches one of these.
    // - If both are set, user must satisfy BOTH conditions.
    allowedRoles?: string[];
    allowedDepartments?: string[];
}

// Mirrors one entry of USERS/{uid}.departments in Firestore.
export interface DepartmentMembership {
    departmentId: string;
    position: string;
}

// Resolved access info for the currently logged-in user.
export interface UserAccess {
    role: string;                        // e.g. "Admin"
    departments: DepartmentMembership[];  // raw data from the user doc
    departmentNames: string[];            // departmentId's resolved to DEPARTMENTS.name, for menu matching
}

export interface IMenuService {
    getMenuItems(userAccess?: UserAccess): MenuItem[];
    home(sortOrder: number): MenuItem;
    profile(sortOrder: number): MenuItem;
    settings(sortOrder: number): MenuItem;
    pledges(sortOrder: number): MenuItem;
}