import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { getDocs, collection, updateDoc, doc, getDocsFromServer } from 'firebase/firestore';
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

// async function addTestUser() {
//   try {
//     const docRef = await addDoc(collection(db, 'PLEDGES'), {
//       userId: 1,
//       userName: 'Test User'
//     });
//     console.log('Added doc ID:', docRef.id);
//   } catch (err: any) {
//     console.error('Error:', err?.message);
//   }
// }

// async function fixDocument() {
//   const docRef = doc(db, 'PLEDGES', '1JYcRQmStfY3UnKajCOH');
//   await updateDoc(docRef, {
//     'amount': 100,        // walang space
//     'modifiedBy': 'Test User',  // walang space
//     'dateModified': new Date('2026-06-08'),  // walang space
//   });
//   console.log('Fixed!');
// }

async function fetchUsers() {
  try {
    
    console.log('Fetching users...');
     console.log('DB app:', (db as any)._databaseId);
     const snapshot = await getDocsFromServer(collection(db, 'PLEDGES'));
    console.log('Size:', snapshot.size);
    console.log('Size:', snapshot.size);
    console.log('Empty:', snapshot.empty);
    
    snapshot.forEach(doc => {
      console.log('Doc data:', doc.data()); 
    });

    const seen = new Set<number>();
    const list: FirestoreUser[] = [];
    snapshot.forEach(doc => {
      const d = doc.data();
      console.log('userId:', d.userId, '| name:', d.name);
      if (d.userId && d.name && !seen.has(d.userId)) {
        seen.add(d.userId);
        list.push({ id: doc.id, userId: d.userId, name: d.name });
      }
    });

    console.log('Final list:', list); 
    setUsers(list);
      if (list.length > 0) 
        setSelectedUser(list[0].userId);
        setSelectedUserName(list[0].name);
          } catch (err: any) {
            console.error('Firestore error:', err?.message);
          }
}
useEffect(() => {
  const unsub = onAuthStateChanged(auth, (user) => {
    console.log('Auth state:', user); 
    if (user) {
      fetchUsers();
    } else {
      console.log('No user logged in');
    }
  });
  return () => unsub();
}, []);

  return (
    <div className="filters">
      {/* <button onClick={addTestUser}>Add Test</button> */}
      {/* <button onClick={fixDocument}>Fix Doc</button> */}
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