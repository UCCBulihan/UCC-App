import NavigationBar from '../../Home/NavigationBar/NavigationBar'

export default function AllMembers() {
  return (
    <div className="app-layout">
      <NavigationBar />
      <main className="main-content" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '420px', padding: '2.5rem 2rem' }}>

          <div style={{
            width: '96px', height: '96px',
            margin: '0 auto 2rem',
            background: '#f5f5f5',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid #e0e0e0'
          }}>
            <i className="fas fa-tools" style={{ fontSize: '40px', color: '#999' }} />  
          </div>

          <h1 style={{ fontSize: '22px', fontWeight: 500, margin: '0 0 0.75rem' }}>
            Page unavailable
          </h1>

          <p style={{ fontSize: '15px', color: '#666', lineHeight: 1.7, margin: '0 0 2rem' }}>
            This section is currently under construction. We're working on it and it will be available soon.
          </p>

          <button onClick={() => window.history.back()} style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '10px 20px', fontSize: '14px',
            borderRadius: '8px', cursor: 'pointer',
            background: 'white', border: '1px solid #ccc'
          }}>
            ← Go back
          </button>

        </div>
      </main>
    </div>
  )
}