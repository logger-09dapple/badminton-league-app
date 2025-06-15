import React, { useState, useEffect } from 'react';
import { useLeague } from '../context/LeagueContext';
import MatchForm from '../components/MatchForm';
import ScoreUpdateForm from '../components/ScoreUpdateForm';
import AdminAuth from '../utils/adminAuth';
import Modal from '../components/Modal';
import { Plus, Calendar, Trophy, Trash2, Filter, X } from 'lucide-react';
import ProtectedAdminButton from '../components/ProtectedAdminButton';

const Matches = () => {
  const { 
    matches, 
    teams, 
    players,
    loading, 
    error, 
    addMatch, 
    updateMatch,
    deleteAllMatches // Add this to context
  } = useLeague();

  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState(new Set());
  const [filteredMatches, setFilteredMatches] = useState([]);

  // Filter matches based on selected players
  useEffect(() => {
    if (selectedPlayers.size === 0) {
      setFilteredMatches(matches);
    } else {
      const filtered = matches.filter(match => {
        // Get all player IDs for both teams in this match
        const team1PlayerIds = match.team1?.team_players?.map(tp => tp.player_id) || [];
        const team2PlayerIds = match.team2?.team_players?.map(tp => tp.player_id) || [];
        const allMatchPlayerIds = [...team1PlayerIds, ...team2PlayerIds];
        
        // Check if any of the selected players are in this match
        return Array.from(selectedPlayers).some(playerId => 
          allMatchPlayerIds.includes(playerId)
        );
      });
      setFilteredMatches(filtered);
    }
  }, [matches, selectedPlayers]);

  const handleAddMatch = () => {
    setSelectedMatch(null);
    setIsMatchModalOpen(true);
  };

  const handleUpdateScore = (match) => {
    setSelectedMatch(match);
    setIsScoreModalOpen(true);
  };

  const handleMatchSubmit = async (matchData) => {
    try {
      await addMatch(matchData);
      setIsMatchModalOpen(false);
    } catch (error) {
      console.error('Error saving match:', error);
      alert('Error saving match: ' + error.message);
    }
  };

  const handleScoreSubmit = async (scoreData) => {
    try {
      await updateMatch(selectedMatch.id, {
        team1Id: selectedMatch.team1_id,
        team2Id: selectedMatch.team2_id,
        team1Score: scoreData.team1Score,
        team2Score: scoreData.team2Score
      });
      setIsScoreModalOpen(false);
      setSelectedMatch(null);
    } catch (error) {
      console.error('Error updating score:', error);
      alert('Error updating score: ' + error.message);
    }
  };

  // NEW: Handle delete all matches
  const handleDeleteAllMatches = async () => {
    AdminAuth.logAdminAction('Deleting all matches?');
    const confirmMessage = `Are you sure you want to delete ALL ${matches.length} matches? This action cannot be undone and will reset all statistics.`;
    
    if (window.confirm(confirmMessage)) {
      try {
        await deleteAllMatches();
        alert('All matches have been deleted successfully.');
      } catch (error) {
        console.error('Error deleting all matches:', error);
        alert('Error deleting all matches: ' + error.message);
      }
    }
  };

  // Player filter functions
  const handlePlayerFilterChange = (playerId, checked) => {
    setSelectedPlayers(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(playerId);
      } else {
        newSet.delete(playerId);
      }
      return newSet;
    });
  };

  const clearAllFilters = () => {
    setSelectedPlayers(new Set());
  };

  const selectAllPlayers = () => {
    setSelectedPlayers(new Set(players.map(p => p.id)));
  };

  // Get player name by ID
  const getPlayerName = (playerId) => {
    const player = players.find(p => p.id === playerId);
    return player ? player.name : 'Unknown Player';
  };

  // Format team display with player names
  const formatTeamDisplay = (team) => {
    if (!team) return 'Unknown Team';
    
    const playerNames = team.team_players?.map(tp => 
      getPlayerName(tp.player_id)
    ).join(' & ') || 'No Players';
    
    return (
      <div className="team-display">
        <div className="team-name">{team.name}</div>
        <div className="player-names">{playerNames}</div>
      </div>
    );
  };

  if (loading) {
    return <div className="loading">Loading matches...</div>;
  }

  const unplayedMatches = filteredMatches.filter(match => match.status === 'scheduled');
  const completedMatches = filteredMatches.filter(match => match.status === 'completed');

  return (
    <div className="matches-page">
      <div className="container">
        <div className="page-header">
          <h1>Matches</h1>
          <div className="header-actions">
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)} 
              className={`btn btn-secondary ${isFilterOpen ? 'active' : ''}`}
            >
              <Filter size={18} />
              Filter by Players
              {selectedPlayers.size > 0 && (
                <span className="filter-count">({selectedPlayers.size})</span>
              )}
            </button>
            {matches.length > 0 && (
              <ProtectedAdminButton
                onClick={handleDeleteAllMatches} 
                className="btn btn-danger"
                title="Delete all matches"
              >
                <Trash2 size={18} />
                Delete All Matches
              </ProtectedAdminButton>
            )}
            <button onClick={handleAddMatch} className="btn btn-primary">
              <Plus size={18} />
              Add Match
            </button>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Player Filter Panel */}
        {isFilterOpen && (
          <div className="filter-panel">
            <div className="filter-header">
              <h3>Filter Matches by Players</h3>
              <div className="filter-actions">
                <button onClick={clearAllFilters} className="btn-link">Clear All</button>
                <button onClick={selectAllPlayers} className="btn-link">Select All</button>
                <button onClick={() => setIsFilterOpen(false)} className="btn-icon">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="player-checkboxes">
              {players.map(player => (
                <label key={player.id} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedPlayers.has(player.id)}
                    onChange={(e) => handlePlayerFilterChange(player.id, e.target.checked)}
                  />
                  <span className="checkbox-text">
                    {player.name}
                    <span className="skill-level">({player.skill_level})</span>
                  </span>
                </label>
              ))}
            </div>
            {selectedPlayers.size > 0 && (
              <div className="filter-summary">
                Showing matches for {selectedPlayers.size} selected player(s)
              </div>
            )}
          </div>
        )}

        <div className="matches-stats">
          <div className="stat-item">
            <span className="stat-label">Total Matches:</span>
            <span className="stat-value">{filteredMatches.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Unplayed:</span>
            <span className="stat-value">{unplayedMatches.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Completed:</span>
            <span className="stat-value">{completedMatches.length}</span>
          </div>
        </div>

        {/* Unplayed Matches Section */}
        <div className="matches-section">
          <h2 className="section-title">
            <Calendar size={20} />
            Unplayed Matches ({unplayedMatches.length})
          </h2>
          
          {unplayedMatches.length === 0 ? (
            <div className="empty-state">
              <p>No unplayed matches found.</p>
              {selectedPlayers.size > 0 && (
                <p>Try adjusting your player filter or add new matches.</p>
              )}
            </div>
          ) : (
            <div className="matches-list">
              {unplayedMatches.map(match => (
                <div key={match.id} className="match-card unplayed">
                  <div className="match-teams">
                    <div className="team">
                      {formatTeamDisplay(match.team1)}
                    </div>
                    <div className="vs">VS</div>
                    <div className="team">
                      {formatTeamDisplay(match.team2)}
                    </div>
                  </div>
                  <div className="match-info">
                    <span className="status-badge status-scheduled">
                      {match.scheduled_date ? `Scheduled: ${new Date(match.scheduled_date).toLocaleDateString()}` : 'Not Scheduled'}
                    </span>
                  </div>
                  <div className="match-actions">
                    <button 
                      onClick={() => handleUpdateScore(match)}
                      className="btn btn-primary btn-sm"
                    >
                      Record Score
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completed Matches Section */}
        <div className="matches-section">
          <h2 className="section-title">
            <Trophy size={20} />
            Completed Matches ({completedMatches.length})
          </h2>
          
          {completedMatches.length === 0 ? (
            <div className="empty-state">
              <p>No completed matches yet.</p>
            </div>
          ) : (
            <div className="matches-list">
              {completedMatches.map(match => (
                <div key={match.id} className="match-card completed">
                  <div className="match-teams">
                    <div className={`team ${match.winner_team_id === match.team1_id ? 'winner' : ''}`}>
                      {formatTeamDisplay(match.team1)}
                      <div className="score">{match.team1_score}</div>
                    </div>
                    <div className="vs">VS</div>
                    <div className={`team ${match.winner_team_id === match.team2_id ? 'winner' : ''}`}>
                      {formatTeamDisplay(match.team2)}
                      <div className="score">{match.team2_score}</div>
                    </div>
                  </div>
                  <div className="match-info">
                    <span className="status-badge status-completed">
                      Completed
                    </span>
                    {match.scheduled_date && (
                      <span className="match-date">
                        {new Date(match.scheduled_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="match-actions">
                    <button 
                      onClick={() => handleUpdateScore(match)}
                      className="btn btn-secondary btn-sm"
                    >
                      Update Score
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Match Modal */}
        <Modal
          isOpen={isMatchModalOpen}
          onClose={() => setIsMatchModalOpen(false)}
          title="Add New Match"
        >
          <MatchForm
            teams={teams}
            onSubmit={handleMatchSubmit}
            onCancel={() => setIsMatchModalOpen(false)}
          />
        </Modal>

        {/* Score Update Modal */}
        <Modal
          isOpen={isScoreModalOpen}
          onClose={() => setIsScoreModalOpen(false)}
          title="Update Match Score"
        >
          <ScoreUpdateForm
            match={selectedMatch}
            onSubmit={handleScoreSubmit}
            onCancel={() => setIsScoreModalOpen(false)}
          />
        </Modal>
      </div>
    </div>
  );
};

export default Matches;

