import React, { useState, useEffect } from 'react';
import { validationUtils } from '../utils/validationUtils';
import { Users, AlertCircle, CheckCircle } from 'lucide-react';

const TeamForm = ({ team, players, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    skillCombination: '',
    playerIds: []
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availablePlayers, setAvailablePlayers] = useState([]);

  // Debug log to verify players prop
  console.log('TeamForm rendered with players:', players);

  // Filter and validate available players
  useEffect(() => {
    if (players && Array.isArray(players)) {
      const validPlayers = players.filter(player => 
        player && 
        player.id && 
        player.name && 
        player.skill_level &&
        player.gender
      );
      setAvailablePlayers(validPlayers);
      
      if (validPlayers.length < 2) {
        setErrors(prev => ({
          ...prev,
          players: 'At least 2 valid players are required to create teams'
        }));
      }
    }
  }, [players]);

  useEffect(() => {
    if (team) {
      const playerIds = team.team_players 
        ? team.team_players.map(tp => tp.player_id || (tp.players && tp.players.id)).filter(Boolean)
        : team.playerIds || [];

      setFormData({
        name: team.name || '',
        skillCombination: team.skill_combination || '',
        playerIds: playerIds
      });
    }
  }, [team]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'playerIds') {
      const selectedOptions = Array.from(e.target.selectedOptions).map(option => option.value);
      
      // Limit to exactly 2 players
      if (selectedOptions.length > 2) {
        setErrors(prev => ({
          ...prev,
          playerIds: 'Please select exactly 2 players for a team'
        }));
        return;
      }
      
      setFormData(prev => ({ ...prev, [name]: selectedOptions }));
      
      // Auto-generate skill combination
      if (selectedOptions.length === 2) {
        const player1 = availablePlayers.find(p => p.id === selectedOptions[0]);
        const player2 = availablePlayers.find(p => p.id === selectedOptions[1]);
        
        if (player1 && player2) {
          const skills = [player1.skill_level, player2.skill_level].sort();
          const skillCombo = skills.join('-');
          setFormData(prev => ({ ...prev, skillCombination: skillCombo }));
        }
      }
      
      // Clear errors when valid selection is made
      if (selectedOptions.length === 2) {
        setErrors(prev => ({ ...prev, playerIds: '' }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
      
      // Clear field-specific errors
      if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: '' }));
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Validate team name
    if (!formData.name || formData.name.trim().length < 2) {
      newErrors.name = 'Team name must be at least 2 characters long';
    }
    
    // Check for duplicate team name (if not editing)
    if (!team && formData.name) {
      // This would need to be passed from parent component
      // For now, we'll skip this validation
    }
    
    // Validate player selection
    if (!formData.playerIds || formData.playerIds.length !== 2) {
      newErrors.playerIds = 'Please select exactly 2 players for the team';
    }
    
    // Validate players exist and are available
    if (formData.playerIds.length === 2) {
      const selectedPlayers = formData.playerIds.map(id => 
        availablePlayers.find(p => p.id === id)
      );
      
      if (selectedPlayers.some(p => !p)) {
        newErrors.playerIds = 'One or more selected players are invalid';
      }
      
      // Check if players are already on another team (would need team data from parent)
      // For now, we'll skip this validation
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const teamData = {
      name: formData.name.trim(),
      skillCombination: formData.skillCombination,
      playerIds: formData.playerIds
    };

    // Additional validation using utility
    const validation = validationUtils.validateTeam(teamData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(teamData);
    } catch (error) {
      console.error('Error submitting team form:', error);
      setErrors({ 
        submit: `Failed to ${team ? 'update' : 'create'} team: ${error.message}` 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get selected player info for display
  const getSelectedPlayerInfo = () => {
    if (formData.playerIds.length === 0) return null;
    
    return formData.playerIds.map(id => {
      const player = availablePlayers.find(p => p.id === id);
      return player ? `${player.name} (${player.skill_level})` : 'Unknown Player';
    });
  };

  const selectedPlayerInfo = getSelectedPlayerInfo();

  return (
    <form onSubmit={handleSubmit} className="team-form">
      <div className="form-header">
        <h3>{team ? 'Edit Team' : 'Create New Team'}</h3>
        <Users size={24} className="form-icon" />
      </div>

      {availablePlayers.length < 2 && (
        <div className="warning-message">
          <AlertCircle size={16} />
          <span>You need at least 2 players to create a team. Please add more players first.</span>
        </div>
      )}

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
          disabled={isSubmitting}
        />
        {errors.name && <span className="error-text">{errors.name}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="playerIds">Select Players *</label>
        <select
          id="playerIds"
          name="playerIds"
          multiple
          value={formData.playerIds}
          onChange={handleChange}
          className={errors.playerIds ? 'error' : ''}
          disabled={isSubmitting || availablePlayers.length < 2}
          size="6"
        >
          {availablePlayers.map(player => (
            <option key={player.id} value={player.id}>
              {player.name} - {player.skill_level} ({player.gender})
            </option>
          ))}
        </select>
        <small className="form-help">
          Hold Ctrl/Cmd to select multiple players. Select exactly 2 players.
        </small>
        {errors.playerIds && <span className="error-text">{errors.playerIds}</span>}
      </div>

      {selectedPlayerInfo && selectedPlayerInfo.length > 0 && (
        <div className="selected-players-info">
          <h4>Selected Players:</h4>
          <ul>
            {selectedPlayerInfo.map((info, index) => (
              <li key={index}>
                <CheckCircle size={16} className="check-icon" />
                {info}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="form-group">
        <label htmlFor="skillCombination">Skill Combination</label>
        <input
          type="text"
          id="skillCombination"
          name="skillCombination"
          value={formData.skillCombination}
          onChange={handleChange}
          placeholder="Auto-generated based on selected players"
          disabled={true}
        />
        <small className="form-help">
          This is automatically generated based on the selected players' skill levels.
        </small>
      </div>

      {errors.submit && (
        <div className="error-message">
          <AlertCircle size={16} />
          {errors.submit}
        </div>
      )}

      <div className="form-actions">
        <button 
          type="button" 
          onClick={onCancel} 
          className="btn btn-secondary"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={isSubmitting || availablePlayers.length < 2 || formData.playerIds.length !== 2}
        >
          {isSubmitting ? 'Saving...' : (team ? 'Update Team' : 'Create Team')}
        </button>
      </div>
    </form>
  );
};

export default TeamForm;