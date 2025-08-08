import React, { useState } from 'react';
import { validationUtils } from '../utils/validationUtils';
import Modal from './Modal';
import ScoreSlider from './ScoreSlider';

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
          <ScoreSlider
                value={scores.team1Score || 0}
            onChange={(value) => setScores(prev => ({ ...prev, team1Score: value }))}
            min={0}
            max={30}
            teamName={match.team1?.name || 'Team 1'}
            error={errors.team1Score}
            />
          <div className="vs-separator">VS</div>

          <ScoreSlider
            value={scores.team2Score || 0}
            onChange={(value) => setScores(prev => ({ ...prev, team2Score: value }))}
            min={0}
            max={30}
            teamName={match.team2?.name || 'Team 2'}
            error={errors.team2Score}
          />
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
