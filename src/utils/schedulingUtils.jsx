// FIXED Round Robin Scheduler for Badminton League
export class RoundRobinScheduler {
  
  // ENHANCED: Generate ALL skill-based team combinations systematically
  generateSkillBasedTeams(players) {
    console.log('Generating teams from players:', players);
    
    if (!players || players.length < 2) {
      console.warn('Not enough players to generate teams');
      return [];
    }

    const skillGroups = this.groupPlayersBySkill(players);
    const teams = [];
    let teamCounter = 1;

    console.log('Players by skill level:', skillGroups);

    // Helper function to create teams with proper naming
    const createTeam = (player1, player2, combination) => {
      return {
        name: `Team ${teamCounter++}`,
        skill_combination: combination,
        playerIds: [player1.id, player2.id],
        players: [player1, player2]
      };
    };

    // Generate ALL possible skill combinations systematically
    const skillLevels = ['Advanced', 'Intermediate', 'Beginner'];
    
    // Create all possible combinations (including same-skill pairs)
    for (let i = 0; i < skillLevels.length; i++) {
      for (let j = i; j < skillLevels.length; j++) {
        const skill1 = skillLevels[i];
        const skill2 = skillLevels[j];
        const combination = skill1 === skill2 ? `${skill1}-${skill2}` : `${skill1}-${skill2}`;
        
        if (skill1 === skill2) {
          // Same skill level - create pairs within the group
          const players1 = skillGroups[skill1] || [];
          const pairs = this.createPairs(players1);
          pairs.forEach(pair => {
            teams.push(createTeam(pair[0], pair[1], combination));
          });
        } else {
          // Different skill levels - create mixed pairs
          const players1 = skillGroups[skill1] || [];
          const players2 = skillGroups[skill2] || [];
          const mixedPairs = this.createMixedPairs(players1, players2);
          mixedPairs.forEach(pair => {
            teams.push(createTeam(pair[0], pair[1], combination));
          });
        }
      }
    }

    console.log('Generated teams:', teams);
    return teams;
  }

  groupPlayersBySkill(players) {
    return players.reduce((groups, player) => {
      const skill = player.skill_level;
      if (!groups[skill]) groups[skill] = [];
      groups[skill].push(player);
      return groups;
    }, {});
  }

  createPairs(players) {
    const pairs = [];
    const usedPlayers = new Set();
    
    for (let i = 0; i < players.length; i++) {
      if (usedPlayers.has(players[i].id)) continue;
      
      for (let j = i + 1; j < players.length; j++) {
        if (usedPlayers.has(players[j].id)) continue;
        
        pairs.push([players[i], players[j]]);
        usedPlayers.add(players[i].id);
        usedPlayers.add(players[j].id);
        break; // Move to next unpaired player
      }
    }
    
    return pairs;
  }

  createMixedPairs(group1, group2) {
    const pairs = [];
    const usedFromGroup1 = new Set();
    const usedFromGroup2 = new Set();
    
    for (let i = 0; i < group1.length; i++) {
      if (usedFromGroup1.has(group1[i].id)) continue;
      
      for (let j = 0; j < group2.length; j++) {
        if (usedFromGroup2.has(group2[j].id)) continue;
        
        pairs.push([group1[i], group2[j]]);
        usedFromGroup1.add(group1[i].id);
        usedFromGroup2.add(group2[j].id);
        break; // Move to next unpaired player from group1
      }
    }
    
    return pairs;
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

  // FIXED: Round-robin scheduling with proper team handling
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

  // NEW: Convert schedule to database-compatible matches
  convertScheduleToMatches(schedule) {
    console.log('Converting schedule to matches:', schedule);
    
    return schedule.map(match => ({
      team1_id: match.team1_id,
      team2_id: match.team2_id,
      scheduled_date: null, // FIXED: Use snake_case and set to null initially
      status: match.status || 'scheduled'
    }));
  }

  // Validate team skill combination
  validateTeamCombination(players) {
    if (players.length !== 2) {
      return { valid: false, message: 'Team must have exactly 2 players' };
    }

    const skills = players.map(p => p.skill_level).sort();
    const combination = skills.join('-');
    
    const validCombinations = [
      'Advanced-Advanced',
      'Advanced-Intermediate', 
      'Intermediate-Intermediate',
      'Intermediate-Beginner',
      'Beginner-Beginner'
    ];

    const normalizedCombo = skills.reverse().join('-'); // Try reverse order too
    
    if (validCombinations.includes(combination) || validCombinations.includes(normalizedCombo)) {
      return { 
        valid: true, 
        combination: skills.includes('Advanced') && skills.includes('Beginner') 
          ? 'Advanced-Beginner' 
          : skills.includes('Advanced') && skills.includes('Intermediate')
            ? 'Advanced-Intermediate'
            : skills.includes('Intermediate') && skills.includes('Beginner')
              ? 'Intermediate-Beginner'
              : combination
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

