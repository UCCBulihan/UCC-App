interface RolesPageHeaderProps {
  userCount: number;        
  assignedCount: number;    
}

export default function RolesPageHeader({ assignedCount }: RolesPageHeaderProps) {
  return (
    <div className="page-header">
      <div className="page-header-left">
        <h1>Roles</h1>
        <p>{assignedCount} user{assignedCount !== 1 ? 's' : ''} with assigned roles</p>
      </div>
    </div>
  );
}