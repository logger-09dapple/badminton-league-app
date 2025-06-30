import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Users, UserPlus, Calendar, BarChart3, Home, Award, Menu, X } from 'lucide-react';

const Header = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const toggleButtonRef = useRef(null);

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/players', label: 'Players', icon: Users },
    { path: '/teams', label: 'Teams', icon: UserPlus },
    { path: '/matches', label: 'Matches', icon: Calendar },
    { path: '/statistics', label: 'Statistics', icon: BarChart3 },
    { path: '/elo-statistics', label: 'ELO Rankings', icon: Award }
  ];

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (mobileMenuOpen && 
          menuRef.current && 
          !menuRef.current.contains(event.target) &&
          toggleButtonRef.current && 
          !toggleButtonRef.current.contains(event.target)) {
        setMobileMenuOpen(false);
      }
    }
    
    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    
    return () => {
      // Remove event listener on cleanup
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [mobileMenuOpen]);

  // Close menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Add/remove body class to prevent scrolling when menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.classList.add('mobile-menu-open');
    } else {
      document.body.classList.remove('mobile-menu-open');
    }

    // Cleanup when component unmounts
    return () => {
      document.body.classList.remove('mobile-menu-open');
    };
  }, [mobileMenuOpen]);

  // Ensure menu stays within viewport on small screens
  useEffect(() => {
    if (mobileMenuOpen && menuRef.current) {
      // Check if menu height exceeds viewport
      const menuHeight = menuRef.current.scrollHeight;
      const viewportHeight = window.innerHeight;
      const menuTop = menuRef.current.getBoundingClientRect().top;

      if (menuTop + menuHeight > viewportHeight) {
        // If menu would go beyond viewport, adjust its max-height
        const availableSpace = viewportHeight - menuTop - 10; // 10px buffer
        menuRef.current.style.maxHeight = `${availableSpace}px`;
      }
    }
  }, [mobileMenuOpen]);

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <div className="logo">
            <h1>🏸 Badminton League Manager</h1>
          </div>
          
          {/* Mobile menu toggle */}
          <button 
            ref={toggleButtonRef}
            className="mobile-menu-toggle" 
            onClick={toggleMobileMenu}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          {/* Regular desktop navigation */}
          <nav className={`nav desktop-nav`}>
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
          
          {/* Mobile navigation */}
          <nav 
            ref={menuRef}
            className={`nav mobile-nav ${mobileMenuOpen ? 'open' : ''}`}
            aria-hidden={!mobileMenuOpen}
          >
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`nav-link ${location.pathname === path ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon size={20} />
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