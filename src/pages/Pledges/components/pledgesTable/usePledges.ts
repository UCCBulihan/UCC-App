import { useState, useEffect } from 'react';
import {
  type SundayTracker,
  loadData,
  saveData,
  getSundays,
  buildCSV,
  MONTHS
} from './PledgesUtils';

// ✅ Accepts userId so each user has their own data
export function usePledges(userId: number) {
  const now = new Date();

  // State
  const [curMonth, setCurMonth] = useState(now.getMonth());
  const [curYear, setCurYear] = useState(now.getFullYear());
  const [data, setData] = useState<SundayTracker>({});

  // ✅ Reload data when month, year, OR user changes
  useEffect(() => {
    setData(loadData(curMonth, curYear, userId));
  }, [curMonth, curYear, userId]);

  // ✅ Save data scoped to this user
  useEffect(() => {
    saveData(curMonth, curYear, userId, data);
  }, [data, curMonth, curYear, userId]);

  // Derived values
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

  // Handlers
  const handleAmount = (day: number, value: string) =>
    setData(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        amount: value
      }
    }));

  const handleNote = (day: number, value: string) =>
    setData(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        notes: value
      }
    }));

  // CSV export
  const exportCSV = () => {
    const csv = buildCSV(sundays, data, curMonth, curYear);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv' })
    );
    a.download = `sundays_${MONTHS[curMonth]}_${curYear}.csv`;
    a.click();
  };

  // Years list
  const years = Array.from(
    { length: 9 },
    (_, i) => now.getFullYear() - 3 + i
  );

  return {
    // state
    curMonth,
    setCurMonth,
    curYear,
    setCurYear,
    data,

    // derived
    sundays,
    total,
    paidCount,
    years,

    // actions
    handleAmount,
    handleNote,
    exportCSV
  };
}