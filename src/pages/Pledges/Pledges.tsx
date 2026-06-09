import './pledges.css';
import { useState } from 'react';
import { usePledges } from './usePledges';
import { MONTHS, fmt } from './PledgesUtils';

const USERS = [
  { id: 1, name: 'Juan Dela Cruz' },
  { id: 2, name: 'Maria Santos' },
  { id: 3, name: 'Pedro Reyes' }
];

export default function Pledges() {
  const [selectedUser, setSelectedUser] = useState(USERS[0].id);

  // ✅ Pass selectedUser so the hook loads the right data
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
    <div className="container">

      {/* HEADER */}
      <div className="header">
        <h1>Sunday Tracker</h1>
        <p>Admin table view (multi-user ready)</p>
      </div>

      {/* FILTERS */}
      <div className="filters">

        {/* ✅ Switching user now reloads the table */}
        <select
          value={selectedUser}
          onChange={e => setSelectedUser(Number(e.target.value))}
        >
          {USERS.map(u => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
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
      <div className="table-wrapper">

        <table className="pledge-table">

          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Notes</th>
            </tr>
          </thead>

          <tbody>
            {sundays.map((d, i) => {
              const day = d.getDate();
              const saved = data[day] || {};
              const paid = parseFloat(saved.amount || '0') > 0;

              return (
                <tr key={day}>

                  <td>{i + 1}</td>

                  <td>
                    {d.toLocaleDateString('en-PH', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </td>

                  <td>
                    <div className="amount-cell">
                      ₱
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={saved.amount || ''}
                        onChange={e =>
                          handleAmount(day, e.target.value)
                        }
                      />
                    </div>
                  </td>

                  <td>
                    <span className={`status ${paid ? 'paid' : 'unpaid'}`}>
                      {paid ? 'Paid' : 'Unpaid'}
                    </span>
                  </td>

                  <td>
                    <input
                      type="text"
                      value={saved.notes || ''}
                      placeholder="Add note..."
                      onChange={e =>
                        handleNote(day, e.target.value)
                      }
                    />
                  </td>

                </tr>
              );
            })}
          </tbody>

        </table>

      </div>

      {/* SUMMARY */}
      <div className="summary">
        <div>Sundays: {sundays.length}</div>
        <div>Paid: {paidCount}</div>
        <div>Total: {fmt(total)}</div>
      </div>

    </div>
  );
}