import React, { useState } from 'react';
import { Calendar, Users } from 'lucide-react';

const MatchScheduler = ({ matches, players, onSchedule, onClose }) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState({});
  const [selectedMatches, setSelectedMatches] = useState([]);

  const handlePlayerSelection = (matchId, playerId) => {
    setSelectedPlayers(prev => {
      const matchPlayers = prev[matchId] || [];
      const isSelected = matchPlayers.includes(playerId);

      if (isSelected) {
        return {
          ...prev,
          [matchId]: matchPlayers.filter(id => id !== playerId)
        };
      } else if (matchPlayers.length < 4) {
        return {
          ...prev,
          [matchId]: [...matchPlayers, playerId]
        };
      }
      return prev;
    });
  };

  const handleMatchSelection = (matchId) => {
    setSelectedMatches(prev => 
      prev.includes(matchId) 
        ? prev.filter(id => id !== matchId)
        : [...prev, matchId]
    );
  };

  const handleScheduleSelected = async () => {
    if (!selectedDate || selectedMatches.length === 0) {
      alert('Please select a date and at least one match');
      return;
    }

    for (const matchId of selectedMatches) {
      await onSchedule(matchId, { date: selectedDate });
    }

    onClose();
  };

  const getPlayersForTeam = (team) => {
    return team?.team_players?.map(tp => tp.players) || [];
  };

  if (matches.length === 0) {
    return (
      <div className="empty-state">
        <p>No scheduled matches available for player assignment.</p>
        <button onClick={onClose} className="btn btn-secondary">
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="match-scheduler">
      <div className="scheduler-header">
        <div className="date-selection">
          <label htmlFor="matchDate">Select Date:</label>
          <input
            type="date"
            id="matchDate"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
      </div>

      <div className="matches-to-schedule">
        <h3>Available Matches</h3>
        {matches.map(match => {
          const team1Players = getPlayersForTeam(match.team1);
          const team2Players = getPlayersForTeam(match.team2);
          const allTeamPlayers = [...team1Players, ...team2Players];
          const matchSelectedPlayers = selectedPlayers[match.id] || [];

          return (
            <div key={match.id} className="match-scheduler-item">
              <div className="match-header">
                <label className="match-selection">
                  <input
                    type="checkbox"
                    checked={selectedMatches.includes(match.id)}
                    onChange={() => handleMatchSelection(match.id)}
                  />
                  <span className="match-title">
                    {match.team1?.name} vs {match.team2?.name}
                  </span>
                </label>
              </div>

              {selectedMatches.includes(match.id) && (
                <div className="player-selection">
                  <h4>Select Available Players ({matchSelectedPlayers.length}/4):</h4>
                  <div className="players-grid">
                    {allTeamPlayers.map(player => (
                      <div
                        key={player.id}
                        className={\`player-option \${
                          matchSelectedPlayers.includes(player.id) ? 'selected' : ''
                        } \${
                          matchSelectedPlayers.length >= 4 && !matchSelectedPlayers.includes(player.id)
                            ? 'disabled' : ''
                        }\`}
                        onClick={() => handlePlayerSelection(match.id, player.id)}
                      >
                        <Users size={16} />
                        <span>{player.name}</span>
                        <span className="skill-level">({player.skill_level})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="scheduler-actions">
        <button onClick={onClose} className="btn btn-secondary">
          Cancel
        </button>
        <button 
          onClick={handleScheduleSelected}
          className="btn btn-primary"
          disabled={!selectedDate || selectedMatches.length === 0}
        >
          Schedule Selected Matches
        </button>
      </div>
    </div>
  );
};

export default MatchScheduler;
