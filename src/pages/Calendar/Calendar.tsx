import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  onSnapshot,
  query,
  where,
  getDocs,
  writeBatch,
} from "firebase/firestore";

import { db } from "../../firebase/firebase";
import { useEffect, useMemo, useState, type FormEvent, type CSSProperties } from 'react'
import NavigationBar from '../Home/NavigationBar/NavigationBar'
import ImportActivitiesModal from './ImportActivitiesModal'
import { CATEGORY_ICONS, getIconColor } from './categoryIcons'
import './calendar_import_additions.css'
import './calendar.css'

type Activity = {
  id: string
  time: string
  endTime?: string // formatted display label, e.g. '10:00 AM'. Absent for whole-day, holidays, and legacy/imported rows that never had a structured end time.
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
  icon?: string // FontAwesome class string, e.g. 'fa-solid fa-church'. Optional so older categories without one still render fine (falls back to the color dot).
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
  icon: string // '' means "no icon" — falls back to the plain color dot
}

// Color swatches offered when creating a category. Kept short and
// distinct so they stay legible as both a dot on the grid and a tag
// in the agenda — swap/extend freely, just keep contrast against white.
const CATEGORY_COLORS = [
  { value: '#71aba5', label: 'Teal' },
  { value: '#81a5f3', label: 'Blue' },
  { value: '#b38df5', label: 'Purple' },
  { value: '#ea82b0', label: 'Pink' },
  { value: '#896ba8', label: 'Amber' },
  { value: '#eb8181', label: 'Red' },
  { value: '#78ca96', label: 'Green' },
  { value: '#9b9b9b', label: 'Slate' },
  { value: '#70bfd2', label: 'Cyan' },
  { value: '#9994f0', label: 'Indigo' },
  { value: '#a6ca73', label: 'Lime' },
  { value: '#f39e72', label: 'Orange' },
  { value: '#d9768e', label: 'Rose' },
  { value: '#c8a46f', label: 'Gold' },
  { value: '#c089f3', label: 'Violet' },
  { value: '#74b0ab', label: 'Dark Teal' },
  { value: '#7c98e8', label: 'Royal Blue' },
  { value: '#77b58e', label: 'Emerald' },
  { value: '#dc9172', label: 'Burnt Orange' },
  { value: '#b57c7c', label: 'Maroon' },
] as const

// Darkens a hex color by mixing it toward black — used to give each color
// swatch a subtly darker border in its own shade, instead of one flat
// border color that wouldn't suit every swatch equally.
function darkenColor(hex: string, amount = 0.18): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  const mix = (c: number) => Math.round(c * (1 - amount))
  return `#${[r, g, b].map((c) => mix(c).toString(16).padStart(2, '0')).join('')}`
}

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
  return { name: '', color: CATEGORY_COLORS[0].value, icon: CATEGORY_ICONS[0].value }
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
  const [activitiesByDate, setActivitiesByDate] = useState<Record<string, Activity[]>>({})
  const [categories, setCategories] = useState<Category[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [draft, setDraft] = useState<NewActivityDraft>(() => createEmptyDraft(today, null))
  const [formError, setFormError] = useState<string | null>(null)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [categoryModalView, setCategoryModalView] = useState<'create' | 'manage'>('create')
  const [categoryDraft, setCategoryDraft] = useState<NewCategoryDraft>(createEmptyCategoryDraft)
  const [categoryFormError, setCategoryFormError] = useState<string | null>(null)
  const [categoryPendingDelete, setCategoryPendingDelete] = useState<Category | null>(null)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isDeduping, setIsDeduping] = useState(false)
  const [dedupeStatus, setDedupeStatus] = useState<string | null>(null)

  // Edit/delete for individual activities. Each calendar event is its own
  // Firestore doc (multi-day activities are pre-expanded one doc per day),
  // so editing/deleting only ever touches a single occurrence — not a
  // whole date range.
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null)
  const [activityPendingDelete, setActivityPendingDelete] = useState<{ id: string; title: string } | null>(null)
  const [isDeletingActivity, setIsDeletingActivity] = useState(false)

  // Inline edit state for the manage-categories list. Only one row can be
  // in edit mode at a time; editDraft holds the in-progress name/color
  // until the user saves or cancels.
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<NewCategoryDraft>(createEmptyCategoryDraft)
  const [editFormError, setEditFormError] = useState<string | null>(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)

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

  // Scoped to the visible month only — re-subscribes whenever the user
  // navigates to a different month, instead of pulling every activity
  // ever created. 'date' is stored as 'YYYY-MM-DD', so a string range
  // query lines up correctly with calendar order.
  useEffect(() => {
    const monthStart = toKey(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1))
    const monthEnd = toKey(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0))

    const activitiesQuery = query(
      collection(db, "CALENDAR_EVENTS"),
      where("date", ">=", monthStart),
      where("date", "<=", monthEnd),
    )

    const unsubscribe = onSnapshot(
      activitiesQuery,
      (snapshot) => {

        const events: Record<string, Activity[]> = {};

        snapshot.forEach((doc) => {
          const data = doc.data();

          if (!events[data.date]) {
            events[data.date] = [];
          }

          events[data.date].push({
            id: doc.id,
            time: data.time,
            endTime: data.endTime || undefined,
            title: data.title,
            categoryId: data.categoryId
          });
        });

        setActivitiesByDate(events);
      }
    );

    return () => unsubscribe();
  }, [monthAnchor]);

  // Categories now live in Firestore so they persist across reloads and
  // across devices, the same way activities already do.
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "CATEGORIES"),
      (snapshot) => {
        const next: Category[] = []
        snapshot.forEach((docSnap) => {
          const data = docSnap.data()
          next.push({
            id: docSnap.id,
            name: data.name,
            color: data.color,
            icon: data.icon || undefined,
          })
        })
        // Keep a stable order so the chip/swatch rows don't jump around
        // every time someone edits an unrelated category.
        next.sort((a, b) => a.name.localeCompare(b.name))
        setCategories(next)
      }
    )

    return () => unsubscribe()
  }, [])

  // Combine a holiday (if any) with that day's scheduled activities.
  function getDayItems(dateKey: string): Activity[] {
    const items: Activity[] = []
    const holiday = holidays[dateKey]
    if (holiday) {
      items.push({ id: `holiday-${dateKey}`, time: 'Holiday', title: holiday.name, isHoliday: true })
    }
    items.push(...(activitiesByDate[dateKey] ?? []))
    return items
  }

  function getCategoryById(categoryId: string | undefined): Category | undefined {
    if (!categoryId) return undefined
    return categories.find((c) => c.id === categoryId)
  }

  // Renders a category's marker: its FontAwesome icon — tinted with that
  // icon's OWN fixed color (e.g. the birthday cake is always pink, the
  // trophy is always gold), independent of the category's color — when one
  // is set, otherwise the original plain category-color dot, so categories
  // created before icons existed still look right.
  function renderCategoryGlyph(cat: Category | undefined, extraClassName = '') {
    if (!cat) return null
    if (cat.icon) {
      return (
        <i
          className={`${cat.icon} calendar-category-icon ${extraClassName}`.trim()}
          style={{ color: getIconColor(cat.icon, cat.color) } as CSSProperties}
          aria-hidden="true"
        />
      )
    }
    return (
      <span
        className={`calendar-category-chip-dot ${extraClassName}`.trim()}
        style={{ background: cat.color }}
      />
    )
  }

  // Counts how many activities reference a category, across all dates —
  // used to warn the user before they delete a category that's in use.
  function countActivitiesUsingCategory(categoryId: string): number {
    let count = 0
    Object.values(activitiesByDate).forEach((activities) => {
      activities.forEach((activity) => {
        if (activity.categoryId === categoryId) count += 1
      })
    })
    return count
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
  // Order matters: the delete confirmation sits on top of the category
  // modal, which sits on top of the activity modal.
  useEffect(() => {
    if (!isModalOpen && !isCategoryModalOpen && !isImportModalOpen && !activityPendingDelete) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (activityPendingDelete) cancelDeleteActivity()
      else if (categoryPendingDelete) setCategoryPendingDelete(null)
      else if (editingCategoryId) cancelEditCategory()
      else if (isCategoryModalOpen) setIsCategoryModalOpen(false)
      else if (isImportModalOpen) setIsImportModalOpen(false)
      else closeModal()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isModalOpen, isCategoryModalOpen, isImportModalOpen, categoryPendingDelete, editingCategoryId, activityPendingDelete])

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
    setEditingActivityId(null)
    setDraft(createEmptyDraft(selectedDate, categories[0]?.id ?? null))
    setFormError(null)
    setIsModalOpen(true)
  }

  // Inverse of formatTimeLabel — turns a stored display label like
  // "2:30 PM" back into a 24-hour "HH:MM" string for the <input type="time">
  // field. Falls back to a sane default if the label doesn't match (e.g.
  // "Whole day", or anything unexpected from older data).
  function parseTimeLabel(label: string): string {
    const match = label.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
    if (!match) return '09:00'
    let hour = Number(match[1])
    const minute = match[2]
    const period = match[3].toUpperCase()
    if (period === 'PM' && hour !== 12) hour += 12
    if (period === 'AM' && hour === 12) hour = 0
    return `${String(hour).padStart(2, '0')}:${minute}`
  }

  // Used to seed a sensible End time default when editing an older/imported
  // activity that has a start time but never had a stored end time.
  function addOneHour(time24: string): string {
    const [hourStr, minuteStr] = time24.split(':')
    const hour = (Number(hourStr) + 1) % 24
    return `${String(hour).padStart(2, '0')}:${minuteStr}`
  }

  function openEditActivityModal(activity: Activity, dateKey: string) {
    const isWholeDay = activity.time === 'Whole day'
    const startTime = isWholeDay ? '09:00' : parseTimeLabel(activity.time)
    setDraft({
      title: activity.title,
      startDate: dateKey,
      endDate: dateKey,
      startTime,
      // Older/imported activities may not have a stored end time — fall
      // back to an hour after the start so the field still has a sensible,
      // valid value if the user enables it.
      endTime: isWholeDay ? '10:00' : activity.endTime ? parseTimeLabel(activity.endTime) : addOneHour(startTime),
      isWholeDay,
      categoryId: activity.categoryId ?? null,
    })
    setEditingActivityId(activity.id)
    setFormError(null)
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setEditingActivityId(null)
  }

  function requestDeleteActivity(activity: Activity) {
    setActivityPendingDelete({ id: activity.id, title: activity.title })
  }

  function cancelDeleteActivity() {
    setActivityPendingDelete(null)
  }

  async function confirmDeleteActivity() {
    if (!activityPendingDelete) return
    setIsDeletingActivity(true)
    try {
      await deleteDoc(doc(db, 'CALENDAR_EVENTS', activityPendingDelete.id))
    } catch (err) {
      window.alert('Could not delete activity. Please try again.')
    } finally {
      setIsDeletingActivity(false)
      setActivityPendingDelete(null)
    }
  }

  function openImportModal() {
    setIsImportModalOpen(true)
  }

  function closeImportModal() {
    setIsImportModalOpen(false)
  }

  // ---- Temporary one-time utility: remove exact-duplicate activities ----
  // Scans EVERY CALENDAR_EVENTS doc (not just the visible month), groups
  // them by their full content, and deletes all but one copy of each
  // group. Meant to clean up the effects of an accidental double-import;
  // safe to remove this block once you've run it and confirmed it's clean.
  async function handleRemoveDuplicates() {
    const confirmed = window.confirm(
      'This will scan ALL activities (every month) and permanently delete exact duplicates, keeping one copy of each. This cannot be undone. Continue?'
    )
    if (!confirmed) return

    setIsDeduping(true)
    setDedupeStatus('Scanning all activities…')

    try {
      const snapshot = await getDocs(collection(db, 'CALENDAR_EVENTS'))

      const groups = new Map<string, { id: string; createdAtMs: number }[]>()
      snapshot.forEach((docSnap) => {
        const data = docSnap.data()
        const key = [
          data.date ?? '',
          data.time ?? '',
          data.endTime ?? '',
          data.title ?? '',
          data.categoryId ?? '',
          data.inCharge ?? '',
          data.place ?? '',
          data.budget ?? '',
        ].join('|')

        const createdAtMs: number = data.createdAt?.toMillis ? data.createdAt.toMillis() : 0
        const list = groups.get(key) ?? []
        list.push({ id: docSnap.id, createdAtMs })
        groups.set(key, list)
      })

      const idsToDelete: string[] = []
      for (const entries of groups.values()) {
        if (entries.length <= 1) continue
        // Keep the oldest copy (earliest createdAt), delete the rest.
        entries.sort((a, b) => a.createdAtMs - b.createdAtMs)
        for (const extra of entries.slice(1)) idsToDelete.push(extra.id)
      }

      if (idsToDelete.length === 0) {
        setDedupeStatus('No duplicates found — your activities are already clean.')
        return
      }

      const BATCH_LIMIT = 450
      let deleted = 0
      for (let i = 0; i < idsToDelete.length; i += BATCH_LIMIT) {
        const chunk = idsToDelete.slice(i, i + BATCH_LIMIT)
        const batch = writeBatch(db)
        for (const id of chunk) batch.delete(doc(db, 'CALENDAR_EVENTS', id))
        await batch.commit()
        deleted += chunk.length
        setDedupeStatus(`Deleted ${deleted} of ${idsToDelete.length} duplicates…`)
      }

      setDedupeStatus(`Done — removed ${deleted} duplicate ${deleted === 1 ? 'activity' : 'activities'}.`)
    } catch (err) {
      setDedupeStatus('Something went wrong while removing duplicates. Please try again.')
    } finally {
      setIsDeduping(false)
    }
  }

  function openCategoryModal() {
    setCategoryDraft(createEmptyCategoryDraft())
    setCategoryFormError(null)
    setCategoryModalView('create')
    setCategoryPendingDelete(null)
    cancelEditCategory()
    setIsCategoryModalOpen(true)
  }

  function openManageCategories() {
    setCategoryFormError(null)
    setCategoryPendingDelete(null)
    setCategoryModalView('manage')
    cancelEditCategory()
    setIsCategoryModalOpen(true)
  }

  function closeCategoryModal() {
    setIsCategoryModalOpen(false)
    setCategoryPendingDelete(null)
    cancelEditCategory()
  }

  function requestDeleteCategory(category: Category) {
    if (editingCategoryId === category.id) cancelEditCategory()
    setCategoryPendingDelete(category)
  }

  function cancelDeleteCategory() {
    setCategoryPendingDelete(null)
  }

  async function confirmDeleteCategory() {
    if (!categoryPendingDelete) return
    const deletedId = categoryPendingDelete.id

    try {
      await deleteDoc(doc(db, "CATEGORIES", deletedId))
    } catch (err) {
      // If the delete fails, keep the confirmation dialog state so the
      // user can see something went wrong rather than silently no-op-ing.
      setCategoryFormError('Could not delete category. Please try again.')
      return
    }

    // If the activity form currently has this category selected, clear it.
    // Existing saved activities keep their categoryId; since that id no
    // longer resolves to a category, they'll just render as uncategorized.
    if (draft.categoryId === deletedId) {
      updateDraft('categoryId', null)
    }

    setCategoryPendingDelete(null)
  }

  function updateCategoryDraft<K extends keyof NewCategoryDraft>(key: K, value: NewCategoryDraft[K]) {
    setCategoryDraft((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmitCategory(event: FormEvent) {
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

    try {
      const newDocRef = await addDoc(collection(db, "CATEGORIES"), {
        name: trimmedName,
        color: categoryDraft.color,
        icon: categoryDraft.icon || null,
        createdAt: serverTimestamp(),
      })
      // Immediately select the freshly-created category on the activity form.
      updateDraft('categoryId', newDocRef.id)
      setIsCategoryModalOpen(false)
    } catch (err) {
      setCategoryFormError('Could not save category. Please try again.')
    }
  }

  function startEditCategory(category: Category) {
    setCategoryPendingDelete(null)
    setEditingCategoryId(category.id)
    setEditDraft({ name: category.name, color: category.color, icon: category.icon ?? '' })
    setEditFormError(null)
  }

  function cancelEditCategory() {
    setEditingCategoryId(null)
    setEditDraft(createEmptyCategoryDraft())
    setEditFormError(null)
    setIsSavingEdit(false)
  }

  function updateEditDraft<K extends keyof NewCategoryDraft>(key: K, value: NewCategoryDraft[K]) {
    setEditDraft((prev) => ({ ...prev, [key]: value }))
  }

  async function saveEditCategory(categoryId: string) {
    const trimmedName = editDraft.name.trim()
    if (!trimmedName) {
      setEditFormError('Category name is required.')
      return
    }
    if (
      categories.some(
        (c) => c.id !== categoryId && c.name.toLowerCase() === trimmedName.toLowerCase(),
      )
    ) {
      setEditFormError('A category with this name already exists.')
      return
    }

    setIsSavingEdit(true)
    try {
      // categoryId on activities is unaffected — they just look up the
      // (now updated) name/color the next time they render.
      await updateDoc(doc(db, "CATEGORIES", categoryId), {
        name: trimmedName,
        color: editDraft.color,
        icon: editDraft.icon || null,
      })
      cancelEditCategory()
    } catch (err) {
      setIsSavingEdit(false)
      setEditFormError('Could not save changes. Please try again.')
    }
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

  // What actually shows in the agenda/grid for an activity's time slot:
  // the full range when an end time was saved, otherwise just the single
  // stored label (covers "Whole day", holidays, and older/imported rows
  // that never had a structured end time).
  function formatActivityTimeRange(activity: Activity): string {
    if (activity.isHoliday) return 'Holiday'
    if (activity.time === 'Whole day') return 'Whole day'
    if (activity.endTime) return `${activity.time} \u2013 ${activity.endTime}`
    return activity.time
  }

  async function handleSubmitActivity(event: FormEvent){
    event.preventDefault()

    const trimmedTitle = draft.title.trim()
    if (!trimmedTitle) {
      setFormError('Activity name is required.')
      return
    }

    // Edit mode: update the single existing doc in place — no date-range
    // expansion, since one occurrence is exactly one Firestore doc.
    if (editingActivityId) {
      if (!draft.isWholeDay && draft.endTime <= draft.startTime) {
        setFormError('End time must be after the start time.')
        return
      }

      try {
        await updateDoc(doc(db, 'CALENDAR_EVENTS', editingActivityId), {
          title: trimmedTitle,
          date: draft.startDate,
          time: draft.isWholeDay ? 'Whole day' : formatTimeLabel(draft.startTime),
          endTime: draft.isWholeDay ? null : formatTimeLabel(draft.endTime),
          categoryId: draft.categoryId,
        })
      } catch (err) {
        setFormError('Could not save changes. Please try again.')
        return
      }

      // If the edited date falls outside the visible month, jump there so
      // the change is actually visible — same convention as the import flow.
      const [y, m] = draft.startDate.split('-').map(Number)
      if (y !== monthAnchor.getFullYear() || m - 1 !== monthAnchor.getMonth()) {
        setMonthAnchor(new Date(y, m - 1, 1))
      }

      setIsModalOpen(false)
      setEditingActivityId(null)
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

    for (const key of dateKeys) {
      await addDoc(
        collection(db, "CALENDAR_EVENTS"),
        {
          title: trimmedTitle,
          date: key,
          time: draft.isWholeDay
            ? "Whole day"
            : formatTimeLabel(draft.startTime),
          endTime: draft.isWholeDay ? null : formatTimeLabel(draft.endTime),
          categoryId: draft.categoryId,
          createdAt: serverTimestamp()
        }
      );
    }

    setIsModalOpen(false);
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
                <button type="button" className="calendar-btn calendar-btn-ghost" onClick={openImportModal}>
                  Import from Excel
                </button>
                <button
                  type="button"
                  className="calendar-btn calendar-btn-ghost"
                  onClick={handleRemoveDuplicates}
                  disabled={isDeduping}
                  title="One-time cleanup: removes exact-duplicate activities created by an accidental double-import"
                >
                  {isDeduping ? 'Removing duplicates…' : 'Remove Duplicates'}
                </button>
                <button type="button" className="calendar-btn calendar-btn-primary" onClick={openNewActivityModal}>
                  + New activity
                </button>
              </div>
            </header>
            {dedupeStatus && (
              <p className="calendar-import-hint" style={{ margin: '0 0 12px' } as CSSProperties}>
                {dedupeStatus}
              </p>
            )}

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
                const itemCount = dayItems.length

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
                    itemCount > 1 ? (
                      <span
                        className="calendar-cell-badge"
                        aria-hidden="true"
                        style={dotColor && !isSelected ? { background: dotColor } : undefined}
                      >
                        +{itemCount}
                      </span>
                    ) : (
                      <span
                        className="calendar-cell-dot"
                        aria-hidden="true"
                        style={dotColor && !isSelected ? { background: dotColor } : undefined}
                      />
                    )
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
                              ? { color: categoryColor }
                              : undefined

                          return (
                            <li
                              key={activity.id}
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
                                {formatActivityTimeRange(activity)}
                              </span>
                              <div className="calendar-agenda-details">
                                <span className="calendar-agenda-title">{activity.title}</span>
                                {category && !activity.isHoliday && (
                                  <span className="calendar-agenda-client calendar-agenda-category">
                                    {renderCategoryGlyph(category, 'calendar-category-icon-inline')}
                                    {category.name}
                                  </span>
                                )}
                                {activity.client && <span className="calendar-agenda-client">{activity.client}</span>}
                              </div>
                              {!activity.isHoliday && (
                                <div className="calendar-agenda-item-actions">
                                  <button
                                    type="button"
                                    className="calendar-agenda-action calendar-agenda-action-edit"
                                    onClick={() => openEditActivityModal(activity, group.dateKey)}
                                    aria-label={`Edit ${activity.title}`}
                                    title="Edit"
                                  >
                                    <i className="fa-solid fa-pen" aria-hidden="true" />
                                  </button>
                                  <button
                                    type="button"
                                    className="calendar-agenda-action calendar-agenda-action-delete"
                                    onClick={() => requestDeleteActivity(activity)}
                                    aria-label={`Delete ${activity.title}`}
                                    title="Delete"
                                  >
                                    <i className="fa-solid fa-trash" aria-hidden="true" />
                                  </button>
                                </div>
                              )}
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
                    {editingActivityId ? 'Edit activity' : 'New activity'}
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
                          {editingActivityId ? 'Date' : 'Start date'}
                        </label>
                        <input
                          id="activity-start-date"
                          type="date"
                          className="calendar-input"
                          value={draft.startDate}
                          onChange={(e) => {
                            const value = e.target.value
                            updateDraft('startDate', value)
                            if (editingActivityId || draft.endDate < value) updateDraft('endDate', value)
                          }}
                        />
                      </div>
                      {!editingActivityId && (
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
                      )}
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
                        <div className="calendar-field-label-actions">
                          <button type="button" className="calendar-add-category-link" onClick={openCategoryModal}>
                            + Category
                          </button>
                          {categories.length > 0 && (
                            <button type="button" className="calendar-add-category-link" onClick={openManageCategories}>
                              Manage
                            </button>
                          )}
                        </div>
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
                                {renderCategoryGlyph(cat)}
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
                      {editingActivityId ? 'Save changes' : 'Save activity'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activityPendingDelete && (
            <div className="calendar-confirm-overlay" onClick={cancelDeleteActivity}>
              <div className="calendar-confirm-box" onClick={(e) => e.stopPropagation()}>
                <p className="calendar-confirm-text">
                  Delete <strong>{activityPendingDelete.title}</strong>? This cannot be undone.
                </p>
                <div className="calendar-confirm-actions">
                  <button type="button" className="calendar-btn calendar-btn-ghost" onClick={cancelDeleteActivity}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="calendar-btn calendar-btn-danger"
                    onClick={confirmDeleteActivity}
                    disabled={isDeletingActivity}
                  >
                    {isDeletingActivity ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {isImportModalOpen && (
            <ImportActivitiesModal
              categories={categories}
              onClose={closeImportModal}
              onImported={(firstImportedDate) => {
                // Categories list updates on its own via the CATEGORIES
                // onSnapshot listener; activities for the visible month
                // refresh the same way via CALENDAR_EVENTS. But the
                // CALENDAR_EVENTS listener is scoped to whatever month is
                // currently on screen — if the import landed in a
                // different month, jump there so the result is actually
                // visible instead of looking like nothing happened.
                if (firstImportedDate) {
                  const [y, m] = firstImportedDate.split('-').map(Number)
                  setMonthAnchor(new Date(y, m - 1, 1))
                }
              }}
            />
          )}

          {isCategoryModalOpen && (
            <div className="calendar-modal-overlay" onClick={closeCategoryModal}>
              <div
                className="calendar-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="category-modal-title"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="calendar-modal-header">
                  <h2 className="calendar-modal-title" id="category-modal-title">
                    {categoryModalView === 'manage' ? 'Manage categories' : 'New category'}
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

                {categoryModalView === 'manage' ? (
                  <>
                    <div className="calendar-modal-body">
                      {categories.length === 0 ? (
                        <p className="calendar-agenda-empty">No categories yet.</p>
                      ) : (
                        <ul className="calendar-manage-list">
                          {categories.map((cat) => {
                            const usageCount = countActivitiesUsingCategory(cat.id)
                            const isEditing = editingCategoryId === cat.id

                            if (isEditing) {
                              return (
                                <li key={cat.id} className="calendar-manage-row calendar-manage-row-editing">
                                  <div className="calendar-manage-edit-form">
                                    <input
                                      type="text"
                                      className="calendar-input"
                                      value={editDraft.name}
                                      onChange={(e) => updateEditDraft('name', e.target.value)}
                                      placeholder="Category name"
                                      autoFocus
                                    />
                                    <div className="calendar-swatch-row">
                                      {CATEGORY_COLORS.map((c) => {
                                        const isColorSelected = editDraft.color === c.value
                                        return (
                                          <button
                                            key={c.value}
                                            type="button"
                                            className={
                                              isColorSelected ? 'calendar-swatch calendar-swatch-selected' : 'calendar-swatch'
                                            }
                                            style={{ background: c.value, borderColor: darkenColor(c.value), '--cal-swatch-color': c.value } as CSSProperties}
                                            onClick={() => updateEditDraft('color', c.value)}
                                            aria-label={c.label}
                                            aria-pressed={isColorSelected}
                                            title={c.label}
                                          >
                                            {isColorSelected && <span className="calendar-swatch-check">✓</span>}
                                          </button>
                                        )
                                      })}
                                    </div>
                                    <div className="calendar-icon-row">
                                      {CATEGORY_ICONS.map((ic) => {
                                        const isIconSelected = editDraft.icon === ic.value
                                        return (
                                          <button
                                            key={ic.value || 'none'}
                                            type="button"
                                            className={
                                              isIconSelected ? 'calendar-icon-swatch calendar-icon-swatch-selected' : 'calendar-icon-swatch'
                                            }
                                            onClick={() => updateEditDraft('icon', ic.value)}
                                            aria-label={ic.label}
                                            aria-pressed={isIconSelected}
                                            title={ic.label}
                                          >
                                            {ic.value ? (
                                              <i className={ic.value} style={{ color: ic.color } as CSSProperties} />
                                            ) : (
                                              <span className="calendar-icon-swatch-none">—</span>
                                            )}
                                          </button>
                                        )
                                      })}
                                    </div>
                                    {editFormError && <p className="calendar-field-error">{editFormError}</p>}
                                    <div className="calendar-manage-edit-actions">
                                      <button
                                        type="button"
                                        className="calendar-btn calendar-btn-ghost"
                                        onClick={cancelEditCategory}
                                        disabled={isSavingEdit}
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        className="calendar-btn calendar-btn-primary"
                                        onClick={() => saveEditCategory(cat.id)}
                                        disabled={isSavingEdit}
                                      >
                                        {isSavingEdit ? 'Saving…' : 'Save'}
                                      </button>
                                    </div>
                                  </div>
                                </li>
                              )
                            }

                            return (
                              <li key={cat.id} className="calendar-manage-row">
                                {renderCategoryGlyph(cat)}
                                <span className="calendar-manage-row-name">{cat.name}</span>
                                {usageCount > 0 && (
                                  <span className="calendar-manage-row-count">
                                    {usageCount} {usageCount === 1 ? 'activity' : 'activities'}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  className="calendar-manage-row-edit"
                                  onClick={() => startEditCategory(cat)}
                                  aria-label={`Edit ${cat.name}`}
                                  title={`Edit ${cat.name}`}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="calendar-manage-row-delete"
                                  onClick={() => requestDeleteCategory(cat)}
                                  aria-label={`Delete ${cat.name}`}
                                  title={`Delete ${cat.name}`}
                                >
                                  ✕
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>

                    <div className="calendar-modal-footer">
                      <button
                        type="button"
                        className="calendar-btn calendar-btn-ghost"
                        onClick={() => {
                          setCategoryDraft(createEmptyCategoryDraft())
                          setCategoryFormError(null)
                          cancelEditCategory()
                          setCategoryModalView('create')
                        }}
                      >
                        + New category
                      </button>
                      <button type="button" className="calendar-btn calendar-btn-primary" onClick={closeCategoryModal}>
                        Done
                      </button>
                    </div>
                  </>
                ) : (
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
                                style={{ background: c.value, borderColor: darkenColor(c.value), '--cal-swatch-color': c.value } as CSSProperties}
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

                      <div className="calendar-field">
                        <span className="calendar-field-label">Icon (optional)</span>
                        <div className="calendar-icon-row">
                          {CATEGORY_ICONS.map((ic) => {
                            const isIconSelected = categoryDraft.icon === ic.value
                            return (
                              <button
                                key={ic.value || 'none'}
                                type="button"
                                className={
                                  isIconSelected ? 'calendar-icon-swatch calendar-icon-swatch-selected' : 'calendar-icon-swatch'
                                }
                                onClick={() => updateCategoryDraft('icon', ic.value)}
                                aria-label={ic.label}
                                aria-pressed={isIconSelected}
                                title={ic.label}
                              >
                                {ic.value ? (
                                  <i className={ic.value} style={{ color: ic.color } as CSSProperties} />
                                ) : (
                                  <span className="calendar-icon-swatch-none">—</span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {categoryFormError && <p className="calendar-field-error">{categoryFormError}</p>}
                    </div>

                    <div className="calendar-modal-footer">
                      {categories.length > 0 && (
                        <button
                          type="button"
                          className="calendar-btn calendar-btn-ghost"
                          onClick={() => {
                            setCategoryFormError(null)
                            setCategoryModalView('manage')
                          }}
                        >
                          Back to list
                        </button>
                      )}
                      <button type="submit" className="calendar-btn calendar-btn-primary">
                        Save category
                      </button>
                    </div>
                  </form>
                )}

                {categoryPendingDelete && (
                  <div className="calendar-confirm-overlay" onClick={cancelDeleteCategory}>
                    <div className="calendar-confirm-box" onClick={(e) => e.stopPropagation()}>
                      <p className="calendar-confirm-text">
                        Delete <strong>{categoryPendingDelete.name}</strong>?
                        {countActivitiesUsingCategory(categoryPendingDelete.id) > 0 && (
                          <>
                            {' '}
                            {countActivitiesUsingCategory(categoryPendingDelete.id)}{' '}
                            {countActivitiesUsingCategory(categoryPendingDelete.id) === 1 ? 'activity' : 'activities'} using
                            this category will become uncategorized.
                          </>
                        )}
                      </p>
                      <div className="calendar-confirm-actions">
                        <button type="button" className="calendar-btn calendar-btn-ghost" onClick={cancelDeleteCategory}>
                          Cancel
                        </button>
                        <button type="button" className="calendar-btn calendar-btn-danger" onClick={confirmDeleteCategory}>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}