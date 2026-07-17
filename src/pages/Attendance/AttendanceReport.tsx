import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase/firebase.ts"; // adjust path if needed
import NavigationBar from "../Home/NavigationBar/NavigationBar";
import "./AttendanceReport.css";

const MONTHS_SHORT = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec"
];

const MEMBERS_COLLECTION_NAME = "MEMBERS";
const ATTENDANCE_COLLECTION_NAME = "MEMBERS_ATTENDANCE";

interface Member {
  id: string;
  name: string;
}

// month -> count of Sundays that fall in it, for a given year
function getSundaysInMonth(year: number, month: number): number {
  let count = 0;
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    if (date.getDay() === 0) count++;
    date.setDate(date.getDate() + 1);
  }
  return count;
}

export default function AttendanceReport() {

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());

  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  // memberId -> month(0-11) -> count of Sundays attended that month
  const [monthlyCounts, setMonthlyCounts] = useState<Record<string, Record<number, number>>>({});
  const [loadingAttendance, setLoadingAttendance] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");

  const sundaysPerMonth = MONTHS_SHORT.map((_, month) => getSundaysInMonth(viewYear, month));
  const totalSundaysInYear = sundaysPerMonth.reduce((sum, n) => sum + n, 0);

  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  // Fetch members (same pattern used across the app)
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
        const counts: Record<string, Record<number, number>> = {};

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as {
            memberId?: string;
            month?: number;
            days?: Record<string, boolean>;
          };
          if (!data.memberId || data.month === undefined) return;

          const attendedCount = data.days
            ? Object.values(data.days).filter(Boolean).length
            : 0;

          if (!counts[data.memberId]) counts[data.memberId] = {};
          counts[data.memberId][data.month] = attendedCount;
        });

        if (!cancelled) setMonthlyCounts(counts);
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

  const getMemberTotal = (memberId: string) => {
    const memberMonths = monthlyCounts[memberId] ?? {};
    return Object.values(memberMonths).reduce((sum, n) => sum + n, 0);
  };

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

            {loadingMembers || loadingAttendance ? (

              <div className="empty-state">Loading report...</div>

            ) : filteredMembers.length === 0 ? (

              <div className="empty-state">
                {searchTerm ? "No members match your search." : "No members found."}
              </div>

            ) : (

            <table>

              <thead>
                <tr>
                  <th>Member</th>
                  {MONTHS_SHORT.map((label) => (
                    <th key={label}>{label}</th>
                  ))}
                  <th>Total</th>
                  <th>%</th>
                </tr>
              </thead>

              <tbody>

                {filteredMembers.map((member) => {
                  const total = getMemberTotal(member.id);
                  const percentage = totalSundaysInYear > 0
                    ? Math.round((total / totalSundaysInYear) * 100)
                    : 0;

                  return (
                    <tr key={member.id}>

                      <td>{member.name}</td>

                      {MONTHS_SHORT.map((_, monthIndex) => {
                        const attended = monthlyCounts[member.id]?.[monthIndex] ?? 0;
                        const possible = sundaysPerMonth[monthIndex];
                        return (
                          <td key={monthIndex} className="count-cell">
                            {possible > 0 ? `${attended}/${possible}` : "—"}
                          </td>
                        );
                      })}

                      <td className="total-cell">{total}/{totalSundaysInYear}</td>
                      <td className="pct-cell">{percentage}%</td>

                    </tr>
                  );
                })}

              </tbody>

            </table>

            )}

          </div>

        </div>

      </main>

    </div>
  );
}
