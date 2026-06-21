import { useEffect, useMemo, useState, type FormEvent, type CSSProperties } from 'react'
import NavigationBar from '../Home/NavigationBar/NavigationBar'
import './calendar.css'

type Activity = {
  time: string
  title: string
  client?: string
  isHoliday?: boolean
  categoryId?: string
}

type Holiday = {
  date: string // 'YYYY-MM-DD'
  name: string
  localName: string
}

type Category = {
  id: string
  name: string
  color: string
}

type NewActivityDraft = {
  title: string
  startDate: string // 'YYYY-MM-DD'
  endDate: string // 'YYYY-MM-DD'
  startTime: string // 'HH:MM'
  endTime: string // 'HH:MM'
  isWholeDay: boolean
  categoryId: string | null
}

type NewCategoryDraft = {
  name: string
  color: string
}

// Color swatches offered when creating a category. Kept short and
// distinct so they stay legible as both a dot on the grid and a tag
// in the agenda — swap/extend freely, just keep contrast against white.
const CATEGORY_COLORS = [
  { value: '#0b6e64', label: 'Teal' },
  { value: '#2563eb', label: 'Blue' },
  { value: '#7c3aed', label: 'Purple' },
  { value: '#db2777', label: 'Pink' },
  { value: '#d97706', label: 'Amber' },
  { value: '#dc2626', label: 'Red' },
  { value: '#16a34a', label: 'Green' },
  { value: '#525252', label: 'Slate' },
] as const

// Starter categories so the picker isn't empty on first load.
// Replace with categories fetched from your backend if you have them.
const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-meeting', name: 'Meeting', color: '#0b6e64' },
  { id: 'cat-event', name: 'Event', color: '#2563eb' },
  { id: 'cat-personal', name: 'Personal', color: '#d97706' },
]

function createEmptyDraft(initialDate: Date, defaultCategoryId: string | null): NewActivityDraft {
  const key = toKey(initialDate)
  return {
    title: '',
    startDate: key,
    endDate: key,
    startTime: '09:00',
    endTime: '10:00',
    isWholeDay: false,
    categoryId: defaultCategoryId,
  }
}

function createEmptyCategoryDraft(): NewCategoryDraft {
  return { name: '', color: CATEGORY_COLORS[0].value }
}

// Demo data — replace with activities fetched from your backend.
// Keyed by date in 'YYYY-MM-DD' format. Used to seed local state below;
// activities created via the "+ New activity" modal get merged in too.
const INITIAL_ACTIVITIES: Record<string, Activity[]> = {
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
  const [activitiesByDate, setActivitiesByDate] = useState<Record<string, Activity[]>>(INITIAL_ACTIVITIES)
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [draft, setDraft] = useState<NewActivityDraft>(() => createEmptyDraft(today, INITIAL_CATEGORIES[0]?.id ?? null))
  const [formError, setFormError] = useState<string | null>(null)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [categoryDraft, setCategoryDraft] = useState<NewCategoryDraft>(createEmptyCategoryDraft)
  const [categoryFormError, setCategoryFormError] = useState<string | null>(null)

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
    items.push(...(activitiesByDate[dateKey] ?? []))
    return items
  }

  function getCategoryById(categoryId: string | undefined): Category | undefined {
    if (!categoryId) return undefined
    return categories.find((c) => c.id === categoryId)
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

    const activityKeysInMonth = Object.keys(activitiesByDate).filter((dateKey) => {
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
  }, [monthAnchor, holidays, activitiesByDate])

  // Allow closing modals with Escape, matching standard dialog behavior.
  // The category modal sits on top of the activity modal, so close it first.
  useEffect(() => {
    if (!isModalOpen && !isCategoryModalOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (isCategoryModalOpen) setIsCategoryModalOpen(false)
      else setIsModalOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isModalOpen, isCategoryModalOpen])

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

  function openNewActivityModal() {
    setDraft(createEmptyDraft(selectedDate, categories[0]?.id ?? null))
    setFormError(null)
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
  }

  function openCategoryModal() {
    setCategoryDraft(createEmptyCategoryDraft())
    setCategoryFormError(null)
    setIsCategoryModalOpen(true)
  }

  function closeCategoryModal() {
    setIsCategoryModalOpen(false)
  }

  function updateCategoryDraft<K extends keyof NewCategoryDraft>(key: K, value: NewCategoryDraft[K]) {
    setCategoryDraft((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmitCategory(event: FormEvent) {
    event.preventDefault()

    const trimmedName = categoryDraft.name.trim()
    if (!trimmedName) {
      setCategoryFormError('Category name is required.')
      return
    }
    if (categories.some((c) => c.name.toLowerCase() === trimmedName.toLowerCase())) {
      setCategoryFormError('A category with this name already exists.')
      return
    }

    const newCategory: Category = {
      id: `cat-${Date.now()}`,
      name: trimmedName,
      color: categoryDraft.color,
    }

    setCategories((prev) => [...prev, newCategory])
    // Immediately select the freshly-created category on the activity form.
    updateDraft('categoryId', newCategory.id)
    setIsCategoryModalOpen(false)
  }

  function updateDraft<K extends keyof NewActivityDraft>(key: K, value: NewActivityDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  function formatTimeLabel(time: string): string {
    const [hourStr, minuteStr] = time.split(':')
    const hour = Number(hourStr)
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 === 0 ? 12 : hour % 12
    return `${displayHour}:${minuteStr} ${period}`
  }

  function handleSubmitActivity(event: FormEvent) {
    event.preventDefault()

    const trimmedTitle = draft.title.trim()
    if (!trimmedTitle) {
      setFormError('Activity name is required.')
      return
    }
    if (draft.endDate < draft.startDate) {
      setFormError('End date cannot be before the start date.')
      return
    }
    if (!draft.isWholeDay && draft.endDate === draft.startDate && draft.endTime <= draft.startTime) {
      setFormError('End time must be after the start time.')
      return
    }

    // Expand the activity across every day in the selected range so it
    // shows up correctly on the grid and in the agenda for each date.
    const start = new Date(`${draft.startDate}T00:00:00`)
    const end = new Date(`${draft.endDate}T00:00:00`)
    const dateKeys: string[] = []
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dateKeys.push(toKey(d))
    }

    const newActivity: Activity = {
      time: draft.isWholeDay ? 'Whole day' : formatTimeLabel(draft.startTime),
      title: trimmedTitle,
      ...(draft.categoryId ? { categoryId: draft.categoryId } : {}),
    }

    setActivitiesByDate((prev) => {
      const next = { ...prev }
      dateKeys.forEach((key) => {
        next[key] = [...(next[key] ?? []), newActivity]
      })
      return next
    })

    setIsModalOpen(false)
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
                <button type="button" className="calendar-btn calendar-btn-primary" onClick={openNewActivityModal}>
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
                const dayItems = getDayItems(dateKey)
                const hasItems = dayItems.length > 0
                const dotColor = getCategoryById(dayItems.find((item) => item.categoryId)?.categoryId)?.color

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
                    {hasItems && (
                      <span
                        className="calendar-cell-dot"
                        aria-hidden="true"
                        style={dotColor ? { background: dotColor } : undefined}
                      />
                    )}
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
                        {group.activities.map((activity) => {
                          const category = getCategoryById(activity.categoryId)
                          const categoryColor = category?.color
                          const tagStyle =
                            !activity.isHoliday && categoryColor
                              ? {
                                  background: `${categoryColor}1f`,
                                  color: categoryColor,
                                }
                              : undefined

                          return (
                            <li
                              key={`${activity.time}-${activity.title}`}
                              className={
                                activity.isHoliday
                                  ? 'calendar-agenda-item calendar-agenda-item-holiday'
                                  : 'calendar-agenda-item'
                              }
                              style={
                                !activity.isHoliday && categoryColor ? { background: `${categoryColor}14` } : undefined
                              }
                            >
                              <span className="calendar-agenda-time" style={tagStyle}>
                                {activity.isHoliday ? 'Holiday' : activity.time}
                              </span>
                              <div className="calendar-agenda-details">
                                <span className="calendar-agenda-title">{activity.title}</span>
                                {category && !activity.isHoliday && (
                                  <span className="calendar-agenda-client">{category.name}</span>
                                )}
                                {activity.client && <span className="calendar-agenda-client">{activity.client}</span>}
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )
                })}
              </div>
            )}
          </aside>

          {isModalOpen && (
            <div className="calendar-modal-overlay" onClick={closeModal}>
              <div
                className="calendar-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="new-activity-title"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="calendar-modal-header">
                  <h2 className="calendar-modal-title" id="new-activity-title">
                    New activity
                  </h2>
                  <button type="button" className="calendar-modal-close" onClick={closeModal} aria-label="Close">
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSubmitActivity}>
                  <div className="calendar-modal-body">
                    <div className="calendar-field">
                      <label className="calendar-field-label" htmlFor="activity-title">
                        Activity name
                      </label>
                      <input
                        id="activity-title"
                        type="text"
                        className="calendar-input"
                        placeholder="e.g. Project Planning Session"
                        value={draft.title}
                        onChange={(e) => updateDraft('title', e.target.value)}
                        autoFocus
                      />
                    </div>

                    <div className="calendar-field-row">
                      <div className="calendar-field">
                        <label className="calendar-field-label" htmlFor="activity-start-date">
                          Start date
                        </label>
                        <input
                          id="activity-start-date"
                          type="date"
                          className="calendar-input"
                          value={draft.startDate}
                          onChange={(e) => {
                            const value = e.target.value
                            updateDraft('startDate', value)
                            if (draft.endDate < value) updateDraft('endDate', value)
                          }}
                        />
                      </div>
                      <div className="calendar-field">
                        <label className="calendar-field-label" htmlFor="activity-end-date">
                          End date
                        </label>
                        <input
                          id="activity-end-date"
                          type="date"
                          className="calendar-input"
                          value={draft.endDate}
                          min={draft.startDate}
                          onChange={(e) => updateDraft('endDate', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="calendar-checkbox-row">
                      <input
                        id="activity-whole-day"
                        type="checkbox"
                        checked={draft.isWholeDay}
                        onChange={(e) => updateDraft('isWholeDay', e.target.checked)}
                      />
                      <label htmlFor="activity-whole-day">Whole day</label>
                    </div>

                    <div className="calendar-field-row">
                      <div className="calendar-field">
                        <label className="calendar-field-label" htmlFor="activity-start-time">
                          Start time
                        </label>
                        <input
                          id="activity-start-time"
                          type="time"
                          className="calendar-input"
                          value={draft.startTime}
                          disabled={draft.isWholeDay}
                          onChange={(e) => updateDraft('startTime', e.target.value)}
                        />
                      </div>
                      <div className="calendar-field">
                        <label className="calendar-field-label" htmlFor="activity-end-time">
                          End time
                        </label>
                        <input
                          id="activity-end-time"
                          type="time"
                          className="calendar-input"
                          value={draft.endTime}
                          disabled={draft.isWholeDay}
                          onChange={(e) => updateDraft('endTime', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="calendar-field">
                      <div className="calendar-field-label-row">
                        <span className="calendar-field-label">Category</span>
                        <button type="button" className="calendar-add-category-link" onClick={openCategoryModal}>
                          + Category
                        </button>
                      </div>

                      {categories.length === 0 ? (
                        <p className="calendar-agenda-empty">
                          No categories yet. Click "+ Category" to create one.
                        </p>
                      ) : (
                        <div className="calendar-category-row">
                          {categories.map((cat) => {
                            const isSelected = draft.categoryId === cat.id
                            return (
                              <button
                                key={cat.id}
                                type="button"
                                className={
                                  isSelected ? 'calendar-category-chip calendar-category-chip-selected' : 'calendar-category-chip'
                                }
                                style={{ '--cal-chip-color': cat.color } as CSSProperties}
                                onClick={() => updateDraft('categoryId', cat.id)}
                                aria-pressed={isSelected}
                              >
                                <span className="calendar-category-chip-dot" style={{ background: cat.color }} />
                                {cat.name}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {formError && <p className="calendar-field-error">{formError}</p>}
                  </div>

                  <div className="calendar-modal-footer">
                    <button type="button" className="calendar-btn calendar-btn-ghost" onClick={closeModal}>
                      Cancel
                    </button>
                    <button type="submit" className="calendar-btn calendar-btn-primary">
                      Save activity
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {isCategoryModalOpen && (
            <div className="calendar-modal-overlay" onClick={closeCategoryModal}>
              <div
                className="calendar-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="new-category-title"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="calendar-modal-header">
                  <h2 className="calendar-modal-title" id="new-category-title">
                    New category
                  </h2>
                  <button
                    type="button"
                    className="calendar-modal-close"
                    onClick={closeCategoryModal}
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSubmitCategory}>
                  <div className="calendar-modal-body">
                    <div className="calendar-field">
                      <label className="calendar-field-label" htmlFor="category-name">
                        Category name
                      </label>
                      <input
                        id="category-name"
                        type="text"
                        className="calendar-input"
                        placeholder="e.g. Client Meeting"
                        value={categoryDraft.name}
                        onChange={(e) => updateCategoryDraft('name', e.target.value)}
                        autoFocus
                      />
                    </div>

                    <div className="calendar-field">
                      <span className="calendar-field-label">Color</span>
                      <div className="calendar-swatch-row">
                        {CATEGORY_COLORS.map((c) => {
                          const isSelected = categoryDraft.color === c.value
                          return (
                            <button
                              key={c.value}
                              type="button"
                              className={isSelected ? 'calendar-swatch calendar-swatch-selected' : 'calendar-swatch'}
                              style={{ background: c.value, '--cal-swatch-color': c.value } as CSSProperties}
                              onClick={() => updateCategoryDraft('color', c.value)}
                              aria-label={c.label}
                              aria-pressed={isSelected}
                              title={c.label}
                            >
                              {isSelected && <span className="calendar-swatch-check">✓</span>}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {categoryFormError && <p className="calendar-field-error">{categoryFormError}</p>}
                  </div>

                  <div className="calendar-modal-footer">
                    <button type="button" className="calendar-btn calendar-btn-ghost" onClick={closeCategoryModal}>
                      Cancel
                    </button>
                    <button type="submit" className="calendar-btn calendar-btn-primary">
                      Save category
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}