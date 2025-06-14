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
      errors.players = 'Team must have exactly 2 players';
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

    // Validate scheduled date if provided
    if (matchData.scheduledDate) {
      const selectedDate = new Date(matchData.scheduledDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        errors.scheduledDate = 'Scheduled date cannot be in the past';
        isValid = false;
      }
    }

    return { isValid, errors };
  },

  // NEW: Comprehensive badminton score validation based on official rules
  validateBadmintonScore: (team1Score, team2Score) => {
    const errors = {};
    let isValid = true;

    // Check if scores are valid numbers
    if (team1Score === undefined || team1Score === null || isNaN(team1Score)) {
      errors.team1Score = 'Team 1 score is required and must be a number';
      isValid = false;
    }

    if (team2Score === undefined || team2Score === null || isNaN(team2Score)) {
      errors.team2Score = 'Team 2 score is required and must be a number';
      isValid = false;
    }

    // Convert to numbers for validation
    const score1 = parseInt(team1Score);
    const score2 = parseInt(team2Score);

    // Basic range validation (0-30)
    if (score1 < 0 || score1 > 30) {
      errors.team1Score = 'Score must be between 0 and 30';
      isValid = false;
    }

    if (score2 < 0 || score2 > 30) {
      errors.team2Score = 'Score must be between 0 and 30';
      isValid = false;
    }

    if (!isValid) return { isValid, errors };

    // Badminton scoring rules validation
    const maxScore = Math.max(score1, score2);
    const minScore = Math.min(score1, score2);

    // Rule 1: Match must have a winner (no ties allowed)
    if (score1 === score2) {
      errors.scores = 'Badminton matches cannot end in a tie - one team must win';
      isValid = false;
    }

    // Rule 2: Game is won at 21 points with 2-point lead
    if (maxScore >= 21) {
      // If max score is 21-29, must have 2-point lead
      if (maxScore <= 29) {
        if (maxScore - minScore < 2) {
          errors.scores = `Score ${maxScore}-${minScore} is invalid. At 20-20 or higher, you need a 2-point lead to win (e.g., 22-20, 23-21)`;
          isValid = false;
        }
      }
      // Rule 3: At 29-29, first to 30 wins (maximum possible score)
      else if (maxScore === 30) {
        if (minScore !== 29) {
          errors.scores = `Score ${maxScore}-${minScore} is invalid. When one team reaches 30, the other team must have 29 points`;
          isValid = false;
        }
      }
      // Rule 4: Cannot exceed 30 points
      else if (maxScore > 30) {
        errors.scores = 'Maximum possible score in badminton is 30 points';
        isValid = false;
      }
    }
    // Rule 5: If neither team has reached 21, game is not complete
    else {
      errors.scores = `Score ${maxScore}-${minScore} is invalid. A badminton game must reach at least 21 points to complete`;
      isValid = false;
    }

    // Additional validation for impossible score progressions
    if (isValid) {
      // Check for logical score progression
      if (minScore > 21 && maxScore < 21) {
        errors.scores = 'Invalid score combination - both teams cannot have more than 21 points unless there was a deuce';
        isValid = false;
      }
    }

    return { isValid, errors };
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
  },

  // NEW: Validate if a score represents a completed game
  isGameComplete: (team1Score, team2Score) => {
    const score1 = parseInt(team1Score);
    const score2 = parseInt(team2Score);
    const maxScore = Math.max(score1, score2);
    const minScore = Math.min(score1, score2);

    // Game is complete if:
    // 1. One team has at least 21 points AND
    // 2. Either has 2-point lead (for scores 21-29) OR one team has 30 points
    if (maxScore >= 21) {
      if (maxScore === 30) return true; // 30-29 scenario
      if (maxScore - minScore >= 2) return true; // 2-point lead scenario
    }
    
    return false;
  },

  // NEW: Get winner from valid scores
  getWinner: (team1Score, team2Score) => {
    const score1 = parseInt(team1Score);
    const score2 = parseInt(team2Score);
    
    if (!validationUtils.isGameComplete(score1, score2)) {
      return null; // Game not complete
    }
    
    return score1 > score2 ? 'team1' : 'team2';
  }
};

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhone(phone) {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

