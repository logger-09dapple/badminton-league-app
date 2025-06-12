import React from 'react';
import { Trophy, Target, TrendingUp, Users } from 'lucide-react';

const TeamStats = ({ teams }) => {
  if (teams.length === 0) {
    return (
      <div className="empty-state">
        <p>No team statistics available.</p>
      </div>
    );
  }

  return (
    <div className="team-stats">
      <div className="stats-table">
        <div className="table-header">
          <span>Team</span>
          <span>Skill Combination</span>
          <span>Matches</span>
          <span>Wins</span>
          <span>Win Rate</span>
          <span>Points</span>
        </div>

        {teams.slice(0, 10).map(team => (
          <div key={team.id} className="table-row">
            <div className="team-info">
              <span className="team-name">{team.name}</span>
              <div className="team-players">
                <Users size={14} />
                <span>{team.team_players?.length || 0} players</span>
              </div>
            </div>

            <div className="skill-combination">
              <span className="combination-badge">
                {team.skill_combination || 'Not set'}
              </span>
            </div>

            <div className="matches">
              <Target size={16} />
              <span>{team.matchesPlayed || 0}</span>
            </div>

            <div className="wins">
              <Trophy size={16} />
              <span>{team.matchesWon || 0}</span>
            </div>

            <div className="win-rate">
              <TrendingUp size={16} />
              <span>{team.winRate}%</span>
            </div>

            <div className="points">
              <span className="points-value">{team.points || 0}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeamStats;