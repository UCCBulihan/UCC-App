import { MONTHS, MONTHS_FULL, fmt, getBarHeight } from '../reportHelpers/reportHelpers';

// ─── Props ────────────────────────────────────────────────────────────────────

interface MonthlyBarChartProps {
  monthlyGrandTotals: Record<number, number>;
  selectedMonth: number | null;
  onSelectMonth: (month: number | null) => void;
  curYear: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MonthlyBarChart({
  monthlyGrandTotals,
  selectedMonth,
  onSelectMonth,
  curYear,
}: MonthlyBarChartProps) {
  const maxMo = Math.max(...Object.values(monthlyGrandTotals), 1);

  return (
    <div className="rpt-card">
      <div className="rpt-card-header">
        <span className="rpt-card-title">Monthly Collection</span>
        <span className="rpt-card-sub">All members combined · {curYear}</span>
      </div>
      <div className="rpt-chart-wrap rpt-chart-wrap--monthly">
        {MONTHS.map((mo, i) => {
          const val = monthlyGrandTotals[i] ?? 0;
          const h = getBarHeight(val, maxMo);
          const isSelected = selectedMonth === i;
          return (
            <div
              key={i}
              className={`rpt-bar-col rpt-bar-col--mo ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectMonth(selectedMonth === i ? null : i)}
              title={`${MONTHS_FULL[i]}: ${fmt(val)}`}
            >
              <span className="rpt-bar-amount rpt-bar-amount--sm">
                {val > 0 ? fmt(val) : ''}
              </span>
              <div className="rpt-bar-track">
                <div
                  className={`rpt-bar-fill ${isSelected ? 'rpt-bar-fill--selected' : ''}`}
                  style={{ height: h }}
                />
              </div>
              <span className="rpt-bar-name">{mo}</span>
            </div>
          );
        })}
      </div>
      <p className="rpt-chart-hint">Click a bar to filter the table above by month</p>
    </div>
  );
}