import React, { useState, useEffect } from 'react';
import { validationUtils } from '../utils/validationUtils';

const MatchForm = ({ match, teams, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    team1Id: '',
    team2Id: '',
    scheduledDate: '',
    status: 'scheduled'
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (match) {
      setFormData({
        team1Id: match.team1_id || '',
        team2Id: match.team2_id || '',
        scheduledDate: match.scheduled_date || '',
        status: match.status || 'scheduled'
      });
    }
  }, [match]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validation = validationUtils.validateMatch(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting match form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableTeams = teams.filter(team => 
    team.team_players && team.team_players.length === 2
  );

  return (
    <form onSubmit={handleSubmit} className="match-form">
      <div className="form-group">
        <label htmlFor="team1Id">Team 1 *</label>
        <select
          id="team1Id"
          name="team1Id"
          value={formData.team1Id}
          onChange={handleChange}
          className={errors.team1 ? 'error' : ''}
        >
          <option value="">Select Team 1</option>
          {availableTeams.map(team => (
            <option key={team.id} value={team.id}>
              {team.name} ({team.skill_combination})
            </option>
          ))}
        </select>
        {errors.team1 && <span className="error-text">{errors.team1}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="team2Id">Team 2 *</label>
        <select
          id="team2Id"
          name="team2Id"
          value={formData.team2Id}
          onChange={handleChange}
          className={errors.team2 ? 'error' : ''}
        >
          <option value="">Select Team 2</option>
          {availableTeams
            .filter(team => team.id !== formData.team1Id)
            .map(team => (
              <option key={team.id} value={team.id}>
                {team.name} ({team.skill_combination})
              </option>
            ))
          }
        </select>
        {errors.team2 && <span className="error-text">{errors.team2}</span>}
        {errors.teams && <span className="error-text">{errors.teams}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="scheduledDate">Scheduled Date</label>
        <input
          type="date"
          id="scheduledDate"
          name="scheduledDate"
          value={formData.scheduledDate}
          onChange={handleChange}
          className={errors.scheduledDate ? 'error' : ''}
        />
        {errors.scheduledDate && <span className="error-text">{errors.scheduledDate}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="status">Status</label>
        <select
          id="status"
          name="status"
          value={formData.status}
          onChange={handleChange}
        >
          <option value="scheduled">Scheduled</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="btn btn-primary">
          {isSubmitting ? 'Saving...' : (match ? 'Update Match' : 'Create Match')}
        </button>
      </div>
    </form>
  );
};

export default MatchForm;