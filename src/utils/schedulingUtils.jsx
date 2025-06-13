// FIXED Round Robin Scheduler for Badminton League with Complete Team Generation
export class RoundRobinScheduler {
 
 // COMPREHENSIVE: Generate ALL possible skill-based team combinations (excluding Advanced-Beginner)
 generateSkillBasedTeams(players) {
 console.log('Generating teams from players:', players);
 
 if (!players || players.length < 2) {
 console.warn('Not enough players to generate teams');
 return [];
 }

 // STEP 1: Generate ALL possible player pairs
 const allPossiblePairs = this.generateAllPlayerPairs(players);
 
 // STEP 2: Filter pairs by valid skill combinations (excluding Advanced-Beginner)
 const validPairs = this.filterValidSkillCombinations(allPossiblePairs);
 
 // STEP 3: Select optimal teams to maximize player participation
 const selectedTeams = this.selectOptimalTeams(validPairs);
 
 console.log(`Generated ${selectedTeams.length} teams from ${players.length} players`);
 return selectedTeams;
 }

 // FIXED: Centralized valid combinations array (excluding Advanced-Beginner)
 getValidSkillCombinations() {
 return [
 'Advanced-Advanced',
 'Advanced-Intermediate',
 'Intermediate-Intermediate', 
 'Intermediate-Beginner',
 'Beginner-Beginner'
 ];
 }

 // NEW: Generate all possible player pairs using combinations
 generateAllPlayerPairs(players) {
 const pairs = [];
 
 // Generate all possible combinations of 2 players
 for (let i = 0; i < players.length; i++) {
 for (let j = i + 1; j < players.length; j++) {
 pairs.push([players[i], players[j]]);
 }
 }
 
 console.log(`Generated ${pairs.length} possible player pairs`);
 return pairs;
 }

 // FIXED: Filter pairs by valid badminton skill combinations (no Advanced-Beginner)
 filterValidSkillCombinations(pairs) {
 const validSkillCombinations = new Set(this.getValidSkillCombinations());

 const validPairs = pairs.filter(pair => {
 const [player1, player2] = pair;
 const skills = [player1.skill_level, player2.skill_level].sort();
 const combination = skills.join('-');
 
 // Log each combination check for debugging
 console.log(`Checking combination: ${combination}`);
 
 return validSkillCombinations.has(combination);
 });

 console.log(`Filtered to ${validPairs.length} valid skill combination pairs`);
 console.log('Valid combinations found:', [...new Set(validPairs.map(pair => {
 const skills = [pair[0].skill_level, pair[1].skill_level].sort();
 return skills.join('-');
 }))]);
 
 return validPairs;
 }

 // ENHANCED: Select optimal teams with better distribution
 selectOptimalTeams(validPairs) {
 const teams = [];
 const usedPlayers = new Set();
 let teamCounter = 1;

 // Group pairs by skill combination for balanced selection
 const pairsBySkillCombo = this.groupPairsBySkillCombination(validPairs);
 
 // Sort skill combinations by priority (you can customize this order)
 const skillComboPriority = this.getValidSkillCombinations();
 
 // Generate teams from each skill combination group in priority order
 skillComboPriority.forEach(combination => {
 const pairs = pairsBySkillCombo[combination] || [];
 console.log(`Processing ${combination}: ${pairs.length} possible pairs`);
 
 if (pairs.length > 0) {
 // Select non-overlapping pairs for this skill combination
 const selectedPairs = this.selectNonOverlappingPairs(pairs, usedPlayers);
 
 // Create teams from selected pairs
 selectedPairs.forEach(pair => {
 const [player1, player2] = pair;
 teams.push({
 name: `Team ${teamCounter++}`,
 skill_combination: combination,
 playerIds: [player1.id, player2.id],
 players: [player1, player2]
 });
 
 // Mark players as used
 usedPlayers.add(player1.id);
 usedPlayers.add(player2.id);
 });
 }
 });

 // OPTIMIZATION: Try to create additional teams from remaining players
 const additionalTeams = this.createAdditionalTeamsFromRemaining(validPairs, usedPlayers, teamCounter);
 teams.push(...additionalTeams);

 return teams;
 }

 // NEW: Group pairs by their skill combination
 groupPairsBySkillCombination(pairs) {
 const groups = {};
 
 pairs.forEach(pair => {
 const [player1, player2] = pair;
 const skills = [player1.skill_level, player2.skill_level].sort();
 const combination = skills.join('-');
 
 if (!groups[combination]) {
 groups[combination] = [];
 }
 groups[combination].push(pair);
 });

 return groups;
 }

 // ENHANCED: Select pairs that don't share players with better logic
 selectNonOverlappingPairs(pairs, globalUsedPlayers) {
 const selected = [];
 const localUsedPlayers = new Set();

 // Shuffle pairs to ensure different results on each run
 const shuffledPairs = [...pairs].sort(() => Math.random() - 0.5);

 for (const pair of shuffledPairs) {
 const [player1, player2] = pair;
 
 // Check if either player is already used globally or locally
 if (!globalUsedPlayers.has(player1.id) && 
 !globalUsedPlayers.has(player2.id) &&
 !localUsedPlayers.has(player1.id) && 
 !localUsedPlayers.has(player2.id)) {
 
 selected.push(pair);
 localUsedPlayers.add(player1.id);
 localUsedPlayers.add(player2.id);
 }
 }

 console.log(`Selected ${selected.length} non-overlapping pairs from ${pairs.length} possible pairs`);
 return selected;
 }

 // FIXED: Create additional teams with centralized validation
 createAdditionalTeamsFromRemaining(allValidPairs, usedPlayers, startCounter) {
 const additionalTeams = [];
 let teamCounter = startCounter;

 // Get all unused pairs
 const unusedPairs = allValidPairs.filter(pair => {
 const [player1, player2] = pair;
 return !usedPlayers.has(player1.id) && !usedPlayers.has(player2.id);
 });

 // Select non-overlapping pairs from unused pairs
 const selectedPairs = this.selectNonOverlappingPairs(unusedPairs, new Set());

 selectedPairs.forEach(pair => {
 const [player1, player2] = pair;
 const skills = [player1.skill_level, player2.skill_level].sort();
 const combination = skills.join('-');

 additionalTeams.push({
 name: `Team ${teamCounter++}`,
 skill_combination: combination,
 playerIds: [player1.id, player2.id],
 players: [player1, player2]
 });

 // Mark players as used
 usedPlayers.add(player1.id);
 usedPlayers.add(player2.id);
 });

 console.log(`Created ${additionalTeams.length} additional teams from remaining players`);
 return additionalTeams;
 }

 // LEGACY FUNCTIONS (maintained for compatibility)
 groupPlayersBySkill(players) {
 return players.reduce((groups, player) => {
 const skill = player.skill_level;
 if (!groups[skill]) groups[skill] = [];
 groups[skill].push(player);
 return groups;
 }, {});
 }

 // FIXED: Generate round-robin schedule using proper circle method
 generateSchedule(teams) {
 console.log('Generating schedule for teams:', teams);
 
 if (!teams || teams.length < 2) {
 console.warn('Not enough teams for schedule generation');
 return [];
 }

 const schedule = this.generateRoundRobinSchedule(teams);
 console.log('Generated schedule:', schedule);
 return schedule;
 }

 generateRoundRobinSchedule(teams) {
 if (teams.length < 2) return [];

 const schedule = [];
 const teamList = [...teams];
 
 // If odd number of teams, add a "bye" team
 if (teamList.length % 2 === 1) {
 teamList.push({ id: 'bye', name: 'BYE' });
 }

 const numRounds = teamList.length - 1;
 const matchesPerRound = teamList.length / 2;

 for (let round = 0; round < numRounds; round++) {
 const roundMatches = [];
 
 for (let match = 0; match < matchesPerRound; match++) {
 const team1Index = match;
 const team2Index = teamList.length - 1 - match;
 
 const team1 = teamList[team1Index];
 const team2 = teamList[team2Index];
 
 // Skip matches involving the "bye" team
 if (team1.id !== 'bye' && team2.id !== 'bye') {
 roundMatches.push({
 team1_id: team1.id,
 team2_id: team2.id,
 round: round + 1,
 status: 'scheduled'
 });
 }
 }
 
 if (roundMatches.length > 0) {
 schedule.push(...roundMatches);
 }
 
 // Rotate teams (keep first team fixed, rotate others)
 if (teamList.length > 2) {
 const lastTeam = teamList.pop();
 teamList.splice(1, 0, lastTeam);
 }
 }

 return schedule;
 }

 // Convert schedule to database-compatible matches
 convertScheduleToMatches(schedule) {
 console.log('Converting schedule to matches:', schedule);
 
 return schedule.map(match => ({
 team1_id: match.team1_id,
 team2_id: match.team2_id,
 scheduled_date: null,
 status: match.status || 'scheduled'
 }));
 }

 // FIXED: Validate team skill combination with centralized valid combinations
 validateTeamCombination(players) {
 if (players.length !== 2) {
 return { valid: false, message: 'Team must have exactly 2 players' };
 }

 const skills = players.map(p => p.skill_level).sort();
 const combination = skills.join('-');
 
 const validCombinations = this.getValidSkillCombinations();

 if (validCombinations.includes(combination)) {
 return { 
 valid: true, 
 combination: combination
 };
 }

 return { valid: false, message: 'Invalid skill combination' };
 }

 // Balance teams by skill level
 balanceTeamsBySkill(teams) {
 const skillCombinations = {};
 
 teams.forEach(team => {
 const combo = team.skill_combination;
 if (!skillCombinations[combo]) {
 skillCombinations[combo] = [];
 }
 skillCombinations[combo].push(team);
 });

 return skillCombinations;
 }
}

export const roundRobinScheduler = new RoundRobinScheduler();

