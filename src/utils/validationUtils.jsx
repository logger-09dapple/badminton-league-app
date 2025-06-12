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

 validateScore: (score) => {
 return score >= 0 && score <= 21 && Number.isInteger(score);
 },

 validateScoreUpdate: (scoreData) => {
 const errors = {};
 let isValid = true;

 if (scoreData.team1Score === undefined || scoreData.team1Score === null) {
 errors.team1Score = 'Team 1 score is required';
 isValid = false;
 } else if (!validationUtils.validateScore(scoreData.team1Score)) {
 errors.team1Score = 'Score must be between 0 and 21';
 isValid = false;
 }

 if (scoreData.team2Score === undefined || scoreData.team2Score === null) {
 errors.team2Score = 'Team 2 score is required';
 isValid = false;
 } else if (!validationUtils.validateScore(scoreData.team2Score)) {
 errors.team2Score = 'Score must be between 0 and 21';
 isValid = false;
 }

 if (scoreData.team1Score === scoreData.team2Score) {
 errors.scores = 'Scores cannot be tied - one team must win';
 isValid = false;
 }

 return { isValid, errors };
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

