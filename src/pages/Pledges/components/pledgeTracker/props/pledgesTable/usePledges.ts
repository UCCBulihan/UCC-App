import { useState, useEffect } from 'react';
import { auth, db } from '../../../../../../firebase/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, query, where, getDocs, Timestamp, doc, setDoc } from 'firebase/firestore';
import {
  type SundayTracker,
  getSundays,
  buildCSV,
  MONTHS
} from './PledgesUtils';

export function usePledges(userId: number) {
  const now = new Date();

  const [curMonth, setCurMonth] = useState(now.getMonth());
  const [curYear, setCurYear] = useState(now.getFullYear());
  const [data, setData] = useState<SundayTracker>({});
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!userId || !currentUser) return; 

    async function fetchPledges() {
      try {
        const start = new Date(curYear, curMonth, 1);
        const end = new Date(curYear, curMonth + 1, 0, 23, 59, 59);

        const q = query(
          collection(db, 'PLEDGES'),
          where('userId', '==', userId),
          where('dateAdded', '>=', Timestamp.fromDate(start)),
          where('dateAdded', '<=', Timestamp.fromDate(end))
        );

        const snapshot = await getDocs(q);
        const newData: SundayTracker = {};

        snapshot.forEach(doc => {
          const d = doc.data();
          const day = (d.dateAdded as Timestamp).toDate().getDate(); 
          newData[day] = { 
            amount: String(d.amount ?? ''),
            notes: d.notes ?? ''
          };
        });

        setData(newData);
      } catch (err: any) {
        console.error('fetchPledges error:', err?.message);
      }
    }

    fetchPledges();
  }, [userId, curMonth, curYear, currentUser]);

  const sundays = getSundays(curMonth, curYear);

  const getAmount = (day: number) =>
    parseFloat(data[day]?.amount || '0');

  const total = sundays.reduce((sum, d) => {
    const v = getAmount(d.getDate());
    return sum + (v > 0 ? v : 0);
  }, 0);

  const paidCount = sundays.filter(
    d => getAmount(d.getDate()) > 0
  ).length;

  const handleAmount = async (day: number, value: string) => {
    setData(prev => ({ ...prev, [day]: { ...prev[day], amount: value } }));

    const date = new Date(curYear, curMonth, day);
    const docId = `${userId}_${curYear}_${curMonth}_${day}`;
    
    await setDoc(doc(db, 'PLEDGES', docId), {
      userId,
      amount: parseFloat(value) || 0,
      dateAdded: Timestamp.fromDate(date),
      dateModified: Timestamp.fromDate(new Date()),
    }, { merge: true });
  };

  const handleNote = (day: number, value: string) =>
    setData(prev => ({ ...prev, [day]: { ...prev[day], notes: value } }));

  const exportCSV = () => {
    const csv = buildCSV(sundays, data, curMonth, curYear);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `sundays_${MONTHS[curMonth]}_${curYear}.csv`;
    a.click();
  };

  const years = Array.from({ length: 9 }, (_, i) => now.getFullYear() - 3 + i);

  return {
    curMonth, setCurMonth,
    curYear, setCurYear,
    data,
    sundays, total, paidCount, years,
    handleAmount, handleNote, exportCSV,
    currentUser,
  };
}