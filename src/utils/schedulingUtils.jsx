// Enhanced Round Robin Scheduler - Standalone Version
export class RoundRobinScheduler {
  
  generateSkillBasedTeams(players) {
    console.log('Starting generateSkillBasedTeams with players:', players);
    
    if (!players || !Array.isArray(players) || players.length < 2) {
      console.warn('Invalid or insufficient players for team generation');
      return [];
    }

    const teams = [];

    try {
      // Group players by gender and skill
      const genderSkillGroups = this.groupPlayersByGenderAndSkill(players);
      
      // Helper function to create teams with player-name-based naming
      const createTeam = (player1, player2, combination, type = 'same-gender') => {
        const player1FirstName = this.getFirstWord(player1.name || 'Player1');
        const player2FirstName = this.getFirstWord(player2.name || 'Player2');
        const teamName = `${player1FirstName}-${player2FirstName}`;
        
        return {
          name: teamName,
          skill_combination: combination,
          team_type: type,
          playerIds: [player1.id, player2.id],
          players: [player1, player2]
        };
      };

      // Generate same-gender teams
      if (genderSkillGroups.Male) {
        const maleTeams = this.generateSameGenderTeams(genderSkillGroups.Male);
        teams.push(...maleTeams.map(team => createTeam(team.players[0], team.players[1], team.skill_combination, 'male')));
      }

      if (genderSkillGroups.Female) {
        const femaleTeams = this.generateSameGenderTeams(genderSkillGroups.Female);
        teams.push(...femaleTeams.map(team => createTeam(team.players[0], team.players[1], team.skill_combination, 'female')));
      }

// 3. Generate mixed doubles teams (one male, one female)
    const mixedTeams = this.generateMixedDoublesTeams(genderSkillGroups);
    teams.push(...mixedTeams.map(team => createTeam(team.players[0], team.players[1], team.skill_combination, 'mixed-doubles')));


      console.log('Successfully generated teams:', teams);
      return teams;
    } catch (error) {
      console.error('Error in generateSkillBasedTeams:', error);
      throw new Error(`Team generation failed: ${error.message}`);
    }
  }

  getFirstWord(fullName) {
    if (!fullName || typeof fullName !== 'string') {
      return 'Unknown';
    }
    return fullName.trim().split(' ')[0] || 'Unknown';
  }

  groupPlayersByGenderAndSkill(players) {
    const groups = {};
    
    players.forEach(player => {
      const gender = player.gender || 'Unknown';
      const skill = player.skill_level || 'Beginner';
      
      if (!groups[gender]) groups[gender] = {};
      if (!groups[gender][skill]) groups[gender][skill] = [];
      
      groups[gender][skill].push(player);
    });
    
    return groups;
  }

  generateSameGenderTeams(genderGroup) {
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
}

// Export singleton instance
export const roundRobinScheduler = new RoundRobinScheduler();

