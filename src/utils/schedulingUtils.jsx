// COMPREHENSIVE Round Robin Scheduler for Badminton League
export class RoundRobinScheduler {
  
  // Define valid skill combinations (removed Advanced-Beginner as requested)
  getValidSkillCombinations() {
    return [
      'Advanced-Advanced',
      'Advanced-Intermediate',
      'Intermediate-Intermediate', 
      'Intermediate-Beginner',
      'Beginner-Beginner'
    ];
  }

  // COMPLETELY REWRITTEN: Generate ALL possible team combinations
  generateSkillBasedTeams(players) {
    console.log('Generating ALL possible team combinations from players:', players);
    
    if (!players || players.length < 2) {
      console.warn('Not enough players to generate teams');
      return [];
    }

    const teams = [];
    let teamCounter = 1;
    const validCombinations = this.getValidSkillCombinations();

    // Group players by skill level
    const skillGroups = this.groupPlayersBySkill(players);
    console.log('Players grouped by skill:', skillGroups);

    // Generate ALL possible combinations for each valid skill pairing
    validCombinations.forEach(combination => {
      const [skill1, skill2] = combination.split('-');
      console.log(`Generating teams for ${combination}`);
      
      if (skill1 === skill2) {
        // Same skill level - generate all possible pairs within the group
        const playersOfSkill = skillGroups[skill1] || [];
        const allPairs = this.generateAllPossiblePairs(playersOfSkill);
        
        allPairs.forEach(pair => {
          teams.push({
            name: `Team ${teamCounter++}`,
            skill_combination: combination,
            playerIds: [pair[0].id, pair[1].id],
            players: [pair[0], pair[1]]
          });
        });
        
        console.log(`Generated ${allPairs.length} teams for ${combination}`);
      } else {
        // Different skill levels - generate all possible cross combinations
        const players1 = skillGroups[skill1] || [];
        const players2 = skillGroups[skill2] || [];
        const crossPairs = this.generateAllCrossCombinations(players1, players2);
        
        crossPairs.forEach(pair => {
          teams.push({
            name: `Team ${teamCounter++}`,
            skill_combination: combination,
            playerIds: [pair[0].id, pair[1].id],
            players: [pair[0], pair[1]]
          });
        });
        
        console.log(`Generated ${crossPairs.length} teams for ${combination}`);
      }
    });

    console.log(`Total teams generated: ${teams.length}`);
    console.log('All generated teams:', teams);
    return teams;
  }

  // Generate ALL possible pairs from a single skill group
  generateAllPossiblePairs(players) {
    const pairs = [];
    
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        pairs.push([players[i], players[j]]);
      }
    }
    
    return pairs;
  }

  // Generate ALL possible cross combinations between two skill groups
  generateAllCrossCombinations(group1, group2) {
    const combinations = [];
    
    for (let i = 0; i < group1.length; i++) {
      for (let j = 0; j < group2.length; j++) {
        combinations.push([group1[i], group2[j]]);
      }
    }
    
    return combinations;
  }

  // Group players by skill level
  groupPlayersBySkill(players) {
    return players.reduce((groups, player) => {
      const skill = player.skill_level;
      if (!groups[skill]) groups[skill] = [];
      groups[skill].push(player);
      return groups;
    }, {});
  }

  // LEGACY FUNCTIONS - kept for backward compatibility but not used in new algorithm
  createPairs(players) {
    const pairs = [];
    for (let i = 0; i < players.length - 1; i += 2) {
      if (players[i + 1]) {
        pairs.push([players[i], players[i + 1]]);
      }
    }
    return pairs;
  }

  createMixedPairs(group1, group2) {
    const pairs = [];
    const minLength = Math.min(group1.length, group2.length);
    
    for (let i = 0; i < minLength; i++) {
      pairs.push([group1[i], group2[i]]);
    }
    
    return pairs;
  }

  // Generate schedule from teams
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

  // Round-robin scheduling with proper team handling
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

  // Validate team skill combination with updated valid combinations
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

