import React from 'react';
import { Medal, Star } from 'lucide-react';

// Helper function to shorten player names intelligently
const shortenName = (name, maxLength = 25) => {
  if (!name || name.length <= maxLength) return name;

  const words = name.trim().split(' ');
  if (words.length === 1) {
    // Single word - truncate if too long
    return name.length > maxLength ? name.substring(0, maxLength - 1) + '…' : name;
  }

  // Multiple words - show first word + initials
  const firstWord = words[0];
  const initials = words.slice(1).map(word => word.charAt(0).toUpperCase()).join('');
  const shortened = initials ? `${firstWord} ${initials}.` : firstWord;

  // If still too long, truncate first word
  if (shortened.length > maxLength) {
    const maxFirstWord = maxLength - (initials ? initials.length + 2 : 0);
    const truncatedFirst = firstWord.substring(0, Math.max(3, maxFirstWord));
    return initials ? `${truncatedFirst} ${initials}.` : truncatedFirst;
  }

  return shortened;
};

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
            <div className={isPlayer ? "player-name" : "team-name"} title={item.name}>
              {shortenName(item.name, 30)}
              {item.rank <= 3 && (
                <Star className={isPlayer ? "top-player" : "top-team"} size={14} />
              )}
            </div>
            {!isPlayer && (
              <div className="team-players" title={item.playerNames}>
                {shortenName(item.playerNames, 40)}
              </div>
            )}
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
          {/* Top row: Rank and Skill Badge */}
          <div className="mobile-rank-and-badge">
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
          <div className="mobile-skill-badge">
            <span className={isPlayer ? `skill-badge skill-${item.skill_level}` : "skill-combo"}>
              {isPlayer ? (item.skill_level || 'N/A') : (item.skill_combination || 'N/A')}
            </span>
          </div>
        </div>

          {/* Bottom row: Name (full width) */}
          <div className="mobile-name-info">
            <div
              className={isPlayer ? "mobile-player-name" : "mobile-team-name"}
              title={item.name}
            >
              {item.name}
              {item.rank <= 3 && (
                <Star className={isPlayer ? "top-player" : "top-team"} size={14} />
              )}
            </div>
            {!isPlayer && (
              <div
                className="mobile-team-players"
                title={item.playerNames}
              >
                {item.playerNames}
              </div>
            )}
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