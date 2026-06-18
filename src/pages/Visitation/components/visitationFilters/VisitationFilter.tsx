import type { VisitationFilters } from '../visitationTypes/visitationTypes';

interface VisitationFilterProps {
  filters: VisitationFilters;
  onFilterChange: (key: keyof VisitationFilters, value: string) => void;
  members: string[];
  visitTypes: string[];
  months: string[];
  years: string[];
}

export default function VisitationFilter({
  filters,
  onFilterChange,
  members,
  visitTypes,
  months,
  years,
}: VisitationFilterProps) {
  return (
    <div className="filters-row">
      <select
        value={filters.member}
        onChange={(e) => onFilterChange('member', e.target.value)}
      >
        <option value="">-- Select Member --</option>
        {members.map((member) => (
          <option key={member} value={member}>
            {member}
          </option>
        ))}
      </select>

      <select
        value={filters.visitType}
        onChange={(e) => onFilterChange('visitType', e.target.value)}
      >
        <option value="">-- Visit Type --</option>
        {visitTypes.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>

      <select
        value={filters.month}
        onChange={(e) => onFilterChange('month', e.target.value)}
      >
        <option value="">-- Month --</option>
        {months.map((month) => (
          <option key={month} value={month}>
            {month}
          </option>
        ))}
      </select>

      <select
        value={filters.year}
        onChange={(e) => onFilterChange('year', e.target.value)}
      >
        <option value="">-- Year --</option>
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </div>
  );
}