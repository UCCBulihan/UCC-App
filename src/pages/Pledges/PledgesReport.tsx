import NavigationBar from '../Home/NavigationBar/NavigationBar';
import './PledgesReport.css';

import { usePledgeReport } from './hooks/usePledgeReport';
import PledgesDashboard from './components/pledgesReport/pledgeReportDashboard/pledgeReportDashboard';

// ─── Component ───────────────────────────────────────────────────────────────

export default function PledgesReport() {
  const {
    curYear,
    setCurYear,
    years,
    members,
    matrix,
    loading,
    selectedMonth,
    setSelectedMonth,
    totalExpenses,
    yearlyTotals,
    monthlyGrandTotals,
    grandTotal,
    visibleMonths,
    exportCSV,
  } = usePledgeReport();

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="app-layout">
      <NavigationBar />
      <main className="main-content report-root">

        {loading ? (
          <div className="rpt-loading">
            <div className="rpt-spinner" />
            <span>Loading {curYear} data…</span>
          </div>
        ) : (
          <PledgesDashboard
            curYear={curYear}
            years={years}
            members={members}
            matrix={matrix}
            yearlyTotals={yearlyTotals}
            monthlyGrandTotals={monthlyGrandTotals}
            grandTotal={grandTotal}
            totalExpenses={totalExpenses}
            selectedMonth={selectedMonth}
            visibleMonths={visibleMonths}
            onYearChange={setCurYear}
            onMonthSelect={setSelectedMonth}
            onExportCSV={exportCSV}
          />
        )}

      </main>
    </div>
  );
}
