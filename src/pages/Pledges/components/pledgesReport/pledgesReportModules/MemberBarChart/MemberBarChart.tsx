import type { Member } from '../reportTypes/reportTypes';
import { fmt, getBarHeight } from '../reportHelpers/reportHelpers';

// ─── Props ────────────────────────────────────────────────────────────────────

interface MemberBarChartProps {
  members: Member[];
  yearlyTotals: Record<number, number>;
  curYear: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MemberBarChart({ members, yearlyTotals, curYear }: MemberBarChartProps) {
  const maxYearly = Math.max(...Object.values(yearlyTotals), 1);

  return (
    <div className="rpt-card">
      <div className="rpt-card-header">
        <span className="rpt-card-title">Yearly Total per Member</span>
        <span className="rpt-card-sub">{curYear}</span>
      </div>
      <div className="rpt-chart-wrap">
        {members.map(m => {
          const val = yearlyTotals[m.userId] ?? 0;
          const h = getBarHeight(val, maxYearly);
          const pct = maxYearly > 0 ? Math.round((val / maxYearly) * 100) : 0;
          return (
            <div key={m.userId} className="rpt-bar-col">
              <span className="rpt-bar-amount">{fmt(val)}</span>
              <div className="rpt-bar-track">
                <div
                  className="rpt-bar-fill"
                  style={{ height: h, opacity: 0.6 + (pct / 100) * 0.4 }}
                  title={`${m.name}: ${fmt(val)}`}
                />
              </div>
              <span className="rpt-bar-name">{m.name.split(' ')[0]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}