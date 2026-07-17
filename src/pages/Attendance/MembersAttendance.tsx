import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where, doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase/firebase.ts"; // adjust path if needed
import NavigationBar from "../Home/NavigationBar/NavigationBar";
import "./MembersAttendance.css";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

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

function computeAge(dateOfBirth?: string): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age >= 0 ? age : null;
}

export default function MembersAttendance() {

  const navigate = useNavigate();
  const now = new Date();

  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [attendance, setAttendance] = useState<Record<string, Record<string, Record<number, boolean>>>>({});
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  const getSundays = (year: number, month: number) => {
    const sundays: number[] = [];
    const date = new Date(year, month, 1);

    while (date.getMonth() === month) {
      if (date.getDay() === 0) {
        sundays.push(date.getDate());
      }
      date.setDate(date.getDate() + 1);
    }

    return sundays;
  };

  const monthKey = `${viewYear}-${viewMonth}`;
  const sundays = getSundays(viewYear, viewMonth);

  // Fetch members from Firestore (MEMBERS collection), excluding archived
  // members. Same pattern used in SundaySchoolLineUp for consistency.
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
        console.error("Failed to load members for attendance:", err);
      } finally {
        if (!cancelled) setLoadingMembers(false);
      }
    }

    loadMembers();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch attendance for the currently viewed month from Firestore
  // (MEMBERS_ATTENDANCE collection), one document per member per month.
  useEffect(() => {
    let cancelled = false;

    async function loadAttendance() {
      setLoadingAttendance(true);
      try {
        const q = query(
          collection(db, ATTENDANCE_COLLECTION_NAME),
          where("monthKey", "==", monthKey)
        );
        const snapshot = await getDocs(q);
        const monthData: Record<string, Record<number, boolean>> = {};

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as {
            memberId?: string;
            days?: Record<string, boolean>;
          };
          if (!data.memberId) return;
          const days: Record<number, boolean> = {};
          if (data.days) {
            Object.entries(data.days).forEach(([dayStr, val]) => {
              days[Number(dayStr)] = !!val;
            });
          }
          monthData[data.memberId] = days;
        });

        if (!cancelled) {
          setAttendance(prev => ({
            ...prev,
            [monthKey]: monthData,
          }));
        }
      } catch (err) {
        console.error("Failed to load attendance:", err);
      } finally {
        if (!cancelled) setLoadingAttendance(false);
      }
    }

    loadAttendance();
    return () => {
      cancelled = true;
    };
  }, [monthKey]);

  const toggleAttendance = async (memberId: string, day: number) => {

    const previousValue = attendance[monthKey]?.[memberId]?.[day] ?? false;
    const newValue = !previousValue;

    // Optimistic local update
    setAttendance(prev => {
      const monthData = prev[monthKey] ?? {};
      const memberData = monthData[memberId] ?? {};

      return {
        ...prev,
        [monthKey]: {
          ...monthData,
          [memberId]: {
            ...memberData,
            [day]: newValue,
          },
        },
      };
    });

    // Persist to Firestore (MEMBERS_ATTENDANCE collection)
    try {
      const docId = `${memberId}_${monthKey}`;
      const attendanceDocRef = doc(db, ATTENDANCE_COLLECTION_NAME, docId);
      await setDoc(
        attendanceDocRef,
        {
          memberId,
          monthKey,
          year: viewYear,
          month: viewMonth,
          days: { [day]: newValue },
        },
        { merge: true }
      );
    } catch (err) {
      console.error("Failed to save attendance:", err);
      // Revert local state if the save failed
      setAttendance(prev => {
        const monthData = prev[monthKey] ?? {};
        const memberData = monthData[memberId] ?? {};

        return {
          ...prev,
          [monthKey]: {
            ...monthData,
            [memberId]: {
              ...memberData,
              [day]: previousValue,
            },
          },
        };
      });
    }

  };

  return (
    <div className="app-layout">

      <NavigationBar />

      <main className="main-content">

       

          <div className="masthead">

            <div>
              <div className="eyebrow">Attendance Record</div>
              <h1>Attendance Tracker</h1>
            </div>

            <button className="btn-add-member" onClick={() => navigate('/Profile/new')}>
              <i className="fa-solid fa-user-plus" aria-hidden="true" />
              Add Member
            </button>

          </div>

          <div className="card">

            <div className="month-nav">

              <div className="nav-group">

                <button
                  className="nav-btn"
                  onClick={() => {
                    if (viewMonth === 0) {
                      setViewMonth(11);
                      setViewYear(viewYear - 1);
                    } else {
                      setViewMonth(viewMonth - 1);
                    }
                  }}
                >
                  ‹
                </button>

                <div className="label">
                  {MONTHS[viewMonth]} {viewYear}
                  <span className="count">
                    {" "}
                    {sundays.length} Sundays
                  </span>
                </div>

                <button
                  className="nav-btn"
                  onClick={() => {
                    if (viewMonth === 11) {
                      setViewMonth(0);
                      setViewYear(viewYear + 1);
                    } else {
                      setViewMonth(viewMonth + 1);
                    }
                  }}
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

                <div className="empty-state">Loading attendance...</div>

              ) : filteredMembers.length === 0 ? (

                <div className="empty-state">
                  {searchTerm ? "No members match your search." : "No members found."}
                </div>

              ) : (

              <table>

                <thead>

                  <tr>

                    <th>Member</th>

                    {sundays.map(day => (
                      <th key={day}>
                        Sun {MONTHS_SHORT[viewMonth]} {day}
                      </th>
                    ))}

                    <th>Total</th>

                  </tr>

                </thead>

                <tbody>

                  {filteredMembers.map(member => {

                    const total =
                      sundays.filter(day =>
                        attendance[monthKey]?.[member.id]?.[day]
                      ).length;

                    return (
                      <tr key={member.id}>

                        <td>{member.name}</td>

                        {sundays.map(day => (

                          <td key={day}>

                            <button
                              className={
                                attendance[monthKey]?.[member.id]?.[day]
                                  ? "chk checked"
                                  : "chk"
                              }
                              onClick={() =>
                                toggleAttendance(member.id, day)
                              }
                            >
                              {attendance[monthKey]?.[member.id]?.[day] ? "✓" : ""}
                            </button>

                          </td>

                        ))}

                        <td>{total}/{sundays.length}</td>

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