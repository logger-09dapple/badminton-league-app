import React from 'react';
import { Edit, Trash2, Mail, Phone } from 'lucide-react';

const PlayerList = ({ players, onEdit, onDelete }) => {
  const getSkillBadgeClass = (skillLevel) => {
    switch (skillLevel) {
      case 'Advanced': return 'skill-badge-advanced';
      case 'Intermediate': return 'skill-badge-intermediate';
      case 'Beginner': return 'skill-badge-beginner';
      default: return 'skill-badge-default';
    }
  };

  if (players.length === 0) {
    return (
      <div className="empty-state">
        <p>No players found. Add your first player to get started!</p>
      </div>
    );
  }

  return (
    <div className="player-list">
      <div className="list-header">
        <span>Player</span>
        <span>Skill Level</span>
        <span>Contact</span>
        <span>Stats</span>
        <span>Actions</span>
      </div>

      {players.map(player => (
        <div key={player.id} className="player-item">
          <div className="player-info">
            <h3>{player.name}</h3>
          </div>

          <div className="player-skill">
            <span className={\`skill-badge \${getSkillBadgeClass(player.skill_level)}\`}>
              {player.skill_level}
            </span>
          </div>

          <div className="player-contact">
            {player.email && (
              <div className="contact-item">
                <Mail size={16} />
                <span>{player.email}</span>
              </div>
            )}
            {player.phone && (
              <div className="contact-item">
                <Phone size={16} />
                <span>{player.phone}</span>
              </div>
            )}
          </div>

          <div className="player-stats">
            <div className="stat">
              <span className="stat-label">Matches:</span>
              <span className="stat-value">{player.matches_played || 0}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Wins:</span>
              <span className="stat-value">{player.matches_won || 0}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Points:</span>
              <span className="stat-value">{player.points || 0}</span>
            </div>
          </div>

          <div className="player-actions">
            <button
              onClick={() => onEdit(player)}
              className="btn btn-icon btn-edit"
              title="Edit player"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={() => onDelete(player.id)}
              className="btn btn-icon btn-delete"
              title="Delete player"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PlayerList;
