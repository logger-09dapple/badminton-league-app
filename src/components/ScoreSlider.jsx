import React, { useState, useRef, useCallback } from 'react';

const ScoreSlider = ({ 
  value, 
  onChange, 
  min = 0, 
  max = 30, 
  label, 
  error,
  teamName 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef(null);
  const progressRef = useRef(null);

  // Calculate progress percentage
  const progressPercentage = ((value - min) / (max - min)) * 100;

  const updateValue = useCallback((clientX) => {
    if (!sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newValue = Math.round(min + percentage * (max - min));
    
    if (newValue !== value) {
      onChange(newValue);
    }
  }, [min, max, value, onChange]);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
    updateValue(e.clientX);
  }, [updateValue]);

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      e.preventDefault();
      updateValue(e.clientX);
    }
  }, [isDragging, updateValue]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
    const touch = e.touches[0];
    updateValue(touch.clientX);
  }, [updateValue]);

  const handleTouchMove = useCallback((e) => {
    if (isDragging && e.touches[0]) {
      e.preventDefault();
      const touch = e.touches[0];
      updateValue(touch.clientX);
    }
  }, [isDragging, updateValue]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add global event listeners when dragging
  React.useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e) => handleMouseMove(e);
      const handleGlobalMouseUp = () => handleMouseUp();
      const handleGlobalTouchMove = (e) => handleTouchMove(e);
      const handleGlobalTouchEnd = () => handleTouchEnd();

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
      document.addEventListener('touchend', handleGlobalTouchEnd);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
        document.removeEventListener('touchmove', handleGlobalTouchMove);
        document.removeEventListener('touchend', handleGlobalTouchEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  const handleKeyDown = useCallback((e) => {
    let newValue = value;
    
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        newValue = Math.max(min, value - 1);
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        newValue = Math.min(max, value + 1);
        break;
      case 'Home':
        newValue = min;
        break;
      case 'End':
        newValue = max;
        break;
      default:
        return;
    }
    
    e.preventDefault();
    onChange(newValue);
  }, [value, min, max, onChange]);

  return (
    <div className="score-group">
      {label && (
        <label className="score-label">
          {teamName ? `${teamName} Score` : label} *
        </label>
      )}
      
      <div className="score-slider-container">
        <div className="score-slider-wrapper">
          <div
            ref={sliderRef}
            className={`score-slider ${isDragging ? 'dragging' : ''}`}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="slider"
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={value}
            aria-label={`${teamName || label} score`}
          >
            <div 
              ref={progressRef}
              className="score-slider-progress"
              style={{ width: `${progressPercentage}%` }}
            />
            <div 
              className="score-slider-thumb"
              style={{ left: `${progressPercentage}%` }}
            />
          </div>
        </div>
        
        <div className="score-display" aria-live="polite">
          {value}
        </div>
      </div>
      
      {error && <span className="error-text">{error}</span>}
    </div>
  );
};

export default ScoreSlider;