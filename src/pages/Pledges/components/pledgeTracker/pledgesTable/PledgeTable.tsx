interface PledgeEntry {
  amount?: string;
  notes?: string;
}

interface PledgeTableProps {
  sundays: Date[];
  data: Record<number, PledgeEntry>;
  handleAmount: (day: number, value: string) => void;
  handleNote: (day: number, value: string) => void;
}

export default function PledgeTable({ sundays, data, handleAmount, handleNote }: PledgeTableProps) {
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
                      onChange={e => handleAmount(day, e.target.value)}
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
                    onChange={e => handleNote(day, e.target.value)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}