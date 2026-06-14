import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocsFromServer, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { auth, db } from '../../firebase/firebase';
import NavigationBar from '../Home/NavigationBar/NavigationBar';
import './PledgesReport.css';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Member {
  userId: number;
  name: string;
}

interface PledgeRecord {
  userId: number;
  name: string;
  amount: number;
  dateAdded: Date;
}

interface MemberMonthData {
  total: number;
  paidSundays: number;
  totalSundays: number;
}

type ReportMatrix = Record<number, Record<number, MemberMonthData>>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTHS = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec'
];

const MONTHS_FULL = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

function getSundayCount(month: number, year: number): number {
  let count = 0;
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    if (d.getDay() === 0) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

function fmt(n: number) {
  return '₱' + n.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function getBarHeight(value: number, max: number): number {
  if (max === 0) return 0;
  return Math.max(4, (value / max) * 140);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PledgesReport() {
  const now = new Date();
  const [curYear, setCurYear] = useState(now.getFullYear());
  const [members, setMembers] = useState<Member[]>([]);
  const [matrix, setMatrix] = useState<ReportMatrix>({});
  const [loading, setLoading] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [totalExpenses, setTotalExpenses] = useState(0);

  const years = Array.from({ length: 7 }, (_, i) => now.getFullYear() - 3 + i);

  // Auth guard
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => setAuthed(!!user));
    return () => unsub();
  }, []);

  // Fetch members
  useEffect(() => {
    if (!authed) return;
    async function fetchMembers() {
      const snap = await getDocsFromServer(collection(db, 'MEMBERS'));
      const seen = new Set<number>();
      const list: Member[] = [];
      snap.forEach(doc => {
        const d = doc.data();
        if (d.isPledger && d.userId && !seen.has(d.userId) && !d.isArchived) {
          seen.add(d.userId);
          list.push({ userId: d.userId, name: `${d.firstName} ${d.lastName}` });
        }
      });
      list.sort((a, b) => a.name.localeCompare(b.name));
      setMembers(list);
    }
    fetchMembers();
  }, [authed]);

  // Fetch pledges for selected year
  useEffect(() => {
    if (!authed || members.length === 0) return;
    setLoading(true);

    async function fetchYear() {
      const start = new Date(curYear, 0, 1);
      const end = new Date(curYear, 11, 31, 23, 59, 59);

      const q = query(
        collection(db, 'PLEDGES'),
        where('dateAdded', '>=', Timestamp.fromDate(start)),
        where('dateAdded', '<=', Timestamp.fromDate(end))
      );

      const snap = await getDocs(q);
      const records: PledgeRecord[] = [];

      snap.forEach(doc => {
        const d = doc.data();
        records.push({
          userId: d.userId,
          name: d.name,
          amount: d.amount ?? 0,
          dateAdded: (d.dateAdded as Timestamp).toDate(),
        });
      });

      // Build matrix: userId → month → { total, paidSundays, totalSundays }
      const mat: ReportMatrix = {};

      members.forEach(m => {
        mat[m.userId] = {};
        for (let mo = 0; mo < 12; mo++) {
          mat[m.userId][mo] = {
            total: 0,
            paidSundays: 0,
            totalSundays: getSundayCount(mo, curYear),
          };
        }
      });

      records.forEach(r => {
        const mo = r.dateAdded.getMonth();
        if (mat[r.userId]?.[mo] !== undefined) {
          if (r.amount > 0) {
            mat[r.userId][mo].total += r.amount;
            mat[r.userId][mo].paidSundays += 1;
          }
        }
      });

      setMatrix(mat);
      setLoading(false);
    }

    fetchYear().catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [authed, members, curYear]);

  // Fetch expenses for selected year from LEDGER
  useEffect(() => {
    if (!authed) return;

    async function fetchExpenses() {
      const start = new Date(curYear, 0, 1);
      const end = new Date(curYear, 11, 31, 23, 59, 59);

      const q = query(
        collection(db, 'LEDGER'),
        where('dateAdded', '>=', Timestamp.fromDate(start)),
        where('dateAdded', '<=', Timestamp.fromDate(end)),
        orderBy('dateAdded', 'asc')
      );

      const snap = await getDocs(q);
      let total = 0;

      snap.forEach(d => {
        const data = d.data();
        const amount = data.amount ?? 0;
        const type = data.type ?? 'EXPENSE';
        // EXPENSE and LOAN_OUT reduce the fund; REPAYMENT adds back
        if (type === 'EXPENSE' || type === 'LOAN_OUT') {
          total += amount;
        } else if (type === 'REPAYMENT') {
          total -= amount;
        }
      });

      setTotalExpenses(total);
    }

    fetchExpenses().catch(console.error);
  }, [authed, curYear]);

  // ── Derived stats ──────────────────────────────────────────────────────────

  const yearlyTotals: Record<number, number> = {};
  members.forEach(m => {
    yearlyTotals[m.userId] = Object.values(matrix[m.userId] ?? {})
      .reduce((s, d) => s + d.total, 0);
  });

  const maxYearly = Math.max(...Object.values(yearlyTotals), 1);

  const monthlyGrandTotals: Record<number, number> = {};
  for (let mo = 0; mo < 12; mo++) {
    monthlyGrandTotals[mo] = members.reduce((s, m) =>
      s + (matrix[m.userId]?.[mo]?.total ?? 0), 0);
  }

  const grandTotal = members.reduce((s, m) => s + (yearlyTotals[m.userId] ?? 0), 0);

  // Filter visible months
  const visibleMonths = selectedMonth !== null
    ? [selectedMonth]
    : MONTHS.map((_, i) => i);

  // Export CSV
  function exportCSV() {
    let csv = `Pledges Report — ${curYear}\n\n`;
    csv += `Member,${MONTHS_FULL.join(',')},Total\n`;
    members.forEach(m => {
      const row = MONTHS.map((_, mo) => (matrix[m.userId]?.[mo]?.total ?? 0).toFixed(2));
      csv += `${m.name},${row.join(',')},${(yearlyTotals[m.userId] ?? 0).toFixed(2)}\n`;
    });
    csv += `TOTAL,${MONTHS.map((_, mo) => monthlyGrandTotals[mo].toFixed(2)).join(',')},${grandTotal.toFixed(2)}\n`;

    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `pledges_report_${curYear}.csv`;
    a.click();
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
     <div className="app-layout">
          <NavigationBar />
      <main className="main-content report-root">

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
              onChange={e => setCurYear(Number(e.target.value))}
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button className="rpt-export-btn" onClick={exportCSV}>
              ↓ Export CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rpt-loading">
            <div className="rpt-spinner" />
            <span>Loading {curYear} data…</span>
          </div>
        ) : (
          <>
            {/* ── KPI Strip ── */}
            <div className="rpt-kpi-strip rpt-kpi-strip--5">
              <div className="rpt-kpi">
                <span className="rpt-kpi-label">Total Collected</span>
                <span className="rpt-kpi-value">{fmt(grandTotal)}</span>
              </div>
              <div className="rpt-kpi rpt-kpi--red">
                <span className="rpt-kpi-label">Total Expenses</span>
                <span className="rpt-kpi-value rpt-kpi-value--red">{fmt(totalExpenses)}</span>
              </div>
              <div className={`rpt-kpi rpt-kpi--net ${grandTotal - totalExpenses >= 0 ? 'rpt-kpi--pos' : 'rpt-kpi--neg'}`}>
                <span className="rpt-kpi-label">Net Balance</span>
                <span className={`rpt-kpi-value ${grandTotal - totalExpenses >= 0 ? 'rpt-kpi-value--green' : 'rpt-kpi-value--red'}`}>
                  {fmt(grandTotal - totalExpenses)}
                </span>
              </div>
              <div className="rpt-kpi">
                <span className="rpt-kpi-label">Active Pledgers</span>
                <span className="rpt-kpi-value">{members.length}</span>
              </div>
              <div className="rpt-kpi">
                <span className="rpt-kpi-label">Avg per Pledger</span>
                <span className="rpt-kpi-value">
                  {fmt(members.length ? grandTotal / members.length : 0)}
                </span>
              </div>
            </div>

            {/* ── Bar Chart: Yearly Total per Member ── */}
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

            {/* ── Month Filter ── */}
            <div className="rpt-month-filter">
              <button
                className={`rpt-chip ${selectedMonth === null ? 'active' : ''}`}
                onClick={() => setSelectedMonth(null)}
              >All Months</button>
              {MONTHS.map((mo, i) => (
                <button
                  key={i}
                  className={`rpt-chip ${selectedMonth === i ? 'active' : ''}`}
                  onClick={() => setSelectedMonth(selectedMonth === i ? null : i)}
                >{mo}</button>
              ))}
            </div>

            {/* ── Matrix Table ── */}
            <div className="rpt-card rpt-card--table">
              <div className="rpt-card-header">
                <span className="rpt-card-title">Member Breakdown</span>
                <span className="rpt-card-sub">Amount pledged (₱) per month</span>
              </div>
              <div className="rpt-table-wrap">
                <table className="rpt-table">
                  <thead>
                    <tr>
                      <th className="rpt-th-member">Member</th>
                      {visibleMonths.map(mo => (
                        <th key={mo}>{MONTHS[mo]}</th>
                      ))}
                      <th className="rpt-th-total">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map(m => {
                      const yearly = yearlyTotals[m.userId] ?? 0;
                      return (
                        <tr key={m.userId}>
                          <td className="rpt-td-member">{m.name}</td>
                          {visibleMonths.map(mo => {
                            const d = matrix[m.userId]?.[mo];
                            const paid = d?.total ?? 0;
                            const paidSu = d?.paidSundays ?? 0;
                            const totalSu = d?.totalSundays ?? 0;
                            return (
                              <td key={mo} className={`rpt-td-amount ${paid > 0 ? 'has-amount' : 'zero'}`}>
                                {paid > 0 ? fmt(paid) : <span className="rpt-dash">—</span>}
                                {paid > 0 && (
                                  <span className="rpt-sunday-pill">{paidSu}/{totalSu}</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="rpt-td-grand">{yearly > 0 ? fmt(yearly) : <span className="rpt-dash">—</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="rpt-tfoot-row">
                      <td className="rpt-td-member">Total</td>
                      {visibleMonths.map(mo => (
                        <td key={mo} className="rpt-td-amount rpt-td-foot">
                          {monthlyGrandTotals[mo] > 0 ? fmt(monthlyGrandTotals[mo]) : <span className="rpt-dash">—</span>}
                        </td>
                      ))}
                      <td className="rpt-td-grand rpt-td-foot">{fmt(grandTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* ── Monthly Bar: Collection per Month ── */}
            <div className="rpt-card">
              <div className="rpt-card-header">
                <span className="rpt-card-title">Monthly Collection</span>
                <span className="rpt-card-sub">All members combined · {curYear}</span>
              </div>
              <div className="rpt-chart-wrap rpt-chart-wrap--monthly">
                {MONTHS.map((mo, i) => {
                  const val = monthlyGrandTotals[i] ?? 0;
                  const maxMo = Math.max(...Object.values(monthlyGrandTotals), 1);
                  const h = getBarHeight(val, maxMo);
                  const isSelected = selectedMonth === i;
                  return (
                    <div
                      key={i}
                      className={`rpt-bar-col rpt-bar-col--mo ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedMonth(selectedMonth === i ? null : i)}
                      title={`${MONTHS_FULL[i]}: ${fmt(val)}`}
                    >
                      <span className="rpt-bar-amount rpt-bar-amount--sm">{val > 0 ? fmt(val) : ''}</span>
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
          </>
        )}
      </main>
    </div>
  );
}