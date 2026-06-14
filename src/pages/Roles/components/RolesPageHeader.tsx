interface RolesPageHeaderProps {
  userCount: number;
}

export default function RolesPageHeader({ userCount }: RolesPageHeaderProps) {
  return (
    <div className="page-header">
      <div className="page-header-left">
        <h1>Roles</h1>
        <p>{userCount} user{userCount !== 1 ? 's' : ''} with assigned roles</p>
      </div>
    </div>
  );
}