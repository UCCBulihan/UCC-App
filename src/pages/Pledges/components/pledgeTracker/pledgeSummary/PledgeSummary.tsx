import { fmt } from '../../pledgesTable/PledgesUtils';

interface PledgeSummaryProps {
  sundayCount: number;
  paidCount: number;
  total: number;
}

export default function PledgeSummary({ sundayCount, paidCount, total }: PledgeSummaryProps) {
  return (
    <div className="summary">
      <div>Sundays: {sundayCount}</div>
      <div>Paid: {paidCount}</div>
      <div>Total: {fmt(total)}</div>
    </div>
  );
}
