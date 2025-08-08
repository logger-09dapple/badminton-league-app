import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const ScoreDropdown = ({ 
  value, 
  onChange, 
  min = 0, 
  max = 30, 
  teamName, 
  error 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const optionsRef = useRef(null);

  // Generate score options
  const scoreOptions = [];
  for (let i = min; i <= max; i++) {
    scoreOptions.push(i);
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Auto-scroll to selected value when dropdown opens
  useEffect(() => {
    if (isOpen && optionsRef.current) {
      const selectedOption = optionsRef.current.querySelector(`[data-value="${value}"]`);
      if (selectedOption) {
        selectedOption.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
  }, [isOpen, value]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleSelect = (score) => {
    onChange(score);
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const newValue = Math.max(min, value - 1);
        onChange(newValue);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const newValue = Math.min(max, value + 1);
        onChange(newValue);
      }
    } else {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
      }
    }
  };

  const handleOptionKeyDown = (e, score) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect(score);
    }
  };

  return (
    <div className="score-group">
      <label className="score-label">
        {teamName} Score *
      </label>
      
      <div className="score-dropdown-container" ref={dropdownRef}>
        <button
          type="button"
          className={`score-dropdown-trigger ${error ? 'error' : ''} ${isOpen ? 'open' : ''}`}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={`${teamName} score: ${value}`}
        >
          <div className="score-display-value">
            {value}
          </div>
          <div className="score-dropdown-arrow">
            {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </button>
        
        {isOpen && (
          <div 
            className="score-dropdown-options" 
            ref={optionsRef}
            role="listbox"
            aria-label={`${teamName} score options`}
          >
            {scoreOptions.map((score) => (
              <div
                key={score}
                className={`score-option ${score === value ? 'selected' : ''}`}
                onClick={() => handleSelect(score)}
                onKeyDown={(e) => handleOptionKeyDown(e, score)}
                role="option"
                aria-selected={score === value}
                data-value={score}
                tabIndex={0}
              >
                <span className="score-number">{score}</span>
                {score === value && (
                  <span className="selected-indicator">✓</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {error && <span className="error-text">{error}</span>}
    </div>
  );
};

export default ScoreDropdown;