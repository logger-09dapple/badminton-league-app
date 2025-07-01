import React, { useState, useEffect } from 'react';
import { supabaseService } from '../services/supabaseService';
import { badmintonEloSystem } from '../utils/BadmintonEloSystem';
import { TrendingUp, TrendingDown, Award, Medal, Trophy, Star } from 'lucide-react';
import '../styles/MobileStatistics.css'; // Base mobile-friendly styles
import '../styles/EloMobileStyles.css'; // Enhanced ELO-specific styles

const EloStatistics = () => {
  const [playerRankings, setPlayerRankings] = useState([]);
  const [teamRankings, setTeamRankings] = useState([]);
  const [skillRecommendations, setSkillRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('players');

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      
      const [players, teams] = await Promise.all([
        supabaseService.getPlayerRankingsByElo(),
        supabaseService.getTeamRankingsByElo()
      ]);
      
      setPlayerRankings(players);
      setTeamRankings(teams);
      
      // Generate skill level recommendations
      const recommendations = badmintonEloSystem.generateSkillLevelRecommendations(players);
      setSkillRecommendations(recommendations);
      
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy className="text-yellow-500" size={20} />;
    if (rank === 2) return <Medal className="text-gray-400" size={20} />;
    if (rank === 3) return <Award className="text-amber-600" size={20} />;
    return <Star className="text-blue-500" size={16} />;
  };

  const getEloChangeIndicator = (ratingChange) => {
    if (ratingChange > 0) {
      return <TrendingUp className="text-green-500" size={16} />;
    } else if (ratingChange < 0) {
      return <TrendingDown className="text-red-500" size={16} />;
    }
    return null;
  };

  const getSkillLevelColor = (skillLevel) => {
    switch (skillLevel) {
      case 'Advanced': return 'bg-red-100 text-red-800';
      case 'Intermediate': return 'bg-blue-100 text-blue-800';
      case 'Beginner': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="loading">Loading ELO statistics...</div>;
  }

  return (
    <div className="elo-statistics">
      <div className="container">
        <div className="page-header">
          <h1>ELO-Based Rankings</h1>
          <div className="stats-summary">
            <div className="summary-item">
              <span className="summary-label">Avg ELO Rating</span>
              <span className="summary-value">
                {playerRankings.length > 0 
                  ? Math.round(playerRankings.reduce((sum, p) => sum + (p.elo_rating || 1500), 0) / playerRankings.length)
                  : 1500
                }
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Total Players</span>
              <span className="summary-value">{playerRankings.length}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Total Teams</span>
              <span className="summary-value">{teamRankings.length}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button 
            className={`tab-button ${activeTab === 'players' ? 'active' : ''}`}
            onClick={() => setActiveTab('players')}
          >
            Player Rankings
          </button>
          <button 
            className={`tab-button ${activeTab === 'teams' ? 'active' : ''}`}
            onClick={() => setActiveTab('teams')}
          >
            Team Rankings
          </button>
          {skillRecommendations.length > 0 && (
            <button 
              className={`tab-button ${activeTab === 'recommendations' ? 'active' : ''}`}
              onClick={() => setActiveTab('recommendations')}
            >
              Skill Recommendations ({skillRecommendations.length})
            </button>
          )}
        </div>

        {/* Player Rankings Tab */}
        {activeTab === 'players' && (
          <div className="rankings-section">
            <h2>Player Rankings by ELO Rating</h2>
            <div className="rankings-list">
              {playerRankings.map((player, index) => (
                <div key={player.id} className="ranking-item player-ranking">
                  <div className="rank-info">
                    {getRankIcon(player.rank)}
                    <span className="rank-number">#{player.rank}</span>
                  </div>
                  <div className="player-info">
                    <div className="player-name">{player.name}</div>
                    <div className="player-meta">
                      <span className={`skill-badge ${getSkillLevelColor(player.skill_level)}`}>
                        {player.skill_level}
                      </span>
                      <span className="gender-badge">{player.gender}</span>
                    </div>
                  </div>
                  <div className="elo-info">
                    <div className="elo-rating">
                      <span className="elo-value">{player.elo_rating || 1500}</span>
                      <span className="elo-label">ELO</span>
                    </div>
                    {player.peak_elo_rating && player.peak_elo_rating > (player.elo_rating || 1500) && (
                      <div className="peak-elo">
                        Peak: {player.peak_elo_rating}
                      </div>
                    )}
                  </div>
                  <div className="stats-info">
                    <div className="stat-item">
                      <span className="stat-value">{player.matches_played || 0}</span>
                      <span className="stat-label">Matches</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-value">{player.win_percentage}%</span>
                      <span className="stat-label">Win Rate</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-value">{player.elo_games_played || 0}</span>
                      <span className="stat-label">ELO Games</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team Rankings Tab */}
        {activeTab === 'teams' && (
          <div className="rankings-section">
            <h2>Team Rankings by ELO Rating</h2>
            <div className="rankings-list">
              {teamRankings.map((team, index) => (
                <div key={team.id} className="ranking-item team-ranking">
                  <div className="rank-info">
                    {getRankIcon(team.rank)}
                    <span className="rank-number">#{team.rank}</span>
                  </div>
                  
                  <div className="team-info">
                    <div className="team-name">{team.name}</div>
                    <div className="team-meta">
                      <span className="skill-combo-badge">{team.skill_combination}</span>
                      <span className="team-type-badge">{team.team_type}</span>
                    </div>
                    <div className="team-players">
                      {team.team_players?.map(tp => tp.players?.name).filter(Boolean).join(' & ')}
                    </div>
                  </div>
                  
                  <div className="elo-info">
                    <div className="elo-rating">
                      <span className="elo-value">{team.elo_rating || team.avg_player_elo}</span>
                      <span className="elo-label">Team ELO</span>
                    </div>
                    <div className="avg-elo">
                      Avg Player: {team.avg_player_elo}
                    </div>
                  </div>
                  
                  <div className="stats-info">
                    <div className="stat-item">
                      <span className="stat-value">{team.matches_played || 0}</span>
                      <span className="stat-label">Matches</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-value">{team.win_percentage}%</span>
                      <span className="stat-label">Win Rate</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-value">{team.points || 0}</span>
                      <span className="stat-label">Points</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skill Recommendations Tab */}
        {activeTab === 'recommendations' && skillRecommendations.length > 0 && (
          <div className="recommendations-section">
            <h2>Automatic Skill Level Recommendations</h2>
            <p className="recommendations-description">
              Based on ELO rating performance, these players may be candidates for skill level adjustments:
            </p>
            <div className="recommendations-list">
              {skillRecommendations.map((rec, index) => (
                <div key={rec.playerId} className="recommendation-item">
                  <div className="rec-player-info">
                    <div className="rec-player-name">{rec.playerName}</div>
                    <div className="rec-elo">ELO: {rec.eloRating}</div>
                  </div>
                  
                  <div className="rec-change">
                    <span className={`skill-badge ${getSkillLevelColor(rec.currentSkill)}`}>
                      {rec.currentSkill}
                    </span>
                    <TrendingUp size={16} />
                    <span className={`skill-badge ${getSkillLevelColor(rec.recommendedSkill)}`}>
                      {rec.recommendedSkill}
                    </span>
                  </div>
                  
                  <div className="rec-confidence">
                    <div className="confidence-bar">
                      <div
                        className="confidence-fill"
                        style={{ width: `${rec.confidence}%` }}
                      ></div>
                    </div>
                    <span className="confidence-text">{rec.confidence}% confidence</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EloStatistics;
