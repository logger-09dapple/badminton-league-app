// Enhanced Round Robin Scheduler for Badminton League with Gender Support
export class RoundRobinScheduler {
  
  // Generate all possible team combinations including gender-based and mixed doubles
  generateSkillBasedTeams(players) {
    console.log('Generating teams from players:', players);
    
    if (!players || players.length < 2) {
      console.warn('Not enough players to generate teams');
      return [];
    }

    const teams = [];
    let teamCounter = 1;

    // Group players by gender and skill
    const genderSkillGroups = this.groupPlayersByGenderAndSkill(players);
    console.log('Players grouped by gender and skill:', genderSkillGroups);

    // Helper function to create teams
    const createTeam = (player1, player2, combination, type = 'same-gender') => {
      return {
        name: `Team ${teamCounter++}`,
        skill_combination: combination,
        team_type: type,
        playerIds: [player1.id, player2.id],
        players: [player1, player2]
      };
    };

    // 1. Generate same-gender teams (Male teams)
    if (genderSkillGroups.Male) {
      const maleTeams = this.generateSameGenderTeams(genderSkillGroups.Male, 'Male');
      teams.push(...maleTeams.map(team => createTeam(team.players[0], team.players[1], team.skill_combination, 'male')));
    }

    // 2. Generate same-gender teams (Female teams)
    if (genderSkillGroups.Female) {
      const femaleTeams = this.generateSameGenderTeams(genderSkillGroups.Female, 'Female');
      teams.push(...femaleTeams.map(team => createTeam(team.players[0], team.players[1], team.skill_combination, 'female')));
    }

    // 3. Generate mixed doubles teams (one male, one female)
    const mixedTeams = this.generateMixedDoublesTeams(genderSkillGroups);
    teams.push(...mixedTeams.map(team => createTeam(team.players[0], team.players[1], team.skill_combination, 'mixed-doubles')));

    console.log('Generated teams:', teams);
    return teams;
  }

  // Group players by gender and then by skill level
  groupPlayersByGenderAndSkill(players) {
    const groups = {};
    
    players.forEach(player => {
      const gender = player.gender;
      const skill = player.skill_level;
      
      if (!groups[gender]) {
        groups[gender] = {};
      }
      if (!groups[gender][skill]) {
        groups[gender][skill] = [];
      }
      
      groups[gender][skill].push(player);
    });
    
    return groups;
  }

  // Generate same-gender teams for a specific gender
  generateSameGenderTeams(genderGroup, gender) {
    const teams = [];
    const skillLevels = ['Advanced', 'Intermediate', 'Beginner'];
    
    // All valid skill combinations including Advanced-Beginner
    const validCombinations = [
      ['Advanced', 'Advanced'],
      ['Advanced', 'Intermediate'],
      ['Advanced', 'Beginner'], // RESTORED: Advanced-Beginner combination
      ['Intermediate', 'Intermediate'],
      ['Intermediate', 'Beginner'],
      ['Beginner', 'Beginner']
    ];

    validCombinations.forEach(([skill1, skill2]) => {
      const players1 = genderGroup[skill1] || [];
      const players2 = genderGroup[skill2] || [];
      
      if (skill1 === skill2) {
        // Same skill level - create pairs within the group
        const pairs = this.createOptimalPairs(players1);
        pairs.forEach(pair => {
          teams.push({
            skill_combination: `${skill1}-${skill2}`,
            players: pair
          });
        });
      } else {
        // Different skill levels - create mixed skill pairs
        const mixedPairs = this.createOptimalMixedPairs(players1, players2);
        mixedPairs.forEach(pair => {
          teams.push({
            skill_combination: `${skill1}-${skill2}`,
            players: pair
          });
        });
      }
    });

    return teams;
  }

  // Generate mixed doubles teams (one male, one female)
  generateMixedDoublesTeams(genderSkillGroups) {
    const teams = [];
    const malePlayers = this.flattenGenderGroup(genderSkillGroups.Male || {});
    const femalePlayers = this.flattenGenderGroup(genderSkillGroups.Female || {});
    
    if (malePlayers.length === 0 || femalePlayers.length === 0) {
      return teams;
    }

    // Create one mixed doubles team per player constraint
    const usedMales = new Set();
    const usedFemales = new Set();
    
    // Try to create balanced skill combinations for mixed doubles
    const skillCombinations = [
      ['Advanced', 'Advanced'],
      ['Advanced', 'Intermediate'],
      ['Advanced', 'Beginner'],
      ['Intermediate', 'Intermediate'],
      ['Intermediate', 'Beginner'],
      ['Beginner', 'Beginner']
    ];

    skillCombinations.forEach(([skill1, skill2]) => {
      const availableMales = malePlayers.filter(p => p.skill_level === skill1 && !usedMales.has(p.id));
      const availableFemales = femalePlayers.filter(p => p.skill_level === skill2 && !usedFemales.has(p.id));
      
      const pairCount = Math.min(availableMales.length, availableFemales.length);
      
      for (let i = 0; i < pairCount; i++) {
        const male = availableMales[i];
        const female = availableFemales[i];
        
        teams.push({
          skill_combination: `Mixed-${skill1}-${skill2}`,
          players: [male, female]
        });
        
        usedMales.add(male.id);
        usedFemales.add(female.id);
      }
    });

    return teams;
  }

  // Flatten gender group to get all players
  flattenGenderGroup(genderGroup) {
    const allPlayers = [];
    Object.values(genderGroup).forEach(skillGroup => {
      allPlayers.push(...skillGroup);
    });
    return allPlayers;
  }

  // Create optimal pairs within same skill group (constraint: each player in one team per skill combination)
  createOptimalPairs(players) {
    const pairs = [];
    const usedPlayers = new Set();
    
    for (let i = 0; i < players.length; i++) {
      if (usedPlayers.has(players[i].id)) continue;
      
      for (let j = i + 1; j < players.length; j++) {
        if (usedPlayers.has(players[j].id)) continue;
        
        pairs.push([players[i], players[j]]);
        usedPlayers.add(players[i].id);
        usedPlayers.add(players[j].id);
        break;
      }
    }
    
    return pairs;
  }

  // Create optimal mixed skill pairs (constraint: each player in one team per skill combination)
  createOptimalMixedPairs(players1, players2) {
    const pairs = [];
    const usedFromGroup1 = new Set();
    const usedFromGroup2 = new Set();
    
    for (let i = 0; i < players1.length; i++) {
      if (usedFromGroup1.has(players1[i].id)) continue;
      
      for (let j = 0; j < players2.length; j++) {
        if (usedFromGroup2.has(players2[j].id)) continue;
        
        pairs.push([players1[i], players2[j]]);
        usedFromGroup1.add(players1[i].id);
        usedFromGroup2.add(players2[j].id);
        break;
      }
    }
    
    return pairs;
  }

  // Rest of existing methods remain the same...
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
      
      if (teamList.length > 2) {
        const lastTeam = teamList.pop();
        teamList.splice(1, 0, lastTeam);
      }
    }

    return schedule;
  }

  convertScheduleToMatches(schedule) {
    console.log('Converting schedule to matches:', schedule);
    
    return schedule.map(match => ({
      team1_id: match.team1_id,
      team2_id: match.team2_id,
      scheduled_date: null,
      status: match.status || 'scheduled'
    }));
  }
}

export const roundRobinScheduler = new RoundRobinScheduler();

