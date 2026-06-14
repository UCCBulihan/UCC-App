import { fmt } from '../reportHelpers/reportHelpers';

// ─── Props ────────────────────────────────────────────────────────────────────

interface KpiStripProps {
  grandTotal: number;
  totalExpenses: number;
  memberCount: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function KpiStrip({ grandTotal, totalExpenses, memberCount }: KpiStripProps) {
  const netBalance = grandTotal - totalExpenses;

  return (
    <div className="rpt-kpi-strip rpt-kpi-strip--5">
      <div className="rpt-kpi">
        <span className="rpt-kpi-label">Total Collected</span>
        <span className="rpt-kpi-value">{fmt(grandTotal)}</span>
      </div>

      <div className="rpt-kpi rpt-kpi--red">
        <span className="rpt-kpi-label">Total Expenses</span>
        <span className="rpt-kpi-value rpt-kpi-value--red">{fmt(totalExpenses)}</span>
      </div>

      <div className={`rpt-kpi rpt-kpi--net ${netBalance >= 0 ? 'rpt-kpi--pos' : 'rpt-kpi--neg'}`}>
        <span className="rpt-kpi-label">Net Balance</span>
        <span className={`rpt-kpi-value ${netBalance >= 0 ? 'rpt-kpi-value--green' : 'rpt-kpi-value--red'}`}>
          {fmt(netBalance)}
        </span>
      </div>

      <div className="rpt-kpi">
        <span className="rpt-kpi-label">Active Pledgers</span>
        <span className="rpt-kpi-value">{memberCount}</span>
      </div>

      <div className="rpt-kpi">
        <span className="rpt-kpi-label">Avg per Pledger</span>
        <span className="rpt-kpi-value">
          {fmt(memberCount ? grandTotal / memberCount : 0)}
        </span>
      </div>
    </div>
  );
}