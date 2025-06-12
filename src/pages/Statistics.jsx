import React, { useMemo } from 'react';
import { useLeague } from '../context/LeagueContext';
import StatsCard from '../components/StatsCard';
import PlayerStats from '../components/PlayerStats';
import TeamStats from '../components/TeamStats';
import { Trophy, Target, TrendingUp, Award } from 'lucide-react';

const Statistics = () => {
  const { players, teams, matches, statistics, loading } = useLeague();

  // Calculate detailed statistics
  const detailedStats = useMemo(() => {
    const completedMatches = matches.filter(match => match.status === 'completed');

    // Player statistics
    const playerStats = players.map(player => {
      const playerMatches = completedMatches.filter(match => 
        match.match_players?.some(mp => mp.player_id === player.id)
      );

      const wins = playerMatches.filter(match => {
        const winningTeam = teams.find(team => team.id === match.winner_team_id);
        return winningTeam?.team_players?.some(tp => tp.player_id === player.id);
      }).length;

      return {
        ...player,
        matchesPlayed: playerMatches.length,
        matchesWon: wins,
        winRate: playerMatches.length > 0 ? (wins / playerMatches.length * 100).toFixed(1) : 0
      };
    });

    // Team statistics
    const teamStats = teams.map(team => {
      const teamMatches = completedMatches.filter(match => 
        match.team1_id === team.id || match.team2_id === team.id
      );

      const wins = teamMatches.filter(match => match.winner_team_id === team.id).length;

      return {
        ...team,
        matchesPlayed: teamMatches.length,
        matchesWon: wins,
        winRate: teamMatches.length > 0 ? (wins / teamMatches.length * 100).toFixed(1) : 0
      };
    });

    // Overall statistics
    const totalGames = completedMatches.length;
    const averageScorePerGame = totalGames > 0 
      ? completedMatches.reduce((sum, match) => sum + match.team1_score + match.team2_score, 0) / totalGames 
      : 0;

    const skillDistribution = players.reduce((acc, player) => {
      acc[player.skill_level] = (acc[player.skill_level] || 0) + 1;
      return acc;
    }, {});

    return {
      playerStats: playerStats.sort((a, b) => b.winRate - a.winRate),
      teamStats: teamStats.sort((a, b) => b.winRate - a.winRate),
      totalGames,
      averageScorePerGame: averageScorePerGame.toFixed(1),
      skillDistribution
    };
  }, [players, teams, matches]);

  if (loading) {
    return <div className="loading">Loading statistics...</div>;
  }

  return (
    <div className="statistics-page">
      <div className="container">
        <h1>League Statistics</h1>

        <div className="stats-grid">
          <StatsCard
            title="Total Games Played"
            value={detailedStats.totalGames}
            icon={Trophy}
            color="blue"
          />
          <StatsCard
            title="Average Score/Game"
            value={detailedStats.averageScorePerGame}
            icon={Target}
            color="green"
          />
          <StatsCard
            title="Active Players"
            value={statistics.totalPlayers}
            icon={TrendingUp}
            color="purple"
          />
          <StatsCard
            title="Active Teams"
            value={statistics.totalTeams}
            icon={Award}
            color="orange"
          />
        </div>

        <div className="statistics-grid">
          <div className="stats-section">
            <h2>Player Statistics</h2>
            <PlayerStats players={detailedStats.playerStats} />
          </div>

          <div className="stats-section">
            <h2>Team Statistics</h2>
            <TeamStats teams={detailedStats.teamStats} />
          </div>
        </div>

        <div className="skill-distribution">
          <h2>Skill Level Distribution</h2>
          <div className="distribution-chart">
            {Object.entries(detailedStats.skillDistribution).map(([skill, count]) => (
              <div key={skill} className="distribution-item">
                <span className="skill-label">{skill}</span>
                <div className="skill-bar">
                  <div 
                    className={`skill-fill skill-\${skill.toLowerCase()}`}
                    style={{ 
                      width: `${(count / statistics.totalPlayers) * 100}%` 
                    }}
                  ></div>
                </div>
                <span className="skill-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
