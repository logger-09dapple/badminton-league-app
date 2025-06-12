// Round Robin Tournament Scheduler - Fixed Version
export const roundRobinScheduler = {
 // Generate round robin schedule for teams
 generateSchedule(teams) {
 if (!teams || teams.length < 2) {
 throw new Error('At least 2 teams are required for scheduling');
 }

 const schedule = [];
 const teamsArray = [...teams];

 // If odd number of teams, add a 'bye' team
 if (teamsArray.length % 2 !== 0) {
 teamsArray.push({ id: 'bye', name: 'BYE', skill_combination: 'bye' });
 }

 const numTeams = teamsArray.length;
 const numRounds = numTeams - 1;
 const matchesPerRound = numTeams / 2;

 for (let round = 0; round < numRounds; round++) {
 const roundMatches = [];

 for (let match = 0; match < matchesPerRound; match++) {
 const team1Index = (round + match) % (numTeams - 1);
 const team2Index = (numTeams - 1 - match + round) % (numTeams - 1);

 let team1, team2;

 if (match === 0) {
 team1 = teamsArray[numTeams - 1]; // Last team stays fixed
 team2 = teamsArray[team1Index];
 } else {
 team1 = teamsArray[team1Index];
 team2 = teamsArray[team2Index];
 }

 // Skip matches with BYE team
 if (team1.id !== 'bye' && team2.id !== 'bye') {
 roundMatches.push({
 id: `r${round + 1}m${match + 1}`,
 round: round + 1,
 team1: team1,
 team2: team2,
 team1Id: team1.id,  // Add this for database compatibility
 team2Id: team2.id,  // Add this for database compatibility
 status: 'scheduled',
 team1Score: 0,
 team2Score: 0,
 scheduledDate: null
 });
 }
 }

 if (roundMatches.length > 0) {
 schedule.push({
 round: round + 1,
 matches: roundMatches
 });
 }
 }

 return schedule;
 },

 // FIXED: Generate skill-based team combinations with better logic
 generateSkillBasedTeams(players) {
 if (!players || players.length < 2) {
 return [];
 }

 const teams = [];
 let teamCounter = 1;

 // Group players by skill level
 const playersBySkill = {
 'Advanced': players.filter(p => p.skill_level === 'Advanced'),
 'Intermediate': players.filter(p => p.skill_level === 'Intermediate'),
 'Beginner': players.filter(p => p.skill_level === 'Beginner')
 };

 // Track used players to avoid duplicates
 const usedPlayers = new Set();

 // Create Advanced-Advanced teams first
 const advancedPlayers = [...playersBySkill.Advanced];
 for (let i = 0; i < advancedPlayers.length - 1; i += 2) {
 if (i + 1 < advancedPlayers.length && 
     !usedPlayers.has(advancedPlayers[i].id) && 
     !usedPlayers.has(advancedPlayers[i + 1].id)) {
   teams.push({
     name: `Team ${teamCounter++}`,
     skill_combination: 'Advanced-Advanced',
     playerIds: [advancedPlayers[i].id, advancedPlayers[i + 1].id],
     players: [advancedPlayers[i], advancedPlayers[i + 1]]
   });
   usedPlayers.add(advancedPlayers[i].id);
   usedPlayers.add(advancedPlayers[i + 1].id);
 }
 }

 // Create Intermediate-Intermediate teams
 const intermediatePlayers = [...playersBySkill.Intermediate];
 for (let i = 0; i < intermediatePlayers.length - 1; i += 2) {
 if (i + 1 < intermediatePlayers.length && 
     !usedPlayers.has(intermediatePlayers[i].id) && 
     !usedPlayers.has(intermediatePlayers[i + 1].id)) {
   teams.push({
     name: `Team ${teamCounter++}`,
     skill_combination: 'Intermediate-Intermediate',
     playerIds: [intermediatePlayers[i].id, intermediatePlayers[i + 1].id],
     players: [intermediatePlayers[i], intermediatePlayers[i + 1]]
   });
   usedPlayers.add(intermediatePlayers[i].id);
   usedPlayers.add(intermediatePlayers[i + 1].id);
 }
 }

 // Create Beginner-Beginner teams
 const beginnerPlayers = [...playersBySkill.Beginner];
 for (let i = 0; i < beginnerPlayers.length - 1; i += 2) {
 if (i + 1 < beginnerPlayers.length && 
     !usedPlayers.has(beginnerPlayers[i].id) && 
     !usedPlayers.has(beginnerPlayers[i + 1].id)) {
   teams.push({
     name: `Team ${teamCounter++}`,
     skill_combination: 'Beginner-Beginner',
     playerIds: [beginnerPlayers[i].id, beginnerPlayers[i + 1].id],
     players: [beginnerPlayers[i], beginnerPlayers[i + 1]]
   });
   usedPlayers.add(beginnerPlayers[i].id);
   usedPlayers.add(beginnerPlayers[i + 1].id);
 }
 }

 // Create mixed skill teams with remaining players
 const remainingAdvanced = advancedPlayers.filter(p => !usedPlayers.has(p.id));
 const remainingIntermediate = intermediatePlayers.filter(p => !usedPlayers.has(p.id));
 const remainingBeginner = beginnerPlayers.filter(p => !usedPlayers.has(p.id));

 // Advanced-Intermediate teams
 const maxAdvInt = Math.min(remainingAdvanced.length, remainingIntermediate.length);
 for (let i = 0; i < maxAdvInt; i++) {
 teams.push({
   name: `Team ${teamCounter++}`,
   skill_combination: 'Advanced-Intermediate',
   playerIds: [remainingAdvanced[i].id, remainingIntermediate[i].id],
   players: [remainingAdvanced[i], remainingIntermediate[i]]
 });
 usedPlayers.add(remainingAdvanced[i].id);
 usedPlayers.add(remainingIntermediate[i].id);
 }

 // Update remaining players after Advanced-Intermediate pairing
 const stillRemainingAdvanced = remainingAdvanced.filter(p => !usedPlayers.has(p.id));
 const stillRemainingIntermediate = remainingIntermediate.filter(p => !usedPlayers.has(p.id));

 // Advanced-Beginner teams
 const maxAdvBeg = Math.min(stillRemainingAdvanced.length, remainingBeginner.length);
 for (let i = 0; i < maxAdvBeg; i++) {
 teams.push({
   name: `Team ${teamCounter++}`,
   skill_combination: 'Advanced-Beginner',
   playerIds: [stillRemainingAdvanced[i].id, remainingBeginner[i].id],
   players: [stillRemainingAdvanced[i], remainingBeginner[i]]
 });
 usedPlayers.add(stillRemainingAdvanced[i].id);
 usedPlayers.add(remainingBeginner[i].id);
 }

 // Intermediate-Beginner teams
 const finalRemainingIntermediate = stillRemainingIntermediate.filter(p => !usedPlayers.has(p.id));
 const finalRemainingBeginner = remainingBeginner.filter(p => !usedPlayers.has(p.id));
 const maxIntBeg = Math.min(finalRemainingIntermediate.length, finalRemainingBeginner.length);
 
 for (let i = 0; i < maxIntBeg; i++) {
 teams.push({
   name: `Team ${teamCounter++}`,
   skill_combination: 'Intermediate-Beginner',
   playerIds: [finalRemainingIntermediate[i].id, finalRemainingBeginner[i].id],
   players: [finalRemainingIntermediate[i], finalRemainingBeginner[i]]
 });
 }

 return teams;
 },

 // Validate team combination
 validateTeamCombination(players) {
 if (!players || players.length !== 2) {
 return { valid: false, message: 'A team must have exactly 2 players' };
 }

 const skillLevels = players.map(p => p.skill_level);
 const validCombinations = [
 ['Advanced', 'Advanced'],
 ['Advanced', 'Intermediate'],
 ['Advanced', 'Beginner'],
 ['Intermediate', 'Intermediate'],
 ['Intermediate', 'Beginner'],
 ['Beginner', 'Beginner']
 ];

 const isValid = validCombinations.some(combo => 
 (combo[0] === skillLevels[0] && combo[1] === skillLevels[1]) ||
 (combo[0] === skillLevels[1] && combo[1] === skillLevels[0])
 );

 if (!isValid) {
 return { valid: false, message: 'Invalid skill level combination' };
 }

 // Create proper combination string
 const sortedSkills = skillLevels.sort();
 const combination = sortedSkills[0] === sortedSkills[1] 
   ? `${sortedSkills[0]}-${sortedSkills[1]}`
   : skillLevels.includes('Advanced') && skillLevels.includes('Beginner')
     ? 'Advanced-Beginner'
     : skillLevels.includes('Advanced') && skillLevels.includes('Intermediate')
       ? 'Advanced-Intermediate'
       : skillLevels.includes('Intermediate') && skillLevels.includes('Beginner')
         ? 'Intermediate-Beginner'
         : sortedSkills.join('-');

 return { valid: true, combination };
 },

 // FIXED: Convert schedule to database-compatible format
 convertScheduleToMatches(schedule) {
 const matches = [];
 
 schedule.forEach(round => {
   round.matches.forEach(match => {
     matches.push({
       team1Id: match.team1Id || match.team1.id,
       team2Id: match.team2Id || match.team2.id,
       status: 'scheduled',
       team1Score: 0,
       team2Score: 0,
       scheduledDate: null
     });
   });
 });
 
 return matches;
 }
};