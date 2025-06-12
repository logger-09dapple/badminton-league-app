// Round Robin Tournament Scheduler
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

  // Generate skill-based team combinations
  generateSkillBasedTeams(players) {
    if (!players || players.length < 2) {
      return [];
    }

    const skillLevels = ['Beginner', 'Intermediate', 'Advanced'];
    const teams = [];
    let teamId = 1;

    // Group players by skill level
    const playersBySkill = {};
    skillLevels.forEach(skill => {
      playersBySkill[skill] = players.filter(player => player.skill_level === skill);
    });

    // Generate all possible team combinations
    const combinations = [
      ['Advanced', 'Advanced'],
      ['Advanced', 'Intermediate'],
      ['Advanced', 'Beginner'],
      ['Intermediate', 'Intermediate'],
      ['Intermediate', 'Beginner'],
      ['Beginner', 'Beginner']
    ];

    combinations.forEach(([skill1, skill2]) => {
      const players1 = playersBySkill[skill1] || [];
      const players2 = skill1 === skill2 ? players1 : (playersBySkill[skill2] || []);

      if (skill1 === skill2) {
        // Same skill level - create pairs from the same group
        for (let i = 0; i < players1.length; i += 2) {
          if (i + 1 < players1.length) {
            teams.push({
              id: teamId++,
              name: `Team ${teams.length + 1}`,
              skill_combination: `${skill1}-${skill2}`,
              players: [players1[i], players1[i + 1]],
              playerIds: [players1[i].id, players1[i + 1].id],
              points: 0,
              matches_played: 0,
              matches_won: 0
            });
          }
        }
      } else {
        // Different skill levels - create cross combinations
        players1.forEach(player1 => {
          players2.forEach(player2 => {
            teams.push({
              id: teamId++,
              name: `Team ${teams.length + 1}`,
              skill_combination: `${skill1}-${skill2}`,
              players: [player1, player2],
              playerIds: [player1.id, player2.id],
              points: 0,
              matches_played: 0,
              matches_won: 0
            });
          });
        });
      }
    });

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

    return { valid: true, combination: skillLevels.sort().join('-') };
  }
};
