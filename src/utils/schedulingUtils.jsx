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

  // Enhanced schedule generation with detailed validation
  generateSchedule(teams) {
    console.log('🎯 Starting schedule generation with teams:', teams);
    
    // Comprehensive validation
    if (!teams || !Array.isArray(teams)) {
      console.error('❌ Invalid teams data: not an array');
      throw new Error('Teams data is invalid or not an array');
    }
    
    if (teams.length < 2) {
      console.error('❌ Insufficient teams:', teams.length);
      throw new Error(`Need at least 2 teams, got ${teams.length}`);
    }

    // Validate each team has proper player data
    const validationResults = this.validateTeamsForScheduling(teams);
    if (!validationResults.isValid) {
      console.error('❌ Team validation failed:', validationResults.errors);
      throw new Error(`Team validation failed: ${validationResults.errors.join(', ')}`);
    }

    // Group teams by skill combination for fair matching
    const groupedTeams = this.groupTeamsBySkillCombination(teams);
    console.log('📋 Teams grouped by skill:', Object.keys(groupedTeams).map(skill => 
      `${skill}: ${groupedTeams[skill].length} teams`
    ));

    const allMatches = [];
    
    // Generate matches within each skill group
    for (const [skillCombination, skillTeams] of Object.entries(groupedTeams)) {
      if (skillTeams.length >= 2) {
        console.log(`🎮 Generating matches for ${skillCombination}: ${skillTeams.length} teams`);
        const skillMatches = this.generateRoundRobinForGroup(skillTeams);
        const validMatches = this.validateMatches(skillMatches);
        allMatches.push(...validMatches);
        console.log(`✅ Generated ${validMatches.length} valid matches for ${skillCombination}`);
      }
    }

    console.log(`🎊 Total matches generated: ${allMatches.length}`);
    return allMatches;
  }

  // Comprehensive team validation
  validateTeamsForScheduling(teams) {
    const errors = [];
    
    for (const team of teams) {
      // Check basic team structure
      if (!team.id) {
        errors.push(`Team missing ID: ${team.name || 'unnamed'}`);
        continue;
      }
      
      if (!team.name) {
        errors.push(`Team ${team.id} missing name`);
      }

      // Critical: Check players array
      if (!team.players || !Array.isArray(team.players)) {
        errors.push(`Team ${team.name} has no players array`);
        continue;
      }

      if (team.players.length !== 2) {
        errors.push(`Team ${team.name} has ${team.players.length} players, expected 2`);
        continue;
      }

      // Validate individual players
      for (const player of team.players) {
        if (!player.id) {
          errors.push(`Team ${team.name} has player without ID`);
        }
        if (!player.name) {
          errors.push(`Team ${team.name} has player without name`);
        }
        if (!player.skill_level) {
          errors.push(`Team ${team.name} has player ${player.name} without skill level`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  // Enhanced player overlap validation
  validateNoPlayerOverlap(team1, team2) {
    if (!team1.players || !team2.players) {
      console.error('🚫 Invalid player data:', {
        team1: team1.name,
        team1Players: team1.players?.length || 0,
        team2: team2.name,
        team2Players: team2.players?.length || 0
      });
      return false;
    }

    const team1PlayerIds = team1.players.map(p => p.id);
    const team2PlayerIds = team2.players.map(p => p.id);
    
    const overlap = team1PlayerIds.some(id => team2PlayerIds.includes(id));
    
    if (overlap) {
      console.warn('⚠️ Player overlap detected:', {
        team1: team1.name,
        team2: team2.name,
        team1Players: team1PlayerIds,
        team2Players: team2PlayerIds
      });
    }

    const totalPlayers = [...new Set([...team1PlayerIds, ...team2PlayerIds])].length;
    console.log('🔍 Player validation:', {
      team1: team1.name,
      team2: team2.name,
      totalUniquePlayers: totalPlayers,
      hasOverlap: overlap
    });

    return !overlap && totalPlayers === 4;
  }

  // Group teams by skill combination
  groupTeamsBySkillCombination(teams) {
    const groups = {};
    
    teams.forEach(team => {
      const skillCombo = team.skill_combination || 'Unknown';
      if (!groups[skillCombo]) {
        groups[skillCombo] = [];
      }
      groups[skillCombo].push(team);
    });
    
    return groups;
  }

  // Generate round-robin within a skill group
  generateRoundRobinForGroup(teams) {
    const matches = [];
    
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        matches.push({
          team1_id: teams[i].id,
          team2_id: teams[j].id,
          status: 'scheduled'
        });
      }
    }
    
    return matches;
  }

  // Validate generated matches
  validateMatches(matches) {
    return matches.filter(match => {
      // Additional validation can be added here
      return match.team1_id && match.team2_id && match.team1_id !== match.team2_id;
    });
  }

  // Convert schedule to database format
  convertScheduleToMatches(schedule) {
    console.log('🔄 Converting schedule to database format:', schedule.length, 'matches');
    
    return schedule.map(match => ({
      team1_id: match.team1_id,
      team2_id: match.team2_id,
      scheduled_date: null,
      status: match.status || 'scheduled'
    }));
  }
}

// Export singleton instance
export const roundRobinScheduler = new RoundRobinScheduler();

