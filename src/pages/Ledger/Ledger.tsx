import NavigationBar from '../Home/NavigationBar/NavigationBar';
import LedgerTracker from './components/LedgerTracker/LedgerTracker';


export default function Ledger() {
  return (
    <div className="app-layout">
      <NavigationBar />
      <main className="main-content">
        <LedgerTracker />
      </main>
    </div>
  );
}
