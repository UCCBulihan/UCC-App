import React from 'react';
import NavigationBar from '../Home/NavigationBar/NavigationBar';

export default function Profile() {
    return (
         <div className="app-layout">
              <NavigationBar />
              <main className="main-content">
                 <h1>Profile</h1>
                 <p>This is the profile page.</p>
              </main>
            </div>
    );
}