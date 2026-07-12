import NavigationBar from '../Home/NavigationBar/NavigationBar';

export default function Ongoing() {
    return (
        <div className="app-layout">
          <style>{`
            .ongoing-page {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 60vh;
              text-align: center;
            }
            .ongoing-content {
              max-width: 400px;
            }
            .ongoing-icon {
              font-size: 3rem;
              display: block;
              margin-bottom: 1rem;
            }
            .ongoing-content h1 {
              font-size: 1.5rem;
              margin-bottom: 0.5rem;
            }
            .ongoing-content p {
              color: #666;
            }
          `}</style>
          <NavigationBar />
          <main className="main-content ongoing-page">
            <div className="ongoing-content">
              <span className="ongoing-icon" role="img" aria-label="under construction">🚧</span>
              <h1>This Page is Ongoing</h1>
              <p>Please wait while the Administration completes the setup.</p>
            </div>
          </main>
        </div>
      );
}