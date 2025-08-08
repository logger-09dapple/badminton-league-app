import React, { useState } from 'react';
import { validationUtils } from '../utils/validationUtils';
import Modal from './Modal';

const ScoreUpdateModal = ({ match, onSubmit, onClose }) => {
  const [scores, setScores] = useState({
    team1Score: match.team1_score || '',
    team2Score: match.team2_score || ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleScoreChange = (team, value) => {
    const numValue = parseInt(value) || 0;
    if (numValue >= 0 && numValue <= 30) { // Updated max to 30 for badminton
      setScores(prev => ({
        ...prev,
        [`${team}Score`]: numValue
      }));

      if (errors[`${team}Score`]) {
        setErrors(prev => ({
          ...prev,
          [`${team}Score`]: ''
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate scores
    const newErrors = {};
    if (!validationUtils.validateScore(scores.team1Score)) {
      newErrors.team1Score = 'Score must be between 0 and 30';
    }
    if (!validationUtils.validateScore(scores.team2Score)) {
      newErrors.team2Score = 'Score must be between 0 and 30';
    }

    // Use badminton score validation
    const scoreValidation = validationUtils.validateBadmintonScore(scores.team1Score, scores.team2Score);
    if (!scoreValidation.isValid) {
      Object.assign(newErrors, scoreValidation.errors);
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        team1Id: match.team1_id,
        team2Id: match.team2_id,
        team1Score: scores.team1Score,
        team2Score: scores.team2Score
      });
    } catch (error) {
      console.error('Error updating score:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Update Match Score">
      <form onSubmit={handleSubmit} className="score-update-form">
        {errors.general && (
          <div className="error-message">{errors.general}</div>
        )}

        <div className="teams-scores">
          <div className="team-score-input">
            <label>{match.team1?.name || 'Team 1'}</label>
            <div className="score-slider-container">
              <input
                type="range"
                min="0"
                max="30"
                value={scores.team1Score || 0}
              onChange={(e) => handleScoreChange('team1', e.target.value)}
                className="score-slider"
            />
              <div className="score-display">{scores.team1Score || 0}</div>
            </div>
            {errors.team1Score && (
              <span className="error-text">{errors.team1Score}</span>
            )}
          </div>

          <div className="vs-separator">VS</div>

          <div className="team-score-input">
            <label>{match.team2?.name || 'Team 2'}</label>
            <div className="score-slider-container">
              <input
                type="range"
                min="0"
                max="30"
                value={scores.team2Score || 0}
                onChange={(e) => handleScoreChange('team2', e.target.value)}
                className="score-slider"
              />
              <div className="score-display">{scores.team2Score || 0}</div>
          </div>
            {errors.team2Score && (
              <span className="error-text">{errors.team2Score}</span>
        )}
        </div>
        </div>

        {scores.team1Score !== scores.team2Score && (
          <div className="winner-display">
            Winner: {scores.team1Score > scores.team2Score
              ? match.team1?.name
              : match.team2?.name
            }
          </div>
        )}

        <div className="form-actions">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="btn btn-primary">
            {isSubmitting ? 'Updating...' : 'Update Score'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ScoreUpdateModal;
