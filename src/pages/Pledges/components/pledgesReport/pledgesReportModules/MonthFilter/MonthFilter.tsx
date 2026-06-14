import { MONTHS } from '../reportHelpers/reportHelpers';

// ─── Props ────────────────────────────────────────────────────────────────────

interface MonthFilterProps {
  selectedMonth: number | null;
  onSelect: (month: number | null) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MonthFilter({ selectedMonth, onSelect }: MonthFilterProps) {
  return (
    <div className="rpt-month-filter">
      <button
        className={`rpt-chip ${selectedMonth === null ? 'active' : ''}`}
        onClick={() => onSelect(null)}
      >
        All Months
      </button>
      {MONTHS.map((mo, i) => (
        <button
          key={i}
          className={`rpt-chip ${selectedMonth === i ? 'active' : ''}`}
          onClick={() => onSelect(selectedMonth === i ? null : i)}
        >
          {mo}
        </button>
      ))}
    </div>
  );
}