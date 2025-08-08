export const validationUtils = {
  validatePlayer: (playerData) => {
    const errors = {};
    let isValid = true;

    if (!playerData.name || playerData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters long';
      isValid = false;
    }

    if (!playerData.skillLevel) {
      errors.skillLevel = 'Skill level is required';
      isValid = false;
    }

    // Enhanced gender validation
    if (!playerData.gender) {
      errors.gender = 'Gender is required';
      isValid = false;
    } else if (!['Male', 'Female', 'Other'].includes(playerData.gender)) {
      errors.gender = 'Please select a valid gender option';
      isValid = false;
    }

    if (playerData.email && !isValidEmail(playerData.email)) {
      errors.email = 'Please enter a valid email address';
      isValid = false;
    }

    if (playerData.phone && !isValidPhone(playerData.phone)) {
      errors.phone = 'Please enter a valid phone number';
      isValid = false;
    }

    return { isValid, errors };
  },

  validateTeam: (teamData) => {
    const errors = {};
    let isValid = true;

    if (!teamData.name || teamData.name.trim().length < 2) {
      errors.name = 'Team name must be at least 2 characters long';
      isValid = false;
    }

    if (teamData.name && teamData.name.trim().length > 50) {
      errors.name = 'Team name must be less than 50 characters';
      isValid = false;
    }

    if (!teamData.playerIds || !Array.isArray(teamData.playerIds) || teamData.playerIds.length !== 2) {
      errors.playerIds = 'A team must have exactly 2 players';
      isValid = false;
    }

    // Check for duplicate player IDs
    if (teamData.playerIds && teamData.playerIds.length === 2) {
      if (teamData.playerIds[0] === teamData.playerIds[1]) {
        errors.playerIds = 'A player cannot be selected twice for the same team';
        isValid = false;
      }
    }

    return { isValid, errors };
  },

  validateMatch: (matchData) => {
    const errors = {};
    let isValid = true;

    if (!matchData.team1Id) {
      errors.team1 = 'Team 1 is required';
      isValid = false;
    }

    if (!matchData.team2Id) {
      errors.team2 = 'Team 2 is required';
      isValid = false;
    }

    if (matchData.team1Id === matchData.team2Id) {
      errors.teams = 'Teams must be different';
      isValid = false;
    }
    
    // Enhanced date validation with timezone handling
    if (matchData.scheduledDate) {
      const matchDate = new Date(matchData.scheduledDate);
      const now = new Date();
      
      if (isNaN(matchDate.getTime())) {
        errors.scheduledDate = 'Please enter a valid date';
        isValid = false;
      }
    }

    return { isValid, errors };
  },

  // Enhanced badminton score validation
  validateBadmintonScore: (team1Score, team2Score) => {
    const errors = {};
    let isValid = true;

    // Basic validation
    if (team1Score === '' || team1Score === null || team1Score === undefined || isNaN(team1Score)) {
      errors.team1Score = 'Please enter a valid score for Team 1';
      isValid = false;
    }

    if (team2Score === '' || team2Score === null || team2Score === undefined || isNaN(team2Score)) {
      errors.team2Score = 'Please enter a valid score for Team 2';
      isValid = false;
    }

    // Skip other validations if basic checks fail
    if (!isValid) return { isValid, errors };

    const score1 = parseInt(team1Score);
    const score2 = parseInt(team2Score);

    // Check for negative scores
    if (score1 < 0 || score2 < 0) {
      errors.scores = 'Scores cannot be negative';
      isValid = false;
    }

    // Badminton-specific score rules
    const maxPoints = 30;
    if (score1 > maxPoints || score2 > maxPoints) {
      errors.scores = `Maximum score in badminton is ${maxPoints} points`;
      isValid = false;
    }

    // Check if game is complete according to badminton rules
    if (!validationUtils.isGameComplete(score1, score2)) {
      errors.scores = 'Invalid score: A badminton game must be won by 2 points, with at least 21 points (30 max)';
      isValid = false;
    }

    return { isValid, errors };
  },

  // Simple score validation for individual scores
  validateScore: (score) => {
    if (score === null || score === undefined || score === '') return false;
    const numScore = parseInt(score);
    return !isNaN(numScore) && numScore >= 0 && numScore <= 30;
  },

  // FIXED: Enhanced game completion check for badminton rules
  isGameComplete: (score1, score2) => {
    const higher = Math.max(score1, score2);
    const lower = Math.min(score1, score2);

    // Basic validation: scores can't be equal (no ties in badminton)
    if (score1 === score2) {
    return false;
    }

    // Game must reach at least 21 points for the winner
    if (higher < 21) {
      return false;
    }

    // FIXED: Special case - At 30 points, the game ends regardless (maximum possible score)
    if (higher === 30) {
      return true; // Any score with 30 is valid (30-0, 30-15, 30-28, 30-29, etc.)
    }

    // FIXED: For scores below 30, must win by at least 2 points
    if (higher < 30 && (higher - lower) >= 2) {
      return true;
    }

    // FIXED: Special deuce scenarios (20-20 onwards)
    if (lower >= 20) {
      // At deuce (20+ each), need to win by 2 points OR reach 30
      return (higher - lower) >= 2 || higher === 30;
    }

    return false;
  },

  // Determine winner based on scores
  getWinner: (score1, score2) => {
    return score1 > score2 ? 'team1' : 'team2';
  },

  // New: Validate tournament data
  validateTournament: (tournamentData) => {
    const errors = {};
    let isValid = true;

    if (!tournamentData.name || tournamentData.name.trim().length < 3) {
      errors.name = 'Tournament name must be at least 3 characters long';
      isValid = false;
    }

    if (!tournamentData.type || !['knockout', 'round_robin', 'swiss'].includes(tournamentData.type)) {
      errors.type = 'Please select a valid tournament type';
      isValid = false;
    }

    if (!tournamentData.startDate) {
      errors.startDate = 'Start date is required';
      isValid = false;
    }

    if (tournamentData.startDate) {
      const startDate = new Date(tournamentData.startDate);
      const now = new Date();
      
      if (startDate < now) {
        errors.startDate = 'Start date cannot be in the past';
        isValid = false;
      }
    }

    if (!tournamentData.maxParticipants || tournamentData.maxParticipants < 4) {
      errors.maxParticipants = 'Tournament must have at least 4 participants';
      isValid = false;
    }

    return { isValid, errors };
  },

  // New: Validate custom player fields
  validateCustomField: (fieldData) => {
    const errors = {};
    let isValid = true;

    if (!fieldData.name || fieldData.name.trim().length < 2) {
      errors.name = 'Field name must be at least 2 characters long';
      isValid = false;
    }

    if (!fieldData.type || !['text', 'number', 'email', 'phone', 'date', 'select'].includes(fieldData.type)) {
      errors.type = 'Please select a valid field type';
      isValid = false;
    }

    if (fieldData.type === 'select' && (!fieldData.options || fieldData.options.length < 2)) {
      errors.options = 'Select fields must have at least 2 options';
      isValid = false;
    }

    return { isValid, errors };
  }
};

// Helper functions
function isValidEmail(email) {
  // Enhanced email validation regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
}

function isValidPhone(phone) {
  // Enhanced phone validation - supports international formats
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');
  return phoneRegex.test(cleanPhone) && cleanPhone.length >= 7;
}