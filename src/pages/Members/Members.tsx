import React, { useState, useEffect } from 'react';
import './members.css';
import NavigationBar from '../Home/NavigationBar/NavigationBar';

export default function Members() {
    return (
        <div className="app-layout">
              <NavigationBar />
              <main className="main-content">
                {/* <Cards /> */}
              </main>
            </div>
    );
}