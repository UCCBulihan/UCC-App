import './PledgeTable.css';
import type { RowSaveStatus } from './usePledges';

interface PledgeEntry {
  amount?: string;
  notes?: string;
}

interface PledgeTableProps {
  sundays: Date[];
  data: Record<number, PledgeEntry>;
  handleAmount: (day: number, value: string) => void | Promise<void>;
  handleNote: (day: number, value: string) => void | Promise<void>;
  commitAmount: (day: number, value: string) => void | Promise<void>;
  commitNote: (day: number, value: string) => void | Promise<void>;
  rowStatus: Record<number, RowSaveStatus | undefined>;
  selectedUser: number;
  canManage: boolean;
}

function SaveBadge({ status }: { status?: RowSaveStatus }) {
  if (!status) return null;

  const styleByStatus: Record<RowSaveStatus, React.CSSProperties> = {
    saving: { color: '#9ca3af', fontStyle: 'italic' },
    saved: { color: '#16a34a', fontWeight: 600 },
    error: { color: '#dc2626', fontWeight: 600 },
  };

  const labelByStatus: Record<RowSaveStatus, string> = {
    saving: 'Saving…',
    saved: '✓ Saved',
    error: '⚠ Failed to save',
  };

  return (
    <span style={{ fontSize: 11, marginLeft: 8, whiteSpace: 'nowrap', ...styleByStatus[status] }}>
      {labelByStatus[status]}
    </span>
  );
}

export default function PledgeTable({
  sundays, data, handleAmount, handleNote, commitAmount, commitNote, rowStatus, canManage
}: PledgeTableProps) {
  return (
    <div className="table-wrapper">
      <table className="pledge-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Date</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Notes</th>
            {canManage && <th></th>}
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
                    year: 'numeric',
                  })}
                </td>
                <td>
                  <div className="amount-cell">
                    ₱
                    {canManage ? (
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={saved.amount || ''}
                        onChange={e => handleAmount(day, e.target.value)}
                        onBlur={e => commitAmount(day, e.target.value)}
                      />
                    ) : (
                      <span style={{ padding: '4px 8px', color: '#111' }}>
                        {saved.amount || '0.00'}
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <span className={`status ${paid ? 'paid' : 'unpaid'}`}>
                    {paid ? 'Collected' : 'Uncollected'}
                  </span>
                </td>
                <td>
                  {canManage ? (
                    <input
                      type="text"
                      value={saved.notes || ''}
                      placeholder="Add note..."
                      onChange={e => handleNote(day, e.target.value)}
                      onBlur={e => commitNote(day, e.target.value)}
                    />
                  ) : (
                    <span style={{ fontSize: 13, color: '#6b7280' }}>
                      {saved.notes || '—'}
                    </span>
                  )}
                </td>
                {canManage && (
                  <td>
                    <SaveBadge status={rowStatus[day]} />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}