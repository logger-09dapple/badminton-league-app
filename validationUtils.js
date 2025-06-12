// Form validation utilities
export const validationUtils = {
  // Email validation
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Phone validation (flexible format)
  validatePhone(phone) {
    const phoneRegex = /^[\d\s\-\(\)\+]+$/;
    return phone.length >= 10 && phoneRegex.test(phone);
  },

  // Player validation
  validatePlayer(playerData) {
    const errors = {};

    if (!playerData.name || playerData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters long';
    }

    if (!playerData.skillLevel) {
      errors.skillLevel = 'Skill level is required';
    }

    if (playerData.email && !this.validateEmail(playerData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (playerData.phone && !this.validatePhone(playerData.phone)) {
      errors.phone = 'Please enter a valid phone number';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  // Team validation
  validateTeam(teamData) {
    const errors = {};

    if (!teamData.name || teamData.name.trim().length < 2) {
      errors.name = 'Team name must be at least 2 characters long';
    }

    if (!teamData.playerIds || teamData.playerIds.length !== 2) {
      errors.players = 'A team must have exactly 2 players';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  // Match validation
  validateMatch(matchData) {
    const errors = {};

    if (!matchData.team1Id) {
      errors.team1 = 'Team 1 is required';
    }

    if (!matchData.team2Id) {
      errors.team2 = 'Team 2 is required';
    }

    if (matchData.team1Id === matchData.team2Id) {
      errors.teams = 'Team 1 and Team 2 must be different';
    }

    if (matchData.scheduledDate && new Date(matchData.scheduledDate) < new Date()) {
      errors.scheduledDate = 'Scheduled date cannot be in the past';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  // Score validation
  validateScore(score) {
    const numScore = parseInt(score);
    return !isNaN(numScore) && numScore >= 0 && numScore <= 21;
  }
};