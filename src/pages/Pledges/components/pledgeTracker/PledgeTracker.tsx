import { useState } from 'react';
import { usePledges } from './props/pledgesTable/usePledges';
import PledgeHeader from './props/pledgeHeader/PledgeHeader';
import PledgeFilters from './props/pledgeFilters/PledgeFilters';
import PledgeTable from './props/pledgesTable/PledgeTable';
import PledgeSummary from './props/pledgeSummary/PledgeSummary';

const USERS = [
  { id: 1, name: 'Juan Dela Cruz' },
  { id: 2, name: 'Maria Santos' },
  { id: 3, name: 'Pedro Reyes' }
];

export default function PledgeTracker() {
  const [selectedUser, setSelectedUser] = useState(USERS[0].id);

  const {
    curMonth, setCurMonth,
    curYear, setCurYear,
    data, sundays,
    total, paidCount,
    years, handleAmount,
    handleNote, exportCSV
  } = usePledges(selectedUser);

  return (
    <>
      <PledgeHeader />
      <PledgeFilters
        selectedUser={selectedUser}
        setSelectedUser={setSelectedUser}
        curMonth={curMonth}
        setCurMonth={setCurMonth}
        curYear={curYear}
        setCurYear={setCurYear}
        years={years}
        exportCSV={exportCSV}
      />
      <PledgeTable
        sundays={sundays}
        data={data}
        handleAmount={handleAmount}
        handleNote={handleNote}
      />
      <PledgeSummary
        sundayCount={sundays.length}
        paidCount={paidCount}
        total={total}
      />
    </>
  );
}