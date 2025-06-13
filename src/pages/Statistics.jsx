import React, { useState } from 'react';
import { useLeague } from '../context/LeagueContext';
import { Trophy, Users, Target, TrendingUp, Medal, Star, Award } from 'lucide-react';

const Statistics = () => {
  const { players, teams, matches, loading } = useLeague();
  const [activeTab, setActiveTab] = useState('players');

  // Calculate comprehensive player statistics
  const getPlayerStats = () => {
    return players
      .map(player => {
        const winRate = player.matches_played > 0 
          ? ((player.matches_won / player.matches_played) * 100).toFixed(1)
          : '0.0';
        
        return {
          ...player,
          winRate: parseFloat(winRate),
          rank: 0 // Will be calculated after sorting
        };
      })
      .sort((a, b) => {
        // Sort by points first, then by win rate, then by matches won
        if (b.points !== a.points) return b.points - a.points;
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        return b.matches_won - a.matches_won;
      })
      .map((player, index) => ({
        ...player,
        rank: index + 1
      }));
  };

  // Calculate comprehensive team statistics
  const getTeamStats = () => {
    return teams
      .map(team => {
        const winRate = team.matches_played > 0 
          ? ((team.matches_won / team.matches_played) * 100).toFixed(1)
          : '0.0';
        
        const playerNames = team.team_players?.map(tp => tp.players?.name).join(' & ') || 'No Players';
        
        return {
          ...team,
          winRate: parseFloat(winRate),
          playerNames,
          rank: 0 // Will be calculated after sorting
        };
      })
      .sort((a, b) => {
        // Sort by points first, then by win rate, then by matches won
        if (b.points !== a.points) return b.points - a.points;
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        return b.matches_won - a.matches_won;
      })
      .map((team, index) => ({
        ...team,
        rank: index + 1
      }));
  };

  // Calculate league overview statistics
  const getLeagueStats = () => {
    const totalMatches = matches.length;
    const completedMatches = matches.filter(m => m.status === 'completed').length;
    const scheduledMatches = matches.filter(m => m.status === 'scheduled').length;
    
    const completionRate = totalMatches > 0 
      ? ((completedMatches / totalMatches) * 100).toFixed(1)
      : '0.0';

    return {
      totalPlayers: players.length,
      totalTeams: teams.length,
      totalMatches,
      completedMatches,
      scheduledMatches,
      completionRate: parseFloat(completionRate)
    };
  };

  // Get ranking icon for positions
  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return <Trophy className="rank-icon gold" size={20} />;
      case 2: return <Medal className="rank-icon silver" size={20} />;
      case 3: return <Award className="rank-icon bronze" size={20} />;
      default: return <span className="rank-number">#{rank}</span>;
    }
  };

  // Get skill level color
  const getSkillLevelColor = (skillLevel) => {
    switch (skillLevel) {
      case 'Advanced': return 'skill-advanced';
      case 'Intermediate': return 'skill-intermediate';
      case 'Beginner': return 'skill-beginner';
      default: return '';
    }
  };

  if (loading) {
    return <div className="loading">Loading statistics...</div>;
  }

  const playerStats = getPlayerStats();
  const teamStats = getTeamStats();
  const leagueStats = getLeagueStats();

  return (
    <div className="statistics-page">
      <div className="container">
        <div className="page-header">
          <h1>League Statistics</h1>
        </div>

        {/* League Overview */}
        <div className="league-overview">
          <h2>League Overview</h2>
          <div className="overview-grid">
            <div className="overview-card">
              <div className="card-icon">
                <Users className="icon-users" size={24} />
              </div>
              <div className="card-content">
                <h3>Total Players</h3>
                <span className="big-number">{leagueStats.totalPlayers}</span>
              </div>
            </div>
            
            <div className="overview-card">
              <div className="card-icon">
                <Target className="icon-teams" size={24} />
              </div>
              <div className="card-content">
                <h3>Total Teams</h3>
                <span className="big-number">{leagueStats.totalTeams}</span>
              </div>
            </div>
            
            <div className="overview-card">
              <div className="card-icon">
                <Trophy className="icon-matches" size={24} />
              </div>
              <div className="card-content">
                <h3>Total Matches</h3>
                <span className="big-number">{leagueStats.totalMatches}</span>
              </div>
            </div>
            
            <div className="overview-card">
              <div className="card-icon">
                <TrendingUp className="icon-completion" size={24} />
              </div>
              <div className="card-content">
                <h3>Completion Rate</h3>
                <span className="big-number">{leagueStats.completionRate}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Tabs */}
        <div className="statistics-tabs">
          <div className="tab-headers">
            <button 
              className={`tab-header ${activeTab === 'players' ? 'active' : ''}`}
              onClick={() => setActiveTab('players')}
            >
              <Users size={18} />
              Player Rankings
            </button>
            <button 
              className={`tab-header ${activeTab === 'teams' ? 'active' : ''}`}
              onClick={() => setActiveTab('teams')}
            >
              <Target size={18} />
              Team Rankings
            </button>
          </div>

          {/* Player Rankings Tab */}
          {activeTab === 'players' && (
            <div className="tab-content">
              <div className="rankings-header">
                <h3>Player Rankings</h3>
                <p>Ranked by points, win rate, and matches won</p>
              </div>
              
              {playerStats.length === 0 ? (
                <div className="empty-state">
                  <p>No player statistics available yet.</p>
                  <p>Add players and complete some matches to see rankings.</p>
                </div>
              ) : (
                <div className="rankings-table">
                  <div className="table-header">
                    <div className="col-rank">Rank</div>
                    <div className="col-player">Player</div>
                    <div className="col-skill">Skill</div>
                    <div className="col-stat">Points</div>
                    <div className="col-stat">Matches</div>
                    <div className="col-stat">Wins</div>
                    <div className="col-stat">Win Rate</div>
                  </div>
                  
                  {playerStats.map(player => (
                    <div key={player.id} className="table-row">
                      <div className="col-rank">
                        {getRankIcon(player.rank)}
                      </div>
                      <div className="col-player">
                        <div className="player-info">
                          <span className="player-name">{player.name}</span>
                          {player.rank <= 3 && (
                            <Star className="top-player" size={14} />
                          )}
                        </div>
                      </div>
                      <div className="col-skill">
                        <span className={`skill-badge ${getSkillLevelColor(player.skill_level)}`}>
                          {player.skill_level}
                        </span>
                      </div>
                      <div className="col-stat">
                        <span className="stat-value">{player.points || 0}</span>
                      </div>
                      <div className="col-stat">
                        <span className="stat-value">{player.matches_played || 0}</span>
                      </div>
                      <div className="col-stat">
                        <span className="stat-value">{player.matches_won || 0}</span>
                      </div>
                      <div className="col-stat">
                        <span className="stat-value">{player.winRate}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Team Rankings Tab */}
          {activeTab === 'teams' && (
            <div className="tab-content">
              <div className="rankings-header">
                <h3>Team Rankings</h3>
                <p>Ranked by points, win rate, and matches won</p>
              </div>
              
              {teamStats.length === 0 ? (
                <div className="empty-state">
                  <p>No team statistics available yet.</p>
                  <p>Create teams and complete some matches to see rankings.</p>
                </div>
              ) : (
                <div className="rankings-table">
                  <div className="table-header">
                    <div className="col-rank">Rank</div>
                    <div className="col-team">Team</div>
                    <div className="col-skill">Skill Mix</div>
                    <div className="col-stat">Points</div>
                    <div className="col-stat">Matches</div>
                    <div className="col-stat">Wins</div>
                    <div className="col-stat">Win Rate</div>
                  </div>
                  
                  {teamStats.map(team => (
                    <div key={team.id} className="table-row">
                      <div className="col-rank">
                        {getRankIcon(team.rank)}
                      </div>
                      <div className="col-team">
                        <div className="team-info">
                          <div className="team-name">{team.name}</div>
                          <div className="team-players">{team.playerNames}</div>
                          {team.rank <= 3 && (
                            <Star className="top-team" size={14} />
                          )}
                        </div>
                      </div>
                      <div className="col-skill">
                        <span className="skill-combo">
                          {team.skill_combination || 'N/A'}
                        </span>
                      </div>
                      <div className="col-stat">
                        <span className="stat-value">{team.points || 0}</span>
                      </div>
                      <div className="col-stat">
                        <span className="stat-value">{team.matches_played || 0}</span>
                      </div>
                      <div className="col-stat">
                        <span className="stat-value">{team.matches_won || 0}</span>
                      </div>
                      <div className="col-stat">
                        <span className="stat-value">{team.winRate}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Statistics;

