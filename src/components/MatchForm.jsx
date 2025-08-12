import React, { useState, useEffect } from 'react';
import { validationUtils } from '../utils/validationUtils';
import { formatInputDate, formatDisplayDate, parseInputDate } from '../utils/dateUtils';
import { Users, ArrowRight, CheckCircle } from 'lucide-react';
import ScoreDropdown from './ScoreDropdown';

const MatchForm = ({ match, teams, players, onSubmit, onCancel, includeScores = false, onAddTeam }) => {
  const [selectedPlayers, setSelectedPlayers] = useState(new Set());
  const [availableTeams1, setAvailableTeams1] = useState([]);
  const [availableTeams2, setAvailableTeams2] = useState([]);
  const [formData, setFormData] = useState({
    team1Id: '',
    team2Id: '',
    scheduledDate: '',
    status: 'completed',
    // FIXED: Empty default values instead of defaulting to 0
    team1Score: '',
    team2Score: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showScoreInput, setShowScoreInput] = useState(true);

  // Debug logging
  console.log('MatchForm props:', { 
    teamsCount: teams?.length, 
    playersCount: players?.length,
    match,
    includeScores
  });

  // Filter valid teams and players
  const validTeams = teams?.filter(team => 
    team && team.id && team.name && team.players && team.players.length === 2
  ) || [];

  const validPlayers = players?.filter(player =>
    player && player.id && player.name
  ) || [];

  useEffect(() => {
    if (match) {
      // Pre-populate for editing
      const matchPlayers = new Set();
      
      if (match.team1?.players) {
        match.team1.players.forEach(p => matchPlayers.add(p.id));
      }
      if (match.team2?.players) {
        match.team2.players.forEach(p => matchPlayers.add(p.id));
      }
      
      setSelectedPlayers(matchPlayers);
      setFormData({
        team1Id: match.team1_id || match.team1?.id || '',
        team2Id: match.team2_id || match.team2?.id || '',
        scheduledDate: match.scheduled_date ? formatInputDate(match.scheduled_date) : '',
        status: match.status || 'completed',
        team1Score: match.team1_score?.toString() || '',
        team2Score: match.team2_score?.toString() || ''
      });
      
      if (matchPlayers.size > 0) {
        setCurrentStep(2);
      }
    }
  }, [match]);

  // Generate all possible team combinations from selected players
  const generateTeamCombinations = (selectedPlayerIds) => {
    if (selectedPlayerIds.length !== 4) return [];
    
    const playerArray = selectedPlayerIds.map(id => 
      validPlayers.find(p => p.id === id)
    ).filter(Boolean);
    
    if (playerArray.length !== 4) return [];
    
    // Generate all possible pairs (combinations of 2 from 4 players)
    const combinations = [];
    for (let i = 0; i < playerArray.length; i++) {
      for (let j = i + 1; j < playerArray.length; j++) {
        const team = [playerArray[i], playerArray[j]];
        const remainingPlayers = playerArray.filter((_, idx) => idx !== i && idx !== j);
        
        // Create team object with necessary properties
        const teamId = `temp_${team[0].id}_${team[1].id}`;
        const skills = [team[0].skill_level, team[1].skill_level].sort();
        const skillCombo = skills.join('-');
        const genders = team.map(p => p.gender);
        const teamType = genders[0] === genders[1] ? 'Same Gender' : 'Mixed';
        
        // Check if this team already exists in the database
        const existingTeam = validTeams.find(dbTeam => {
          const dbPlayerIds = dbTeam.players.map(p => p.id).sort();
          const currentPlayerIds = team.map(p => p.id).sort();
          return dbPlayerIds[0] === currentPlayerIds[0] && dbPlayerIds[1] === currentPlayerIds[1];
        });
        
        combinations.push({
          id: existingTeam?.id || teamId,
          name: existingTeam?.name || `${team[0].name} & ${team[1].name}`,
          players: team,
          skill_combination: skillCombo,
          team_type: teamType,
          isExisting: !!existingTeam,
          remainingPlayers: remainingPlayers
        });
      }
    }
    
    return combinations;
  };

  // Update available teams when selected players change
  useEffect(() => {
    if (selectedPlayers.size === 4) {
      const selectedPlayerIds = Array.from(selectedPlayers);
      const allPossibleTeams = generateTeamCombinations(selectedPlayerIds);
      
      console.log('All possible team combinations:', allPossibleTeams);
      
      setAvailableTeams1(allPossibleTeams);
      setCurrentStep(2);
    } else {
      setAvailableTeams1([]);
      setAvailableTeams2([]);
      setCurrentStep(1);
      setFormData(prev => ({ ...prev, team1Id: '', team2Id: '' }));
    }
  }, [selectedPlayers, validTeams, validPlayers]);

  // Update Team 2 options when Team 1 is selected
  useEffect(() => {
    if (formData.team1Id && availableTeams1.length > 0) {
      const selectedTeam1 = availableTeams1.find(team => team.id === formData.team1Id);
      
      if (selectedTeam1 && selectedTeam1.remainingPlayers) {
        // Create the opposing team from remaining players
        const remainingPlayers = selectedTeam1.remainingPlayers;
        const skills = [remainingPlayers[0].skill_level, remainingPlayers[1].skill_level].sort();
        const skillCombo = skills.join('-');
        const genders = remainingPlayers.map(p => p.gender);
        const teamType = genders[0] === genders[1] ? 'Same Gender' : 'Mixed';
        
        // Check if this team already exists in the database
        const existingTeam = validTeams.find(dbTeam => {
          const dbPlayerIds = dbTeam.players.map(p => p.id).sort();
          const currentPlayerIds = remainingPlayers.map(p => p.id).sort();
          return dbPlayerIds[0] === currentPlayerIds[0] && dbPlayerIds[1] === currentPlayerIds[1];
        });
        
        const team2Id = existingTeam?.id || `temp_${remainingPlayers[0].id}_${remainingPlayers[1].id}`;
        const opposingTeam = {
          id: team2Id,
          name: existingTeam?.name || `${remainingPlayers[0].name} & ${remainingPlayers[1].name}`,
          players: remainingPlayers,
          skill_combination: skillCombo,
          team_type: teamType,
          isExisting: !!existingTeam
        };
        
        setAvailableTeams2([opposingTeam]);
      } else {
        // Fallback to original logic for existing teams
        const remainingTeams = availableTeams1.filter(team => team.id !== formData.team1Id);
        setAvailableTeams2(remainingTeams);
      }
      
      setCurrentStep(3);
    } else {
      setAvailableTeams2([]);
      setFormData(prev => ({ ...prev, team2Id: '' }));
      if (selectedPlayers.size === 4) {
        setCurrentStep(2);
      }
    }
  }, [formData.team1Id, availableTeams1, validTeams, validPlayers]);

  const handlePlayerToggle = (playerId) => {
    const newSelectedPlayers = new Set(selectedPlayers);
    
    if (newSelectedPlayers.has(playerId)) {
      newSelectedPlayers.delete(playerId);
    } else if (newSelectedPlayers.size < 4) {
      newSelectedPlayers.add(playerId);
    }
    
    setSelectedPlayers(newSelectedPlayers);
    
    if (errors.players) {
      setErrors(prev => ({ ...prev, players: '' }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // For score fields, only allow numeric input
    if ((name === 'team1Score' || name === 'team2Score')) {
      if (value === '' || /^\d+$/.test(value)) {
        setFormData(prev => ({
          ...prev,
          [name]: value
        }));
      }
      return;
    }
    
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

  const toggleScoreInput = () => {
    setShowScoreInput(!showScoreInput);
    // If turning off score input, clear the scores
    if (showScoreInput) {
      setFormData(prev => ({
        ...prev,
        team1Score: '',
        team2Score: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if we need to create new teams
    const team1 = availableTeams1.find(team => team.id === formData.team1Id);
    const team2 = availableTeams2.find(team => team.id === formData.team2Id);
    
    if (!team1 || !team2) {
      setErrors({ teams: 'Please select valid teams for both sides' });
      return;
    }

    let actualTeam1Id = formData.team1Id;
    let actualTeam2Id = formData.team2Id;

    // Create new teams if they don't exist
    if (!team1.isExisting || !team2.isExisting) {
      setIsSubmitting(true);
      try {
        // Create team 1 if it doesn't exist
        if (!team1.isExisting) {
          const team1Data = {
            name: team1.name,
            skillCombination: team1.skill_combination,
            playerIds: team1.players.map(p => p.id)
          };
          
          console.log('Creating new team 1:', team1Data);
          const newTeam1 = await onAddTeam(team1Data);
          actualTeam1Id = newTeam1.id;
        }

        // Create team 2 if it doesn't exist
        if (!team2.isExisting) {
          const team2Data = {
            name: team2.name,
            skillCombination: team2.skill_combination,
            playerIds: team2.players.map(p => p.id)
          };
          
          console.log('Creating new team 2:', team2Data);
          const newTeam2 = await onAddTeam(team2Data);
          actualTeam2Id = newTeam2.id;
        }
      } catch (error) {
        console.error('Error creating teams:', error);
        setErrors({ 
          submit: `Failed to create teams: ${error.message}` 
        });
        setIsSubmitting(false);
        return;
      }
    }

    const matchData = {
      team1Id: actualTeam1Id,
      team2Id: actualTeam2Id,
      scheduledDate: formData.scheduledDate ? parseInputDate(formData.scheduledDate) : null,
      status: 'completed' // Always completed since we require scores
    };

    // Always include scores (required now)
    if (!formData.team1Score || !formData.team2Score) {
      setErrors({ scores: 'Both team scores are required' });
      setIsSubmitting(false);
      return;
    }
      
    matchData.team1Score = parseInt(formData.team1Score);
    matchData.team2Score = parseInt(formData.team2Score);

    // Validate scores
    const scoreValidation = validationUtils.validateBadmintonScore(matchData.team1Score, matchData.team2Score);
    if (!scoreValidation.isValid) {
      setErrors(scoreValidation.errors);
      setIsSubmitting(false);
      return;
    }

    const validation = validationUtils.validateMatch(matchData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      setIsSubmitting(false);
      return;
    }

    if (selectedPlayers.size !== 4) {
      setErrors({ players: 'Please select exactly 4 players for the match' });
      setIsSubmitting(false);
      return;
    }

    if (actualTeam1Id === actualTeam2Id) {
      setErrors({ teams: 'Please select different teams for the match' });
      setIsSubmitting(false);
      return;
    }

    try {
      console.log('🎯 Submitting match data:', matchData); // Debug log
      const result = await onSubmit(matchData);
      console.log('✅ Match creation result:', result); // Debug log
    } catch (error) {
      console.error('❌ Error submitting match form:', error);

      // Better error message handling
      let errorMessage = 'Failed to save match. Please try again.';

      if (error.message) {
        if (error.message.includes('No ELO updates generated')) {
          errorMessage = 'Unable to calculate ELO ratings for this match. This may be due to incomplete player data. Please ensure all selected players have been properly initialized.';
        } else if (error.message.includes('Invalid player count')) {
          errorMessage = 'Invalid team composition. Please ensure both teams have exactly 2 players each.';
        } else if (error.message.includes('validation failed')) {
          errorMessage = `Score validation error: ${error.message}`;
        } else {
          errorMessage = error.message;
        }
      }

      setErrors({
        submit: errorMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show error if no data available
  if (!players || !teams) {
    return (
      <div className="match-form-error">
        <p>Loading players and teams data...</p>
      </div>
    );
  }

  if (validPlayers.length < 4) {
    return (
      <div className="match-form-error">
        <p>Not enough players available to create a match.</p>
        <p>You need at least 4 players. Currently available: {validPlayers.length}</p>
        <button onClick={onCancel} className="btn btn-secondary">
          Close
        </button>
      </div>
    );
  }

  const renderStepIndicator = () => (
    <div className="step-indicator">
      <div className={`step ${currentStep >= 1 ? 'active' : ''} ${selectedPlayers.size === 4 ? 'completed' : ''}`}>
        <div className="step-number">1</div>
        <div className="step-label">Select Players</div>
      </div>
      <ArrowRight className="step-arrow" size={16} />
      <div className={`step ${currentStep >= 2 ? 'active' : ''} ${formData.team1Id ? 'completed' : ''}`}>
        <div className="step-number">2</div>
        <div className="step-label">Choose Team 1</div>
      </div>
      <ArrowRight className="step-arrow" size={16} />
      <div className={`step ${currentStep >= 3 ? 'active' : ''} ${formData.team2Id ? 'completed' : ''}`}>
        <div className="step-number">3</div>
        <div className="step-label">Choose Team 2</div>
      </div>
          <ArrowRight className="step-arrow" size={16} />
      <div className={`step ${currentStep >= 3 && formData.team2Id ? 'active' : ''} ${formData.team1Score && formData.team2Score ? 'completed' : ''}`}>
            <div className="step-number">4</div>
        <div className="step-label">Enter Score</div>
          </div>
    </div>
  );

  const renderPlayerSelection = () => (
    <div className="player-selection-section">
      <h3>Step 1: Select Players for the Match</h3>
      <p className="instruction-text">
        Select exactly 4 players who will participate in this match ({selectedPlayers.size}/4 selected)
      </p>
      
      <div className="players-grid">
        {validPlayers.map(player => (
          <label key={player.id} className="player-checkbox">
            <input
              type="checkbox"
              checked={selectedPlayers.has(player.id)}
              onChange={() => handlePlayerToggle(player.id)}
              disabled={!selectedPlayers.has(player.id) && selectedPlayers.size >= 4}
            />
            <div className="checkbox-content">
              <span className="player-name">{player.name}</span>
              <span className="player-skill">{player.skill_level}</span>
              {player.gender && <span className="player-gender">({player.gender})</span>}
            </div>
          </label>
        ))}
      </div>
      
      {errors.players && <span className="error-text">{errors.players}</span>}
    </div>
  );

  const renderTeamSelection = () => (
    <>
      {currentStep >= 2 && (
        <div className="team-selection-section">
          <h3>Step 2: Select Team 1</h3>
          <p className="instruction-text">
            Choose the first team from available combinations:
          </p>
          
          <div className="teams-grid">
            {availableTeams1.map(team => (
              <label key={team.id} className="team-option">
                <input
                  type="radio"
                  name="team1Id"
                  value={team.id}
                  checked={formData.team1Id === team.id}
                  onChange={handleChange}
                />
                  <div className="team-content">
                    <div className="team-name">
                      {team.name}
                      {!team.isExisting && <span className="new-team-badge">NEW</span>}
                    </div>
                    <div className="team-players">
                      {team.players.map(player => (
                        <span key={player.id} className="player-tag">
                          {player.name}
                        </span>
                      ))}
                    </div>
                    <div className="team-meta">
                      <span className="skill-combo">{team.skill_combination}</span>
                      <span className="team-type">{team.team_type}</span>
                      {!team.isExisting && <span className="creation-note">Will be created</span>}
                    </div>
                  </div>
              </label>
            ))}
          </div>
          
          {errors.team1 && <span className="error-text">{errors.team1}</span>}
        </div>
      )}

      {currentStep >= 3 && (
        <div className="team-selection-section">
          <h3>Step 3: Select Team 2</h3>
          <p className="instruction-text">
            Choose the second team from remaining combinations:
          </p>
          
          <div className="teams-grid">
            {availableTeams2.map(team => (
              <label key={team.id} className="team-option">
                <input
                  type="radio"
                  name="team2Id"
                  value={team.id}
                  checked={formData.team2Id === team.id}
                  onChange={handleChange}
                />
                  <div className="team-content">
                    <div className="team-name">
                      {team.name}
                      {!team.isExisting && <span className="new-team-badge">NEW</span>}
                    </div>
                    <div className="team-players">
                      {team.players.map(player => (
                        <span key={player.id} className="player-tag">
                          {player.name}
                        </span>
                      ))}
                    </div>
                    <div className="team-meta">
                      <span className="skill-combo">{team.skill_combination}</span>
                      <span className="team-type">{team.team_type}</span>
                      {!team.isExisting && <span className="creation-note">Will be created</span>}
                    </div>
                  </div>
              </label>
            ))}
          </div>
          
          {errors.team2 && <span className="error-text">{errors.team2}</span>}
          {errors.teams && <span className="error-text">{errors.teams}</span>}
        </div>
      )}
    </>
  );

  // Render score input fields - Always show since we require scores
  const renderScoreInput = () => {
    if (!formData.team1Id || !formData.team2Id) return null;
    
    const team1 = validTeams.find(team => team.id === formData.team1Id);
    const team2 = validTeams.find(team => team.id === formData.team2Id);
    
    if (!team1 || !team2) return null;
    
    return (
      <div className="match-score-section">
            <h3>Step 4: Record Match Score</h3>
            <div className="teams-display">
              <span className="team-name">{team1.name}</span>
              <span className="vs">VS</span>
              <span className="team-name">{team2.name}</span>
            </div>
            
            <div className="score-inputs">
          <ScoreDropdown
            value={parseInt(formData.team1Score) || 0}
            onChange={(value) => setFormData(prev => ({ ...prev, team1Score: value.toString() }))}
            min={0}
            max={30}
            teamName={team1.name}
            error={errors.team1Score}
                />

          <ScoreDropdown
            value={parseInt(formData.team2Score) || 0}
            onChange={(value) => setFormData(prev => ({ ...prev, team2Score: value.toString() }))}
            min={0}
            max={30}
            teamName={team2.name}
            error={errors.team2Score}
              />
            </div>

        {/* Badminton Scoring Rules */}
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
        {formData.team1Score && formData.team2Score && (
          <div className="winner-preview">
            <strong>Winner: {parseInt(formData.team1Score) > parseInt(formData.team2Score) ? team1.name : team2.name}</strong>
            <span className="note">Match will be automatically marked as completed</span>
      </div>
        )}

        {errors.scores && <span className="error-text">{errors.scores}</span>}
      </div>
  );
};

  return (
    <form onSubmit={handleSubmit} className="enhanced-match-form">
      {renderStepIndicator()}
      
      <div className="form-content">
        {renderPlayerSelection()}
        {renderTeamSelection()}

        {currentStep >= 3 && formData.team2Id && (
          <div className="match-details-section">
            <h3>Match Details</h3>
            
            <div className="form-group">
              <label htmlFor="scheduledDate">Match Date (Optional)</label>
              <input
                type="date"
                id="scheduledDate"
                name="scheduledDate"
                value={formData.scheduledDate}
                onChange={handleChange}
                className={errors.scheduledDate ? 'error' : ''}
              />
              {errors.scheduledDate && <span className="error-text">{errors.scheduledDate}</span>}
              <small className="form-help">
                Leave blank to use current date. Date will be displayed in your local timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone})
              </small>
            </div>

            {/* Always show score input - removed status selection */}
            {renderScoreInput()}
          </div>
        )}
      </div>

      {errors.submit && (
        <div className="error-message">
          {errors.submit}
        </div>
      )}

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn btn-secondary">
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !formData.team1Id || !formData.team2Id || selectedPlayers.size !== 4 ||
                    !formData.team1Score || !formData.team2Score}
          className="btn btn-primary"
        >
          {isSubmitting ? 'Creating Match...' : (match ? 'Update Match' : 'Create Match with Score')}
        </button>
      </div>
    </form>
  );
};

export default MatchForm;