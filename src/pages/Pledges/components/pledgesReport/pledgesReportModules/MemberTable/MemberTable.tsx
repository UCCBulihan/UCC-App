import type { Member, ReportMatrix } from '../reportTypes/reportTypes';
import { MONTHS, fmt } from '../reportHelpers/reportHelpers';

// ─── Props ────────────────────────────────────────────────────────────────────

interface MemberTableProps {
  members: Member[];
  matrix: ReportMatrix;
  yearlyTotals: Record<number, number>;
  monthlyGrandTotals: Record<number, number>;
  grandTotal: number;
  visibleMonths: number[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MemberTable({
  members,
  matrix,
  yearlyTotals,
  monthlyGrandTotals,
  grandTotal,
  visibleMonths,
}: MemberTableProps) {
  return (
    <div className="rpt-card rpt-card--table">
      <div className="rpt-card-header">
        <span className="rpt-card-title">Member Breakdown</span>
        <span className="rpt-card-sub">Amount pledged (₱) per month</span>
      </div>
      <div className="rpt-table-wrap">
        <table className="rpt-table">
          <thead>
            <tr>
              <th className="rpt-th-member">Member</th>
              {visibleMonths.map(mo => (
                <th key={mo}>{MONTHS[mo]}</th>
              ))}
              <th className="rpt-th-total">Total</th>
            </tr>
          </thead>
          <tbody>
            {members.map(m => {
              const yearly = yearlyTotals[m.userId] ?? 0;
              return (
                <tr key={m.userId}>
                  <td className="rpt-td-member">{m.name}</td>
                  {visibleMonths.map(mo => {
                    const d = matrix[m.userId]?.[mo];
                    const paid = d?.total ?? 0;
                    const paidSu = d?.paidSundays ?? 0;
                    const totalSu = d?.totalSundays ?? 0;
                    return (
                      <td key={mo} className={`rpt-td-amount ${paid > 0 ? 'has-amount' : 'zero'}`}>
                        {paid > 0 ? fmt(paid) : <span className="rpt-dash">—</span>}
                        {paid > 0 && (
                          <span className="rpt-sunday-pill">{paidSu}/{totalSu}</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="rpt-td-grand">
                    {yearly > 0 ? fmt(yearly) : <span className="rpt-dash">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="rpt-tfoot-row">
              <td className="rpt-td-member">Total</td>
              {visibleMonths.map(mo => (
                <td key={mo} className="rpt-td-amount rpt-td-foot">
                  {monthlyGrandTotals[mo] > 0
                    ? fmt(monthlyGrandTotals[mo])
                    : <span className="rpt-dash">—</span>}
                </td>
              ))}
              <td className="rpt-td-grand rpt-td-foot">{fmt(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}