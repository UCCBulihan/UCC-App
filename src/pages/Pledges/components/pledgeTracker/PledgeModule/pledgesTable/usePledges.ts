import { useState, useEffect, useRef, useCallback } from 'react';
import { auth, db } from '../../../../../../firebase/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, query, where, getDocs, Timestamp, doc, setDoc } from 'firebase/firestore';
import {
  type SundayTracker,
  getSundays,
  buildCSV,
  MONTHS
} from './PledgesUtils';

// Bilang ng milliseconds na hihintayin pagkatapos ng huling keystroke
// bago talaga isulat sa Firestore.
const SAVE_DEBOUNCE_MS = 800;
// Gaano katagal ipapakita ang "Saved" bago mawala.
const SAVED_BADGE_MS = 1500;

export type RowSaveStatus = 'saving' | 'saved' | 'error';

export function usePledges(userId: number, userName: string) {
  const now = new Date();

  const [curMonth, setCurMonth] = useState(now.getMonth());
  const [curYear, setCurYear] = useState(now.getFullYear());
  const [data, setData] = useState<SundayTracker>({});
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Status ng pag-save kada Sunday/day — para sa "Saving... / Saved / Failed" indicator
  const [rowStatus, setRowStatus] = useState<Record<number, RowSaveStatus | undefined>>({});

  // Naka-store dito yung mga pending debounce timer, keyed by "day_field" (hal. "10_amount")
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // Naka-store dito yung mga timer na nag-clear ng "Saved" badge pagkatapos ng ilang segundo
  const savedClearTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!userId || !currentUser || !userName) {
      setData({});
      return;
    }

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
  }, [userId, curMonth, curYear, currentUser, userName]);

  // Kapag lumipat ng member/month/year, kanselahin ang lahat ng pending timer
  // (save timers + saved-badge clear timers) at i-reset ang status indicators.
  useEffect(() => {
    return () => {
      Object.values(saveTimers.current).forEach(clearTimeout);
      saveTimers.current = {};
      Object.values(savedClearTimers.current).forEach(clearTimeout);
      savedClearTimers.current = {};
      setRowStatus({});
    };
  }, [userId, curMonth, curYear]);

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

  // ── Mga helper para sa indicator ──────────────────────────────────────────
  function markSaving(day: number) {
    if (savedClearTimers.current[day]) {
      clearTimeout(savedClearTimers.current[day]);
      delete savedClearTimers.current[day];
    }
    setRowStatus(prev => ({ ...prev, [day]: 'saving' }));
  }

  function markSaved(day: number) {
    setRowStatus(prev => ({ ...prev, [day]: 'saved' }));
    savedClearTimers.current[day] = setTimeout(() => {
      setRowStatus(prev => {
        const next = { ...prev };
        delete next[day];
        return next;
      });
      delete savedClearTimers.current[day];
    }, SAVED_BADGE_MS);
  }

  function markError(day: number) {
    setRowStatus(prev => ({ ...prev, [day]: 'error' }));
  }

  // ── Ito lang ang TANGING lugar na talagang sumusulat sa Firestore ─────────
  const writeToFirestore = useCallback(
    async (day: number, field: 'amount' | 'notes', value: string) => {
      if (!userId || !userName) return;

      const date = new Date(curYear, curMonth, day);
      const docId = `${userId}_${curYear}_${curMonth}_${day}`;

      const payload: Record<string, any> = {
        name: userName,
        userId,
        dateAdded: Timestamp.fromDate(date),
        dateModified: Timestamp.fromDate(new Date()),
      };
      if (field === 'amount') payload.amount = parseFloat(value) || 0;
      if (field === 'notes') payload.notes = value;

      try {
        await setDoc(doc(db, 'PLEDGES', docId), payload, { merge: true });
        markSaved(day);
      } catch (err: any) {
        console.error('save error:', err?.message);
        markError(day);
      }
    },
    [userId, userName, curYear, curMonth]
  );

  // Mag-schedule ng save (debounce). Ipinapakita na ang "Saving..." mula ngayon
  // hanggang matapos ang actual na pagsulat, kaya honest ang feedback sa user.
  function scheduleSave(day: number, field: 'amount' | 'notes', value: string) {
    const key = `${day}_${field}`;
    if (saveTimers.current[key]) clearTimeout(saveTimers.current[key]);
    markSaving(day);
    saveTimers.current[key] = setTimeout(() => {
      delete saveTimers.current[key];
      writeToFirestore(day, field, value);
    }, SAVE_DEBOUNCE_MS);
  }

  // I-save AGAD, kanselahin ang naghihintay na timer (ginagamit sa onBlur)
  function flushSave(day: number, field: 'amount' | 'notes', value: string) {
    const key = `${day}_${field}`;
    if (saveTimers.current[key]) {
      clearTimeout(saveTimers.current[key]);
      delete saveTimers.current[key];
    }
    markSaving(day);
    writeToFirestore(day, field, value);
  }

  // ── onChange: i-update lang ang screen, i-schedule ang save ───────────────
  const handleAmount = (day: number, value: string) => {
    if (!userId || !userName) return;
    setData(prev => ({ ...prev, [day]: { ...prev[day], amount: value } }));
    scheduleSave(day, 'amount', value);
  };

  const handleNote = (day: number, value: string) => {
    if (!userId || !userName) return;
    setData(prev => ({ ...prev, [day]: { ...prev[day], notes: value } }));
    scheduleSave(day, 'notes', value);
  };

  // ── onBlur: i-save agad, hindi na maghintay ng 800ms ──────────────────────
  const commitAmount = (day: number, value: string) => {
    if (!userId || !userName) return;
    flushSave(day, 'amount', value);
  };

  const commitNote = (day: number, value: string) => {
    if (!userId || !userName) return;
    flushSave(day, 'notes', value);
  };

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
    handleAmount, handleNote,
    commitAmount, commitNote,
    rowStatus,
    exportCSV,
    currentUser,
  };
}