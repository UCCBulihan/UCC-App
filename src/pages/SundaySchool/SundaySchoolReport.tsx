import { useState, useMemo } from 'react'
import NavigationBar from '../Home/NavigationBar/NavigationBar'
import './sundaySchool.css'

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

/**
 * TEMP: sample/dummy data so this page is viewable on its own.
 * Replace this with real data from the Sunday Income Tracker
 * (shared state, API, or storage) once that's wired up.
 */
function getSampleMonthlyTotals(year: number): number[] {
  // deterministic pseudo-random sample so numbers don't jump around
  // every re-render; swap this out for real data later.
  const seedBase = year % 7
  return MONTH_NAMES.map((_, i) => {
    const wave = Math.sin((i + seedBase) * 1.3) * 0.5 + 0.5
    return Math.round(wave * 4200 + 800)
  })
}

export default function Reports() {
  const currentRealYear = new Date().getFullYear()
  const [year, setYear] = useState(currentRealYear)

  const yearOptions = useMemo(() => {
    const years: number[] = []
    for (let y = currentRealYear - 3; y <= currentRealYear + 1; y++) years.push(y)
    return years
  }, [currentRealYear])

  // TODO: replace with real per-month totals once Reports is
  // connected to the same data source as the Sunday Income Tracker.
  const monthlyTotals = useMemo(() => getSampleMonthlyTotals(year), [year])

  const totalForYear = monthlyTotals.reduce((sum, v) => sum + v, 0)
  const monthsWithIncome = monthlyTotals.filter(v => v > 0).length
  const averagePerMonth = monthsWithIncome > 0 ? totalForYear / monthsWithIncome : 0
  const maxMonthValue = Math.max(...monthlyTotals, 1)
  const bestMonthIndex = monthlyTotals.indexOf(Math.max(...monthlyTotals))

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

            <section className="sit-report-summary">
              <div className="sit-summary-cell">
                <div className="sit-label">Total Income</div>
                <div className="sit-value sit-accent">{peso(totalForYear)}</div>
                <div className="sit-sub">{year} full year</div>
              </div>
              <div className="sit-summary-cell">
                <div className="sit-label">Average per Month</div>
                <div className="sit-value">{peso(averagePerMonth)}</div>
                <div className="sit-sub">across {monthsWithIncome} months</div>
              </div>
              <div className="sit-summary-cell">
                <div className="sit-label">Best Month</div>
                <div className="sit-value">{MONTH_SHORT[bestMonthIndex]}</div>
                <div className="sit-sub">{peso(monthlyTotals[bestMonthIndex])}</div>
              </div>
              <div className="sit-summary-cell">
                <div className="sit-label">Months with Income</div>
                <div className="sit-value">{monthsWithIncome} / 12</div>
                <div className="sit-sub">{year}</div>
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
                    className={`sit-month-row${i === bestMonthIndex ? ' sit-best' : ''}`}
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
          </div>
        </div>

      </main>
    </div>
  )
}