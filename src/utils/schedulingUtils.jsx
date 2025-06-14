// FIXED Round Robin Scheduler for Badminton League with Constraint Optimization
export class RoundRobinScheduler {

  // FIXED: Generate skill-based teams with proper constraints
  // Each player can be in multiple teams across different skill combinations
  // BUT only ONE team per skill combination group
  generateSkillBasedTeams(players) {
    console.log('Generating teams from players:', players);

    if (!players || players.length < 2) {
      console.warn('Not enough players to generate teams');
      return [];
    }

    const skillGroups = this.groupPlayersBySkill(players);
    console.log('Players by skill level:', skillGroups);

    // Generate all possible pairs for each skill combination
    const allPairsBySkill = this.generateAllPairsBySkillCombination(skillGroups);

    // Apply constraints: one team per player per skill combination
    const selectedTeams = this.selectTeamsWithConstraints(allPairsBySkill);

    // Convert to final team format
    const finalTeams = this.convertToTeamFormat(selectedTeams);

    console.log('Generated teams with constraints:', finalTeams);
    return finalTeams;
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

  // Generate all possible pairs for each valid skill combination
  generateAllPairsBySkillCombination(skillGroups) {
    const validCombinations = [
      'Advanced-Advanced',
      'Advanced-Intermediate', 
      'Intermediate-Intermediate',
      'Intermediate-Beginner',
      'Beginner-Beginner'
      // Note: Advanced-Beginner removed per user request
    ];

    const allPairs = {};

    for (const combo of validCombinations) {
      allPairs[combo] = this.generatePairsForSkillCombination(combo, skillGroups);
    }

    return allPairs;
  }

  // Generate pairs for a specific skill combination
  generatePairsForSkillCombination(skillCombo, skillGroups) {
    const skillLevels = skillCombo.split('-');

    if (skillLevels[0] === skillLevels[1]) {
      // Same skill level - generate all possible pairs within the group
      const players = skillGroups[skillLevels[0]] || [];
      const pairs = [];
      for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
          pairs.push([players[i], players[j]]);
        }
      }
      return pairs;
    } else {
      // Different skill levels - generate all cross-combinations
      const group1 = skillGroups[skillLevels[0]] || [];
      const group2 = skillGroups[skillLevels[1]] || [];
      const pairs = [];
      for (const p1 of group1) {
        for (const p2 of group2) {
          pairs.push([p1, p2]);
        }
      }
      return pairs;
    }
  }

  // CONSTRAINT OPTIMIZATION: Select teams ensuring each player appears only once per skill combination
  selectTeamsWithConstraints(allPairsBySkill) {
    const selectedTeams = {};
    const playerAssignments = {}; // Track which players are used in each skill combination

    for (const [skillCombo, pairs] of Object.entries(allPairsBySkill)) {
      if (!pairs || pairs.length === 0) {
        selectedTeams[skillCombo] = [];
        continue;
      }

      // Initialize tracking for this skill combination
      playerAssignments[skillCombo] = new Set();

      const selectedPairs = [];
      let availablePairs = [...pairs]; // Create a copy

      // Greedily select pairs ensuring no player appears twice in this skill combination
      while (availablePairs.length > 0) {
        // Find a pair where neither player is already used in this skill combination
        let selectedPair = null;
        let selectedIndex = -1;

        for (let i = 0; i < availablePairs.length; i++) {
          const [p1, p2] = availablePairs[i];
          if (!playerAssignments[skillCombo].has(p1.id) && 
              !playerAssignments[skillCombo].has(p2.id)) {
            selectedPair = availablePairs[i];
            selectedIndex = i;
            break;
          }
        }

        if (selectedPair === null) {
          break; // No more valid pairs available
        }

        // Add the selected pair
        selectedPairs.push(selectedPair);
        const [p1, p2] = selectedPair;
        playerAssignments[skillCombo].add(p1.id);
        playerAssignments[skillCombo].add(p2.id);

        // Remove pairs that would create conflicts
        availablePairs = availablePairs.filter(([player1, player2]) => 
          !playerAssignments[skillCombo].has(player1.id) && 
          !playerAssignments[skillCombo].has(player2.id)
        );
      }

      selectedTeams[skillCombo] = selectedPairs;

      console.log(`${skillCombo}: Selected ${selectedPairs.length} teams from ${pairs.length} possible pairs`);
    }

    return selectedTeams;
  }

  // Convert selected pairs to team format with proper naming
  convertToTeamFormat(selectedTeams) {
    const teams = [];
    let teamCounter = 1;

    for (const [skillCombo, pairs] of Object.entries(selectedTeams)) {
      for (const [player1, player2] of pairs) {
        teams.push({
          name: `Team ${teamCounter++}`,
          skill_combination: skillCombo,
          playerIds: [player1.id, player2.id],
          players: [player1, player2]
        });
      }
    }

    return teams;
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
      scheduled_date: null, // Use snake_case and set to null initially
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
        combination: skills.includes('Advanced') && skills.includes('Intermediate')
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