interface RolesPageHeaderProps {
  userCount: number;
  assignedCount: number;
  departmentCount: number;
  onManageDepartments: () => void;
}

export default function RolesPageHeader({
  assignedCount, departmentCount, onManageDepartments,
}: RolesPageHeaderProps) {
  return (
    <div className="page-header">
      <div className="page-header-left">
        <h1>Roles</h1>
        <p>{assignedCount} user{assignedCount !== 1 ? 's' : ''} with assigned roles</p>
      </div>
      <div className="page-header-right">
        <button type="button" className="btn-add" onClick={onManageDepartments}>
          <i className="fa-solid fa-sitemap" aria-hidden="true" />
          Manage Departments
          {departmentCount > 0 && <span className="header-btn-count">{departmentCount}</span>}
        </button>
      </div>
    </div>
  );
}