import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase/firebase.ts"; // adjust path if needed
import NavigationBar from "../Home/NavigationBar/NavigationBar";
import "./SundaySchoolAttendance.css";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

const MONTHS_SHORT = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec"
];

const MEMBERS_COLLECTION_NAME = "MEMBERS";

interface Member {
  id: string;
  name: string;
}

export default function SundaySchoolAttendance() {

  const now = new Date();

  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [attendance, setAttendance] = useState<Record<string, Record<string, Record<number, boolean>>>>({});
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
          if (fullName) list.push({ id: docSnap.id, name: fullName });
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

  const toggleAttendance = (memberId: string, day: number) => {

    setAttendance(prev => {
      const monthData = prev[monthKey] ?? {};
      const memberData = monthData[memberId] ?? {};

      return {
        ...prev,
        [monthKey]: {
          ...monthData,
          [memberId]: {
            ...memberData,
            [day]: !memberData[day],
          },
        },
      };
    });

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

              {loadingMembers ? (

                <div className="empty-state">Loading members...</div>

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