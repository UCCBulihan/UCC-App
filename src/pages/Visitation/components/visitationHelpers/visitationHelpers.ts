import type { VisitationRecord } from '../visitationTypes/visitationTypes';

/**
 * Formats an ISO date string ("2026-06-10") into display format ("Jun 10, 2026").
 * Returns an empty string if the input is falsy or invalid.
 */
export function formatDisplayDate(isoDate?: string): string {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Formats an ISO date string into the short "Jun 27" style used for
 * the follow-up column in the table.
 */
export function formatShortDate(isoDate?: string): string {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Converts an array of visitation records into a CSV string and
 * triggers a browser download.
 */
export function exportVisitationsToCSV(records: VisitationRecord[], filename = 'visitations.csv') {
  const headers = [
    'Member Visited',
    'Visit Date',
    'Visited By',
    'Location',
    'Visit Type',
    'Status',
    'Follow-up Date',
    'Notes',
  ];

  const rows = records.map((r) => [
    r.memberVisited.join('; '),
    formatDisplayDate(r.visitDate),
    r.visitedBy.join('; '),
    r.location,
    r.visitType,
    r.status,
    r.followUpNeeded ? formatDisplayDate(r.followUpDate) : '',
    r.notes,
  ]);

  const escapeCell = (cell: string) => `"${(cell ?? '').replace(/"/g, '""')}"`;

  const csvContent = [headers, ...rows]
    .map((row) => row.map(escapeCell).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Formats a list of names for compact table display.
 * Returns the first name plus a "+N more" suffix indicator when there
 * are additional names, along with the full list for use in a tooltip.
 */
export function formatNameList(names: string[]): { primary: string; moreCount: number; full: string } {
  if (names.length === 0) return { primary: '—', moreCount: 0, full: '' };
  return {
    primary: names[0],
    moreCount: names.length - 1,
    full: names.join(', '),
  };
}

/**
 * Applies the active filters to the full list of visitation records.
 */
export function filterVisitations(
  records: VisitationRecord[],
  filters: { member: string; visitType: string; month: string; year: string }
): VisitationRecord[] {
  return records.filter((record) => {
    if (filters.member && !record.memberVisited.includes(filters.member)) return false;
    if (filters.visitType && record.visitType !== filters.visitType) return false;

    if (filters.month || filters.year) {
      const date = new Date(record.visitDate);
      if (isNaN(date.getTime())) return false;

      if (filters.month) {
        const monthName = date.toLocaleDateString('en-US', { month: 'long' });
        if (monthName !== filters.month) return false;
      }
      if (filters.year) {
        if (String(date.getFullYear()) !== filters.year) return false;
      }
    }

    return true;
  });
}