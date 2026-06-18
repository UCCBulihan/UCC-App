export type VisitStatus = 'Scheduled' | 'Completed' | 'Cancelled';

export type VisitType =
  | 'General Visit'
  | 'Pastoral'
  | 'Sick Visit'
  | 'Welcome'
  | 'Follow-up Visit';

export type VisitLocation = 'Home' | 'Hospital' | 'Church' | 'Office' | 'Other';

export interface VisitationRecord {
  id: string;
  memberVisited: string;
  visitDate: string; // ISO format e.g. "2026-06-10"
  visitedBy: string;
  location: VisitLocation | '';
  visitType: VisitType | '';
  status: VisitStatus | '';
  followUpNeeded: boolean;
  followUpDate?: string;
  notes: string;
}

export interface VisitationFilters {
  member: string;
  visitType: string;
  month: string;
  year: string;
}

// Payload shape used when creating a new record from the modal form
export type NewVisitationInput = Omit<VisitationRecord, 'id' | 'notes'>;