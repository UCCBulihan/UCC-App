// ─── Constants ────────────────────────────────────────────────────────────────

export const MONTHS = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec'
];

export const MONTHS_FULL = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getSundayCount(month: number, year: number): number {
  let count = 0;
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    if (d.getDay() === 0) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

export function fmt(n: number): string {
  return '₱' + n.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function getBarHeight(value: number, max: number): number {
  if (max === 0) return 0;
  return Math.max(4, (value / max) * 140);
}