import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Users, UserPlus, Calendar, BarChart3, Home, Menu, X, Trophy } from 'lucide-react';
import '../styles/SimpleHeader.css';

const SimpleHeader = () => {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/players', label: 'Players', icon: Users },
    { path: '/teams', label: 'Teams', icon: UserPlus },
    { path: '/matches', label: 'Matches', icon: Calendar },
    { path: '/tournaments', label: 'Tournaments', icon: Trophy },
    { path: '/statistics', label: 'Statistics', icon: BarChart3 }
  ];

  // Close menu when route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Handle clicks outside menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuOpen && 
          menuRef.current && 
          !menuRef.current.contains(event.target) &&
          buttonRef.current &&
          !buttonRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape' && menuOpen) {
        setMenuOpen(false);
        buttonRef.current?.focus(); // Return focus to menu button
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
      
      // Prevent body scroll when menu is open on mobile
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const toggleMenu = () => {
    setMenuOpen(prev => !prev);
  };

  const handleMenuItemClick = () => {
    setMenuOpen(false);
  };

  const handleMenuItemKeyDown = (event, path) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleMenuItemClick();
      // Navigate will be handled by Link component
    }
  };

  return (
    <header className="simple-header">
      <div className="header-container">
        <Link to="/dashboard" className="app-title">
          🏸 Badminton League
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="desktop-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
            >
              <item.icon size={16} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        
        {/* Mobile Menu Toggle */}
        <button 
          ref={buttonRef}
          className="menu-toggle" 
          onClick={toggleMenu}
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-haspopup="true"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      
      {menuOpen && (
        <>
          {/* Overlay for mobile */}
          <div className="menu-overlay" onClick={() => setMenuOpen(false)} />
          
          <nav 
            ref={menuRef}
            className="mobile-menu"
            id="mobile-menu"
            role="navigation"
            aria-label="Main navigation"
          >
            {navItems.map((item, index) => (
              <Link 
                key={item.path} 
                to={item.path} 
                className={`menu-item ${location.pathname === item.path ? 'active' : ''}`}
                onClick={handleMenuItemClick}
                onKeyDown={(e) => handleMenuItemKeyDown(e, item.path)}
                role="menuitem"
                tabIndex={menuOpen ? 0 : -1}
                aria-current={location.pathname === item.path ? 'page' : undefined}
              >
                <item.icon size={20} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </>
      )}
    </header>
  );
};

export default SimpleHeader;