import React from 'react';
import './pledges.css';
import { useState } from 'react';
import { usePledges } from './components/pledgesTable/usePledges';
import { MONTHS, fmt } from './components/pledgesTable/PledgesUtils';
import PledgeTable from './components/pledgesTable/PledgeTable';
import NavigationBar from '../Home/NavigationBar/NavigationBar';

const USERS = [
  { id: 1, name: 'Juan Dela Cruz' },
  { id: 2, name: 'Maria Santos' },
  { id: 3, name: 'Pedro Reyes' }
];

export default function Pledges() { 
  const [selectedUser, setSelectedUser] = useState(USERS[0].id);

  const {
    curMonth,
    setCurMonth,
    curYear,
    setCurYear,
    data,
    sundays,
    total,
    paidCount,
    years,
    handleAmount,
    handleNote,
    exportCSV
  } = usePledges(selectedUser);

  return (
    <div className="app-layout">
      <NavigationBar />
      <main className="main-content">

        {/* HEADER */}
        <div className="header">
          <h1>Sunday Tracker</h1>
          <p>Admin table view (multi-user ready)</p>
        </div>

        {/* FILTERS */}
        <div className="filters">
          <select
            value={selectedUser}
            onChange={e => setSelectedUser(Number(e.target.value))}
          >
            {USERS.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>

          <select
            value={curMonth}
            onChange={e => setCurMonth(Number(e.target.value))}
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>

          <select
            value={curYear}
            onChange={e => setCurYear(Number(e.target.value))}
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <button className="export-btn" onClick={exportCSV}>
            Export CSV
          </button>
        </div>

        {/* TABLE */}
        <PledgeTable
          sundays={sundays}
          data={data}
          handleAmount={handleAmount}
          handleNote={handleNote}
        />

        {/* SUMMARY */}
        <div className="summary">
          <div>Sundays: {sundays.length}</div>
          <div>Paid: {paidCount}</div>
          <div>Total: {fmt(total)}</div>
        </div>

      </main>
    </div>
  );
}