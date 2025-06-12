import React from 'react';
import { Calendar, Clock, Trophy } from 'lucide-react';

const RecentMatches = ({ matches }) => {
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

  if (matches.length === 0) {
    return (
      <div className="recent-matches">
        <h2>Recent Matches</h2>
        <div className="empty-state">
          <p>No matches found. Schedule your first match to get started!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="recent-matches">
      <h2>Recent Matches</h2>
      <div className="matches-list">
        {matches.map(match => {
          const status = getStatusBadge(match.status);

          return (
            <div key={match.id} className="match-card">
              <div className="match-header">
                <div className="match-teams">
                  <span className="team-name">{match.team1?.name || 'Team 1'}</span>
                  <span className="vs">vs</span>
                  <span className="team-name">{match.team2?.name || 'Team 2'}</span>
                </div>
                <span className={`status-badge ${status.class}`}>
                  {status.label}
                </span>
              </div>

              <div className="match-details">
                <div className="match-info">
                  <Calendar size={16} />
                  <span>{formatDate(match.scheduled_date)}</span>
                </div>

                {match.status === 'completed' && (
                  <div className="match-score">
                    <Trophy size={16} />
                    <span>{match.team1_score} - {match.team2_score}</span>
                  </div>
                )}

                {match.status === 'scheduled' && (
                  <div className="match-status">
                    <Clock size={16} />
                    <span>Awaiting players</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecentMatches;
