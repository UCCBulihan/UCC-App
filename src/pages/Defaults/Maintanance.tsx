import NavigationBar from '../Home/NavigationBar/NavigationBar';

export default function Ongoing() {
    return (
        <div className="app-layout">
          <NavigationBar />
          <main className="main-content ongoing-page">
            <div className="ongoing-content">
              <span className="ongoing-icon" role="img" aria-label="under construction">🚧</span>
              <h1>This Page is Under Maintenance</h1>
              <p>Please wait while the Administration completes the setup.</p>
            </div>
          </main>
        </div>
      );
}