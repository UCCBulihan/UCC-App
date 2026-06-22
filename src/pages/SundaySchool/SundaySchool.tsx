import { useState, useMemo } from 'react'
import NavigationBar from '../Home/NavigationBar/NavigationBar'
import './sundaySchool.css'

type SundayEntry = {
  amount: string
  received: boolean
  note: string
}

type EntryStore = Record<string, SundayEntry>

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function getSundaysForMonth(year: number, monthIndex: number): number[] {
  const sundays: number[] = []
  const date = new Date(year, monthIndex, 1)
  while (date.getDay() !== 0) {
    date.setDate(date.getDate() + 1)
  }
  while (date.getMonth() === monthIndex) {
    sundays.push(date.getDate())
    date.setDate(date.getDate() + 7)
  }
  return sundays
}

function peso(n: number): string {
  return '₱' + (Math.round(n * 100) / 100).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function entryKey(year: number, monthIndex: number, day: number): string {
  return `${year}-${monthIndex}-${day}`
}

function formatDateLabel(year: number, monthIndex: number, day: number): string {
  return `${MONTH_NAMES[monthIndex].slice(0, 3)} ${day}, ${year}`
}

const EMPTY_ENTRY: SundayEntry = { amount: '', received: false, note: '' }

export default function SundaySchool() {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth()) // 0-indexed
  const [store, setStore] = useState<EntryStore>({})

  const sundays = useMemo(
    () => getSundaysForMonth(viewYear, viewMonth),
    [viewYear, viewMonth]
  )

  const getEntry = (day: number): SundayEntry => {
    const key = entryKey(viewYear, viewMonth, day)
    return store[key] ?? EMPTY_ENTRY
  }

  const updateEntry = (day: number, patch: Partial<SundayEntry>) => {
    const key = entryKey(viewYear, viewMonth, day)
    setStore(prev => {
      const current = prev[key] ?? EMPTY_ENTRY
      const updated = { ...current, ...patch }

      // auto-flip status when amount crosses zero, unless the
      // caller is explicitly setting `received` themselves
      if (patch.amount !== undefined && patch.received === undefined) {
        const val = parseFloat(patch.amount) || 0
        if (val > 0 && !current.received) updated.received = true
        if (val === 0 && current.received) updated.received = false
      }

      return { ...prev, [key]: updated }
    })
  }

  const { total, receivedCount, rate } = useMemo(() => {
    let total = 0
    let receivedCount = 0
    sundays.forEach(day => {
      const entry = getEntry(day)
      const val = parseFloat(entry.amount) || 0
      total += val
      if (entry.received) receivedCount++
    })
    const rate = sundays.length > 0 ? Math.round((receivedCount / sundays.length) * 100) : 0
    return { total, receivedCount, rate }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sundays, store, viewYear, viewMonth])

  const goPrevMonth = () => {
    setViewMonth(m => {
      if (m === 0) {
        setViewYear(y => y - 1)
        return 11
      }
      return m - 1
    })
  }

  const goNextMonth = () => {
    setViewMonth(m => {
      if (m === 11) {
        setViewYear(y => y + 1)
        return 0
      }
      return m + 1
    })
  }

  const goToday = () => {
    setViewYear(today.getFullYear())
    setViewMonth(today.getMonth())
  }

  const resetMonth = () => {
    const monthLabel = `${MONTH_NAMES[viewMonth]} ${viewYear}`
    if (!confirm(`Reset all entries for ${monthLabel}?`)) return
    setStore(prev => {
      const next = { ...prev }
      sundays.forEach(day => {
        delete next[entryKey(viewYear, viewMonth, day)]
      })
      return next
    })
  }

  const exportCsv = () => {
    let csv = 'Date,Amount,Status,Notes\n'
    sundays.forEach(day => {
      const entry = getEntry(day)
      const dateStr = formatDateLabel(viewYear, viewMonth, day)
      const amount = entry.amount || '0'
      const status = entry.received ? 'Received' : 'Pending'
      const note = (entry.note || '').replace(/"/g, '""')
      csv += `"${dateStr}","${amount}","${status}","${note}"\n`
    })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sunday-income-${MONTH_NAMES[viewMonth]}-${viewYear}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const monthLabel = `${MONTH_NAMES[viewMonth]} ${viewYear}`

  return (
    <div className="app-layout">
      <NavigationBar />
      <main className="main-content">

        <div className="sit-app">
          <div className="sit-page">
            <header className="sit-page-head">
              <h1 className="sit-title">Sunday Income Tracker</h1>
              {/* <p className="sit-subtitle">Track what comes in every Sunday, month by month.</p> */}
            </header>

            <section className="sit-summary">
              <div className="sit-summary-cell">
                <div className="sit-label">Sundays this month</div>
                <div className="sit-value">{sundays.length}</div>
                <div className="sit-sub">{monthLabel}</div>
              </div>
              <div className="sit-summary-cell">
                <div className="sit-label">Received</div>
                <div className="sit-value">{receivedCount}</div>
                <div className="sit-sub">of {sundays.length} Sundays</div>
              </div>
              <div className="sit-summary-cell">
                <div className="sit-label">Total Income</div>
                <div className="sit-value sit-accent">{peso(total)}</div>
                <div className="sit-sub">This month</div>
              </div>
              <div className="sit-summary-cell">
                <div className="sit-label">Collection Rate</div>
                <div className="sit-value">{rate}%</div>
                <div className="sit-progress-track">
                  <div className="sit-progress-fill" style={{ width: `${rate}%` }} />
                </div>
              </div>
            </section>

            <div className="sit-toolbar">
              <div className="sit-month-nav">
                <button
                  type="button"
                  className="sit-nav-btn"
                  aria-label="Previous month"
                  onClick={goPrevMonth}
                >
                  ‹
                </button>
                <span className="sit-month-label">{monthLabel}</span>
                <button
                  type="button"
                  className="sit-nav-btn"
                  aria-label="Next month"
                  onClick={goNextMonth}
                >
                  ›
                </button>
              </div>
              <div className="sit-toolbar-actions">
                <button type="button" className="sit-btn sit-btn-today" onClick={goToday}>
                  This Month
                </button>
                <button type="button" className="sit-btn" onClick={exportCsv}>
                  Export CSV
                </button>
                <button type="button" className="sit-btn" onClick={resetMonth}>
                  Reset Month
                </button>
              </div>
            </div>

            <div className="sit-table-card">
              <table className="sit-table">
                <thead>
                  <tr>
                    <th className="sit-th sit-col-num">#</th>
                    <th className="sit-th sit-col-date">Date</th>
                    <th className="sit-th sit-col-amount">Amount</th>
                    <th className="sit-th sit-col-status">Status</th>
                    <th className="sit-th sit-col-notes">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {sundays.map((day, i) => {
                    const entry = getEntry(day)
                    const dateLabel = formatDateLabel(viewYear, viewMonth, day)
                    const hasValue = (parseFloat(entry.amount) || 0) > 0

                    return (
                      <tr className="sit-row" key={day}>
                        <td className="sit-td sit-col-num" data-label="#">{i + 1}</td>
                        <td className="sit-td sit-col-date" data-label="Date">{dateLabel}</td>
                        <td className="sit-td" data-label="Amount">
                          <div className={`sit-amount-wrap${hasValue ? ' sit-has-value' : ''}`}>
                            <span className="sit-peso">₱</span>
                            <input
                              type="number"
                              className="sit-amount-input"
                              min="0"
                              step="1"
                              placeholder="0"
                              value={entry.amount}
                              aria-label={`Amount for ${dateLabel}`}
                              onChange={e => updateEntry(day, { amount: e.target.value })}
                            />
                          </div>
                        </td>
                        <td className="sit-td" data-label="Status">
                          <button
                            type="button"
                            className={`sit-status-badge${entry.received ? ' sit-received' : ''}`}
                            title="Click to toggle status"
                            onClick={() => updateEntry(day, { received: !entry.received })}
                          >
                            {entry.received ? 'Received' : 'Pending'}
                          </button>
                        </td>
                        <td className="sit-td" data-label="Notes">
                          <input
                            type="text"
                            className="sit-note-input"
                            placeholder="Add note..."
                            value={entry.note}
                            aria-label={`Note for ${dateLabel}`}
                            onChange={e => updateEntry(day, { note: e.target.value })}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="sit-table-foot">
                <span>Sundays: <strong>{sundays.length}</strong></span>
                <span>Received: <strong>{receivedCount}</strong></span>
                <span>Total: <strong>{peso(total)}</strong></span>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  )
}