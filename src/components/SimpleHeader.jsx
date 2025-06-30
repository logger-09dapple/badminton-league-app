import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Users, UserPlus, Calendar, BarChart3, Home, Award, Menu, X } from 'lucide-react';
import '../styles/SimpleHeader.css';

const SimpleHeader = () => {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/players', label: 'Players', icon: Users },
    { path: '/teams', label: 'Teams', icon: UserPlus },
    { path: '/matches', label: 'Matches', icon: Calendar },
    { path: '/statistics', label: 'Statistics', icon: BarChart3 },
    { path: '/elo-statistics', label: 'ELO Rankings', icon: Award }
  ];

  return (
    <header className="simple-header">
      <div className="header-container">
        <h1 className="app-title">🏸 Badminton League</h1>
        
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      
      {menuOpen && (
        <nav className="mobile-menu">
          {navItems.map((item) => (
            <Link 
              key={item.path} 
              to={item.path} 
              className={`menu-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
};

export default SimpleHeader;