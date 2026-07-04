import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { db } from '../../firebase/firebase' // adjust to your actual firebase.ts path
import { collection, query, where, getDocs, Timestamp, doc, setDoc } from 'firebase/firestore'
import NavigationBar from '../Home/NavigationBar/NavigationBar'
import { useCurrentUserRole } from './useCurrentUserRole' // adjust path to wherever you place the hook
import './sundaySchool.css'

// ════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════

interface SundayEntry {
  amount?: string
  received?: boolean
  note?: string
  sponsor?: string
}

type SundayTracker = Record<number, SundayEntry> // keyed by day-of-month

export type RowSaveStatus = 'saving' | 'saved' | 'error'

type SundayField = 'amount' | 'received' | 'note' | 'sponsor'

// ════════════════════════════════════════════════════════════════
// Constants & pure helpers (would be SundaySchoolUtils.ts if split)
// ════════════════════════════════════════════════════════════════

const COLLECTION_NAME = 'SUNDAYSCHOOL_INCOME'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// Bilang ng milliseconds na hihintayin pagkatapos ng huling keystroke
// bago talaga isulat sa Firestore.
const SAVE_DEBOUNCE_MS = 800
// Gaano katagal ipapakita ang "Saved" bago mawala.
const SAVED_BADGE_MS = 1500

function getSundays(month: number, year: number): Date[] {
  const out: Date[] = []
  const d = new Date(year, month, 1)
  while (d.getMonth() === month) {
    if (d.getDay() === 0) out.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return out
}

function fmt(n: number): string {
  return '₱' + n.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function buildCSV(sundays: Date[], data: SundayTracker): string {
  let csv = 'Sunday #,Date,Amount (PHP),Status,Sponsor,Note\n'
  sundays.forEach((d, i) => {
    const day = d.getDate()
    const saved = data[day] || {}
    const amount = saved.amount || '0'
    const note = (saved.note || '').replace(/,/g, ';')
    const sponsor = (saved.sponsor || '').replace(/,/g, ';')
    const date = d.toLocaleDateString('en-PH', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
    const status = saved.received ? 'Received' : 'Pending'
    csv += `${i + 1},${date},${amount},${status},${sponsor},${note}\n`
  })
  return csv
}

// ════════════════════════════════════════════════════════════════
// SaveBadge (would be part of SundaySchoolTable.tsx if split)
// ════════════════════════════════════════════════════════════════

function SaveBadge({ status }: { status?: RowSaveStatus }) {
  if (!status) return null

  const styleByStatus: Record<RowSaveStatus, React.CSSProperties> = {
    saving: { color: '#9ca3af', fontStyle: 'italic' },
    saved: { color: '#16a34a', fontWeight: 600 },
    error: { color: '#dc2626', fontWeight: 600 },
  }

  const labelByStatus: Record<RowSaveStatus, string> = {
    saving: 'Saving…',
    saved: '✓ Saved',
    error: '⚠ Failed to save',
  }

  return (
    <span style={{ fontSize: 11, marginLeft: 8, whiteSpace: 'nowrap', ...styleByStatus[status] }}>
      {labelByStatus[status]}
    </span>
  )
}

// ════════════════════════════════════════════════════════════════
// Main component (hook logic + table + page, all in one file)
// ════════════════════════════════════════════════════════════════

export default function SundaySchool() {
  const now = new Date()

  // Admin/Moderator can touch amount + received status (the actual money).
  // Member and up can touch sponsor/note (just annotations). Viewer is
  // read-only across the board.
  const { canEditFinancials, canEditDetails } = useCurrentUserRole()

  const [curMonth, setCurMonth] = useState(now.getMonth()) // 0-indexed, same as PLEDGES
  const [curYear, setCurYear] = useState(now.getFullYear())
  const [data, setData] = useState<SundayTracker>({})
  const [loading, setLoading] = useState(false)

  // Status ng pag-save kada Sunday/day — para sa "Saving... / Saved / Failed" indicator
  const [rowStatus, setRowStatus] = useState<Record<number, RowSaveStatus | undefined>>({})

  // Naka-store dito yung mga pending debounce timer, keyed by "day_field" (hal. "10_amount")
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  // Naka-store dito yung mga timer na nag-clear ng "Saved" badge pagkatapos ng ilang segundo
  const savedClearTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  const sundays = useMemo(() => getSundays(curMonth, curYear), [curMonth, curYear])

  // ── Fetch entries for the viewed month via dateAdded range query ─────────
  useEffect(() => {
    let cancelled = false

    async function fetchEntries() {
      setLoading(true)
      try {
        const start = new Date(curYear, curMonth, 1)
        const end = new Date(curYear, curMonth + 1, 0, 23, 59, 59)

        const q = query(
          collection(db, COLLECTION_NAME),
          where('dateAdded', '>=', Timestamp.fromDate(start)),
          where('dateAdded', '<=', Timestamp.fromDate(end))
        )

        const snapshot = await getDocs(q)
        const newData: SundayTracker = {}

        snapshot.forEach(docSnap => {
          const d = docSnap.data()
          const day = (d.dateAdded as Timestamp).toDate().getDate()
          newData[day] = {
            amount: String(d.amount ?? ''),
            received: !!d.received,
            note: d.note ?? '',
            sponsor: d.sponsor ?? '',
          }
        })

        if (!cancelled) setData(newData)
      } catch (err: any) {
        console.error('fetchEntries error:', err?.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchEntries()
    return () => { cancelled = true }
  }, [curMonth, curYear])

  // Kapag lumipat ng month/year, kanselahin ang lahat ng pending timer
  // (save timers + saved-badge clear timers) at i-reset ang status indicators.
  useEffect(() => {
    return () => {
      Object.values(saveTimers.current).forEach(clearTimeout)
      saveTimers.current = {}
      Object.values(savedClearTimers.current).forEach(clearTimeout)
      savedClearTimers.current = {}
      setRowStatus({})
    }
  }, [curMonth, curYear])

  const getAmount = (day: number) => parseFloat(data[day]?.amount || '0')

  const total = sundays.reduce((sum, d) => sum + getAmount(d.getDate()), 0)
  const receivedCount = sundays.filter(d => data[d.getDate()]?.received).length
  const rate = sundays.length > 0 ? Math.round((receivedCount / sundays.length) * 100) : 0

  // ── Save status indicator helpers ─────────────────────────────────────────
  function markSaving(day: number) {
    if (savedClearTimers.current[day]) {
      clearTimeout(savedClearTimers.current[day])
      delete savedClearTimers.current[day]
    }
    setRowStatus(prev => ({ ...prev, [day]: 'saving' }))
  }

  function markSaved(day: number) {
    setRowStatus(prev => ({ ...prev, [day]: 'saved' }))
    savedClearTimers.current[day] = setTimeout(() => {
      setRowStatus(prev => {
        const next = { ...prev }
        delete next[day]
        return next
      })
      delete savedClearTimers.current[day]
    }, SAVED_BADGE_MS)
  }

  function markError(day: number) {
    setRowStatus(prev => ({ ...prev, [day]: 'error' }))
  }

  // ── Ito lang ang TANGING lugar na talagang sumusulat sa Firestore ─────────
  const writeToFirestore = useCallback(
    async (day: number, field: SundayField, value: string | boolean) => {
      // Permission check happens here too, not just on the disabled inputs —
      // this is the one real chokepoint, so it's the safest place to make
      // sure a role change can't be bypassed by calling the handler directly.
      const isFinancialField = field === 'amount' || field === 'received'
      const allowed = isFinancialField ? canEditFinancials : canEditDetails
      if (!allowed) {
        console.warn(`Blocked write to "${field}": current role lacks permission.`)
        markError(day)
        return
      }

      const date = new Date(curYear, curMonth, day)
      const docIdStr = `${curYear}_${curMonth}_${day}`

      const payload: Record<string, any> = {
        dateAdded: Timestamp.fromDate(date),
        dateModified: Timestamp.fromDate(new Date()),
      }
      if (field === 'amount') payload.amount = parseFloat(value as string) || 0
      if (field === 'received') payload.received = !!value
      if (field === 'note') payload.note = value
      if (field === 'sponsor') payload.sponsor = value

      try {
        await setDoc(doc(db, COLLECTION_NAME, docIdStr), payload, { merge: true })
        markSaved(day)
      } catch (err: any) {
        console.error('save error:', err?.message)
        markError(day)
      }
    },
    [curYear, curMonth, canEditFinancials, canEditDetails]
  )

  // Mag-schedule ng save (debounce). Ipinapakita na ang "Saving..." mula ngayon
  // hanggang matapos ang actual na pagsulat, kaya honest ang feedback sa user.
  function scheduleSave(day: number, field: SundayField, value: string | boolean) {
    const key = `${day}_${field}`
    if (saveTimers.current[key]) clearTimeout(saveTimers.current[key])
    markSaving(day)
    saveTimers.current[key] = setTimeout(() => {
      delete saveTimers.current[key]
      writeToFirestore(day, field, value)
    }, SAVE_DEBOUNCE_MS)
  }

  // I-save AGAD, kanselahin ang naghihintay na timer (ginagamit sa onBlur, at sa toggle)
  function flushSave(day: number, field: SundayField, value: string | boolean) {
    const key = `${day}_${field}`
    if (saveTimers.current[key]) {
      clearTimeout(saveTimers.current[key])
      delete saveTimers.current[key]
    }
    markSaving(day)
    writeToFirestore(day, field, value)
  }

  // ── onChange: i-update lang ang screen, i-schedule ang save ───────────────
  const handleAmount = (day: number, value: string) => {
    setData(prev => {
      const current = prev[day] || {}
      const next: SundayEntry = { ...current, amount: value }

      // auto-flip received when amount crosses zero, mirroring the old behavior
      const val = parseFloat(value) || 0
      if (val > 0 && !current.received) next.received = true
      if (val === 0 && current.received) next.received = false

      if (next.received !== current.received) {
        scheduleSave(day, 'received', !!next.received)
      }
      return { ...prev, [day]: next }
    })
    scheduleSave(day, 'amount', value)
  }

  const handleNote = (day: number, value: string) => {
    setData(prev => ({ ...prev, [day]: { ...prev[day], note: value } }))
    scheduleSave(day, 'note', value)
  }

  const handleSponsor = (day: number, value: string) => {
    setData(prev => ({ ...prev, [day]: { ...prev[day], sponsor: value } }))
    scheduleSave(day, 'sponsor', value)
  }

  // ── onBlur: i-save agad, hindi na maghintay ng 800ms ──────────────────────
  const commitAmount = (day: number, value: string) => flushSave(day, 'amount', value)
  const commitNote = (day: number, value: string) => flushSave(day, 'note', value)
  const commitSponsor = (day: number, value: string) => flushSave(day, 'sponsor', value)

  // ── toggle status badge: save agad, walang debounce ───────────────────────
  const toggleReceived = (day: number) => {
    setData(prev => {
      const current = prev[day] || {}
      const nextReceived = !current.received
      flushSave(day, 'received', nextReceived)
      return { ...prev, [day]: { ...current, received: nextReceived } }
    })
  }

  const exportCSV = () => {
    const csv = buildCSV(sundays, data)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `sunday_income_${MONTHS[curMonth]}_${curYear}.csv`
    a.click()
  }

  const goPrevMonth = () => {
    setCurMonth(m => {
      if (m === 0) { setCurYear(y => y - 1); return 11 }
      return m - 1
    })
  }

  const goNextMonth = () => {
    setCurMonth(m => {
      if (m === 11) { setCurYear(y => y + 1); return 0 }
      return m + 1
    })
  }

  const goToday = () => {
    setCurYear(now.getFullYear())
    setCurMonth(now.getMonth())
  }

  const monthLabel = `${MONTHS[curMonth]} ${curYear}`
  const sundayCount = sundays.length

  return (
    <div className="app-layout">
      <NavigationBar />
      <main className="main-content">
        <div className="page-wrapper">

          <div className="header">
            <h1>Sunday Income Tracker</h1>
            <p>Track what comes in every Sunday, month by month.</p>
          </div>

          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-label">Sundays this month</div>
              <div className="stat-value">{sundayCount}</div>
              <div className="stat-sub">{monthLabel}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Received</div>
              <div className={`stat-value ${receivedCount > 0 ? 'green' : ''}`}>{receivedCount}</div>
              <div className="stat-sub">of {sundayCount} Sundays</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Income</div>
              <div className="stat-value">{fmt(total)}</div>
              <div className="stat-sub">This month</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Collection rate</div>
              <div className="stat-value">{rate}%</div>
              <div className="progress-wrap">
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{ width: `${rate}%` }} />
                </div>
                <div className="progress-label">{receivedCount} of {sundayCount} Sundays Received</div>
              </div>
            </div>
          </div>

          <div className="filters">
            <button type="button" className="export-btn" onClick={goPrevMonth} aria-label="Previous month">‹</button>
            <span style={{ fontWeight: 500, padding: '0 8px' }}>{monthLabel}</span>
            <button type="button" className="export-btn" onClick={goNextMonth} aria-label="Next month">›</button>
            <button type="button" className="export-btn" onClick={goToday}>This Month</button>
            <button type="button" className="export-btn" onClick={exportCSV}>Export CSV</button>
          </div>

          <div className="table-wrapper">
            {loading ? (
              <div style={{ padding: 16, color: 'var(--muted)' }}>Loading entries…</div>
            ) : (
              <table className="pledge-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Sponsor</th>
                    <th>Notes</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sundays.map((d, i) => {
                    const day = d.getDate()
                    const saved = data[day] || {}
                    const received = !!saved.received

                    return (
                      <tr key={day}>
                        <td>{i + 1}</td>
                        <td>
                          {d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td>
                          <div className="amount-cell">
                            ₱
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={saved.amount || ''}
                              onChange={e => handleAmount(day, e.target.value)}
                              onBlur={e => commitAmount(day, e.target.value)}
                              disabled={!canEditFinancials}
                              title={!canEditFinancials ? 'Only Admins/Moderators can edit amounts' : undefined}
                            />
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`status ${received ? 'paid' : 'unpaid'}`}
                            style={{ border: 'none', cursor: canEditFinancials ? 'pointer' : 'not-allowed' }}
                            onClick={() => canEditFinancials && toggleReceived(day)}
                            disabled={!canEditFinancials}
                            title={canEditFinancials ? 'Click to toggle status' : 'Only Admins/Moderators can change status'}
                          >
                            {received ? 'Received' : 'Pending'}
                          </button>
                        </td>
                        <td>
                          <input
                            type="text"
                            value={saved.sponsor || ''}
                            placeholder="Add sponsor..."
                            onChange={e => handleSponsor(day, e.target.value)}
                            onBlur={e => commitSponsor(day, e.target.value)}
                            disabled={!canEditDetails}
                            title={!canEditDetails ? 'View only' : undefined}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={saved.note || ''}
                            placeholder="Add note..."
                            onChange={e => handleNote(day, e.target.value)}
                            onBlur={e => commitNote(day, e.target.value)}
                            disabled={!canEditDetails}
                            title={!canEditDetails ? 'View only' : undefined}
                          />
                        </td>
                        <td>
                          <SaveBadge status={rowStatus[day]} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}

            <div className="summary">
              <span>Sundays: <strong>{sundayCount}</strong></span>
              <span>Received: <strong>{receivedCount}</strong></span>
              <span>Total: <strong>{fmt(total)}</strong></span>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}