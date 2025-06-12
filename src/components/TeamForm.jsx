import React, { useState, useEffect } from 'react';
import { validationUtils } from '../utils/validationUtils';
import { roundRobinScheduler } from '../utils/schedulingUtils';

const TeamForm = ({ team, players, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    playerIds: []
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skillCombination, setSkillCombination] = useState('');

  useEffect(() => {
    if (team) {
      setFormData({
        name: team.name || '',
        playerIds: team.team_players?.map(tp => tp.player_id) || []
      });
      setSkillCombination(team.skill_combination || '');
    }
  }, [team]);

  useEffect(() => {
    // Update skill combination when players are selected
    if (formData.playerIds.length === 2) {
      const selectedPlayers = players.filter(p => formData.playerIds.includes(p.id));
      const validation = roundRobinScheduler.validateTeamCombination(selectedPlayers);
      if (validation.valid) {
        setSkillCombination(validation.combination);
      }
    } else {
      setSkillCombination('');
    }
  }, [formData.playerIds, players]);

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

  const handlePlayerSelection = (playerId) => {
    setFormData(prev => {
      const newPlayerIds = prev.playerIds.includes(playerId)
        ? prev.playerIds.filter(id => id !== playerId)
        : prev.playerIds.length < 2
          ? [...prev.playerIds, playerId]
          : [prev.playerIds[1], playerId]; // Replace first player if already 2 selected

      return { ...prev, playerIds: newPlayerIds };
    });

    if (errors.players) {
      setErrors(prev => ({ ...prev, players: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const teamData = {
      ...formData,
      skillCombination
    };

    const validation = validationUtils.validateTeam(teamData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    // Validate team combination
    const selectedPlayers = players.filter(p => formData.playerIds.includes(p.id));
    const combinationValidation = roundRobinScheduler.validateTeamCombination(selectedPlayers);
    if (!combinationValidation.valid) {
      setErrors({ players: combinationValidation.message });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        ...teamData,
        skillCombination: combinationValidation.combination
      });
    } catch (error) {
      console.error('Error submitting team form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <label>Select Players (exactly 2) *</label>
        <div className="player-selection">
          {players.map(player => (
            <div
              key={player.id}
              className={\`player-option \${
                formData.playerIds.includes(player.id) ? 'selected' : ''
              } \${
                formData.playerIds.length >= 2 && !formData.playerIds.includes(player.id) 
                  ? 'disabled' : ''
              }\`}
              onClick={() => handlePlayerSelection(player.id)}
            >
              <span className="player-name">{player.name}</span>
              <span className={\`skill-badge skill-badge-\${player.skill_level.toLowerCase()}\`}>
                {player.skill_level}
              </span>
            </div>
          ))}
        </div>
        {errors.players && <span className="error-text">{errors.players}</span>}
      </div>

      {skillCombination && (
        <div className="skill-combination">
          <label>Skill Combination</label>
          <div className="combination-display">
            <span className="combination-badge">{skillCombination}</span>
          </div>
        </div>
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
