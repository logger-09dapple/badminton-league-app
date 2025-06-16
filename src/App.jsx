import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HashRouter } from 'react-router-dom';
import { LeagueProvider } from './context/LeagueContext';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Players from './pages/Players';
import Teams from './pages/Teams';
import Matches from './pages/Matches';
import Statistics from './pages/Statistics';
import EloStatistics from './components/EloStatistics';
import './App.css';

function App() {
  return (
    <LeagueProvider>
      <HashRouter>
        <div className="App">
          <Header />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/players" element={<Players />} />
              <Route path="/teams" element={<Teams />} />
              <Route path="/matches" element={<Matches />} />
              <Route path="/statistics" element={<Statistics />} />
	      <Route path="/elo-statistics" element={<EloStatistics />} />	  
            </Routes>
          </main>
        </div>
      </HashRouter>
    </LeagueProvider>
  );
}

export default App;
