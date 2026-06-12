import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocsFromServer } from 'firebase/firestore';
import { auth, db } from '../../../../../../firebase/firebase';
import { MONTHS } from '../pledgesTable/PledgesUtils';

interface FirestoreUser {
  id: string;
  userId: number;
  name: string;
}

interface PledgeFiltersProps {
  selectedUser: number;
  setSelectedUser: (id: number) => void;
  curMonth: number;
  setCurMonth: (month: number) => void;
  curYear: number;
  setCurYear: (year: number) => void;
  years: number[];
  exportCSV: () => void;
  setSelectedUserName: (name: string) => void;
}

export default function PledgeFilters({
  selectedUser, setSelectedUser,
  curMonth, setCurMonth,
  curYear, setCurYear,
  years, exportCSV,
  setSelectedUserName
}: PledgeFiltersProps) {
  const [users, setUsers] = useState<FirestoreUser[]>([]);

  async function fetchUsers() {
    try {
      const snapshot = await getDocsFromServer(collection(db, 'MEMBERS'));

      const seen = new Set<number>();
      const list: FirestoreUser[] = [];

      snapshot.forEach(doc => {
        const d = doc.data();
        if (d.isPledger && d.userId && !seen.has(d.userId)) {
          seen.add(d.userId);
          list.push({
            id: doc.id,
            userId: d.userId,
            name: `${d.firstName} ${d.lastName}`
          });
        }
      });

      setUsers(list);
      if (list.length > 0) {
        setSelectedUser(list[0].userId);
        setSelectedUserName(list[0].name);
      }
    } catch (err: any) {
      console.error('Firestore error:', err?.message);
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchUsers();
      }
    });
    return () => unsub();
  }, []);

  return (
    <div className="filters">
      <select value={selectedUser} onChange={e => {
        const selected = users.find(u => u.userId === Number(e.target.value));
        setSelectedUser(Number(e.target.value));
        setSelectedUserName(selected?.name ?? '');
      }}>
        {users.length === 0 ? (
          <option disabled>Loading...</option>
        ) : (
          users.map(u => (
            <option key={u.id} value={u.userId}>{u.name}</option>
          ))
        )}
      </select>

      <select value={curMonth} onChange={e => setCurMonth(Number(e.target.value))}>
        {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
      </select>

      <select value={curYear} onChange={e => setCurYear(Number(e.target.value))}>
        {years.map(y => <option key={y} value={y}>{y}</option>)}
      </select>

      <button className="export-btn" onClick={exportCSV}>Export CSV</button>
    </div>
  );
}