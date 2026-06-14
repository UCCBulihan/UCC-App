
interface PageHeaderProps {
  memberCount: number;
  onAddMember: () => void;
}

export default function PageHeader({ memberCount, onAddMember }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div className="page-header-left">
        <h1>Members</h1>
        <p>{memberCount} member{memberCount !== 1 ? 's' : ''} total</p>
      </div>
      <button className="btn-add" onClick={onAddMember}>
        <i className="fa-solid fa-user-plus" aria-hidden="true" />
        Add Member
      </button>
    </div>
  );
}