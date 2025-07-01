import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HashRouter } from 'react-router-dom';
import { LeagueProvider } from './context/LeagueContext';
import SimpleHeader from './components/SimpleHeader';
import Dashboard from './pages/Dashboard';
import Players from './pages/Players';
import Teams from './pages/Teams';
import Matches from './pages/Matches';
import Statistics from './pages/Statistics';
import EloStatistics from './components/EloStatistics';
import './App.css';
import './styles/MobileResponsive.css';
import './styles/ScrollFix.css';
import './styles/SimpleHeader.css';
import './styles/MobileStatistics.css';
import './styles/EloMobileStyles.css'; // Import ELO-specific mobile styles

function App() {
  return (
    <LeagueProvider>
      <HashRouter>
        <div className="App">
          <SimpleHeader /> {/* Use the simple header */}
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