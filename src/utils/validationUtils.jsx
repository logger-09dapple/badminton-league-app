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

    // NEW: Gender validation
    if (!playerData.gender) {
      errors.gender = 'Gender is required';
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

    if (!teamData.playerIds || teamData.playerIds.length !== 2) {
      errors.playerIds = 'A team must have exactly 2 players';
      isValid = false;
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

    // Removed date validation - dates should be accepted regardless of timezone
    return { isValid, errors };
  },

  // Validate badminton scores
  validateBadmintonScore: (team1Score, team2Score) => {
    const errors = {};
    let isValid = true;

    // Basic validation
    if (team1Score === '' || isNaN(team1Score)) {
      errors.team1Score = 'Please enter a valid score for Team 1';
      isValid = false;
    }

    if (team2Score === '' || isNaN(team2Score)) {
      errors.team2Score = 'Please enter a valid score for Team 2';
      isValid = false;
    }

    // Skip other validations if basic checks fail
    if (!isValid) return { isValid, errors };

    // Badminton-specific score rules
    const maxPoints = 30;
    if (team1Score > maxPoints || team2Score > maxPoints) {
      errors.scores = `Maximum score in badminton is ${maxPoints} points`;
      isValid = false;
    }

    const winningScore = Math.max(team1Score, team2Score);
    const losingScore = Math.min(team1Score, team2Score);

    // Check if game is complete according to badminton rules
    if (!validationUtils.isGameComplete(team1Score, team2Score)) {
      errors.scores = 'Invalid score: A badminton game must be won by 2 points, with at least 21 points (30 max)';
          isValid = false;
        }
    return { isValid, errors };
  },

  // Helper method to check if a game is complete
  isGameComplete: (score1, score2) => {
    const higher = Math.max(score1, score2);
    const lower = Math.min(score1, score2);

    // Game must reach at least 21 points
    if (higher < 21) {
    return false;
    }

    // At 29-29, first to 30 wins
    if (higher === 30 && lower === 29) {
      return true;
    }

    // Must win by 2 points up to 30
    if (higher <= 30 && higher - lower >= 2) {
      return true;
    }

    return false;
  },

  // Determine winner based on scores
  getWinner: (score1, score2) => {
    return score1 > score2 ? 'team1' : 'team2';
  },

  // Simplified score validation for basic checks
  validateScore: (score) => {
    return score >= 0 && score <= 30 && Number.isInteger(score);
  },

  // Enhanced score update validation with badminton rules
  validateScoreUpdate: (scoreData) => {
    const team1Score = parseInt(scoreData.team1Score);
    const team2Score = parseInt(scoreData.team2Score);

    return validationUtils.validateBadmintonScore(team1Score, team2Score);
  }
};

// Helper functions
function isValidEmail(email) {
  // Simple email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhone(phone) {
  // Basic phone validation
  const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
  return phoneRegex.test(phone);
}
