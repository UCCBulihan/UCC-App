interface RolesToolbarProps {
  search: string;
  filter: string;
  onSearchChange: (val: string) => void;
  onFilterChange: (val: string) => void;
}

export default function RolesToolbar({
  search, filter, onSearchChange, onFilterChange,
}: RolesToolbarProps) {
  return (
    <div className="toolbar">
      <div className="search-wrap">
        <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
        />
      </div>
      <div className="filter-select-wrap">
        <i className="fa-solid fa-filter" aria-hidden="true" />
        <select value={filter} onChange={e => onFilterChange(e.target.value)}>
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="moderator">Moderator</option>
          <option value="member">Member</option>
          <option value="viewer">Viewer</option>
        </select>
      </div>
    </div>
  );
}