import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase/firebase.ts"; // adjust path if needed
import NavigationBar from "../Home/NavigationBar/NavigationBar";
import "./SundaySchoolMembersAttendance.css";

const MONTHS_SHORT = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec"
];

const MEMBERS_COLLECTION_NAME = "MEMBERS";
const ATTENDANCE_COLLECTION_NAME = "MEMBERS_ATTENDANCE";

// Number of consecutive missed Sundays before a member is flagged for follow-up
const FOLLOW_UP_THRESHOLD = 3;

interface Member {
  id: string;
  name: string;
}

interface SundayRef {
  month: number; // 0-11
  day: number;
}

function getSundaysInMonth(year: number, month: number): number[] {
  const days: number[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    if (date.getDay() === 0) days.push(date.getDate());
    date.setDate(date.getDate() + 1);
  }
  return days;
}

export default function AttendanceReport() {

  const now = new Date();
  const isCurrentYear = (year: number) => year === now.getFullYear();

  const [viewYear, setViewYear] = useState(now.getFullYear());

  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  // memberId -> month(0-11) -> day -> attended
  const [attendanceDays, setAttendanceDays] = useState<Record<string, Record<number, Record<number, boolean>>>>({});
  const [loadingAttendance, setLoadingAttendance] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");

  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  // All Sundays for the viewed year, per month, chronological.
  const sundaysByMonth = useMemo(
    () => MONTHS_SHORT.map((_, month) => getSundaysInMonth(viewYear, month)),
    [viewYear]
  );

  // Sundays that have "already happened" as of today — for a past year, that's
  // every Sunday; for the current year, only up to and including today.
  const elapsedSundays: SundayRef[] = useMemo(() => {
    const list: SundayRef[] = [];
    sundaysByMonth.forEach((days, month) => {
      days.forEach((day) => {
        const date = new Date(viewYear, month, day);
        if (!isCurrentYear(viewYear) || date <= now) {
          list.push({ month, day });
        }
      });
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sundaysByMonth, viewYear]);

  const totalSundaysInYear = sundaysByMonth.reduce((sum, days) => sum + days.length, 0);

  // Fetch members
  useEffect(() => {
    let cancelled = false;

    async function loadMembers() {
      try {
        const q = query(
          collection(db, MEMBERS_COLLECTION_NAME),
          where("isArchived", "==", false)
        );
        const snapshot = await getDocs(q);
        const list: Member[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Record<string, unknown>;
          const fullName = [data.firstName, data.lastName]
            .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
            .join(" ")
            .trim();
          if (fullName) {
            list.push({ id: docSnap.id, name: fullName });
          }
        });
        list.sort((a, b) => a.name.localeCompare(b.name));
        if (!cancelled) setMembers(list);
      } catch (err) {
        console.error("Failed to load members for attendance report:", err);
      } finally {
        if (!cancelled) setLoadingMembers(false);
      }
    }

    loadMembers();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch every attendance doc for the selected year (one doc per member per month)
  useEffect(() => {
    let cancelled = false;

    async function loadAttendance() {
      setLoadingAttendance(true);
      try {
        const q = query(
          collection(db, ATTENDANCE_COLLECTION_NAME),
          where("year", "==", viewYear)
        );
        const snapshot = await getDocs(q);
        const data: Record<string, Record<number, Record<number, boolean>>> = {};

        snapshot.forEach((docSnap) => {
          const docData = docSnap.data() as {
            memberId?: string;
            month?: number;
            days?: Record<string, boolean>;
          };
          if (!docData.memberId || docData.month === undefined) return;

          const dayMap: Record<number, boolean> = {};
          if (docData.days) {
            Object.entries(docData.days).forEach(([dayStr, val]) => {
              dayMap[Number(dayStr)] = !!val;
            });
          }

          if (!data[docData.memberId]) data[docData.memberId] = {};
          data[docData.memberId][docData.month] = dayMap;
        });

        if (!cancelled) setAttendanceDays(data);
      } catch (err) {
        console.error("Failed to load attendance report data:", err);
      } finally {
        if (!cancelled) setLoadingAttendance(false);
      }
    }

    loadAttendance();
    return () => {
      cancelled = true;
    };
  }, [viewYear]);

  const wasPresent = (memberId: string, month: number, day: number) =>
    !!attendanceDays[memberId]?.[month]?.[day];

  const getMonthCount = (memberId: string, month: number) => {
    const days = sundaysByMonth[month];
    return days.filter((day) => wasPresent(memberId, month, day)).length;
  };

  const getMemberStats = (memberId: string) => {
    const total = MONTHS_SHORT.reduce((sum, _label, month) => sum + getMonthCount(memberId, month), 0);

    // Consecutive absences, counted backwards from the most recent elapsed Sunday.
    let consecutiveAbsences = 0;
    for (let i = elapsedSundays.length - 1; i >= 0; i--) {
      const { month, day } = elapsedSundays[i];
      if (wasPresent(memberId, month, day)) break;
      consecutiveAbsences++;
    }

    const isPerfect = elapsedSundays.length > 0 &&
      elapsedSundays.every(({ month, day }) => wasPresent(memberId, month, day));

    return { total, consecutiveAbsences, isPerfect };
  };

  const currentMonthIndex = now.getMonth();
  const showThisMonthStats = isCurrentYear(viewYear);

  // Sort members by how active they are — most Sundays attended this month
  // (or, for a past year, across the whole year) first, least active last.
  const sortedMembers = useMemo(() => {
    const scored = members.map((m) => {
      const score = showThisMonthStats
        ? getMonthCount(m.id, currentMonthIndex)
        : getMemberStats(m.id).total;
      return { member: m, score };
    });
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.member.name.localeCompare(b.member.name);
    });
    return scored.map((s) => s.member);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, attendanceDays, showThisMonthStats, currentMonthIndex]);

  const filteredMembers = sortedMembers.filter((m) =>
    m.name.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedMembers = filteredMembers.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  // Reset to page 1 whenever the search term or year changes so the user
  // doesn't get stuck on an out-of-range page.
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, viewYear]);

  const totalMembers = members.length;

  const activeThisMonth = showThisMonthStats
    ? members.filter((m) => getMonthCount(m.id, currentMonthIndex) > 0).length
    : null;
  const inactiveThisMonth = showThisMonthStats && activeThisMonth !== null
    ? totalMembers - activeThisMonth
    : null;

  const yearAttendanceRate = useMemo(() => {
    if (elapsedSundays.length === 0 || totalMembers === 0) return 0;
    const possible = elapsedSundays.length * totalMembers;
    const attended = members.reduce((sum, m) => {
      return sum + elapsedSundays.filter(({ month, day }) => wasPresent(m.id, month, day)).length;
    }, 0);
    return Math.round((attended / possible) * 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, elapsedSundays, attendanceDays]);

  const perfectAttendanceCount = useMemo(
    () => members.filter((m) => getMemberStats(m.id).isPerfect).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [members, elapsedSundays, attendanceDays]
  );

  const needsFollowUpCount = useMemo(
    () => members.filter((m) => getMemberStats(m.id).consecutiveAbsences >= FOLLOW_UP_THRESHOLD).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [members, elapsedSundays, attendanceDays]
  );

  const isTodaySunday = now.getDay() === 0;
  const presentTodayCount = (showThisMonthStats && isTodaySunday)
    ? members.filter((m) => wasPresent(m.id, now.getMonth(), now.getDate())).length
    : null;

  // Monthly trend: attendance % per month across all members, for the bar chart.
  const monthlyTrend = useMemo(() => {
    return MONTHS_SHORT.map((label, month) => {
      const possible = sundaysByMonth[month].length * totalMembers;
      const attended = members.reduce((sum, m) => sum + getMonthCount(m.id, month), 0);
      const pct = possible > 0 ? Math.round((attended / possible) * 100) : 0;
      return { label, pct };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, attendanceDays, sundaysByMonth, totalMembers]);

  const isLoading = loadingMembers || loadingAttendance;

  return (
    <div className="app-layout">

      <NavigationBar />

      <main className="main-content">

        <div className="masthead">
          <div>
            <div className="eyebrow">Attendance Report</div>
            <h1>Yearly Attendance Summary</h1>
          </div>
        </div>

        {!isLoading && (
          <div className="stats-grid">

            <div className="stat-card">
              <div className="stat-icon icon-purple"><i className="fa-solid fa-users" aria-hidden="true"></i></div>
              <div className="stat-value">{totalMembers}</div>
              <div className="stat-label">Total Members</div>
            </div>

            <div className="stat-card">
              <div className="stat-icon icon-blue"><i className="fa-solid fa-arrow-trend-up" aria-hidden="true"></i></div>
              <div className="stat-value">{yearAttendanceRate}%</div>
              <div className="stat-label">Attendance Rate ({viewYear})</div>
            </div>

            <div className="stat-card">
              <div className="stat-icon icon-active"><i className="fa-solid fa-calendar-check" aria-hidden="true"></i></div>
              <div className="stat-value">{activeThisMonth ?? "—"}</div>
              <div className="stat-label">Active This Month</div>
            </div>

            <div className="stat-card">
              <div className="stat-icon icon-inactive"><i className="fa-solid fa-calendar-xmark" aria-hidden="true"></i></div>
              <div className="stat-value">{inactiveThisMonth ?? "—"}</div>
              <div className="stat-label">Inactive This Month</div>
            </div>

            <div className="stat-card">
              <div className={`stat-icon ${presentTodayCount !== null ? "icon-green" : "icon-inactive"}`}>
                <i className="fa-solid fa-calendar-day" aria-hidden="true"></i>
              </div>
              <div className="stat-value">{presentTodayCount ?? "—"}</div>
              <div className="stat-label">Present Today</div>
              {presentTodayCount === null && (
                <div className="stat-caption">
                  {!showThisMonthStats ? "Viewing another year" : "No service today"}
                </div>
              )}
            </div>

            <div className="stat-card">
              <div className="stat-icon icon-gold"><i className="fa-solid fa-star" aria-hidden="true"></i></div>
              <div className="stat-value">{perfectAttendanceCount}</div>
              <div className="stat-label">Perfect Attendance</div>
            </div>

            <div className="stat-card stat-card-warning">
              <div className="stat-icon icon-warning"><i className="fa-solid fa-arrow-trend-down" aria-hidden="true"></i></div>
              <div className="stat-value">{needsFollowUpCount}</div>
              <div className="stat-label">Needs Follow-up ({FOLLOW_UP_THRESHOLD}+ absences)</div>
            </div>

          </div>
        )}

        {!isLoading && (
          <div className="card trend-card">
            <div className="trend-title"><i className="fa-solid fa-chart-column" aria-hidden="true"></i> Monthly Attendance Trend — {viewYear}</div>
            <div className="trend-chart">
              {monthlyTrend.map(({ label, pct }) => (
                <div className="trend-bar-col" key={label}>
                  <div className="trend-bar-track">
                    <div
                      className="trend-bar-fill"
                      style={{ height: `${Math.max(pct, 2)}%` }}
                      title={`${label}: ${pct}%`}
                    />
                  </div>
                  <div className="trend-bar-label">{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card">

          <div className="report-nav">

            <div className="nav-group">

              <button
                className="nav-btn"
                onClick={() => setViewYear(viewYear - 1)}
              >
                ‹
              </button>

              <div className="label">
                {viewYear}
                <span className="count"> {totalSundaysInYear} Sundays</span>
              </div>

              <button
                className="nav-btn"
                onClick={() => setViewYear(viewYear + 1)}
              >
                ›
              </button>

            </div>

            <input
              type="text"
              className="search-input"
              placeholder="Search member..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

          </div>

          <div className="table-scroll">

            {isLoading ? (

              <div className="empty-state">Loading report...</div>

            ) : filteredMembers.length === 0 ? (

              <div className="empty-state">
                {searchTerm ? "No members match your search." : "No members found."}
              </div>

            ) : (
            <>
            <table>

              <thead>
                <tr>
                  <th>Member</th>
                  {MONTHS_SHORT.map((label) => (
                    <th key={label}>{label}</th>
                  ))}
                  <th>Total</th>
                  <th>%</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>

                {paginatedMembers.map((member) => {
                  const { total, consecutiveAbsences, isPerfect } = getMemberStats(member.id);
                  const percentage = totalSundaysInYear > 0
                    ? Math.round((total / totalSundaysInYear) * 100)
                    : 0;
                  const needsFollowUp = consecutiveAbsences >= FOLLOW_UP_THRESHOLD;

                  const pctClass = percentage >= 75 ? "pct-good" : percentage >= 40 ? "pct-mid" : "pct-low";

                  return (
                    <tr key={member.id} className={needsFollowUp ? "row-flagged" : ""}>

                      <td className="member-cell">{member.name}</td>

                      {MONTHS_SHORT.map((_, monthIndex) => {
                        const attended = getMonthCount(member.id, monthIndex);
                        const possible = sundaysByMonth[monthIndex].length;
                        return (
                          <td key={monthIndex} className="count-cell">
                            {possible > 0 ? `${attended}/${possible}` : "—"}
                          </td>
                        );
                      })}

                      <td className="total-cell">{total}/{totalSundaysInYear}</td>
                      <td className={`pct-cell ${pctClass}`}>{percentage}%</td>
                      <td className="status-cell">
                        {isPerfect && <span className="badge badge-perfect"><i className="fa-solid fa-star" aria-hidden="true"></i> Perfect</span>}
                        {needsFollowUp && <span className="badge badge-warning"><i className="fa-solid fa-arrow-trend-down" aria-hidden="true"></i> Follow-up</span>}
                        {!isPerfect && !needsFollowUp && <span className="badge-neutral">—</span>}
                      </td>

                    </tr>
                  );
                })}

              </tbody>

            </table>

            <div className="pagination">
              <div className="pagination-info">
                Showing {(safePage - 1) * ITEMS_PER_PAGE + 1}
                –{Math.min(safePage * ITEMS_PER_PAGE, filteredMembers.length)} of {filteredMembers.length} members
              </div>
              <div className="pagination-controls">
                <button
                  className="page-btn"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage(safePage - 1)}
                >
                  ‹ Prev
                </button>
                <span className="page-indicator">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  className="page-btn"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage(safePage + 1)}
                >
                  Next ›
                </button>
              </div>
            </div>
            </>
            )}

          </div>

        </div>

      </main>

    </div>
  );
}