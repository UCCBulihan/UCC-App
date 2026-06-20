import { useMemo, useState } from 'react'
import NavigationBar from '../Home/NavigationBar/NavigationBar'
import './calendar.css'

type Activity = {
  time: string
  title: string
  client?: string
}

// Demo data — replace with activities fetched from your backend.
// Keyed by date in 'YYYY-MM-DD' format.
const SAMPLE_ACTIVITIES: Record<string, Activity[]> = {
  '2026-06-05': [
    { time: '9:00 AM', title: 'Executive Meeting' },
    { time: '2:00 PM', title: 'Project Planning Session' },
  ],

  '2026-06-12': [
    { time: '8:00 AM', title: 'Leadership Development Camp' },
  ],

  '2026-06-18': [
    { time: '10:00 AM', title: 'Community Outreach Program' },
    { time: '3:00 PM', title: 'Team Building Event' },
  ],

  '2026-06-25': [
    { time: '9:00 AM', title: 'Recognition & Awards Ceremony' },
    { time: '1:00 PM', title: 'Annual General Meeting' },
  ],
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function toKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function buildMonthGrid(monthAnchor: Date): Date[] {
  const year = monthAnchor.getFullYear()
  const month = monthAnchor.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const startOffset = firstOfMonth.getDay() // 0 = Sunday
  const gridStart = new Date(year, month, 1 - startOffset)

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    return d
  })
}

type DayGroup = {
  dateKey: string
  date: Date
  label: string
  activities: Activity[]
}

export default function Calendar() {
  const today = useMemo(() => new Date(), [])
  const [monthAnchor, setMonthAnchor] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(today)

  const days = useMemo(() => buildMonthGrid(monthAnchor), [monthAnchor])

  const monthLabel = monthAnchor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // All activities that fall within the currently viewed month, grouped by day
  // and sorted chronologically — this replaces the old "selected day only" list.
  const monthActivities: DayGroup[] = useMemo(() => {
    const year = monthAnchor.getFullYear()
    const month = monthAnchor.getMonth()

    return Object.entries(SAMPLE_ACTIVITIES)
      .filter(([dateKey]) => {
        const [y, m] = dateKey.split('-').map(Number)
        return y === year && m === month + 1
      })
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateKey, activities]) => {
        const [y, m, d] = dateKey.split('-').map(Number)
        const date = new Date(y, m - 1, d)
        return {
          dateKey,
          date,
          label: date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
          activities,
        }
      })
  }, [monthAnchor])

  function goToPrevMonth() {
    setMonthAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  function goToNextMonth() {
    setMonthAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  function goToToday() {
    setMonthAnchor(new Date(today.getFullYear(), today.getMonth(), 1))
    setSelectedDate(today)
  }

  return (
    <div className="app-layout">
      <NavigationBar />
      <main className="main-content">
        <div className="calendar-page">
          <section className="calendar-card">
            <header className="calendar-toolbar">
              <div className="calendar-toolbar-left">
                <h1 className="calendar-month-label">{monthLabel}</h1>
                <div className="calendar-nav-group">
                  <button
                    type="button"
                    className="calendar-nav-button"
                    onClick={goToPrevMonth}
                    aria-label="Previous month"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="calendar-nav-button"
                    onClick={goToNextMonth}
                    aria-label="Next month"
                  >
                    ›
                  </button>
                </div>
              </div>
              <div className="calendar-toolbar-right">
                <button type="button" className="calendar-btn calendar-btn-ghost" onClick={goToToday}>
                  Today
                </button>
                <button type="button" className="calendar-btn calendar-btn-primary">
                  + New activity
                </button>
              </div>
            </header>

            <div className="calendar-weekday-row">
              {WEEKDAY_LABELS.map((label) => (
                <span key={label} className="calendar-weekday-label">
                  {label}
                </span>
              ))}
            </div>

            <div className="calendar-grid">
              {days.map((date) => {
                const inCurrentMonth = date.getMonth() === monthAnchor.getMonth()
                const isToday = isSameDay(date, today)
                const isSelected = isSameDay(date, selectedDate)
                const hasActivities = (SAMPLE_ACTIVITIES[toKey(date)] ?? []).length > 0

                const cellClassNames = [
                  'calendar-cell',
                  !inCurrentMonth && 'calendar-cell-muted',
                  isToday && 'calendar-cell-today',
                  isSelected && 'calendar-cell-selected',
                ]
                  .filter(Boolean)
                  .join(' ')

                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    className={cellClassNames}
                    onClick={() => setSelectedDate(date)}
                  >
                    <span className="calendar-cell-number">{date.getDate()}</span>
                    {hasActivities && <span className="calendar-cell-dot" aria-hidden="true" />}
                  </button>
                )
              })}
            </div>
          </section>

          <aside className="calendar-agenda">
            <h2 className="calendar-agenda-date">{monthLabel}</h2>

            {monthActivities.length === 0 ? (
              <p className="calendar-agenda-empty">No activities scheduled this month.</p>
            ) : (
              <div className="calendar-agenda-groups">
                {monthActivities.map((group) => {
                  const isActiveGroup = isSameDay(group.date, selectedDate)
                  const groupClassNames = [
                    'calendar-agenda-group',
                    isActiveGroup && 'calendar-agenda-group-active',
                  ]
                    .filter(Boolean)
                    .join(' ')

                  return (
                    <div key={group.dateKey} className={groupClassNames}>
                      <h3 className="calendar-agenda-group-date">{group.label}</h3>
                      <ul className="calendar-agenda-list">
                        {group.activities.map((activity) => (
                          <li key={`${activity.time}-${activity.title}`} className="calendar-agenda-item">
                            <span className="calendar-agenda-time">{activity.time}</span>
                            <div className="calendar-agenda-details">
                              <span className="calendar-agenda-title">{activity.title}</span>
                              {activity.client && <span className="calendar-agenda-client">{activity.client}</span>}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  )
}