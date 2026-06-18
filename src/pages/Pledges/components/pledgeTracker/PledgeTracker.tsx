import { useState } from 'react';
import { usePledges } from './PledgeModule/pledgesTable/usePledges';
import PledgeHeader from './PledgeModule/pledgeHeader/PledgeHeader';
import PledgeFilters from './PledgeModule/pledgeFilters/PledgeFilters';
import PledgeTable from './PledgeModule/pledgesTable/PledgeTable';
import PledgeSummary from './PledgeModule/pledgeSummary/PledgeSummary';
import { useCurrentUserRole } from '../../../Pledges/hooks/useCurrentUserRole';
import { fmt, MONTHS } from './PledgeModule/pledgesTable/PledgesUtils';

export default function PledgeTracker() {
  const [selectedUser, setSelectedUser] = useState(0);
  const [selectedUserName, setSelectedUserName] = useState('');
  const { canManage } = useCurrentUserRole();

  const {
    curMonth, setCurMonth,
    curYear, setCurYear,
    data, sundays,
    total, paidCount,
    years, handleAmount,
    handleNote, exportCSV,
    currentUser,
  } = usePledges(selectedUser, selectedUserName);

  const sundayCount = sundays.length;
  const collectionRate = sundayCount > 0 ? Math.round((paidCount / sundayCount) * 100) : 0;

  return (
    <>
      <PledgeHeader
        currentUser={currentUser}
      />

      {/* Stats cards */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Sundays this month</div>
          <div className="stat-value">{sundayCount}</div>
          <div className="stat-sub">{MONTHS[curMonth]} {curYear}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Paid</div>
          <div className={`stat-value ${paidCount > 0 ? 'green' : ''}`}>{paidCount}</div>
          <div className="stat-sub">of {sundayCount} Sundays</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Collected</div>
          <div className="stat-value">{fmt(total)}</div>
          <div className="stat-sub">This month</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Collection rate</div>
          <div className="stat-value">{collectionRate}%</div>
          <div className="progress-wrap">
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${collectionRate}%` }} />
            </div>
            <div className="progress-label">{paidCount} of {sundayCount} Sundays Collected</div>
          </div>
        </div>
      </div>

      <PledgeFilters
        selectedUser={selectedUser}
        setSelectedUser={setSelectedUser}
        curMonth={curMonth}
        setCurMonth={setCurMonth}
        curYear={curYear}
        setCurYear={setCurYear}
        years={years}
        exportCSV={exportCSV}
         canManage={canManage}   
        setSelectedUserName={setSelectedUserName}
      />

      <PledgeTable
        sundays={sundays}
        data={data}
        handleAmount={handleAmount}
        handleNote={handleNote}
        selectedUser={selectedUser}
        canManage={canManage}
      />

      <PledgeSummary
        sundayCount={sundayCount}
        paidCount={paidCount}
        total={total}
      />
    </>
  );
}