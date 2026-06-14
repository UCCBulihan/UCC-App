import type { Member, ReportMatrix } from '../pledgesReportModules/reportTypes/reportTypes';
import KpiStrip from '../pledgesReportModules/KpiStrip/KpiStrip';
import MemberBarChart from '../pledgesReportModules/MemberBarChart/MemberBarChart';
import MonthFilter from '../pledgesReportModules/MonthFilter/MonthFilter';
import MemberTable from '../pledgesReportModules/MemberTable/MemberTable';
import MonthlyBarChart from '../pledgesReportModules/MonthlyBarChart/MonthlyBarChart';

// ─── Props ────────────────────────────────────────────────────────────────────

interface PledgesDashboardProps {
  curYear: number;
  years: number[];
  members: Member[];
  matrix: ReportMatrix;
  yearlyTotals: Record<number, number>;
  monthlyGrandTotals: Record<number, number>;
  grandTotal: number;
  totalExpenses: number;
  selectedMonth: number | null;
  visibleMonths: number[];
  onYearChange: (year: number) => void;
  onMonthSelect: (month: number | null) => void;
  onExportCSV: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PledgesDashboard({
  curYear,
  years,
  members,
  matrix,
  yearlyTotals,
  monthlyGrandTotals,
  grandTotal,
  totalExpenses,
  selectedMonth,
  visibleMonths,
  onYearChange,
  onMonthSelect,
  onExportCSV,
}: PledgesDashboardProps) {
  return (
    <>
      {/* ── Header ── */}
      <div className="rpt-header">
        <div className="rpt-header-left">
          <span className="rpt-eyebrow">Pledge Records</span>
          <h1 className="rpt-title">Annual Report</h1>
        </div>
        <div className="rpt-header-right">
          <select
            className="rpt-select"
            value={curYear}
            onChange={e => onYearChange(Number(e.target.value))}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="rpt-export-btn" onClick={onExportCSV}>
            ↓ Export CSV
          </button>
        </div>
      </div>

      <KpiStrip
        grandTotal={grandTotal}
        totalExpenses={totalExpenses}
        memberCount={members.length}
      />

      <MemberBarChart
        members={members}
        yearlyTotals={yearlyTotals}
        curYear={curYear}
      />

      <MonthFilter
        selectedMonth={selectedMonth}
        onSelect={onMonthSelect}
      />

      <MemberTable
        members={members}
        matrix={matrix}
        yearlyTotals={yearlyTotals}
        monthlyGrandTotals={monthlyGrandTotals}
        grandTotal={grandTotal}
        visibleMonths={visibleMonths}
      />

      <MonthlyBarChart
        monthlyGrandTotals={monthlyGrandTotals}
        selectedMonth={selectedMonth}
        onSelectMonth={onMonthSelect}
        curYear={curYear}
      />
    </>
  );
}