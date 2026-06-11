import './pledges.css';
import NavigationBar from '../Home/NavigationBar/NavigationBar';
import PledgeTracker from './components/pledgeTracker/PledgeTracker';

export default function Pledges() {
  return (
    <div className="app-layout">
      <NavigationBar />
      <main className="main-content">
        <PledgeTracker />
      </main>
    </div>
  );
}