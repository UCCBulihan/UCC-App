import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocsFromServer, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { auth, db } from '../../../firebase/firebase';

import type { Member, PledgeRecord, ReportMatrix } from '../components/pledgesReport/pledgesReportModules/reportTypes/reportTypes';
import { getSundayCount, MONTHS, MONTHS_FULL } from '../components/pledgesReport/pledgesReportModules/reportHelpers/reportHelpers';

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePledgeReport() {
  const now = new Date();
  const [curYear, setCurYear] = useState(now.getFullYear());
  const [members, setMembers] = useState<Member[]>([]);
  const [matrix, setMatrix] = useState<ReportMatrix>({});
  const [loading, setLoading] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [totalExpenses, setTotalExpenses] = useState(0);

  const years = Array.from({ length: 7 }, (_, i) => now.getFullYear() - 3 + i);

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => setAuthed(!!user));
    return () => unsub();
  }, []);

  // ── Fetch members ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authed) return;
    async function fetchMembers() {
      const snap = await getDocsFromServer(collection(db, 'MEMBERS'));
      const seen = new Set<number>();
      const list: Member[] = [];
      snap.forEach(doc => {
        const d = doc.data();
        if (d.isPledger && d.userId && !seen.has(d.userId) && !d.isArchived) {
          seen.add(d.userId);
          list.push({ userId: d.userId, name: `${d.firstName} ${d.lastName}` });
        }
      });
      list.sort((a, b) => a.name.localeCompare(b.name));
      setMembers(list);
    }
    fetchMembers();
  }, [authed]);

  // ── Fetch pledges for selected year ────────────────────────────────────────
  useEffect(() => {
    if (!authed || members.length === 0) return;
    setLoading(true);

    async function fetchYear() {
      const start = new Date(curYear, 0, 1);
      const end = new Date(curYear, 11, 31, 23, 59, 59);

      const q = query(
        collection(db, 'PLEDGES'),
        where('dateAdded', '>=', Timestamp.fromDate(start)),
        where('dateAdded', '<=', Timestamp.fromDate(end))
      );

      const snap = await getDocs(q);
      const records: PledgeRecord[] = [];

      snap.forEach(doc => {
        const d = doc.data();
        records.push({
          userId: d.userId,
          name: d.name,
          amount: d.amount ?? 0,
          dateAdded: (d.dateAdded as Timestamp).toDate(),
        });
      });

      // Build matrix: userId → month → { total, paidSundays, totalSundays }
      const mat: ReportMatrix = {};

      members.forEach(m => {
        mat[m.userId] = {};
        for (let mo = 0; mo < 12; mo++) {
          mat[m.userId][mo] = {
            total: 0,
            paidSundays: 0,
            totalSundays: getSundayCount(mo, curYear),
          };
        }
      });

      records.forEach(r => {
        const mo = r.dateAdded.getMonth();
        if (mat[r.userId]?.[mo] !== undefined) {
          if (r.amount > 0) {
            mat[r.userId][mo].total += r.amount;
            mat[r.userId][mo].paidSundays += 1;
          }
        }
      });

      setMatrix(mat);
      setLoading(false);
    }

    fetchYear().catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [authed, members, curYear]);

  // ── Fetch expenses for selected year ───────────────────────────────────────
  useEffect(() => {
    if (!authed) return;

    async function fetchExpenses() {
      const start = new Date(curYear, 0, 1);
      const end = new Date(curYear, 11, 31, 23, 59, 59);

      const q = query(
        collection(db, 'LEDGER'),
        where('dateAdded', '>=', Timestamp.fromDate(start)),
        where('dateAdded', '<=', Timestamp.fromDate(end)),
        orderBy('dateAdded', 'asc')
      );

      const snap = await getDocs(q);
      let total = 0;

      snap.forEach(d => {
        const data = d.data();
        const amount = data.amount ?? 0;
        const type = data.type ?? 'EXPENSE';
        if (type === 'EXPENSE' || type === 'LOAN_OUT') {
          total += amount;
        } else if (type === 'REPAYMENT') {
          total -= amount;
        }
      });

      setTotalExpenses(total);
    }

    fetchExpenses().catch(console.error);
  }, [authed, curYear]);

  // ── Derived stats ──────────────────────────────────────────────────────────

  const yearlyTotals: Record<number, number> = {};
  members.forEach(m => {
    yearlyTotals[m.userId] = Object.values(matrix[m.userId] ?? {})
      .reduce((s, d) => s + d.total, 0);
  });

  const monthlyGrandTotals: Record<number, number> = {};
  for (let mo = 0; mo < 12; mo++) {
    monthlyGrandTotals[mo] = members.reduce((s, m) =>
      s + (matrix[m.userId]?.[mo]?.total ?? 0), 0);
  }

  const grandTotal = members.reduce((s, m) => s + (yearlyTotals[m.userId] ?? 0), 0);

  const visibleMonths = selectedMonth !== null
    ? [selectedMonth]
    : MONTHS.map((_, i) => i);

  // ── Export CSV ─────────────────────────────────────────────────────────────

  function exportCSV() {
    let csv = `Pledges Report — ${curYear}\n\n`;
    csv += `Member,${MONTHS_FULL.join(',')},Total\n`;
    members.forEach(m => {
      const row = MONTHS.map((_, mo) => (matrix[m.userId]?.[mo]?.total ?? 0).toFixed(2));
      csv += `${m.name},${row.join(',')},${(yearlyTotals[m.userId] ?? 0).toFixed(2)}\n`;
    });
    csv += `TOTAL,${MONTHS.map((_, mo) => monthlyGrandTotals[mo].toFixed(2)).join(',')},${grandTotal.toFixed(2)}\n`;

    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `pledges_report_${curYear}.csv`;
    a.click();
  }

  // ── Return ─────────────────────────────────────────────────────────────────

  return {
    curYear,
    setCurYear,
    years,
    members,
    matrix,
    loading,
    selectedMonth,
    setSelectedMonth,
    totalExpenses,
    yearlyTotals,
    monthlyGrandTotals,
    grandTotal,
    visibleMonths,
    exportCSV,
  };
}
