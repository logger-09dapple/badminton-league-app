import React from 'react';
import { Edit, Trash2, Users } from 'lucide-react';

const TeamList = ({ teams, onEdit, onDelete }) => {
  const getSkillCombinationClass = (skillCombination) => {
    if (skillCombination?.includes('Advanced')) return 'combination-advanced';
    if (skillCombination?.includes('Intermediate')) return 'combination-intermediate';
    return 'combination-beginner';
  };

  if (teams.length === 0) {
    return (
      <div className="empty-state">
        <p>No teams found. Create your first team to get started!</p>
      </div>
    );
  }

  return (
    <div className="team-list">
      <div className="list-header">
        <span>Team</span>
        <span>Players</span>
        <span>Skill Combination</span>
        <span>Stats</span>
        <span>Actions</span>
      </div>

      {teams.map(team => (
        <div key={team.id} className="team-item">
          <div className="team-info">
            <h3>{team.name}</h3>
          </div>

          <div className="team-players">
            {team.team_players?.map(tp => (
              <div key={tp.player_id} className="player-chip">
                <Users size={14} />
                <span>{tp.players?.name || 'Unknown Player'}</span>
              </div>
            )) || (
              <span className="no-players">No players assigned</span>
            )}
          </div>

          <div className="team-combination">
            <span className={`combination-badge ${getSkillCombinationClass(team.skill_combination)}`}>
              {team.skill_combination || 'Not set'}
            </span>
          </div>

          <div className="team-stats">
            <div className="stat">
              <span className="stat-label">Matches:</span>
              <span className="stat-value">{team.matches_played || 0}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Wins:</span>
              <span className="stat-value">{team.matches_won || 0}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Points:</span>
              <span className="stat-value">{team.points || 0}</span>
            </div>
          </div>

          <div className="team-actions">
            <button
              onClick={() => onEdit(team)}
              className="btn btn-icon btn-edit"
              title="Edit team"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={() => onDelete(team.id)}
              className="btn btn-icon btn-delete"
              title="Delete team"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TeamList;
