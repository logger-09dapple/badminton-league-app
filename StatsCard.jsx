import React from 'react';

const StatsCard = ({ title, value, icon: Icon, color }) => {
  return (
    <div className={\`stats-card stats-card-\${color}\`}>
      <div className="stats-card-content">
        <div className="stats-card-info">
          <h3>{title}</h3>
          <p className="stats-value">{value}</p>
        </div>
        <div className="stats-card-icon">
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
};

export default StatsCard;