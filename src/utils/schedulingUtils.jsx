// FIXED Round Robin Scheduler for Badminton League with Proper Match Validation
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

  // Create optimal pairs within same skill group
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

  // Create optimal mixed skill pairs
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

  // ========== FIXED MATCH GENERATION ALGORITHMS ==========
  
  // MAIN FIX: Generate schedule with proper skill grouping and player validation
  generateSchedule(teams) {
    console.log('🏸 Starting schedule generation for teams:', teams);
    
    if (!teams || teams.length < 2) {
      console.warn('❌ Not enough teams for schedule generation');
      return [];
    }

    // FIX 1: Group teams by skill combination to ensure same-skill matches
    const teamsBySkill = this.groupTeamsBySkillCombination(teams);
    console.log('📊 Teams grouped by skill combination:', teamsBySkill);

    const allMatches = [];

    // FIX 2: Generate separate tournaments for each skill combination
    Object.entries(teamsBySkill).forEach(([skillCombination, skillTeams]) => {
      console.log(`\n🎯 Generating matches for ${skillCombination} (${skillTeams.length} teams)`);
      
      if (skillTeams.length >= 2) {
        const skillMatches = this.generateRoundRobinForSkillGroup(skillTeams, skillCombination);
        console.log(`✅ Generated ${skillMatches.length} matches for ${skillCombination}`);
        allMatches.push(...skillMatches);
      } else {
        console.log(`⚠️ Only ${skillTeams.length} team(s) in ${skillCombination}, skipping tournament`);
      }
    });

    console.log(`\n🏆 Total matches generated: ${allMatches.length}`);
    return allMatches;
  }

  // NEW: Group teams by skill combination
  groupTeamsBySkillCombination(teams) {
    const groups = {};
    
    teams.forEach(team => {
      const skill = team.skill_combination;
      if (!groups[skill]) {
        groups[skill] = [];
      }
      groups[skill].push(team);
    });
    
    return groups;
  }

  // FIXED: Round-robin for specific skill group with player validation
  generateRoundRobinForSkillGroup(teams, skillCombination) {
    console.log(`🔄 Running round-robin for ${skillCombination} with ${teams.length} teams`);
    
    if (teams.length < 2) {
      return [];
    }

    const matches = [];
    const teamList = [...teams];
    
    // Add bye team if odd number
    if (teamList.length % 2 === 1) {
      teamList.push({ id: 'bye', name: 'BYE', skill_combination: skillCombination });
    }

    const numRounds = teamList.length - 1;
    const matchesPerRound = teamList.length / 2;

    for (let round = 0; round < numRounds; round++) {
      for (let match = 0; match < matchesPerRound; match++) {
        const team1Index = match;
        const team2Index = teamList.length - 1 - match;
        
        const team1 = teamList[team1Index];
        const team2 = teamList[team2Index];
        
        // Skip bye matches
        if (team1.id !== 'bye' && team2.id !== 'bye') {
          // FIX 3: Validate no player overlap before creating match
          if (this.validateNoPlayerOverlap(team1, team2)) {
            matches.push({
              team1_id: team1.id,
              team2_id: team2.id,
              round: round + 1,
              status: 'scheduled',
              skill_combination: skillCombination
            });
            console.log(`✅ Valid match: ${team1.name} vs ${team2.name}`);
          } else {
            console.error(`❌ INVALID MATCH BLOCKED: ${team1.name} vs ${team2.name} - Player overlap detected!`);
          }
        }
      }
      
      // Rotate teams for next round
      if (teamList.length > 2) {
        const lastTeam = teamList.pop();
        teamList.splice(1, 0, lastTeam);
      }
    }

    return matches;
  }

  // NEW: Validate that two teams have no common players
  validateNoPlayerOverlap(team1, team2) {
    const team1Players = new Set(team1.playerIds || []);
    const team2Players = new Set(team2.playerIds || []);
    
    // Check for any common players
    for (const playerId of team1Players) {
      if (team2Players.has(playerId)) {
        console.error(`🚫 Player overlap detected: Player ${playerId} is in both teams`);
        console.error(`   Team 1 (${team1.name}): ${Array.from(team1Players)}`);
        console.error(`   Team 2 (${team2.name}): ${Array.from(team2Players)}`);
        return false;
      }
    }
    
    // Validate total player count
    const totalPlayers = team1Players.size + team2Players.size;
    if (totalPlayers !== 4) {
      console.error(`🚫 Invalid player count: Expected 4 players, got ${totalPlayers}`);
      return false;
    }
    
    return true;
  }

  // NEW: Additional validation method for debugging
  validateAllMatches(matches, teams) {
    console.log('\n🔍 Validating all generated matches...');
    
    const teamMap = new Map(teams.map(team => [team.id, team]));
    let validMatches = 0;
    let invalidMatches = 0;

    matches.forEach((match, index) => {
      const team1 = teamMap.get(match.team1_id);
      const team2 = teamMap.get(match.team2_id);
      
      if (!team1 || !team2) {
        console.error(`❌ Match ${index + 1}: Missing team data`);
        invalidMatches++;
        return;
      }

      // Check skill combination match
      if (team1.skill_combination !== team2.skill_combination) {
        console.error(`❌ Match ${index + 1}: Skill mismatch - ${team1.skill_combination} vs ${team2.skill_combination}`);
        invalidMatches++;
        return;
      }

      // Check player overlap
      if (!this.validateNoPlayerOverlap(team1, team2)) {
        console.error(`❌ Match ${index + 1}: Player overlap detected`);
        invalidMatches++;
        return;
      }

      validMatches++;
    });

    console.log(`\n📈 Validation Results:`);
    console.log(`   ✅ Valid matches: ${validMatches}`);
    console.log(`   ❌ Invalid matches: ${invalidMatches}`);
    console.log(`   📊 Success rate: ${((validMatches / matches.length) * 100).toFixed(1)}%`);

    return invalidMatches === 0;
  }

  // Convert schedule to database-compatible matches
  convertScheduleToMatches(schedule) {
    console.log('Converting schedule to matches:', schedule);
    
    return schedule.map(match => ({
      team1_id: match.team1_id,
      team2_id: match.team2_id,
      scheduled_date: null,
      status: match.status || 'scheduled',
      skill_combination: match.skill_combination // Include skill info
    }));
  }
}

export const roundRobinScheduler = new RoundRobinScheduler();

