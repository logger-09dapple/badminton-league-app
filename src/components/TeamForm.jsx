import React, { useState, useEffect } from 'react';
import { validationUtils } from '../utils/validationUtils';

const TeamForm = ({ team, players, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    skillCombination: '',
    playerIds: []
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debug log to verify players prop
  console.log('TeamForm rendered with players:', players);

  useEffect(() => {
    if (team) {
      setFormData({
        name: team.name || '',
        skillCombination: team.skill_combination || '',
        playerIds: team.team_players 
          ? team.team_players.map(tp => tp.player_id || (tp.players && tp.players.id)) 
          : team.playerIds || []
      });
    }
  }, [team]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'playerIds') {
      const selectedOptions = Array.from(e.target.selectedOptions).map(option => option.value);
      setFormData(prev => ({ ...prev, [name]: selectedOptions }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Team form submitted with data:', formData);

    const validation = validationUtils.validateTeam(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting team form:', error);
      setErrors({ submit: 'Failed to save team. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ensure players is always an array
  const availablePlayers = Array.isArray(players) ? players : [];
  
  if (availablePlayers.length === 0) {
    return (
      <div className="team-form-error">
        <p>No players available to create a team.</p>
        <p>Please add players first.</p>
        <button onClick={onCancel} className="btn btn-secondary">Close</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="team-form">
      <div className="form-group">
        <label htmlFor="name">Team Name *</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className={errors.name ? 'error' : ''}
          placeholder="Enter team name"
        />
        {errors.name && <span className="error-text">{errors.name}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="skillCombination">Skill Combination *</label>
        <select
          id="skillCombination"
          name="skillCombination"
          value={formData.skillCombination}
          onChange={handleChange}
          className={errors.skillCombination ? 'error' : ''}
        >
          <option value="">Select Skill Combination</option>
          <option value="Advanced-Advanced">Advanced-Advanced</option>
          <option value="Advanced-Intermediate">Advanced-Intermediate</option>
          <option value="Advanced-Beginner">Advanced-Beginner</option>
          <option value="Intermediate-Intermediate">Intermediate-Intermediate</option>
          <option value="Intermediate-Beginner">Intermediate-Beginner</option>
          <option value="Beginner-Beginner">Beginner-Beginner</option>
        </select>
        {errors.skillCombination && <span className="error-text">{errors.skillCombination}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="playerIds">Players (select 2) *</label>
        <select
          id="playerIds"
          name="playerIds"
          multiple
          value={formData.playerIds}
          onChange={handleChange}
          className={errors.players ? 'error' : ''}
          size={Math.min(6, availablePlayers.length)}
        >
          {availablePlayers.map(player => (
            <option key={player.id} value={player.id}>
              {player.name} ({player.skill_level})
              {player.gender ? ` - ${player.gender}` : ''}
            </option>
          ))}
        </select>
        <small>Hold Ctrl (or Cmd on Mac) to select multiple players</small>
        {errors.players && <span className="error-text">{errors.players}</span>}
      </div>

      {errors.submit && (
        <div className="error-message">{errors.submit}</div>
      )}

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="btn btn-primary">
          {isSubmitting ? 'Saving...' : (team ? 'Update Team' : 'Add Team')}
        </button>
      </div>
    </form>
  );
};

export default TeamForm;

