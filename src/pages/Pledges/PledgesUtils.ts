// Types
export interface SundayData {
  amount?: string;
  notes?: string;
}
export interface SundayTracker {
  [day: number]: SundayData;
}

// Helpers
export const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

export const storeKey = (m: number, y: number) =>
  `sunday_tracker_${y}_${m}`;

export const loadData = (m: number, y: number): SundayTracker => {
  try {
    return JSON.parse(localStorage.getItem(storeKey(m, y)) || '{}');
  } catch { return {}; }
};

export const saveData = (m: number, y: number, d: SundayTracker) =>
  localStorage.setItem(storeKey(m, y), JSON.stringify(d));

export const getSundays = (month: number, year: number): Date[] => {
  const out: Date[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    if (d.getDay() === 0) out.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
};

export const fmt = (n: number) =>
  '₱' + n.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

export const buildCSV = (
  sundays: Date[],
  data: SundayTracker,
  month: number,
  year: number
) => {
  let csv = 'Sunday #,Date,Amount (PHP),Status,Note\n';
  sundays.forEach((d, i) => {
    const day = d.getDate();
    const saved = data[day] || {};
    const amount = saved.amount || '0';
    const notes = (saved.notes || '').replace(/,/g, ';');
    const date = d.toLocaleDateString('en-PH', {
      weekday: 'long', year: 'numeric',
      month: 'long', day: 'numeric'
    });
    csv += `${i+1},${date},${amount},${
      parseFloat(amount) > 0 ? 'Paid' : 'Unpaid'
    },${notes}\n`;
  });
  return csv;
};