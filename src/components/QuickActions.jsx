import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Users, Calendar, BarChart3 } from 'lucide-react';

const QuickActions = () => {
  const navigate = useNavigate();

  const actions = [
    {
      title: 'Add Player',
      description: 'Register a new player',
      icon: UserPlus,
      color: 'blue',
      path: '/players'
    },
    {
      title: 'Create Team',
      description: 'Form a new team',
      icon: Users,
      color: 'green',
      path: '/teams'
    },
    {
      title: 'Schedule Match',
      description: 'Set up a new match',
      icon: Calendar,
      color: 'purple',
      path: '/matches'
    },
    {
      title: 'View Stats',
      description: 'Check league statistics',
      icon: BarChart3,
      color: 'orange',
      path: '/statistics'
    }
  ];

  return (
    <div className="quick-actions">
      <h2>Quick Actions</h2>
      <div className="actions-grid">
        {actions.map(({ title, description, icon: Icon, color, path }) => (
          <button
            key={title}
            onClick={() => navigate(path)}
            className={\`action-card action-card-\${color}\`}
          >
            <div className="action-icon">
              <Icon size={24} />
            </div>
            <div className="action-content">
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
