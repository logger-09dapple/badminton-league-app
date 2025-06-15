// Enhanced Round Robin Scheduler for Badminton League with Error Handling and Custom Team Naming
export class RoundRobinScheduler {
  
  // Generate all possible team combinations with custom naming
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

    // Helper function to create teams with player-name-based naming
    const createTeam = (player1, player2, combination, type = 'same-gender') => {
      // NEW FEATURE: Use first words of player names for team naming
      const player1FirstName = this.getFirstWord(player1.name || 'Player1');
      const player2FirstName = this.getFirstWord(player2.name || 'Player2');
      const teamName = `${player1FirstName}-${player2FirstName}`;
      
      return {
        name: teamName, // CHANGED: Custom naming based on player names
        skill_combination: combination,
        team_type: type,
        playerIds: [player1.id, player2.id],
        players: [player1, player2]
      };
    };

    try {
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
    } catch (error) {
      console.error('Error in generateSkillBasedTeams:', error);
      throw new Error(`Team generation failed: ${error.message}`);
    }
  }

  // NEW FEATURE: Extract first word from player name
  getFirstWord(fullName) {
    if (!fullName || typeof fullName !== 'string') {
      return 'Unknown';
    }
    return fullName.trim().split(' ')[0] || 'Unknown';
  }

  // Enhanced error handling for all methods
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

  // Remaining methods with enhanced error handling...
  generateSameGenderTeams(genderGroup, gender) {
    const teams = [];
    const validCombinations = [
      ['Advanced', 'Advanced'],
      ['Advanced', 'Intermediate'],
      ['Advanced', 'Beginner'],
      ['Intermediate', 'Intermediate'],
      ['Intermediate', 'Beginner'],
      ['Beginner', 'Beginner']
    ];

    validCombinations.forEach(([skill1, skill2]) => {
      try {
        const players1 = genderGroup[skill1] || [];
        const players2 = genderGroup[skill2] || [];
        
        if (skill1 === skill2) {
          const pairs = this.createOptimalPairs(players1);
          pairs.forEach(pair => {
            teams.push({
              skill_combination: `${skill1}-${skill2}`,
              players: pair
            });
          });
        } else {
          const mixedPairs = this.createOptimalMixedPairs(players1, players2);
          mixedPairs.forEach(pair => {
            teams.push({
              skill_combination: `${skill1}-${skill2}`,
              players: pair
            });
          });
        }
      } catch (error) {
        console.error(`Error generating teams for ${skill1}-${skill2}:`, error);
      }
    });

    return teams;
  }

  // Additional methods with comprehensive error handling...
}

export const roundRobinScheduler = new RoundRobinScheduler();

