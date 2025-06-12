import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LeagueProvider } from './context/LeagueContext';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Players from './pages/Players';
import Teams from './pages/Teams';
import Matches from './pages/Matches';
import Statistics from './pages/Statistics';
import './App.css';\n\nfunction App() {
  return (
    <LeagueProvider>
      <Router>
        <div className=\"App\">
          <Header />
          <main className=\"main-content\">
            <Routes>
              <Route path=\"/\" element={<Navigate to=\"/dashboard\" replace />} />
              <Route path=\"/dashboard\" element={<Dashboard />} />
              <Route path=\"/players\" element={<Players />} />
              <Route path=\"/teams\" element={<Teams />} />
              <Route path=\"/matches\" element={<Matches />} />
              <Route path=\"/statistics\" element={<Statistics />} />
            </Routes>
          </main>
        </div>
      </Router>
    </LeagueProvider>
  );
}

export default App;
