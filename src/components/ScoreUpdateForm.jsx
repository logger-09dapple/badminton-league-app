import React, { useState, useEffect } from 'react';
import { validationUtils } from '../utils/validationUtils';

const ScoreUpdateForm = ({ match, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    team1Score: '',
    team2Score: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (match) {
      setFormData({
        team1Score: match.team1_score?.toString() || '',
        team2Score: match.team2_score?.toString() || ''
      });
    }
  }, [match]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Only allow numeric input
    if (value === '' || /^\d+$/.test(value)) {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));

      // Clear error when user starts typing
      if (errors[name]) {
        setErrors(prev => ({
          ...prev,
          [name]: ''
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const team1Score = parseInt(formData.team1Score);
    const team2Score = parseInt(formData.team2Score);

    // Validate badminton scores
    const validation = validationUtils.validateBadmintonScore(team1Score, team2Score);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        team1Score,
        team2Score
      });
    } catch (error) {
      console.error('Error submitting score:', error);
      setErrors({ submit: 'Failed to save score. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!match) {
    return (
      <div className="score-form-error">
        <p>No match selected for score update.</p>
        <button onClick={onCancel} className="btn btn-secondary">
          Close
        </button>
      </div>
    );
  }

  const previewWinner = () => {
    if (formData.team1Score && formData.team2Score) {
      const score1 = parseInt(formData.team1Score);
      const score2 = parseInt(formData.team2Score);
      
      if (validationUtils.isGameComplete(score1, score2)) {
        const winner = validationUtils.getWinner(score1, score2);
        return winner === 'team1' ? match.team1?.name : match.team2?.name;
      }
    }
    return null;
  };

  const winner = previewWinner();

  return (
    <form onSubmit={handleSubmit} className="score-form">
      <div className="match-info">
        <h3>Update Score</h3>
        <div className="teams-display">
          <span className="team-name">{match.team1?.name}</span>
          <span className="vs">VS</span>
          <span className="team-name">{match.team2?.name}</span>
        </div>
      </div>

      <div className="score-inputs">
        <div className="score-group">
          <label htmlFor="team1Score">{match.team1?.name} Score *</label>
          <input
            type="text"
            id="team1Score"
            name="team1Score"
            value={formData.team1Score}
            onChange={handleChange}
            className={errors.team1Score ? 'error' : ''}
            placeholder="0"
            maxLength="2"
          />
          {errors.team1Score && <span className="error-text">{errors.team1Score}</span>}
        </div>

        <div className="score-group">
          <label htmlFor="team2Score">{match.team2?.name} Score *</label>
          <input
            type="text"
            id="team2Score"
            name="team2Score"
            value={formData.team2Score}
            onChange={handleChange}
            className={errors.team2Score ? 'error' : ''}
            placeholder="0"
            maxLength="2"
          />
          {errors.team2Score && <span className="error-text">{errors.team2Score}</span>}
        </div>
      </div>

      {/* Badminton Scoring Rules Info */}
      <div className="scoring-rules">
        <h4>Badminton Scoring Rules:</h4>
        <ul>
          <li>Game is won at 21 points with a 2-point lead</li>
          <li>At 20-20, you need to win by 2 points (22-20, 23-21, etc.)</li>
          <li>At 29-29, first team to 30 points wins</li>
          <li>Maximum possible score is 30 points</li>
        </ul>
      </div>

      {/* Winner Preview */}
      {winner && (
        <div className="winner-preview">
          <strong>Winner: {winner}</strong>
          <span className="note">Match will be automatically marked as completed</span>
        </div>
      )}

      {/* General errors */}
      {errors.scores && (
        <div className="error-message">
          {errors.scores}
        </div>
      )}

      {errors.submit && (
        <div className="error-message">
          {errors.submit}
        </div>
      )}

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="btn btn-primary">
          {isSubmitting ? 'Saving...' : 'Save Score'}
        </button>
      </div>
    </form>
  );
};

export default ScoreUpdateForm;

