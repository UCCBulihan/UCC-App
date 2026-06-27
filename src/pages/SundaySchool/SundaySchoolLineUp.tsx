import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import NavigationBar from '../Home/NavigationBar/NavigationBar'
import './SundaySchoolLineUp.css';

/* -------------------------------------------------------------------------
 * SundaySchoolLineUp
 * -------------------------------------------------------------------------
 * Styled to match the existing UCC App design system (Members page):
 * white cards, gray-50 inputs, blue-600 primary accent.
 * Headings use Merriweather (700), body/UI uses Source Sans 3 — both
 * already loaded globally via the Google Fonts link in index.html.
 * Icons use Font Awesome 6 classes, already loaded via CDN in index.html.
 * Styling lives in ./SundaySchoolLineUp.css (plain CSS, no Tailwind).
 *
 * `.app-layout` / `.main-content` are assumed to already be styled
 * globally (reused by other pages like Members), so they are NOT
 * redefined here — only the `ssl-*` classes below are new.
 *
 * INTEGRATION POINTS (optional — component works standalone without them):
 *   - `initialData`   : hydrate with roster data you've already fetched
 *                        from your backend.
 *   - `onSave`        : called ~600ms after the user stops typing, with
 *                        the current month's data. Wire this to your
 *                        API/DB call. If omitted, falls back to
 *                        localStorage so it still works on its own.
 *   - `onMonthChange` : called whenever the visible month changes, so
 *                        you can fetch that month's data if needed.
 * ---------------------------------------------------------------------- */

export interface SundayEntry {
  teacher: string;
  assistants: string[];
  topic: string;
}

export type RosterData = Record<string, SundayEntry>; // key: "YYYY-MM-DD"

export interface SundaySchoolLineUpProps {
  initialData?: RosterData;
  onSave?: (monthKey: string, monthData: RosterData) => void | Promise<void>;
  onMonthChange?: (year: number, month: number) => void; // month is 0-indexed
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const ORDINALS = ["First Sunday", "Second Sunday", "Third Sunday", "Fourth Sunday", "Fifth Sunday"];
const COLLAPSE_THRESHOLD = 3;
const LOCAL_STORAGE_KEY = "ucc-app:sunday-school-roster";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function dateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}
function monthKeyOf(year: number, month: number) {
  return `${year}-${pad(month + 1)}`;
}
function getSundays(year: number, month: number): number[] {
  const days: number[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    if (new Date(year, month, d).getDay() === 0) days.push(d);
  }
  return days;
}
function emptyEntry(): SundayEntry {
  return { teacher: "", assistants: [""], topic: "" };
}

export default function SundaySchoolLineUp({
  initialData,
  onSave,
  onMonthChange,
}: SundaySchoolLineUpProps = {}) {
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const [roster, setRoster] = useState<RosterData>(() => {
    if (initialData) return initialData;
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      } catch {
        /* ignore malformed cache */
      }
    }
    return {};
  });

  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState({ text: "", visible: false, saving: false });

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initialData) {
      setRoster((prev) => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  useEffect(() => {
    onMonthChange?.(viewYear, viewMonth);
  }, [viewYear, viewMonth, onMonthChange]);

  const sundays = useMemo(() => getSundays(viewYear, viewMonth), [viewYear, viewMonth]);

  const showStatus = useCallback((text: string, saving = false) => {
    setStatus({ text, visible: true, saving });
    if (statusHideTimer.current) clearTimeout(statusHideTimer.current);
    if (!saving) {
      statusHideTimer.current = setTimeout(() => {
        setStatus((s) => ({ ...s, visible: false }));
      }, 1800);
    }
  }, []);

  const persist = useCallback(
    async (nextRoster: RosterData) => {
      const mKey = monthKeyOf(viewYear, viewMonth);
      const monthSlice: RosterData = {};
      sundays.forEach((d) => {
        const k = dateKey(viewYear, viewMonth, d);
        if (nextRoster[k]) monthSlice[k] = nextRoster[k];
      });

      showStatus("Saving...", true);
      try {
        if (onSave) {
          await onSave(mKey, monthSlice);
        } else if (typeof window !== "undefined") {
          window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextRoster));
        }
        showStatus("Saved");
      } catch {
        showStatus("Couldn't save, try again");
      }
    },
    [viewYear, viewMonth, sundays, onSave, showStatus]
  );

  const updateEntry = useCallback(
    (day: number, updater: (entry: SundayEntry) => SundayEntry) => {
      setRoster((prev) => {
        const key = dateKey(viewYear, viewMonth, day);
        const current = prev[key] ?? emptyEntry();
        const next = { ...prev, [key]: updater(current) };
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => persist(next), 600);
        return next;
      });
    },
    [viewYear, viewMonth, persist]
  );

  function goToMonth(year: number, month: number) {
    setViewYear(year);
    setViewMonth(month);
    setStatus((s) => ({ ...s, visible: false }));
  }
  function goPrev() {
    let m = viewMonth - 1, y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    goToMonth(y, m);
  }
  function goNext() {
    let m = viewMonth + 1, y = viewYear;
    if (m > 11) { m = 0; y += 1; }
    goToMonth(y, m);
  }
  function goToday() {
    goToMonth(today.getFullYear(), today.getMonth());
  }

  return (
    <div className="app-layout">
      <NavigationBar />
      <main className="main-content">
        <div className="ssl-header">
          <div>
            <h1 className="ssl-title">Sunday School</h1>
            <p className="ssl-subtitle">
              {sundays.length} Sunday{sundays.length !== 1 ? "s" : ""} this month
            </p>
          </div>

          <div className="ssl-monthnav">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous month"
              className="ssl-iconbtn"
            >
              <i className="fa-solid fa-chevron-left" aria-hidden="true" />
            </button>
            <div className="ssl-month-label">
              {MONTHS[viewMonth]} {viewYear}
            </div>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next month"
              className="ssl-iconbtn"
            >
              <i className="fa-solid fa-chevron-right" aria-hidden="true" />
            </button>
            <button type="button" onClick={goToday} className="ssl-todaybtn">
              Today
            </button>
          </div>
        </div>

        <div className="ssl-card">
          {sundays.length === 0 ? (
            <div className="ssl-empty">No Sundays this month.</div>
          ) : (
            sundays.map((day, idx) => {
              const key = dateKey(viewYear, viewMonth, day);
              const entry = roster[key] ?? emptyEntry();
              const isToday =
                viewYear === today.getFullYear() &&
                viewMonth === today.getMonth() &&
                day === today.getDate();
              const isExpanded =
                !!expandedDays[key] || entry.assistants.length <= COLLAPSE_THRESHOLD;
              const visibleAssistants = isExpanded
                ? entry.assistants
                : entry.assistants.slice(0, COLLAPSE_THRESHOLD);

              return (
                <div key={key} className="ssl-row">
                  <div className="ssl-badge-col">
                    <div className={"ssl-date-circle" + (isToday ? " is-today" : "")}>
                      {day}
                    </div>
                    <span className="ssl-ordinal">
                      {ORDINALS[idx] ?? `${idx + 1}th Sunday`}
                    </span>
                  </div>

                  <div className="ssl-fields">
                    <p className="ssl-date-text">
                      Sunday, {MONTHS[viewMonth]} {day}, {viewYear}
                    </p>

                    <div className="ssl-field">
                      <label className="ssl-label">Teacher</label>
                      <input
                        type="text"
                        value={entry.teacher}
                        placeholder="Teacher's name"
                        onChange={(e) => {
                          const value = e.target.value;
                          updateEntry(day, (en) => ({ ...en, teacher: value }));
                        }}
                        className="ssl-input"
                      />
                    </div>

                    <div className="ssl-field">
                      <label className="ssl-label">Assistant Teacher(s)</label>
                      {visibleAssistants.map((value, aIdx) => (
                        <div key={aIdx} className="ssl-assistant-row">
                          <input
                            type="text"
                            value={value}
                            placeholder="Assistant teacher's name"
                            onChange={(e) => {
                              const v = e.target.value;
                              updateEntry(day, (en) => {
                                const assistants = [...en.assistants];
                                assistants[aIdx] = v;
                                return { ...en, assistants };
                              });
                            }}
                            className="ssl-input"
                          />
                          {entry.assistants.length > 1 && (
                            <button
                              type="button"
                              aria-label="Remove assistant teacher"
                              onClick={() => {
                                updateEntry(day, (en) => {
                                  const assistants = en.assistants.filter((_, i) => i !== aIdx);
                                  return { ...en, assistants: assistants.length ? assistants : [""] };
                                });
                              }}
                              className="ssl-remove-btn"
                            >
                              <i className="fa-solid fa-xmark" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      ))}

                      {entry.assistants.length > COLLAPSE_THRESHOLD && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedDays((prev) => ({ ...prev, [key]: !isExpanded }))
                          }
                          className="ssl-toggle-link"
                        >
                          {isExpanded ? "Show less" : `Show all (${entry.assistants.length})`}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setExpandedDays((prev) => ({ ...prev, [key]: true }));
                          updateEntry(day, (en) => ({ ...en, assistants: [...en.assistants, ""] }));
                        }}
                        className="ssl-add-link"
                      >
                        <i className="fa-solid fa-plus" aria-hidden="true" /> Add another assistant
                      </button>
                    </div>

                    <div className="ssl-field">
                      <label className="ssl-label">Lesson Topic</label>
                      <input
                        type="text"
                        value={entry.topic}
                        placeholder="Topic title"
                        onChange={(e) => {
                          const value = e.target.value;
                          updateEntry(day, (en) => ({ ...en, topic: value }));
                        }}
                        className="ssl-input"
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}

          <div className="ssl-footer">
            <span>Changes are saved automatically</span>
            <span
              className={
                "ssl-status" +
                (status.visible ? " is-visible" : "") +
                (status.saving ? " is-saving" : " is-saved")
              }
            >
              {status.text}
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}