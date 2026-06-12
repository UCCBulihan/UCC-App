import type { User } from 'firebase/auth';

interface PledgeHeaderProps {
  currentUser: User | null; 
}

export default function PledgeHeader({ currentUser }: PledgeHeaderProps) {
  return (
    <div className="header">
      <h1>Sunday Tracker</h1>
      {currentUser ? (
        <p>Welcome, <strong>{currentUser.displayName ?? currentUser.email}</strong></p>
      ) : (
        <p>Admin table view (multi-user ready)</p>
      )}
    </div>
  );
}