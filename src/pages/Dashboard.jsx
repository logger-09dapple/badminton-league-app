import React from 'react';
import { useLeague } from '../context/LeagueContext';
import StatsCard from '../components/StatsCard';
import RecentMatches from '../components/RecentMatches';
import QuickActions from '../components/QuickActions';
import { Users, UserPlus, Calendar, Trophy } from 'lucide-react';

const Dashboard = () => {
  const { statistics, matches, loading } = useLeague();

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  const recentMatches = matches.slice(0, 5);

  return (
    <div className="dashboard">
      <div className="container">
        <h1>Dashboard</h1>

        <div className="stats-grid">
          <StatsCard
            title="Total Players"
            value={statistics.totalPlayers}
            icon={Users}
            color="blue"
          />
          <StatsCard
            title="Total Teams"
            value={statistics.totalTeams}
            icon={UserPlus}
            color="green"
          />
          <StatsCard
            title="Total Matches"
            value={statistics.totalMatches}
            icon={Calendar}
            color="purple"
          />
          <StatsCard
            title="Completed Matches"
            value={statistics.completedMatches}
            icon={Trophy}
            color="orange"
          />
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-section">
            <QuickActions />
          </div>
          <div className="dashboard-section">
            <RecentMatches matches={recentMatches} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
