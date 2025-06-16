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
        //if (usedPlayers.has(players[i].id)) continue;
      
      for (let j = i + 1; j < players.length; j++) {
        //if (usedPlayers.has(players[j].id)) continue;
        
        pairs.push([players[i], players[j]]);
        //usedPlayers.add(players[i].id);
        //usedPlayers.add(players[j].id);
        //break;
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

// Enhanced schedule generation with comprehensive gender validation
generateSchedule(teams) {
  console.log('🎯 Starting gender-aware schedule generation');
  
  if (!teams || !Array.isArray(teams)) {
    throw new Error('Teams data is invalid or not an array');
  }
  
  if (teams.length < 2) {
    throw new Error(`Need at least 2 teams, got ${teams.length}`);
  }

  // Validate teams before proceeding
  const validationResults = this.validateTeamsForScheduling(teams);
  if (!validationResults.isValid) {
    throw new Error(`Team validation failed: ${validationResults.errors.join(', ')}`);
  }

  // Group teams by skill combination
  const groupedTeams = this.groupTeamsBySkillCombination(teams);
  console.log('📋 Teams grouped by skill:', Object.keys(groupedTeams));

  const allMatches = [];
  
  // 1. Generate same-skill matches with gender awareness
  for (const [skillCombination, skillTeams] of Object.entries(groupedTeams)) {
    if (skillTeams.length >= 2) {
      console.log(`🎮 Generating same-skill matches for ${skillCombination}`);
      
      // Group by gender within skill combination
      const genderGroups = this.groupTeamsByGender(skillTeams);
      
      // Generate matches within each gender group
      Object.entries(genderGroups).forEach(([genderType, genderTeams]) => {
        if (genderTeams.length >= 2) {
          console.log(`   🎯 ${genderType} teams: ${genderTeams.length}`);
          const sameSkillMatches = this.generateRoundRobinForGroup(genderTeams);
          sameSkillMatches.forEach(match => {
            match.gender_category = genderType;
            match.match_type = 'same-skill';
          });
          allMatches.push(...sameSkillMatches);
          console.log(`   ✅ Added ${sameSkillMatches.length} same-skill ${genderType} matches`);
        }
      });
    }
  }

  // 2. Generate cross-skill matches (already gender-aware)
  const crossSkillMatches = this.generateCrossSkillMatches(groupedTeams);
  allMatches.push(...crossSkillMatches);

  // 3. Validate all matches (includes gender compatibility check)
  const validMatches = this.validateAllMatches(allMatches, teams);
  
  console.log(`📊 Gender-aware match generation summary:`);
  console.log(`   - Total generated: ${allMatches.length}`);
  console.log(`   - Valid matches: ${validMatches.length}`);
  console.log(`   - Rejected matches: ${allMatches.length - validMatches.length}`);
  
  return validMatches;
}

// NEW: Group teams by gender type
groupTeamsByGender(teams) {
  const genderGroups = {
    male: [],
    female: [],
    'mixed-doubles': []
  };
  
  teams.forEach(team => {
    const genderType = this.determineTeamGenderType(team);
    if (genderType !== 'unknown') {
      genderGroups[genderType].push(team);
    }
  });
  
  return genderGroups;
}
	

// Enhanced cross-skill matching with gender-aware grouping
generateCrossSkillMatches(groupedTeams) {
  console.log('🔄 Generating gender-aware cross-skill matches');
  const crossSkillMatches = [];
  
  // First, organize teams by gender type within skill combinations
  const genderAwareTeams = this.organizeTeamsByGenderAndSkill(groupedTeams);
  
  // Define fair cross-skill pairings for SAME GENDER types only
  const fairPairings = [
    {
      team1Type: 'Advanced-Intermediate',
      team2Type: 'Advanced-Advanced',
      description: 'Mixed advanced vs pure advanced'
    },
    {
      team1Type: 'Intermediate-Intermediate', 
      team2Type: 'Advanced-Beginner',
      description: 'Pure intermediate vs mixed advanced-beginner'
    },
    {
      team1Type: 'Intermediate-Beginner',
      team2Type: 'Beginner-Beginner', 
      description: 'Mixed intermediate-beginner vs pure beginner'
    },
    {
      team1Type: 'Intermediate-Intermediate',
      team2Type: 'Intermediate-Beginner',
      description: 'Pure intermediate vs mixed intermediate-beginner'
    }
  ];

  // Generate matches for each fair pairing within each gender category
  ['male', 'female', 'mixed-doubles'].forEach(genderType => {
    console.log(`🎯 Processing ${genderType} teams for cross-skill matches`);
    
    fairPairings.forEach(pairing => {
      const group1Teams = genderAwareTeams[genderType]?.[pairing.team1Type] || [];
      const group2Teams = genderAwareTeams[genderType]?.[pairing.team2Type] || [];
      
      if (group1Teams.length > 0 && group2Teams.length > 0) {
        console.log(`⚔️ Creating ${genderType} ${pairing.description} matches: ${group1Teams.length} vs ${group2Teams.length} teams`);
        
        const pairingMatches = this.generateCrossGroupMatches(group1Teams, group2Teams);
        
        pairingMatches.forEach(match => {
          match.match_type = 'cross-skill';
          match.pairing_description = `${genderType} ${pairing.description}`;
          match.gender_category = genderType;
        });
        
        crossSkillMatches.push(...pairingMatches);
        console.log(`✅ Generated ${pairingMatches.length} ${genderType} cross-skill matches`);
      }
    });
  });

  console.log(`🎊 Total gender-aware cross-skill matches: ${crossSkillMatches.length}`);
  return crossSkillMatches;
}

// NEW: Organize teams by gender type and then by skill combination
organizeTeamsByGenderAndSkill(groupedTeams) {
  const genderAwareTeams = {
    male: {},
    female: {},
    'mixed-doubles': {}
  };
  
  // Process each skill combination group
  Object.entries(groupedTeams).forEach(([skillCombination, teams]) => {
    teams.forEach(team => {
      const genderType = this.determineTeamGenderType(team);
      
      if (genderType !== 'unknown') {
        if (!genderAwareTeams[genderType][skillCombination]) {
          genderAwareTeams[genderType][skillCombination] = [];
        }
        genderAwareTeams[genderType][skillCombination].push(team);
      }
    });
  });
  
  // Log the organization results
  Object.entries(genderAwareTeams).forEach(([genderType, skillGroups]) => {
    const totalTeams = Object.values(skillGroups).flat().length;
    if (totalTeams > 0) {
      console.log(`📊 ${genderType} teams by skill:`, 
        Object.entries(skillGroups).map(([skill, teams]) => `${skill}: ${teams.length}`).join(', ')
      );
    }
  });
  
  return genderAwareTeams;
}



// NEW: Generate matches between two different skill groups
generateCrossGroupMatches(group1Teams, group2Teams) {
  const matches = [];
  
  // Create matches between every team in group1 vs every team in group2
  group1Teams.forEach(team1 => {
    group2Teams.forEach(team2 => {
      matches.push({
        team1_id: team1.id,
        team2_id: team2.id,
        status: 'scheduled',
        skill_combination_1: team1.skill_combination,
        skill_combination_2: team2.skill_combination
      });
    });
  });
  
  return matches;
}

// Enhanced validation with gender-aware match filtering
validateAllMatches(matches, teams) {
  console.log('🔍 Validating all matches for player overlap and gender compatibility');
  
  // Create team lookup for quick access
  const teamLookup = {};
  teams.forEach(team => {
    teamLookup[team.id] = team;
  });
  
  const validMatches = matches.filter(match => {
    const team1 = teamLookup[match.team1_id];
    const team2 = teamLookup[match.team2_id];
    
    if (!team1 || !team2) {
      console.warn('⚠️ Match references non-existent team:', match);
      return false;
    }
    
    // Validate no player overlap
    const hasValidPlayers = this.validateNoPlayerOverlap(team1, team2);
    if (!hasValidPlayers) {
      console.warn('🚫 Match rejected due to player overlap:', {
        team1: team1.name,
        team2: team2.name
      });
      return false;
    }
    
    // NEW: Validate gender compatibility
    const hasCompatibleGenders = this.validateGenderCompatibility(team1, team2);
    if (!hasCompatibleGenders) {
      console.warn('🚫 Match rejected due to gender incompatibility:', {
        team1: team1.name,
        team1Type: team1.team_type,
        team2: team2.name,
        team2Type: team2.team_type
      });
      return false;
    }
    
    return true;
  });
  
  console.log(`✅ Validated ${validMatches.length} matches out of ${matches.length} generated`);
  return validMatches;
}

// NEW: Validate that teams have compatible gender compositions for fair matches
validateGenderCompatibility(team1, team2) {
  // Get team types (male, female, mixed-doubles)
  const team1Type = this.determineTeamGenderType(team1);
  const team2Type = this.determineTeamGenderType(team2);
  
  console.log('🔍 Gender compatibility check:', {
    team1: team1.name,
    team1Type: team1Type,
    team2: team2.name,
    team2Type: team2Type
  });
  
  // Valid match combinations:
  // 1. Same gender teams can play each other (male vs male, female vs female)
  // 2. Mixed doubles teams can play other mixed doubles teams
  // 3. Cross-gender matches are NOT allowed (male vs female, male vs mixed, female vs mixed)
  
  const validCombinations = [
    ['male', 'male'],
    ['female', 'female'], 
    ['mixed-doubles', 'mixed-doubles']
  ];
  
  const isValidCombination = validCombinations.some(([type1, type2]) => 
    (team1Type === type1 && team2Type === type2) || 
    (team1Type === type2 && team2Type === type1)
  );
  
  if (!isValidCombination) {
    console.warn(`⚠️ Invalid gender combination: ${team1Type} vs ${team2Type}`);
  }
  
  return isValidCombination;
}

// NEW: Determine team gender type based on player composition
determineTeamGenderType(team) {
  // Check if team_type is already set in database
  if (team.team_type && ['male', 'female', 'mixed-doubles'].includes(team.team_type)) {
    return team.team_type;
  }
  
  // Fallback: Determine from player genders
  if (!team.players || team.players.length !== 2) {
    console.warn('⚠️ Cannot determine team gender type - invalid players data');
    return 'unknown';
  }
  
  const player1Gender = team.players[0].gender;
  const player2Gender = team.players[1].gender;
  
  if (player1Gender === 'Male' && player2Gender === 'Male') {
    return 'male';
  } else if (player1Gender === 'Female' && player2Gender === 'Female') {
    return 'female';
  } else if ((player1Gender === 'Male' && player2Gender === 'Female') || 
             (player1Gender === 'Female' && player2Gender === 'Male')) {
    return 'mixed-doubles';
  } else {
    console.warn('⚠️ Unknown gender combination:', { player1Gender, player2Gender });
    return 'unknown';
  }
}


// Enhanced player overlap validation with detailed logging
validateNoPlayerOverlap(team1, team2) {
  if (!team1.players || !team2.players) {
    console.error('🚫 Missing player data:', {
      team1: team1.name,
      team1HasPlayers: !!team1.players,
      team2: team2.name, 
      team2HasPlayers: !!team2.players
    });
    return false;
  }

  if (team1.players.length !== 2 || team2.players.length !== 2) {
    console.error('🚫 Invalid player count:', {
      team1: team1.name,
      team1PlayerCount: team1.players.length,
      team2: team2.name,
      team2PlayerCount: team2.players.length
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
      overlappingPlayers: team1PlayerIds.filter(id => team2PlayerIds.includes(id))
    });
    return false;
  }

  const totalPlayers = [...new Set([...team1PlayerIds, ...team2PlayerIds])].length;
  return totalPlayers === 4;
}
	
// Enhanced team validation with detailed error reporting
validateTeamsForScheduling(teams) {
  console.log('🔍 Validating teams for scheduling:', teams.length, 'teams');
  const errors = [];
  const warnings = [];
  
  if (!teams || !Array.isArray(teams)) {
    errors.push('Teams data is not a valid array');
    return { isValid: false, errors, warnings };
  }
  
  for (const team of teams) {
    const teamName = team.name || `Team ${team.id || 'Unknown'}`;
    
    // Check basic team structure
    if (!team.id) {
      errors.push(`${teamName}: Missing team ID`);
      continue;
    }
    
    if (!team.name) {
      warnings.push(`Team ${team.id}: Missing team name`);
    }

    // Critical: Check players array existence and structure
    if (!team.players) {
      errors.push(`${teamName}: Missing players property`);
      continue;
    }
    
    if (!Array.isArray(team.players)) {
      errors.push(`${teamName}: Players is not an array (type: ${typeof team.players})`);
      continue;
    }

    if (team.players.length === 0) {
      errors.push(`${teamName}: Players array is empty`);
      continue;
    }

    if (team.players.length !== 2) {
      errors.push(`${teamName}: Has ${team.players.length} players, expected exactly 2`);
      continue;
    }

    // Validate individual players
    team.players.forEach((player, index) => {
      if (!player) {
        errors.push(`${teamName}: Player ${index + 1} is null/undefined`);
        return;
      }
      
      if (!player.id) {
        errors.push(`${teamName}: Player ${index + 1} missing ID`);
      }
      
      if (!player.name) {
        warnings.push(`${teamName}: Player ${index + 1} missing name`);
      }
      
      if (!player.skill_level) {
        errors.push(`${teamName}: Player ${index + 1} (${player.name || 'unnamed'}) missing skill level`);
      }
    });
  }

  // Log validation results
  if (errors.length > 0) {
    console.error('❌ Team validation errors:', errors);
  }
  
  if (warnings.length > 0) {
    console.warn('⚠️ Team validation warnings:', warnings);
  }

  const validTeamsCount = teams.filter(team => 
    team.players && Array.isArray(team.players) && team.players.length === 2
  ).length;

  console.log(`📊 Validation summary: ${validTeamsCount}/${teams.length} teams valid`);

  return {
    isValid: errors.length === 0,
    errors: errors,
    warnings: warnings,
    validTeamsCount: validTeamsCount,
    totalTeams: teams.length
  };
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
          status: 'scheduled',
          skill_combination_1: teams[i].skill_combination,
          skill_combination_2: teams[j].skill_combination		
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

