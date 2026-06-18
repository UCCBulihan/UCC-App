/* ════════════════════════════════════
   PledgeTable — Table Styles
═══════════════════════════════════════ */

/* ── Table wrapper ── */
.table-wrapper {
  background: #ffffff;
  border: 0.5px solid #e5e5e3;
  border-radius: 12px;
  overflow-x: auto;
  margin-top: 0;
}

/* ── Table ── */
.pledge-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 700px;
}

/* ── Header ── */
.pledge-table thead tr {
  border-bottom: 0.5px solid #e5e5e3;
}

.pledge-table th {
  position: sticky;
  top: 0;
  padding: 10px 14px;
  text-align: left;
  font-size: 11px;
  font-weight: 500;
  color: #6b7280;
  background: #f9f9f8;
  white-space: nowrap;
  z-index: 1;
}

.pledge-table th:first-child {
  text-align: center;
  width: 48px;
}

/* ── Body rows ── */
.pledge-table tbody tr {
  border-bottom: 0.5px solid #e5e5e3;
}

.pledge-table tbody tr:last-child {
  border-bottom: none;
}

.pledge-table tbody tr:hover td {
  background: #f9f9f8;
}

.pledge-table td {
  padding: 11px 14px;
  font-size: 13px;
  color: #1a1a1a;
  vertical-align: middle;
  border-bottom: none;
}

.pledge-table td:first-child {
  text-align: center;
  color: #9ca3af;
  font-size: 12px;
}

/* ── Amount cell ── */
.amount-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.amount-cell > span:first-child {
  font-size: 12px;
  color: #6b7280;
}

.amount-cell input {
  width: 120px;
  height: 28px;
  padding: 0 8px;
  border: 0.5px solid #d0d0ce;
  border-radius: 8px;
  text-align: right;
  font-size: 13px;
  font-family: 'Segoe UI', Arial, sans-serif;
  color: #1a1a1a;
  background: #ffffff;
}

.amount-cell input:focus {
  outline: 2px solid #534AB7;
  outline-offset: 1px;
  border-color: transparent;
}

.amount-cell input::placeholder {
  color: #9ca3af;
}

/* ── Status badge ── */
.status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
  font-family: 'Segoe UI', Arial, sans-serif;
}

.status::before {
  content: '';
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status.paid {
  background: #EAF3DE;
  color: #3B6D11;
}

.status.paid::before {
  background: #639922;
}

.status.unpaid {
  background: #FCEBEB;
  color: #A32D2D;
}

.status.unpaid::before {
  background: #E24B4A;
}

/* ── Notes input ── */
.pledge-table input[type="text"] {
  width: 180px;
  height: 28px;
  padding: 0 8px;
  border: 0.5px solid #d0d0ce;
  border-radius: 8px;
  font-size: 12px;
  font-family: 'Segoe UI', Arial, sans-serif;
  color: #1a1a1a;
  background: #ffffff;
}

.pledge-table input[type="text"]:focus {
  outline: 2px solid #534AB7;
  outline-offset: 1px;
  border-color: transparent;
}

.pledge-table input[type="text"]::placeholder {
  color: #9ca3af;
}