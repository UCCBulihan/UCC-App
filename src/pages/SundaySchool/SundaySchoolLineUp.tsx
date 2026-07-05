import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  collection,
  deleteDoc,
  doc,
  documentId,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "../../firebase/firebase.ts"; 
import NavigationBar from '../Home/NavigationBar/NavigationBar.tsx';
import { useCurrentUserRole } from './useCurrentUserRole.ts'; // adjust path to wherever you place the hook
import './SundaySchoolLineUp.css';

interface SundayEntry {
  teacher: string;
  assistants: string[];
  topic: string;
}

type RosterData = Record<string, SundayEntry>; // key: "YYYY-MM-DD"

interface MemberOption {
  id: string;
  fullName: string;
}

const COLLECTION_NAME = "SUNDAYSCHOOLLINEUP";
const MEMBERS_COLLECTION_NAME = "MEMBERS";
const MAX_NAME_LENGTH = 80;
const MAX_TOPIC_LENGTH = 120;
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const ORDINALS = ["First Sunday", "Second Sunday", "Third Sunday", "Fourth Sunday", "Fifth Sunday"];
const COLLAPSE_THRESHOLD = 3;
const MAX_SUGGESTIONS = 8;

// Module-level cache so navigating to/from this page within the same
// session doesn't re-read the whole Members collection every time —
// only once per MEMBERS_CACHE_TTL_MS window, shared across mounts.
const MEMBERS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let membersCache: MemberOption[] | null = null;
let membersCacheAt = 0;

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function dateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
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

/**
 * Text input with a name-suggestion dropdown sourced from the Members list.
 * Typing filters the list; clicking (or arrow keys + Enter) fills the input
 * with the selected member's full name. Free text is still allowed — this
 * is a suggestion helper, not a hard-locked select.
 */
function MemberAutocompleteInput({
  value,
  onChange,
  placeholder,
  maxLength,
  disabled,
  title,
  members,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  title?: string;
  members: MemberOption[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    const list = q
      ? members.filter((m) => m.fullName.toLowerCase().includes(q))
      : members;
    return list.slice(0, MAX_SUGGESTIONS);
  }, [value, members]);

  useEffect(() => {
    setActiveIndex(0);
  }, [suggestions.length, isOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectMember(name: string) {
    onChange(name);
    setIsOpen(false);
  }

  return (
    <div className="ssl-autocomplete-wrap" ref={wrapRef}>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(e) => {
          if (!isOpen || suggestions.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            selectMember(suggestions[activeIndex].fullName);
          } else if (e.key === "Escape") {
            setIsOpen(false);
          }
        }}
        className="ssl-input"
        disabled={disabled}
        title={title}
      />
      {isOpen && !disabled && suggestions.length > 0 && (
        <div className="ssl-autocomplete-dropdown" role="listbox">
          {suggestions.map((m, i) => (
            <div
              key={m.id}
              role="option"
              aria-selected={i === activeIndex}
              className={"ssl-autocomplete-item" + (i === activeIndex ? " is-active" : "")}
              // onMouseDown (not onClick) fires before the input's onBlur,
              // so the selection registers before the dropdown closes.
              onMouseDown={(e) => {
                e.preventDefault();
                selectMember(m.fullName);
              }}
              onMouseEnter={() => setActiveIndex(i)}
            >
              {m.fullName}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SundaySchoolLineUp() {
  // Line-Up (teacher/assistant/topic assignments) is scheduling/admin
  // responsibility — Admin/Moderator only, same bar as the Ledger.
  // Member and Viewer both get read-only access here.
  const { canManageLineUp } = useCurrentUserRole();

  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const [roster, setRoster] = useState<RosterData>({});
  const [loading, setLoading] = useState(true);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState({ text: "", visible: false, saving: false });
  const [members, setMembers] = useState<MemberOption[]>([]);

  // Per-day debounce timers, so editing one Sunday doesn't reset another's save timer.
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout> | undefined>>({});
  const statusHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // One-time fetch (not a live listener) of the Members list, for the
  // teacher/assistant name suggestion dropdown. Archived members are
  // excluded. Result is cached at module scope for MEMBERS_CACHE_TTL_MS,
  // so re-visiting this page within that window costs zero extra reads —
  // the list doesn't need to be second-by-second live for autocomplete.
  useEffect(() => {
    let cancelled = false;

    async function loadMembers() {
      const isFresh = membersCache && Date.now() - membersCacheAt < MEMBERS_CACHE_TTL_MS;
      if (isFresh) {
        setMembers(membersCache as MemberOption[]);
        return;
      }
      try {
        const q = query(collection(db, MEMBERS_COLLECTION_NAME), where("isArchived", "==", false));
        const snapshot = await getDocs(q);
        const list: MemberOption[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Record<string, unknown>;
          const fullName = [data.firstName, data.lastName]
            .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
            .join(" ")
            .trim();
          if (fullName) list.push({ id: docSnap.id, fullName });
        });
        list.sort((a, b) => a.fullName.localeCompare(b.fullName));
        membersCache = list;
        membersCacheAt = Date.now();
        if (!cancelled) setMembers(list);
      } catch (err) {
        console.error("Failed to load members for name suggestions:", err);
      }
    }

    loadMembers();
    return () => {
      cancelled = true;
    };
  }, []);

  // Live-subscribe to this month's Sunday documents.
  useEffect(() => {
    setLoading(true);
    const startKey = dateKey(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
    const endKey = dateKey(viewYear, viewMonth, lastDay);

    const q = query(
      collection(db, COLLECTION_NAME),
      where(documentId(), ">=", startKey),
      where(documentId(), "<=", endKey),
      orderBy(documentId())
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setRoster((prev) => {
          const next = { ...prev };
          snapshot.forEach((docSnap) => {
            const key = docSnap.id;
            // Don't let a server echo clobber an edit that's still pending save.
            if (saveTimers.current[key]) return;
            const data = docSnap.data() as Partial<SundayEntry>;
            next[key] = {
              teacher: data.teacher ?? "",
              assistants:
                Array.isArray(data.assistants) && data.assistants.length
                  ? (data.assistants as string[])
                  : [""],
              topic: data.topic ?? "",
            };
          });
          return next;
        });
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load Sunday School roster:", err);
        showStatus("Couldn't load data");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [viewYear, viewMonth, showStatus]);

  const persistDay = useCallback(
    async (key: string, entry: SundayEntry) => {
      if (!canManageLineUp) {
        console.warn('Blocked roster save: current role (Viewer) is read-only.');
        return;
      }
      const cleaned = {
        teacher: entry.teacher.trim().slice(0, MAX_NAME_LENGTH),
        assistants: entry.assistants
          .map((a) => a.trim().slice(0, MAX_NAME_LENGTH))
          .filter((a) => a.length > 0),
        topic: entry.topic.trim().slice(0, MAX_TOPIC_LENGTH),
      };
      const isEntirelyEmpty =
        !cleaned.teacher && cleaned.assistants.length === 0 && !cleaned.topic;

      showStatus("Saving...", true);
      try {
        if (isEntirelyEmpty) {
          // Nothing left to keep for this Sunday — remove the doc instead of
          // leaving a blank record behind.
          await deleteDoc(doc(db, COLLECTION_NAME, key)).catch(() => {});
        } else {
          await setDoc(
            doc(db, COLLECTION_NAME, key),
            {
              date: key,
              ...cleaned,
              updatedBy: auth.currentUser?.displayName ?? auth.currentUser?.email ?? null,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        }
        showStatus("Saved");
      } catch (err) {
        console.error("Failed to save Sunday entry:", err);
        showStatus("Couldn't save, try again");
      } finally {
        delete saveTimers.current[key];
      }
    },
    [showStatus, canManageLineUp]
  );

  const updateEntry = useCallback(
    (day: number, updater: (entry: SundayEntry) => SundayEntry) => {
      const key = dateKey(viewYear, viewMonth, day);
      setRoster((prev) => {
        const current = prev[key] ?? emptyEntry();
        const next = { ...prev, [key]: updater(current) };
        if (saveTimers.current[key]) clearTimeout(saveTimers.current[key]);
        saveTimers.current[key] = setTimeout(() => persistDay(key, next[key]), 600);
        return next;
      });
    },
    [viewYear, viewMonth, persistDay]
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
            <button type="button" onClick={goPrev} aria-label="Previous month" className="ssl-iconbtn">
              <i className="fa-solid fa-chevron-left" aria-hidden="true" />
            </button>
            <div className="ssl-month-label">
              {MONTHS[viewMonth]} {viewYear}
            </div>
            <button type="button" onClick={goNext} aria-label="Next month" className="ssl-iconbtn">
              <i className="fa-solid fa-chevron-right" aria-hidden="true" />
            </button>
            <button type="button" onClick={goToday} className="ssl-todaybtn">
              Today
            </button>
          </div>
        </div>

        <div className="ssl-card">
          {loading ? (
            <div className="ssl-empty">Loading...</div>
          ) : sundays.length === 0 ? (
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
                      <MemberAutocompleteInput
                        value={entry.teacher}
                        placeholder="Teacher's name"
                        maxLength={MAX_NAME_LENGTH}
                        members={members}
                        onChange={(value) => {
                          updateEntry(day, (en) => ({ ...en, teacher: value }));
                        }}
                        disabled={!canManageLineUp}
                        title={!canManageLineUp ? 'View only' : undefined}
                      />
                    </div>

                    <div className="ssl-field">
                      <label className="ssl-label">Assistant Teacher(s)</label>
                      {visibleAssistants.map((value, aIdx) => (
                        <div key={aIdx} className="ssl-assistant-row">
                          <MemberAutocompleteInput
                            value={value}
                            placeholder="Assistant teacher's name"
                            maxLength={MAX_NAME_LENGTH}
                            members={members}
                            onChange={(v) => {
                              updateEntry(day, (en) => {
                                const assistants = [...en.assistants];
                                assistants[aIdx] = v;
                                return { ...en, assistants };
                              });
                            }}
                            disabled={!canManageLineUp}
                            title={!canManageLineUp ? 'View only' : undefined}
                          />
                          {entry.assistants.length > 1 && canManageLineUp && (
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

                      {canManageLineUp && (
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
                      )}
                    </div>

                    <div className="ssl-field">
                      <label className="ssl-label">Lesson Topic</label>
                      <input
                        type="text"
                        value={entry.topic}
                        placeholder="Topic title"
                        maxLength={MAX_TOPIC_LENGTH}
                        onChange={(e) => {
                          const value = e.target.value;
                          updateEntry(day, (en) => ({ ...en, topic: value }));
                        }}
                        className="ssl-input"
                        disabled={!canManageLineUp}
                        title={!canManageLineUp ? 'View only' : undefined}
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