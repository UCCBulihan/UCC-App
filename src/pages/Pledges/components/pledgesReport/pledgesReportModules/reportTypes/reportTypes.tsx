// ─── Types ───────────────────────────────────────────────────────────────────

export interface Member {
  userId: number;
  name: string;
}

export interface PledgeRecord {
  userId: number;
  name: string;
  amount: number;
  dateAdded: Date;
}

export interface MemberMonthData {
  total: number;
  paidSundays: number;
  totalSundays: number;
}

export type ReportMatrix = Record<number, Record<number, MemberMonthData>>;