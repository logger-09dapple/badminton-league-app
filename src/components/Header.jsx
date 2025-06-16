import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Users, UserPlus, Calendar, BarChart3, Home, Award } from 'lucide-react';

const Header = () => {
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/players', label: 'Players', icon: Users },
    { path: '/teams', label: 'Teams', icon: UserPlus },
    { path: '/matches', label: 'Matches', icon: Calendar },
    { path: '/statistics', label: 'Statistics', icon: BarChart3 },
    { path: '/elo-statistics', label: 'ELO Rankings', icon: Award }
  ];

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <div className="logo">
            <h1>🏸 Badminton League Manager</h1>
          </div>
          <nav className="nav">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`nav-link ${location.pathname === path ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
