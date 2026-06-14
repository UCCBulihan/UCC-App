interface RolesPageHeaderProps {
  userCount: number;
  onAssignRole: () => void;
}

export default function RolesPageHeader({ userCount, onAssignRole }: RolesPageHeaderProps) {
  return (
    <div className="page-header">
      <div className="page-header-left">
        <h1>Roles</h1>
        <p>{userCount} user{userCount !== 1 ? 's' : ''} with assigned roles</p>
      </div>
      <button className="btn-add" onClick={onAssignRole}>
        <i className="fa-solid fa-user-shield" aria-hidden="true" />
        Assign Role
      </button>
    </div>
  );
}