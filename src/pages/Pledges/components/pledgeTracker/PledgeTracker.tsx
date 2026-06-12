import { useState } from 'react';
import { usePledges } from './props/pledgesTable/usePledges';
import PledgeHeader from './props/pledgeHeader/PledgeHeader';
import PledgeFilters from './props/pledgeFilters/PledgeFilters';
import PledgeTable from './props/pledgesTable/PledgeTable';
import PledgeSummary from './props/pledgeSummary/PledgeSummary';

export default function PledgeTracker() {
  const [selectedUser, setSelectedUser] = useState(1);

  const {
    curMonth, setCurMonth,
    curYear, setCurYear,
    data, sundays,
    total, paidCount,
    years, handleAmount,
    handleNote, exportCSV,
    currentUser, 
  } = usePledges(selectedUser);

  return (
    <>
      <PledgeHeader currentUser={currentUser} /> 
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