import React, { useState, useEffect, useRef } from 'react';
import { useLeague } from '../context/LeagueContext';
import MatchForm from '../components/MatchForm';
import ScoreUpdateForm from '../components/ScoreUpdateForm';
import AdminAuth from '../utils/adminAuth';
import Modal from '../components/Modal';
import { Plus, Calendar, Trophy, Trash2, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import ProtectedAdminButton from '../components/ProtectedAdminButton';
import { scrollToElement } from '../utils/scrollHelper';
import '../styles/MatchesPage.css'; // Import the new CSS file

const Matches = () => {
  const { 
    matches, 
    teams, 
    players,
    loading, 
    error, 
    addMatch, 
    updateMatch,
    deleteAllMatches, // Add this to context
    deleteMatch // We'll implement this in the context
  } = useLeague();

  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState(new Set());
  const [filteredMatches, setFilteredMatches] = useState([]);
  const [showCompletedMatches, setShowCompletedMatches] = useState(true);
  const [showUnplayedMatches, setShowUnplayedMatches] = useState(true);

  // Refs for the section content elements
  const completedSectionRef = useRef(null);
  const unplayedSectionRef = useRef(null);

  // Enhanced function to handle section toggle with better scrolling
  const toggleSection = (section, isCurrentlyShown) => {
    // First toggle the section visibility
    if (section === 'completed') {
      setShowCompletedMatches(!isCurrentlyShown);
    } else {
      setShowUnplayedMatches(!isCurrentlyShown);
    }

    // If we're opening a section (especially unplayed), ensure it's visible after expansion
    if (isCurrentlyShown === true) return; // Only proceed if we're opening

    // Use setTimeout to allow the DOM to update before scrolling
        setTimeout(() => {
      const ref = section === 'completed' ? completedSectionRef : unplayedSectionRef;
      if (ref.current) {
        // Use our enhanced scroll helper
        scrollToElement(ref.current, {
          block: 'start',
          offset: -20
        });
      }
    }, 50); // Short delay to ensure DOM is updated
  };

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
      // UPDATED: Check if ALL players in this match are in the selected players set
      // This ensures only matches between selected players are shown
      return allMatchPlayerIds.length > 0 && 
             allMatchPlayerIds.every(playerId => selectedPlayers.has(playerId));
    });
    setFilteredMatches(filtered);
  }
}, [matches, selectedPlayers]);

// Get count of matches involving only selected players
const getExclusiveMatchCount = () => {
  if (selectedPlayers.size === 0) return matches.length;
  
  return matches.filter(match => {
    const team1PlayerIds = match.team1?.team_players?.map(tp => tp.player_id) || [];
    const team2PlayerIds = match.team2?.team_players?.map(tp => tp.player_id) || [];
    const allMatchPlayerIds = [...team1PlayerIds, ...team2PlayerIds];

    return allMatchPlayerIds.length > 0 &&
           allMatchPlayerIds.every(playerId => selectedPlayers.has(playerId));
  }).length;
};

// Get list of selected player names for display
const getSelectedPlayerNames = () => {
  return Array.from(selectedPlayers)
    .map(playerId => players.find(p => p.id === playerId)?.name)
    .filter(Boolean)
    .join(', ');
};
	
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
      console.log('Adding match with data:', matchData);
      const newMatch = await addMatch(matchData);
      console.log('Match added successfully:', newMatch);
      setIsMatchModalOpen(false);

      // Show success message
      alert(matchData.team1Score !== undefined ?
        'Match created with scores successfully!' :
        'Match created successfully!');
    } catch (error) {
      console.error('Error saving match:', error);
      alert('Error saving match: ' + (error.message || 'Unknown error'));
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

  // Handle delete all matches
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

  // New: Handle delete individual match
  const handleDeleteMatch = async (matchId) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    const confirmMessage = `Are you sure you want to delete this match between ${match.team1?.name} and ${match.team2?.name}? ${
      match.status === 'completed' ? 'This will also revert player statistics and ELO ratings.' : ''
    }`;

    if (window.confirm(confirmMessage)) {
      try {
        await deleteMatch(matchId);
        alert('Match has been deleted successfully.');
      } catch (error) {
        console.error('Error deleting match:', error);
        alert('Error deleting match: ' + error.message);
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

  // Format team display with player names - with length limits for better layout
  const formatTeamDisplay = (team) => {
    if (!team) return 'Unknown Team';

    const playerNames = team.team_players?.map(tp => {
      const playerName = getPlayerName(tp.player_id);
      // Limit name length to prevent layout issues
      return playerName.length > 15 ? playerName.substring(0, 15) + '...' : playerName;
    }).join(' & ') || 'No Players';

    // Also limit team name length
    const teamName = team.name && team.name.length > 20
      ? team.name.substring(0, 20) + '...'
      : team.name || 'Unknown';

    return (
      <div className="team-display">
        <div className="team-name">{teamName}</div>
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
            <div className="filter-info">
              <strong>Exclusive Filter Active:</strong> Showing matches where ALL players are from the {selectedPlayers.size} selected players
            </div>
            <div className="selected-players">
              <strong>Selected Players:</strong> {getSelectedPlayerNames()}
            </div>
            <div className="match-count">
              <strong>Matching Exclusive Combinations:</strong> {getExclusiveMatchCount()} matches
            </div>
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

        {/* Completed Matches Section - SHOWN FIRST */}
        <div className="matches-section">
          <div
            className="section-header"
            onClick={() => toggleSection('completed', showCompletedMatches)}
          >
            <h2 className="section-title">
              <Trophy size={20} />
              Completed Matches ({completedMatches.length})
            </h2>
            {showCompletedMatches ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>

          <div
            ref={completedSectionRef}
            className={`section-content ${!showCompletedMatches ? 'collapsed' : ''}`}
          >
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
                      <span className="match-date">
                        {match.status === 'completed' && match.updated_at
                          ? new Date(match.updated_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })
                          : match.created_at
                            ? new Date(match.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })
                            : match.scheduled_date
                              ? new Date(match.scheduled_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                                })
                              : 'No date'
                        }
                      </span>
                    </div>
                    <div className="match-actions">
                      <button
                        onClick={() => handleUpdateScore(match)}
                        className="btn btn-secondary btn-sm"
                      >
                        Update Score
                      </button>
                      <ProtectedAdminButton
                        onClick={() => handleDeleteMatch(match.id)}
                        className="btn btn-danger btn-sm"
                        title="Delete match"
                        modalTitle="Delete Completed Match"
                        modalMessage="Warning: Deleting a completed match will revert all player statistics and ELO ratings associated with this match."
                      >
                        <Trash2 size={16} />
                        Delete
                      </ProtectedAdminButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Unplayed Matches Section */}
        <div className="matches-section">
          <div
            className="section-header"
            onClick={() => toggleSection('unplayed', showUnplayedMatches)}
            ref={unplayedSectionRef}
          >
            <h2 className="section-title">
              <Calendar size={20} />
              Unplayed Matches ({unplayedMatches.length})
            </h2>
            {showUnplayedMatches ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>

          <div
            className={`section-content ${!showUnplayedMatches ? 'collapsed' : ''}`}
          >
            {unplayedMatches.length === 0 ? (
              <div className="empty-state">
                <p>No unplayed matches found.</p>
                {selectedPlayers.size > 0 && (
                  <p>Try adjusting your player filter or add new matches.</p>
                )}
              </div>
            ) : (
              <div className="matches-list scrollable-match-list">
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
                        {match.scheduled_date ? `Scheduled: ${new Date(match.scheduled_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}` : 'Not Scheduled'}
                      </span>
                      <span className="match-date">
                        Created: {match.created_at
                          ? new Date(match.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })
                          : 'No date'
                        }
                      </span>
                    </div>
                    <div className="match-actions">
                      <button
                        onClick={() => handleUpdateScore(match)}
                        className="btn btn-primary btn-sm"
                      >
                        Record Score
                      </button>
                      <ProtectedAdminButton
                        onClick={() => handleDeleteMatch(match.id)}
                        className="btn btn-danger btn-sm"
                        title="Delete match"
                      >
                        <Trash2 size={16} />
                        Delete
                      </ProtectedAdminButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add Match Modal */}
        <Modal
          isOpen={isMatchModalOpen}
          onClose={() => setIsMatchModalOpen(false)}
          title="Add New Match"
        >
          <MatchForm
            teams={teams}
            players={players}
            onSubmit={handleMatchSubmit}
            onCancel={() => setIsMatchModalOpen(false)}
            includeScores={true} /* NEW: Enable score input during match creation */
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
