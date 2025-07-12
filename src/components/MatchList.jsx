import React, { useState } from 'react';
import { Calendar, Clock, Trophy, Edit, Users } from 'lucide-react';
import ScoreUpdateModal from './ScoreUpdateModal';

const MatchList = ({ matches, teams, onEdit, onSchedule, onUpdateScore }) => {
  const [scoreModalMatch, setScoreModalMatch] = useState(null);

  const formatDate = (dateString) => {
    if (!dateString) return 'Not scheduled';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      scheduled: { label: 'Scheduled', class: 'status-scheduled' },
      in_progress: { label: 'In Progress', class: 'status-in-progress' },
      completed: { label: 'Completed', class: 'status-completed' }
    };

    return statusConfig[status] || { label: status, class: 'status-default' };
  };

  const handleScoreUpdate = (match) => {
    setScoreModalMatch(match);
  };

  const handleScoreSubmit = async (scoreData) => {
    await onUpdateScore(scoreModalMatch.id, scoreData);
    setScoreModalMatch(null);
  };

  if (matches.length === 0) {
    return (
      <div className="empty-state">
        <p>No matches found. Create your first match to get started!</p>
      </div>
    );
  }

  return (
    <>
      <div className="match-list">
        <div className="list-header">
          <span>Teams</span>
          <span>Date</span>
          <span>Status</span>
          <span>Score</span>
          <span>Actions</span>
        </div>

        {matches.map(match => {
          const status = getStatusBadge(match.status);

          return (
            <div key={match.id} className="match-item">
              <div className="match-teams">
                <div className="team">
                  <span className="team-name">{match.team1?.name || 'Team 1'}</span>
                  <span className="skill-combo">{match.team1?.skill_combination}</span>
                </div>
                <span className="vs">vs</span>
                <div className="team">
                  <span className="team-name">{match.team2?.name || 'Team 2'}</span>
                  <span className="skill-combo">{match.team2?.skill_combination}</span>
                </div>
              </div>

              <div className="match-date">
                <Calendar size={16} />
                <span>{match.status === 'completed' && match.updated_at
                  ? formatDate(match.updated_at)
                  : formatDate(match.scheduled_date)
                }</span>
              </div>

              <div className="match-status">
                <span className={`status-badge ${status.class}`}>
                  {status.label}
                </span>
              </div>

              <div className="match-score">
                {match.status === 'completed' ? (
                  <div className="score-display">
                    <span className="score">{match.team1_score} - {match.team2_score}</span>
                    {match.winner_team_id && (
                      <div className="winner">
                        <Trophy size={14} />
                        <span>
                          {match.winner_team_id === match.team1_id
                            ? match.team1?.name
                            : match.team2?.name
                          }
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="no-score">-</span>
                )}
              </div>

              <div className="match-actions">
                {match.status !== 'completed' && (
                  <>
                    <button
                      onClick={() => onEdit(match)}
                      className="btn btn-icon btn-edit"
                      title="Edit match"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleScoreUpdate(match)}
                      className="btn btn-icon btn-score"
                      title="Update score"
                    >
                      <Trophy size={16} />
                    </button>
                  </>
                )}
                {match.status === 'completed' && (
                  <button
                    onClick={() => handleScoreUpdate(match)}
                    className="btn btn-icon btn-edit"
                    title="Edit score"
                  >
                    <Edit size={16} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {scoreModalMatch && (
        <ScoreUpdateModal
          match={scoreModalMatch}
          onSubmit={handleScoreSubmit}
          onClose={() => setScoreModalMatch(null)}
        />
      )}
    </>
  );
};

export default MatchList;
