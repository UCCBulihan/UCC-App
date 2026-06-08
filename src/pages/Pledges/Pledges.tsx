import { useState, useEffect } from 'react';
import './pledges.css';
import {
  MONTHS, type SundayTracker,
  loadData, saveData,
  getSundays, fmt, buildCSV
} from './PledgesUtils';
import './pledges.css';

export default function Pledges() {
  const now = new Date();
  const [curMonth, setCurMonth] = useState(now.getMonth());
  const [curYear,  setCurYear]  = useState(now.getFullYear());
  const [data, setData]         = useState<SundayTracker>({});

  useEffect(() => {
    setData(loadData(curMonth, curYear));
  }, [curMonth, curYear]);

  useEffect(() => {
    saveData(curMonth, curYear, data);
  }, [data, curMonth, curYear]);

  const sundays = getSundays(curMonth, curYear);
  const total   = sundays.reduce((sum, d) => {
    const v = parseFloat(data[d.getDate()]?.amount || '0');
    return sum + (v > 0 ? v : 0);
  }, 0);
  const paidCount = sundays.filter(d =>
    parseFloat(data[d.getDate()]?.amount || '0') > 0
  ).length;

  const handleAmount = (day: number, value: string) =>
    setData(prev => ({ ...prev, [day]: { ...prev[day], amount: value } }));

  const handleNote = (day: number, value: string) =>
    setData(prev => ({ ...prev, [day]: { ...prev[day], notes: value } }));

  const exportCSV = () => {
    const csv = buildCSV(sundays, data, curMonth, curYear);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `sundays_${MONTHS[curMonth]}_${curYear}.csv`;
    a.click();
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Sunday Tracker</h1>
        <p>Track amounts received every Sunday</p>
      </div>

      <div className="selects">
        <select value={curMonth} onChange={e => setCurMonth(Number(e.target.value))}>
          {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select value={curYear} onChange={e => setCurYear(Number(e.target.value))}>
          {Array.from({ length: 9 }, (_, i) => now.getFullYear() - 3 + i).map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <div className="stats">
        <div className="stat"><div className="stat-label">Sundays</div>
          <div className="stat-value">{sundays.length}</div></div>
        <div className="stat"><div className="stat-label">Paid</div>
          <div className="stat-value">{paidCount}</div></div>
        <div className="stat"><div className="stat-label">Total Amount</div>
          <div className="stat-value">{fmt(total)}</div></div>
        <div className="stat"><div className="stat-label">Average / Sunday</div>
          <div className="stat-value">{paidCount > 0 ? fmt(total / paidCount) : '₱0.00'}</div></div>
      </div>

      <div className="section-head">
        <span>{MONTHS[curMonth]} {curYear}</span>
        <button onClick={exportCSV}>Export CSV</button>
      </div>

      <div className="entries">
        {sundays.length === 0 ? (
          <p className="empty">No Sundays this month.</p>
        ) : sundays.map((d, i) => {
          const day  = d.getDate();
          const saved = data[day] || {};
          const paid  = parseFloat(saved.amount || '0') > 0;
          return (
            <div key={day} className="entry-card">
              <div className="entry-top">
                <div className="entry-date">
                  <span className="entry-day">Sunday {i + 1}</span>
                  <span className="entry-full-date">
                    {d.toLocaleDateString('en-PH', {
                      month: 'short', day: 'numeric', year: 'numeric'
                    })}
                  </span>
                </div>
                <span className={`badge ${paid ? 'badge-paid' : 'badge-unpaid'}`}>
                  {paid ? 'Paid' : 'Unpaid'}
                </span>
              </div>
              <div className="entry-bottom">
                <div className="amount-wrap">
                  <span className="peso">₱</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={0.01}
                    placeholder="0.00"
                    value={saved.amount || ''}
                    className={`amount-input ${paid ? 'has-value' : ''}`}
                    onChange={e => handleAmount(day, e.target.value)}
                  />
                </div>
                <input
                  type="text"
                  className="notes-input"
                  placeholder="Note..."
                  value={saved.notes || ''}
                  onChange={e => handleNote(day, e.target.value)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}