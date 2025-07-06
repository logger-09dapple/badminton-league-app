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
import Tournaments from './pages/Tournaments';
import Setup from './pages/Setup';
import { populateTeamEloHistory, clearTeamEloHistory, repopulateTeamEloHistory } from './scripts/populateTeamEloHistory';
import { fixEloMismatch, clearDuplicateEloHistory, completeEloFix } from './utils/fixEloMismatch';
import { processSequentialElo } from './utils/sequentialEloProcessor';
import { processSequentialTeamElo } from './utils/sequentialTeamEloProcessor';
import { processEnhancedSequentialElo } from './utils/enhancedSequentialEloProcessor';
import './App.css';
import './styles/MobileResponsive.css';
import './styles/ScrollFix.css';
import './styles/SimpleHeader.css';
import './styles/NavigationFix.css';
import './styles/EloRating.css';
import './styles/MobileStatistics.css';
import './styles/EloMobileStyles.css';
import './styles/Charts.css';
import './styles/TournamentBracket.css';

// Make debug functions available globally in browser console
if (typeof window !== 'undefined') {
  window.populateTeamEloHistory = populateTeamEloHistory;
  window.clearTeamEloHistory = clearTeamEloHistory;
  window.repopulateTeamEloHistory = repopulateTeamEloHistory;
  window.fixEloMismatch = fixEloMismatch;
  window.clearDuplicateEloHistory = clearDuplicateEloHistory;
  window.completeEloFix = completeEloFix;
  window.processSequentialElo = processSequentialElo;
  window.processSequentialTeamElo = processSequentialTeamElo;
  window.processEnhancedSequentialElo = processEnhancedSequentialElo;
}

function App() {
  return (
    <LeagueProvider>
      <HashRouter>
        <div className="App">
          <SimpleHeader />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/players" element={<Players />} />
              <Route path="/teams" element={<Teams />} />
              <Route path="/matches" element={<Matches />} />
              <Route path="/statistics" element={<Statistics />} />
              <Route path="/tournaments" element={<Tournaments />} />
              <Route path="/setup" element={<Setup />} />
            </Routes>
          </main>
        </div>
      </HashRouter>
    </LeagueProvider>
  );
}

export default App;