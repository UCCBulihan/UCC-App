import { useEffect, useMemo, useState } from 'react'
import NavigationBar from '../Home/NavigationBar/NavigationBar'
import './calendar.css'

type Activity = {
  time: string
  title: string
  client?: string
  isHoliday?: boolean
}

type Holiday = {
  date: string // 'YYYY-MM-DD'
  name: string
  localName: string
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

// Public holiday source — free, no API key, CORS-enabled.
// Docs: https://date.nager.at/api
const HOLIDAY_COUNTRY_CODE = 'PH'

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
  const [holidays, setHolidays] = useState<Record<string, Holiday>>({})
  const [holidaysError, setHolidaysError] = useState(false)

  const days = useMemo(() => buildMonthGrid(monthAnchor), [monthAnchor])
  const year = monthAnchor.getFullYear()

  // Fetch public holidays for the visible year. Re-fetches only when the
  // year changes (not on every month flip), and caches per year in state.
  useEffect(() => {
    let cancelled = false

    fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${HOLIDAY_COUNTRY_CODE}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load holidays')
        return res.json() as Promise<Holiday[]>
      })
      .then((data) => {
        if (cancelled) return
        const byDate: Record<string, Holiday> = {}
        data.forEach((h) => {
          byDate[h.date] = h
        })
        setHolidays(byDate)
        setHolidaysError(false)
      })
      .catch(() => {
        if (!cancelled) setHolidaysError(true)
      })

    return () => {
      cancelled = true
    }
  }, [year])

  // Combine a holiday (if any) with that day's scheduled activities.
  function getDayItems(dateKey: string): Activity[] {
    const items: Activity[] = []
    const holiday = holidays[dateKey]
    if (holiday) {
      items.push({ time: 'Holiday', title: holiday.name, isHoliday: true })
    }
    items.push(...(SAMPLE_ACTIVITIES[dateKey] ?? []))
    return items
  }

  const monthLabel = monthAnchor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // All activities + holidays for the currently viewed month, grouped by day
  // and sorted chronologically.
  const monthActivities: DayGroup[] = useMemo(() => {
    const month = monthAnchor.getMonth()

    const holidayKeysInMonth = Object.keys(holidays).filter((dateKey) => {
      const [y, m] = dateKey.split('-').map(Number)
      return y === year && m === month + 1
    })

    const activityKeysInMonth = Object.keys(SAMPLE_ACTIVITIES).filter((dateKey) => {
      const [y, m] = dateKey.split('-').map(Number)
      return y === year && m === month + 1
    })

    const allKeys = Array.from(new Set([...holidayKeysInMonth, ...activityKeysInMonth])).sort()

    return allKeys.map((dateKey) => {
      const [y, m, d] = dateKey.split('-').map(Number)
      const date = new Date(y, m - 1, d)
      return {
        dateKey,
        date,
        label: date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
        activities: getDayItems(dateKey),
      }
    })
  }, [monthAnchor, holidays])

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
                const dateKey = toKey(date)
                const isHoliday = !!holidays[dateKey]
                const hasItems = getDayItems(dateKey).length > 0

                const cellClassNames = [
                  'calendar-cell',
                  !inCurrentMonth && 'calendar-cell-muted',
                  isToday && 'calendar-cell-today',
                  isSelected && 'calendar-cell-selected',
                  isHoliday && 'calendar-cell-holiday',
                ]
                  .filter(Boolean)
                  .join(' ')

                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    className={cellClassNames}
                    onClick={() => setSelectedDate(date)}
                    title={isHoliday ? holidays[dateKey].name : undefined}
                  >
                    <span className="calendar-cell-number">{date.getDate()}</span>
                    {hasItems && <span className="calendar-cell-dot" aria-hidden="true" />}
                  </button>
                )
              })}
            </div>

            {holidaysError && (
              <p className="calendar-agenda-empty" style={{ marginTop: 8 }}>
                Couldn't load public holidays right now.
              </p>
            )}
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
                          <li
                            key={`${activity.time}-${activity.title}`}
                            className={
                              activity.isHoliday
                                ? 'calendar-agenda-item calendar-agenda-item-holiday'
                                : 'calendar-agenda-item'
                            }
                          >
                            <span className="calendar-agenda-time">
                              {activity.isHoliday ? 'Holiday' : activity.time}
                            </span>
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