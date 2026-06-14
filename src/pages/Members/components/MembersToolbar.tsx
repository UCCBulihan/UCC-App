interface MembersToolbarProps {
  search: string;
  filter: string;
  onSearchChange: (val: string) => void;
  onFilterChange: (val: string) => void;
}

export default function MembersToolbar({ search, filter, onSearchChange, onFilterChange }: MembersToolbarProps) {
  return (
    <div className="toolbar">
      <div className="search-wrap">
        <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
        <input
          type="text"
          placeholder="Search by name…"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
        />
      </div>
      <div className="filter-select-wrap">
        <i className="fa-solid fa-filter" aria-hidden="true" />
        <select value={filter} onChange={e => onFilterChange(e.target.value)}>
          <option value="all">All Members</option>
          <option value="yes">Pledgers Only</option>
          <option value="no">Non-Pledgers</option>
        </select>
      </div>
    </div>
  );
}