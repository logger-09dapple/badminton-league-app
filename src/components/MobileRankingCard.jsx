import React from 'react';
import { Medal, Star } from 'lucide-react';

const MobileRankingCard = ({ 
  item, 
  type = 'player', 
  isSelected = false, 
  onClick 
}) => {
  const isPlayer = type === 'player';
  
  return (
    <div
      className={`table-row ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      {/* Desktop view */}
      <div className="desktop-view">
        <div className="col-rank">
          <div className="rank-display">
            {item.rank <= 3 && (
              <Medal 
                className={`rank-icon ${
                  item.rank === 1 ? 'gold' : 
                  item.rank === 2 ? 'silver' : 'bronze'
                }`}
                size={16}
              />
            )}
            <span className="rank-number">#{item.rank}</span>
          </div>
        </div>
        <div className={isPlayer ? "col-player" : "col-team"}>
          <div className={isPlayer ? "player-info" : "team-info"}>
            <div className={isPlayer ? "player-name" : "team-name"}>
              {item.name}
              {item.rank <= 3 && (
                <Star className={isPlayer ? "top-player" : "top-team"} size={14} />
              )}
            </div>
            {!isPlayer && <div className="team-players">{item.playerNames}</div>}
          </div>
        </div>
        <div className="col-skill">
          <span className={isPlayer ? `skill-badge skill-${item.skill_level}` : "skill-combo"}>
            {isPlayer ? (item.skill_level || 'N/A') : (item.skill_combination || 'N/A')}
          </span>
        </div>
        <div className="col-stat" data-label={isPlayer ? "ELO" : "Team ELO"}>
          <span className="stat-value elo-rating">
            {isPlayer ? item.eloRating : item.teamEloRating}
          </span>
        </div>
        <div className="col-stat" data-label="Points">
          <span className="stat-value">{item.points || 0}</span>
        </div>
        <div className="col-stat" data-label="Matches">
          <span className="stat-value">{item.matches_played || 0}</span>
        </div>
        <div className="col-stat" data-label="Wins">
          <span className="stat-value">{item.matches_won || 0}</span>
        </div>
        <div className="col-stat" data-label="Win Rate">
          <span className="stat-value">{item.winRate}%</span>
        </div>
        {isPlayer && (
          <div className="col-stat" data-label="Form">
            <span className="stat-value">{item.recentForm}</span>
          </div>
        )}
      </div>

      {/* Mobile view */}
      <div className="mobile-view">
        <div className="mobile-card-header">
          <div className="mobile-rank-info">
            <div className="rank-display">
              {item.rank <= 3 && (
                <Medal 
                  className={`rank-icon ${
                    item.rank === 1 ? 'gold' : 
                    item.rank === 2 ? 'silver' : 'bronze'
                  }`}
                  size={18}
                />
              )}
              <span className="rank-number">#{item.rank}</span>
            </div>
          </div>
          <div className="mobile-name-info">
            <div className={isPlayer ? "mobile-player-name" : "mobile-team-name"}>
              {item.name}
              {item.rank <= 3 && (
                <Star className={isPlayer ? "top-player" : "top-team"} size={14} />
              )}
            </div>
            {!isPlayer && (
              <div className="mobile-team-players">{item.playerNames}</div>
            )}
          </div>
          <div className="mobile-skill-badge">
            <span className={isPlayer ? `skill-badge skill-${item.skill_level}` : "skill-combo"}>
              {isPlayer ? (item.skill_level || 'N/A') : (item.skill_combination || 'N/A')}
            </span>
          </div>
        </div>
        <div className="mobile-stats-grid">
          <div className="mobile-stat-item">
            <div className="mobile-stat-label">{isPlayer ? 'ELO Rating' : 'Team ELO'}</div>
            <div className="mobile-stat-value elo-rating">
              {isPlayer ? item.eloRating : item.teamEloRating}
            </div>
          </div>
          <div className="mobile-stat-item">
            <div className="mobile-stat-label">Points</div>
            <div className="mobile-stat-value">{item.points || 0}</div>
          </div>
          <div className="mobile-stat-item">
            <div className="mobile-stat-label">Matches</div>
            <div className="mobile-stat-value">{item.matches_played || 0}</div>
          </div>
          <div className="mobile-stat-item">
            <div className="mobile-stat-label">Wins</div>
            <div className="mobile-stat-value">{item.matches_won || 0}</div>
          </div>
          <div className="mobile-stat-item">
            <div className="mobile-stat-label">Win Rate</div>
            <div className="mobile-stat-value">{item.winRate}%</div>
          </div>
          <div className="mobile-stat-item">
            <div className="mobile-stat-label">{isPlayer ? 'Recent Form' : 'Activity'}</div>
            <div className="mobile-stat-value">
              {isPlayer ? item.recentForm : (item.matches_played > 0 ? 'Active' : 'Inactive')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileRankingCard;