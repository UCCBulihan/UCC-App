import type { VisitationRecord } from '../visitationTypes/visitationTypes';
import { formatDisplayDate, formatShortDate } from '../visitationHelpers/visitationHelpers';

interface VisitationTableProps {
  visitations: VisitationRecord[];
  onNotesChange: (id: string, notes: string) => void;
  onEdit: (record: VisitationRecord) => void;
}

function StatusBadge({ status }: { status: VisitationRecord['status'] }) {
  if (!status) return null;
  const className =
    status === 'Completed'
      ? 'badge badge-completed'
      : status === 'Scheduled'
      ? 'badge badge-scheduled'
      : 'badge badge-cancelled';
  return <span className={className}>{status}</span>;
}

export default function VisitationTable({ visitations, onNotesChange, onEdit }: VisitationTableProps) {
  return (
    <div className="table-card">
      <div className="table-scroll">
        <table className="visitation-table">
          <thead>
            <tr>
              <th className="col-num">#</th>
              <th className="col-visited">Member Visited</th>
              <th className="col-date">Visit Date</th>
              <th className="col-by">Visited By</th>
              <th className="col-loc">Location</th>
              <th className="col-type">Visit Type</th>
              <th className="col-status">Status</th>
              <th className="col-followup">Follow-up</th>
              <th className="col-notes">Notes</th>
              <th className="col-action"></th>
            </tr>
          </thead>
          <tbody>
            {visitations.map((record, index) => (
              <tr key={record.id}>
                <td className="col-num">{index + 1}</td>
                <td>{record.memberVisited}</td>
                <td>{formatDisplayDate(record.visitDate)}</td>
                <td>{record.visitedBy}</td>
                <td>{record.location}</td>
                <td>
                  {record.visitType && (
                    <span className="type-badge">{record.visitType}</span>
                  )}
                </td>
                <td className="col-status">
                  <StatusBadge status={record.status} />
                </td>
                <td className="col-followup">
                  {record.followUpNeeded ? (
                    <span className="followup-yes">{formatShortDate(record.followUpDate)}</span>
                  ) : (
                    <span className="followup-no">—</span>
                  )}
                </td>
                <td className="col-notes">
                  <input
                    className="note-input"
                    type="text"
                    placeholder="Add note..."
                    value={record.notes}
                    onChange={(e) => onNotesChange(record.id, e.target.value)}
                  />
                </td>
                <td className="col-action">
                  <button className="btn-icon" title="Edit" onClick={() => onEdit(record)}>
                    <i className="fa-solid fa-pen"></i>
                  </button>
                </td>
              </tr>
            ))}

            {visitations.length === 0 && (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '24px', color: '#6b6b6b' }}>
                  No visitation records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}