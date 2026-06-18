import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocsFromServer } from 'firebase/firestore';
import { auth, db } from '../../../../../../firebase/firebase';
import { MONTHS } from '../pledgesTable/PledgesUtils';
import ManagePledgersModal from '../ManagePledgersModal/ManagePledgersModal';

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
  canManage: boolean;
}

export default function PledgeFilters({
  selectedUser, setSelectedUser,
  curMonth, setCurMonth,
  curYear, setCurYear,
  years, exportCSV,
  setSelectedUserName,
  canManage,
}: PledgeFiltersProps) {
  const [users, setUsers] = useState<FirestoreUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  async function fetchUsers() {
    try {
      const snapshot = await getDocsFromServer(collection(db, 'MEMBERS'));

      const seen = new Set<number>();
      const list: FirestoreUser[] = [];

      snapshot.forEach(doc => {
        const d = doc.data();
        if (d.isPledger && d.userId && !seen.has(d.userId) && !d.isArchived) {
          seen.add(d.userId);
          list.push({
            id: doc.id,
            userId: d.userId,
            name: `${d.firstName} ${d.lastName}`
          });
        }
      });

      setUsers(list);
    } catch (err: any) {
      console.error('Firestore error:', err?.message);
    } finally {
      setLoadingUsers(false);
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) fetchUsers();
    });
    return () => unsub();
  }, []);

  return (
    <>
      <div className="filters">
        <select value={selectedUser} onChange={e => {
          const selected = users.find(u => u.userId === Number(e.target.value));
          setSelectedUser(Number(e.target.value));
          setSelectedUserName(selected?.name ?? '');
        }}>
          <option value="">-- Select Member --</option>
          {loadingUsers ? (
            <option disabled>Loading...</option>
          ) : users.length === 0 ? (
            <option disabled>No pledgers found</option>
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

        {canManage && (
          <button
            className="manage-pledgers-btn"
            onClick={() => setModalOpen(true)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              strokeLinejoin="round" aria-hidden="true">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Manage Pledgers
          </button>
        )}

        <button className="export-btn" onClick={exportCSV}>Export CSV</button>
      
      </div>

      <ManagePledgersModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onPledgersUpdated={fetchUsers}
      />

      
    </>
  );
}