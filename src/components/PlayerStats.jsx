import React from 'react';
import { Trophy, Target, TrendingUp } from 'lucide-react';

const PlayerStats = ({ players }) => {
  if (players.length === 0) {
    return (
      <div className="empty-state">
        <p>No player statistics available.</p>
      </div>
    );
  }

  return (
    <div className="player-stats">
      <div className="stats-table">
        <div className="table-header">
          <span>Player</span>
          <span>Skill Level</span>
          <span>Matches</span>
          <span>Wins</span>
          <span>Win Rate</span>
          <span>Points</span>
        </div>

        {players.slice(0, 10).map(player => (
          <div key={player.id} className="table-row">
            <div className="player-info">
              <span className="player-name">{player.name}</span>
            </div>

            <div className="skill-level">
              <span className={\`skill-badge skill-badge-\${player.skill_level?.toLowerCase()}\`}>
                {player.skill_level}
              </span>
            </div>

            <div className="matches">
              <Target size={16} />
              <span>{player.matchesPlayed || 0}</span>
            </div>

            <div className="wins">
              <Trophy size={16} />
              <span>{player.matchesWon || 0}</span>
            </div>

            <div className="win-rate">
              <TrendingUp size={16} />
              <span>{player.winRate}%</span>
            </div>

            <div className="points">
              <span className="points-value">{player.points || 0}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlayerStats;
