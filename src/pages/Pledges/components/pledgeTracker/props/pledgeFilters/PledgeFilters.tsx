import { MONTHS } from '../pledgesTable/PledgesUtils';

const USERS = [
  { id: 1, name: 'Juan Dela Cruz' },
  { id: 2, name: 'Maria Santos' },
  { id: 3, name: 'Pedro Reyes' }
];

interface PledgeFiltersProps {
  selectedUser: number;
  setSelectedUser: (id: number) => void;
  curMonth: number;
  setCurMonth: (month: number) => void;
  curYear: number;
  setCurYear: (year: number) => void;
  years: number[];
  exportCSV: () => void;
}

export default function PledgeFilters({
  selectedUser,
  setSelectedUser,
  curMonth,
  setCurMonth,
  curYear,
  setCurYear,
  years,
  exportCSV
}: PledgeFiltersProps) {
  return (
    <div className="filters">
      <select
        value={selectedUser}
        onChange={e => setSelectedUser(Number(e.target.value))}
      >
        {USERS.map(u => (
          <option key={u.id} value={u.id}>{u.name}</option>
        ))}
      </select>

      <select
        value={curMonth}
        onChange={e => setCurMonth(Number(e.target.value))}
      >
        {MONTHS.map((m, i) => (
          <option key={i} value={i}>{m}</option>
        ))}
      </select>

      <select
        value={curYear}
        onChange={e => setCurYear(Number(e.target.value))}
      >
        {years.map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>

      <button className="export-btn" onClick={exportCSV}>
        Export CSV
      </button>
    </div>
  );
}
