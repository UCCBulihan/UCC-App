interface PledgeEntry {
  amount?: string;
  notes?: string;
}

interface PledgeTableProps {
  sundays: Date[];
  data: Record<number, PledgeEntry>;
  handleAmount: (day: number, value: string) => void | Promise<void>; 
  handleNote: (day: number, value: string) => void | Promise<void>;   
  selectedUser: number;
  canManage: boolean;
}

export default function PledgeTable({ 
  sundays, data, handleAmount, handleNote, canManage 
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
                    {paid ? 'Paid' : 'Unpaid'}
                  </span>
                </td>
                <td>
                  {canManage ? (
                    <input
                      type="text"
                      value={saved.notes || ''}
                      placeholder="Add note..."
                      onChange={e => handleNote(day, e.target.value)}
                    />
                  ) : (
                    <span style={{ fontSize: 13, color: '#6b7280' }}>
                      {saved.notes || '—'}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}