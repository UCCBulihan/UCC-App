import { useState, useEffect, useMemo } from 'react'
import { db } from '../../firebase/firebase' // adjust to your actual firebase.ts path
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore'
import NavigationBar from '../Home/NavigationBar/NavigationBar'
import './sundaySchool.css'
import './reports.css'

const COLLECTION_NAME = 'SUNDAYSCHOOL_INCOME'

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

function peso(n: number): string {
  return '₱' + (Math.round(n * 100) / 100).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function pesoCompact(n: number): string {
  if (n >= 1000) return '₱' + (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return '₱' + Math.round(n)
}

// ════════════════════════════════════════════════════════════════
// Real data: pull every SUNDAYSCHOOL_INCOME doc for the selected
// year and bucket the amounts by month.
//
// Only entries marked `received: true` are counted as income here —
// an amount that's been typed in but not yet toggled to "Received"
// is still pending money, not income that's actually come in. That
// pending amount is tracked separately (see pendingTotal below) so
// it isn't silently dropped, just not counted as collected income.
// ════════════════════════════════════════════════════════════════
function useYearlyIncome(year: number) {
  const [monthlyTotals, setMonthlyTotals] = useState<number[]>(() => Array(12).fill(0))
  const [pendingTotal, setPendingTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchYear() {
      setLoading(true)
      setError(null)
      try {
        const start = new Date(year, 0, 1)
        const end = new Date(year, 11, 31, 23, 59, 59)

        const q = query(
          collection(db, COLLECTION_NAME),
          where('dateAdded', '>=', Timestamp.fromDate(start)),
          where('dateAdded', '<=', Timestamp.fromDate(end))
        )

        const snapshot = await getDocs(q)
        const totals = Array(12).fill(0)
        let pending = 0

        snapshot.forEach(docSnap => {
          const d = docSnap.data()
          const month = (d.dateAdded as Timestamp).toDate().getMonth()
          const amount = d.amount ?? 0

          if (d.received) {
            totals[month] += amount
          } else {
            pending += amount
          }
        })

        if (!cancelled) {
          setMonthlyTotals(totals)
          setPendingTotal(pending)
        }
      } catch (err: any) {
        console.error('fetchYear error:', err?.message)
        if (!cancelled) setError('Could not load report data. Please try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchYear()
    return () => { cancelled = true }
  }, [year])

  return { monthlyTotals, pendingTotal, loading, error }
}

export default function SundaySchoolReport() {
  const currentRealYear = new Date().getFullYear()
  const [year, setYear] = useState(currentRealYear)

  const yearOptions = useMemo(() => {
    const years: number[] = []
    for (let y = currentRealYear - 3; y <= currentRealYear + 1; y++) years.push(y)
    return years
  }, [currentRealYear])

  const { monthlyTotals, pendingTotal, loading, error } = useYearlyIncome(year)

  const totalForYear = monthlyTotals.reduce((sum, v) => sum + v, 0)
  const monthsWithIncome = monthlyTotals.filter(v => v > 0).length
  const averagePerMonth = monthsWithIncome > 0 ? totalForYear / monthsWithIncome : 0
  const maxMonthValue = Math.max(...monthlyTotals, 1)
  const bestMonthIndex = monthlyTotals.indexOf(Math.max(...monthlyTotals))
  const hasAnyIncome = totalForYear > 0

  return (
    <div className="app-layout">
      <NavigationBar />
      <main className="main-content">

        <div className="sit-app">
          <div className="sit-page">
            <header className="sit-page-head">
              <h1 className="sit-title">Reports</h1>
              <p className="sit-subtitle">Yearly overview of Sunday income, month by month.</p>
            </header>

            <div className="sit-reports-toolbar">
              <select
                className="sit-year-select"
                value={year}
                onChange={e => setYear(parseInt(e.target.value, 10))}
                aria-label="Select year"
              >
                {yearOptions.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {error && (
              <div className="sit-chart-card" style={{ color: 'var(--sit-pending)' }}>
                {error}
              </div>
            )}

            {loading ? (
              <div className="sit-chart-card">Loading {year} report…</div>
            ) : (
              <>
                <section className="sit-report-summary">
                  <div className="sit-summary-cell">
                    <div className="sit-label">Total Income</div>
                    <div className="sit-value sit-accent">{peso(totalForYear)}</div>
                    <div className="sit-sub">{year} full year, received only</div>
                  </div>
                  <div className="sit-summary-cell">
                    <div className="sit-label">Average per Month</div>
                    <div className="sit-value">{peso(averagePerMonth)}</div>
                    <div className="sit-sub">across {monthsWithIncome} months</div>
                  </div>
                  <div className="sit-summary-cell">
                    <div className="sit-label">Best Month</div>
                    <div className="sit-value">{hasAnyIncome ? MONTH_SHORT[bestMonthIndex] : '—'}</div>
                    <div className="sit-sub">{hasAnyIncome ? peso(monthlyTotals[bestMonthIndex]) : 'No income yet'}</div>
                  </div>
                  <div className="sit-summary-cell">
                    <div className="sit-label">Pending</div>
                    <div className="sit-value">{peso(pendingTotal)}</div>
                    <div className="sit-sub">logged, not yet received</div>
                  </div>
                </section>

                <div className="sit-chart-card">
                  <div className="sit-chart-card-head">
                    <span className="sit-chart-title">Monthly Income — {year}</span>
                    <span className="sit-chart-hint">Hover a bar for the exact amount</span>
                  </div>
                  <div className="sit-bar-chart">
                    {monthlyTotals.map((value, i) => {
                      const heightPct = Math.max((value / maxMonthValue) * 100, 1.5)
                      return (
                        <div
                          className={`sit-bar-col${value > 0 ? ' sit-has-bar-value' : ''}`}
                          key={i}
                          title={`${MONTH_NAMES[i]} ${year}: ${peso(value)}`}
                        >
                          <span className="sit-bar-value">{pesoCompact(value)}</span>
                          <div className="sit-bar-shape" style={{ height: `${heightPct}%` }} />
                          <span className="sit-bar-label">{MONTH_SHORT[i]}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="sit-month-table-card">
                  {monthlyTotals.map((value, i) => {
                    const widthPct = Math.max((value / maxMonthValue) * 100, 1.5)
                    return (
                      <div
                        className={`sit-month-row${hasAnyIncome && i === bestMonthIndex ? ' sit-best' : ''}`}
                        key={i}
                      >
                        <span className="sit-month-row-name">{MONTH_NAMES[i]}</span>
                        <div className="sit-month-row-bar-track">
                          <div className="sit-month-row-bar-fill" style={{ width: `${widthPct}%` }} />
                        </div>
                        <span className="sit-month-row-amount">{peso(value)}</span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>

      </main>
    </div>
  )
}