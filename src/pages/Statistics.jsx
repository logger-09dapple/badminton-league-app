import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { useLeague } from '../context/LeagueContext';
import StatsCard from '../components/StatsCard';
import ChartsAndGraphs from '../components/ChartsAndGraphs';
import MobileRankingCard from '../components/MobileRankingCard';
import { analyticsUtils } from '../utils/analyticsUtils';
import { getPlayerEloProgression, getTeamEloProgression } from '../utils/eloChartUtils';
import '../styles/Statistics.css'; // Import the new CSS file
import { 
  Users, 
  Trophy, 
  Target, 
  TrendingUp, 
  Star, 
  Medal,
  BarChart3,
  PieChart,
  Download,
  Filter,
  Calendar,
  Activity
} from 'lucide-react';

const Statistics = () => {
  const { players, teams, matches, loading, error } = useLeague();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [comparePlayer, setComparePlayer] = useState(null); // New state for comparison
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [dateFilter, setDateFilter] = useState('all');
  const [chartType, setChartType] = useState('performance');
  const [analyticsData, setAnalyticsData] = useState(null);

  // Tab configuration - Removed ELO tab
  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'players', label: 'Player Rankings', icon: Users },
    { id: 'teams', label: 'Team Rankings', icon: Trophy },
    { id: 'analytics', label: 'Advanced Analytics', icon: TrendingUp },
  ];

  // Chart type configuration
  const chartTypes = [
    { id: 'performance', label: 'Performance Trends', icon: TrendingUp },
    { id: 'elo', label: 'ELO Distribution', icon: BarChart3 },
    { id: 'skills', label: 'Skill Distribution', icon: PieChart },
    { id: 'competitiveness', label: 'League Competitiveness', icon: Activity },
  ];

  // Calculate recent form for a player - moved up to avoid dependency issues
  const calculateRecentForm = useCallback((playerId, matchesData) => {
    if (!matchesData) return 'N/A';
    
    try {
      const recentMatches = matchesData
        .filter(match => match.status === 'completed') // Only completed matches
        .filter(match => {
          return match.team1?.team_players?.some(tp => tp.player_id === playerId) ||
                 match.team2?.team_players?.some(tp => tp.player_id === playerId);
        })
        // FIXED: Use updated_at for proper chronological order of when matches were actually played
        .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
        .slice(0, 5); // Take last 5 matches
      if (recentMatches.length === 0) return 'N/A';
      
      const wins = recentMatches.filter(match => 
        analyticsUtils.didPlayerWin(match, playerId)
      ).length;
      
      return `${wins}/${recentMatches.length}`;
    } catch (error) {
      console.warn(`Error calculating recent form for player ${playerId}:`, error);
      return 'N/A';
    }
  }, []);

  // NEW: Calculate recent form for teams
  const calculateTeamRecentForm = useCallback((teamId, matchesData) => {
    if (!matchesData) return 'N/A';
    try {
      const recentMatches = matchesData
        .filter(match => match.status === 'completed') // Only completed matches
        .filter(match => match.team1_id === teamId || match.team2_id === teamId)
        // Use updated_at for proper chronological order of when matches were actually played
        .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
        .slice(0, 5); // Take last 5 matches

      if (recentMatches.length === 0) return 'N/A';

      const wins = recentMatches.filter(match => match.winner_team_id === teamId).length;

      return `${wins}/${recentMatches.length}`;
      } catch (error) {
      console.warn(`Error calculating team recent form for team ${teamId}:`, error);
      return 'N/A';
      }
  }, []);

  // Calculate analytics data
  useEffect(() => {
    if (players && teams && matches) {
      try {
        const analytics = analyticsUtils.analyzeLeagueProgression(players, teams, matches);
        setAnalyticsData(analytics);
      } catch (error) {
        console.warn('Error calculating analytics data:', error);
        setAnalyticsData(null);
      }
    }
  }, [players, teams, matches]);

  // Filter matches by date
  const filteredMatches = useMemo(() => {
    if (!matches || dateFilter === 'all') return matches;
    try {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          filterDate.setMonth(now.getMonth() - 3);
          break;
        default:
          return matches;
      }
      
      return matches.filter(match => new Date(match.created_at) >= filterDate);
    } catch (error) {
      console.warn('Error filtering matches:', error);
      return matches;
    }
  }, [matches, dateFilter]);

  // Calculate league overview stats
  const leagueOverview = useMemo(() => {
    if (!players || !teams || !matches) return {};

    try {
      const completedMatches = matches.filter(match => match.status === 'completed');
      const totalPoints = completedMatches.reduce((sum, match) => 
        sum + (match.team1_score || 0) + (match.team2_score || 0), 0);
      
      return {
        totalPlayers: players.length,
        totalTeams: teams.length,
        totalMatches: matches.length,
        completedMatches: completedMatches.length,
        averageScore: completedMatches.length > 0 ? (totalPoints / (completedMatches.length * 2)).toFixed(1) : '0.0',
        completionRate: matches.length > 0 ? ((completedMatches.length / matches.length) * 100).toFixed(1) : '0.0'
      };
    } catch (error) {
      console.warn('Error calculating league overview:', error);
      return {};
    }
  }, [players, teams, matches]);

  // Calculate player statistics with enhanced metrics - SORTED BY ELO RATING with matches consideration
  const playerStats = useMemo(() => {
    if (!players || !Array.isArray(players) || !filteredMatches) return [];
    
    try {
      return players
        .map(player => {
          try {
            const winRate = player.matches_played > 0 
              ? ((player.matches_won / player.matches_played) * 100).toFixed(1)
              : '0.0';
            
            return {
              ...player,
              winRate: parseFloat(winRate),
              rank: 0, // Will be calculated after sorting
              eloRating: player.elo_rating || 1500,
              recentForm: calculateRecentForm(player.id, filteredMatches),
              hasPlayedMatches: (player.matches_played || 0) > 0
            };
          } catch (error) {
            console.warn(`Error processing player ${player?.name}:`, error);
            return {
              ...player,
              winRate: 0,
              rank: 0,
              eloRating: 1500,
              recentForm: 'N/A',
              hasPlayedMatches: false
            };
          }
        })
        .sort((a, b) => {
          // First, prioritize players who have played matches
          if (a.hasPlayedMatches && !b.hasPlayedMatches) return -1;
          if (!a.hasPlayedMatches && b.hasPlayedMatches) return 1;

          // For players who have played matches, sort by ELO rating
          if (a.hasPlayedMatches && b.hasPlayedMatches) {
          if (b.eloRating !== a.eloRating) return b.eloRating - a.eloRating;
            // If ELO is same, sort by matches played (more experienced first)
            if (b.matches_played !== a.matches_played) return (b.matches_played || 0) - (a.matches_played || 0);
          }

          // For players without matches, sort by ELO rating still
          if (b.eloRating !== a.eloRating) return b.eloRating - a.eloRating;

          // Final tiebreakers
          if (b.points !== a.points) return (b.points || 0) - (a.points || 0);
          if (b.winRate !== a.winRate) return b.winRate - a.winRate;
          return (b.matches_won || 0) - (a.matches_won || 0);
        })
        .map((player, index) => ({
          ...player,
          rank: index + 1
        }));
    } catch (error) {
      console.warn('Error calculating player stats:', error);
      return [];
    }
  }, [players, filteredMatches, calculateRecentForm]);

  // Calculate team statistics - Enhanced with actual team ELO ratings
  const teamStats = useMemo(() => {
    if (!teams || !Array.isArray(teams)) return [];

    try {
      return teams
        .map(team => {
    try {
            const winRate = team.matches_played > 0
              ? ((team.matches_won / team.matches_played) * 100).toFixed(1)
              : '0.0';
            
            const playerNames = team.team_players?.map(tp => tp.players?.name).filter(Boolean).join(' & ') || 'No Players';
            
            // Use actual team ELO rating from database, fallback to average if not available
            let teamEloRating = team.team_elo_rating || 1500;

            // If no team ELO rating exists, calculate from player averages as fallback
            if (!team.team_elo_rating && team.team_players && team.team_players.length > 0) {
              const playerElos = team.team_players
                .map(tp => {
                  const player = players?.find(p => p.id === tp.player_id);
                  return player?.elo_rating || 1500;
                })
                .filter(elo => elo > 0);

              if (playerElos.length > 0) {
                teamEloRating = Math.round(playerElos.reduce((sum, elo) => sum + elo, 0) / playerElos.length);
              }
            }

            return {
              ...team,
              winRate: parseFloat(winRate),
              playerNames,
              teamEloRating,
              rank: 0, // Will be calculated after sorting
              hasPlayedMatches: (team.matches_played || 0) > 0,
              recentForm: calculateTeamRecentForm(team.id, filteredMatches) // NEW: Add team form
            };
          } catch (error) {
            console.warn(`Error processing team ${team?.name}:`, error);
            return {
              ...team,
              winRate: 0,
              playerNames: 'No Players',
              teamEloRating: 1500,
              rank: 0,
              hasPlayedMatches: false,
              recentForm: 'N/A' // NEW: Add default form
            };
          }
        })
        .sort((a, b) => {
          // Prioritize teams that have played matches
          if (a.hasPlayedMatches && !b.hasPlayedMatches) return -1;
          if (!a.hasPlayedMatches && b.hasPlayedMatches) return 1;

          // Sort by team ELO rating first (now using actual team ELO)
          if (b.teamEloRating !== a.teamEloRating) return b.teamEloRating - a.teamEloRating;
          // Then by points, win rate, and matches won
          if (b.points !== a.points) return (b.points || 0) - (a.points || 0);
          if (b.winRate !== a.winRate) return b.winRate - a.winRate;
          return (b.matches_won || 0) - (a.matches_won || 0);
        })
        .map((team, index) => ({
          ...team,
          rank: index + 1
        }));
    } catch (error) {
      console.warn('Error calculating team stats:', error);
      return [];
    }
  }, [teams, players, calculateTeamRecentForm, filteredMatches]);
  // Calculate performance trends for selected entity - Now uses actual ELO history
  const performanceTrends = useMemo(() => {
    if (!filteredMatches) return [];
    
    // We'll use async loading for the trends since we need to fetch ELO history
    return []; // This will be replaced by useEffect
  }, []);

  // State for actual performance trends with ELO history
  const [actualPerformanceTrends, setActualPerformanceTrends] = useState([]);
  const [trendsLoading, setTrendsLoading] = useState(false);

  // Load actual performance trends with ELO history
  useEffect(() => {
    const loadPerformanceTrends = async () => {
      if (!filteredMatches || (!selectedPlayer && !selectedTeam)) {
        setActualPerformanceTrends([]);
        return;
      }

      setTrendsLoading(true);
      try {
        let trends = [];

      if (selectedPlayer) {
          console.log('Loading player ELO progression for player:', selectedPlayer);
          trends = await getPlayerEloProgression(selectedPlayer, filteredMatches, players);
      } else if (selectedTeam) {
          console.log('Loading team ELO progression for team:', selectedTeam);
          console.log('Team stats available:', teamStats.map(t => ({ id: t.id, name: t.name })));
          trends = await getTeamEloProgression(selectedTeam, filteredMatches, teams);
      }
      
        console.log('Loaded performance trends:', trends.length, 'data points');
        setActualPerformanceTrends(trends);
    } catch (error) {
        console.error('Error loading performance trends:', error);
        // Fallback to old calculation
        try {
          if (selectedPlayer) {
            const fallback = analyticsUtils.calculatePerformanceTrends(filteredMatches, selectedPlayer, null, players, teams);
            setActualPerformanceTrends(fallback);
          } else if (selectedTeam) {
            const fallback = analyticsUtils.calculatePerformanceTrends(filteredMatches, null, selectedTeam, players, teams);
            setActualPerformanceTrends(fallback);
    }
        } catch (fallbackError) {
          console.error('Fallback calculation also failed:', fallbackError);
          setActualPerformanceTrends([]);
        }
      } finally {
        setTrendsLoading(false);
      }
};

    loadPerformanceTrends();
  }, [filteredMatches, selectedPlayer, selectedTeam, players, teams, teamStats]);

  // Calculate head-to-head data - now with proper player comparison
  const headToHeadData = useMemo(() => {
    if (!filteredMatches || !selectedPlayer || !comparePlayer) return null;
    
    try {
      return analyticsUtils.calculateHeadToHead(filteredMatches, selectedPlayer, comparePlayer, 'player');
    } catch (error) {
      console.warn('Error calculating head-to-head data:', error);
      return null;
    }
  }, [filteredMatches, selectedPlayer, comparePlayer]);

  // Get player names for display
  const selectedPlayerName = useMemo(() => {
    return playerStats.find(p => p.id === selectedPlayer)?.name || '';
  }, [playerStats, selectedPlayer]);

  const comparePlayerName = useMemo(() => {
    return playerStats.find(p => p.id === comparePlayer)?.name || '';
  }, [playerStats, comparePlayer]);

  // Get team name for display - FIXED: Add team name lookup
  const selectedTeamName = useMemo(() => {
    return teamStats.find(t => t.id === selectedTeam)?.name || '';
  }, [teamStats, selectedTeam]);

  // Calculate competitiveness data
  const competitivenessData = useMemo(() => {
    if (!analyticsData) return [];
    
    try {
      return [
        { label: 'Overall', value: analyticsData.competitivenessIndex || 0 },
        { label: 'Team Balance', value: analyticsData.teamBalanceIndex || 0 },
        { label: 'Skill Variety', value: analyticsData.skillLevelDistribution ? 
          Object.keys(analyticsData.skillLevelDistribution).length * 20 : 0 },
      ];
    } catch (error) {
      console.warn('Error calculating competitiveness data:', error);
      return [];
    }
  }, [analyticsData]);

  // Export report
  const handleExportReport = useCallback(() => {
    if (!players || !teams || !matches) return;
    
    try {
      const reportData = analyticsUtils.generateReportData(players, teams, matches);
      const dataStr = JSON.stringify(reportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `league-report-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  }, [players, teams, matches]);

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner"></div>
        <p>Loading statistics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-state">
        <h2>Error Loading Statistics</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="statistics-page">
      <div className="page-header">
        <div className="header-content">
          <div className="header-text">
            <h1>
              <BarChart3 size={28} />
              League Statistics
            </h1>
            <p>Comprehensive analytics and performance insights</p>
          </div>
          
          <div className="header-actions">
            <div className="filter-group">
              <Filter size={16} />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              >
                <option value="all">All Time</option>
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
                <option value="quarter">Last Quarter</option>
              </select>
            </div>

            <button
              className="btn btn-secondary"
              onClick={handleExportReport}
            >
              <Download size={16} />
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="overview-section">
          <div className="league-overview">
            <h2>League Overview</h2>
            <div className="overview-grid">
              <StatsCard
                title="Total Players"
                value={leagueOverview.totalPlayers || 0}
                icon={Users}
                trend="neutral"
              />
              <StatsCard
                title="Total Teams"
                value={leagueOverview.totalTeams || 0}
                icon={Trophy}
                trend="neutral"
              />
              <StatsCard
                title="Matches Played"
                value={leagueOverview.completedMatches || 0}
                subtitle={`of ${leagueOverview.totalMatches || 0} scheduled`}
                icon={Target}
                trend="positive"
              />
              <StatsCard
                title="Completion Rate"
                value={`${leagueOverview.completionRate || '0.0'}%`}
                icon={TrendingUp}
                trend={parseFloat(leagueOverview.completionRate || 0) > 80 ? 'positive' : 'neutral'}
              />
              <StatsCard
                title="Average Score"
                value={leagueOverview.averageScore || '0.0'}
                subtitle="points per team"
                icon={Activity}
                trend="neutral"
              />
              {analyticsData && (
                <StatsCard
                  title="Competitiveness"
                  value={`${Math.round(analyticsData.competitivenessIndex || 0)}%`}
                  subtitle="match closeness index"
                  icon={Medal}
                  trend={(analyticsData.competitivenessIndex || 0) > 70 ? 'positive' : 'neutral'}
                />
              )}
            </div>
          </div>

          {/* Charts Section */}
          {analyticsData && (
            <div className="charts-section">
              <div className="section-header">
                <h2>Analytics Dashboard</h2>
                <div className="chart-type-selector">
                  {chartTypes.map(type => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        className={`chart-type-btn ${chartType === type.id ? 'active' : ''}`}
                        onClick={() => setChartType(type.id)}
                      >
                        <Icon size={16} />
                        <span>{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="charts-grid">
                {chartType === 'performance' && (
                  <div className="performance-chart-notice">
                    <p>To view performance trends, please go to the <strong>Player Rankings</strong> tab and select a player.</p>
                  </div>
                )}
              <ChartsAndGraphs
                  type={chartType}
                  performanceTrends={chartType === 'performance' ? [] : actualPerformanceTrends}
                  eloDistribution={analyticsData.eloDistribution}
                  skillDistribution={analyticsData.skillLevelDistribution}
                  headToHeadData={headToHeadData}
                  competitivenessData={competitivenessData}
                  selectedPlayerName={selectedPlayerName}
                  comparePlayerName={comparePlayerName}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Player Rankings Tab */}
      {activeTab === 'players' && (
        <div className="rankings-section">
          <div className="section-header">
            <h2>Player Rankings (Sorted by ELO Rating)</h2>
            <div className="ranking-controls">
              <select
                value={selectedPlayer || ''}
                onChange={(e) => setSelectedPlayer(e.target.value || null)}
              >
                <option value="">Select player for analysis...</option>
                {playerStats.map(player => (
                  <option key={player.id} value={player.id}>
                    {player.name} (ELO: {player.eloRating})
                  </option>
                ))}
              </select>
              
              {selectedPlayer && (
                <select
                  value={comparePlayer || ''}
                  onChange={(e) => setComparePlayer(e.target.value || null)}
                >
                  <option value="">Select player to compare...</option>
                  {playerStats.filter(p => p.id !== selectedPlayer).map(player => (
                    <option key={player.id} value={player.id}>
                      {player.name} (ELO: {player.eloRating})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {selectedPlayer && actualPerformanceTrends.length > 0 && (
            <div className="player-analysis">
              <h3>Performance Analysis - {selectedPlayerName}</h3>
              {trendsLoading && (
                <div className="loading-state">
              <div className="loading-spinner"></div>
                  <p>Loading ELO progression...</p>
            </div>
          )}
              {!trendsLoading && (
                <>
              <ChartsAndGraphs
                type="performance"
                performanceTrends={actualPerformanceTrends}
                selectedPlayerName={selectedPlayerName}
              />
                  <div className="elo-history-info">
                    <p className="text-sm text-gray-600 mt-2">
                      {actualPerformanceTrends.filter(t => t.hasActualHistory).length > 0 ? (
                        <>
                          ✅ Showing actual ELO history from {actualPerformanceTrends.filter(t => t.hasActualHistory).length} matches
                          {actualPerformanceTrends.some(t => !t.hasActualHistory) &&
                            ` (${actualPerformanceTrends.filter(t => !t.hasActualHistory).length} estimated)`
                          }
                        </>
            ) : (
                        <>⚠️ Using estimated ELO progression (no stored history found)</>
            )}
                  </p>
                </div>
                </>
      )}
    </div>
          )}
          
          {trendsLoading && selectedPlayer && (
            <div className="loading-trends">
              <div className="loading-spinner"></div>
              <p>Loading performance trends...</p>
            </div>
          )}

          {headToHeadData && selectedPlayer && comparePlayer && (
            <div className="head-to-head-analysis">
              <h3>Head-to-Head Comparison</h3>
              <ChartsAndGraphs
                type="headtohead"
                headToHeadData={headToHeadData}
                selectedPlayerName={selectedPlayerName}
                comparePlayerName={comparePlayerName}
              />
            </div>
          )}

          <div className="rankings-table">
            <div className="table-header">
              <div className="col-rank">Rank</div>
              <div className="col-player">Player</div>
              <div className="col-skill">Skill</div>
              <div className="col-stat">ELO</div>
              <div className="col-stat">Points</div>
              <div className="col-stat">Matches</div>
              <div className="col-stat">Wins</div>
              <div className="col-stat">Win Rate</div>
              <div className="col-stat">Form</div>
            </div>
            
            {playerStats.length === 0 ? (
              <div className="empty-state">
                <Users size={48} />
                <p>No player statistics available</p>
              </div>
            ) : (
              <div className="table-body">
                {playerStats.map((player) => (
                  <MobileRankingCard
                    key={player.id}
                    item={player}
                    type="player"
                    isSelected={selectedPlayer === player.id}
                    onClick={() => setSelectedPlayer(player.id === selectedPlayer ? null : player.id)}
                  />
                ))}
    </div>
            )}
          </div>
        </div>
      )}

      {/* Team Rankings Tab */}
      {activeTab === 'teams' && (
        <div className="rankings-section">
          <div className="section-header">
            <h2>Team Rankings</h2>
            <div className="ranking-controls">
              <select
                value={selectedTeam || ''}
                onChange={(e) => setSelectedTeam(e.target.value || null)}
              >
                <option value="">Select team for analysis...</option>
                {teamStats.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedTeam && actualPerformanceTrends.length > 0 && (
            <div className="team-analysis">
              <h3>Team Performance Analysis - {selectedTeamName}</h3>
              {trendsLoading && (
                <div className="loading-state">
              <div className="loading-spinner"></div>
                  <p>Loading team ELO progression...</p>
            </div>
          )}
              {!trendsLoading && (
                <>
                  <ChartsAndGraphs
                    type="performance"
                    performanceTrends={actualPerformanceTrends}
                    selectedTeamName={selectedTeamName}
                  />
                  <div className="elo-history-info">
                    <p className="text-sm text-gray-600 mt-2">
                      {actualPerformanceTrends.filter(t => t.hasActualHistory).length > 0 ? (
                        <>
                          ✅ Showing actual team ELO history from {actualPerformanceTrends.filter(t => t.hasActualHistory).length} matches
                          {actualPerformanceTrends.some(t => !t.hasActualHistory) &&
                            ` (${actualPerformanceTrends.filter(t => !t.hasActualHistory).length} estimated)`
                          }
                        </>
                      ) : (
                        <>⚠️ Using estimated team ELO progression (run team ELO history setup first)</>
      )}
                    </p>
    </div>
                </>
              )}
            </div>
          )}

          {trendsLoading && selectedTeam && (
            <div className="loading-trends">
              <div className="loading-spinner"></div>
              <p>Loading performance trends...</p>
            </div>
          )}

          <div className="rankings-table">
            <div className="table-header team-header">
              <div className="col-rank">Rank</div>
              <div className="col-team">Team</div>
              <div className="col-skill">Skill</div>
              <div className="col-stat">Team ELO</div>
              <div className="col-stat">Points</div>
              <div className="col-stat">Matches</div>
              <div className="col-stat">Wins</div>
              <div className="col-stat">Win Rate</div>
              <div className="col-stat">Form</div>
            </div>
            
            {teamStats.length === 0 ? (
              <div className="empty-state">
                <Trophy size={48} />
                <p>No team statistics available</p>
              </div>
            ) : (
              <div className="table-body">
                {teamStats.map((team) => (
                  <MobileRankingCard
                    key={team.id}
                    item={team}
                    type="team"
                    isSelected={selectedTeam === team.id}
                    onClick={() => setSelectedTeam(team.id === selectedTeam ? null : team.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Advanced Analytics Tab */}
      {activeTab === 'analytics' && analyticsData && (
        <div className="analytics-section">
          <h2>Advanced Analytics</h2>
          
          <div className="analytics-grid">
            <div className="analytics-card">
              <h3>League Health Metrics</h3>
              <div className="metrics-grid">
                <div className="metric-item">
                  <span className="metric-label">Competitiveness Index</span>
                  <span className="metric-value">{Math.round(analyticsData.competitivenessIndex || 0)}%</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Team Balance</span>
                  <span className="metric-value">{Math.round(analyticsData.teamBalanceIndex || 0)}%</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Completion Rate</span>
                  <span className="metric-value">{leagueOverview.completionRate || '0.0'}%</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Active Players</span>
                  <span className="metric-value">{analyticsData.totalPlayers || 0}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Active Teams</span>
                  <span className="metric-value">{analyticsData.totalTeams || 0}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Completed Matches</span>
                  <span className="metric-value">{analyticsData.completedMatches || 0}</span>
                </div>
              </div>
            </div>
            <div className="analytics-card">
              <h3>Distribution Analysis</h3>
              <div className="distribution-charts">
                <div className="chart-section">
                  <h4>ELO Rating Distribution</h4>
                  <ChartsAndGraphs
                    type="elo"
                    eloDistribution={analyticsData.eloDistribution}
                  />
                </div>
                <div className="chart-section">
                  <h4>Skill Level Distribution</h4>
                  <ChartsAndGraphs
                    type="skills"
                    skillDistribution={analyticsData.skillLevelDistribution}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="analytics-insights">
            <h3>Key Insights</h3>
            <div className="insights-grid">
              <div className="insight-card">
                <Activity size={24} />
                <div className="insight-content">
                  <h4>Match Competitiveness</h4>
                  <p>
                    {(analyticsData.competitivenessIndex || 0) > 80 
                      ? "Matches are highly competitive with close scores"
                      : (analyticsData.competitivenessIndex || 0) > 60
                      ? "Good level of competition across matches"
                      : "Consider rebalancing teams for closer matches"
                    }
                  </p>
                </div>
              </div>

              <div className="insight-card">
                <Users size={24} />
                <div className="insight-content">
                  <h4>Player Distribution</h4>
                  <p>
                    {analyticsData.skillLevelDistribution
                      ? (() => {
                          const entries = Object.entries(analyticsData.skillLevelDistribution);
                          const totalPlayers = entries.reduce((sum, [, count]) => sum + count, 0);
                          if (totalPlayers === 0) return "No skill level data available";

                          const [dominantSkill] = entries.sort(([,a], [,b]) => b - a)[0] || ['mixed', 0];
                          const percentage = Math.round((entries.find(([skill]) => skill === dominantSkill)?.[1] || 0) / totalPlayers * 100);

                          return `${dominantSkill.charAt(0).toUpperCase() + dominantSkill.slice(1)} players make up ${percentage}% of the league`;
                        })()
                      : "Balanced skill distribution across all levels"
                    }
                  </p>
                </div>
              </div>

              <div className="insight-card">
                <Trophy size={24} />
                <div className="insight-content">
                  <h4>Team Balance</h4>
                  <p>
                    {(analyticsData.teamBalanceIndex || 0) > 70
                      ? "Great variety in team skill combinations promoting competitive balance"
                      : (analyticsData.teamBalanceIndex || 0) > 40
                      ? "Moderate team variety - consider encouraging more diverse team formations"
                      : "Limited team variety - encourage players to form teams with different skill combinations"
                    }
                  </p>
                </div>
              </div>

              <div className="insight-card">
                <Target size={24} />
                <div className="insight-content">
                  <h4>League Activity</h4>
                  <p>
                    {leagueOverview.completionRate > 80
                      ? "Excellent match completion rate - players are highly engaged"
                      : leagueOverview.completionRate > 60
                      ? "Good activity level - most scheduled matches are being completed"
                      : "Consider strategies to improve match completion rates"
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Statistics;