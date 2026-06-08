import { useState, useEffect } from 'react';
import {
  type SundayTracker,
  loadData,
  saveData,
  getSundays,
  buildCSV,
  MONTHS
} from './PledgesUtils';

export function usePledges() {
  const now = new Date();

  // State
  const [curMonth, setCurMonth] = useState(now.getMonth());
  const [curYear, setCurYear] = useState(now.getFullYear());
  const [data, setData] = useState<SundayTracker>({});

  // Load data when month/year changes
  useEffect(() => {
    setData(loadData(curMonth, curYear));
  }, [curMonth, curYear]);

  // Save data whenever changes happen
  useEffect(() => {
    saveData(curMonth, curYear, data);
  }, [data, curMonth, curYear]);

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

  // Years list (cleaned from component)
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