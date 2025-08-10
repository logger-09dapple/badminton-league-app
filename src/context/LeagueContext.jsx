import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { supabaseService } from '../services/supabaseService';
import { matchService } from '../services/matchService';
import { deleteMatchWithStats } from '../services/matchDeletion';
import { createMatchWithScores } from '../services/matchCreation';
import { roundRobinScheduler } from '../utils/schedulingUtils';
import { badmintonEloSystem } from '../utils/BadmintonEloSystem';
import { unifiedEloService } from '../services/unifiedEloServiceComplete';
import { eloSystemManager } from '../services/eloSystemManager';

const LeagueContext = createContext();

// Action types
const ACTION_TYPES = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_PLAYERS: 'SET_PLAYERS',
  ADD_PLAYER: 'ADD_PLAYER',
  UPDATE_PLAYER: 'UPDATE_PLAYER',
  DELETE_PLAYER: 'DELETE_PLAYER',
  SET_TEAMS: 'SET_TEAMS',
  ADD_TEAM: 'ADD_TEAM',
  UPDATE_TEAM: 'UPDATE_TEAM',
  DELETE_TEAM: 'DELETE_TEAM',
  DELETE_ALL_TEAMS: 'DELETE_ALL_TEAMS',
  SET_MATCHES: 'SET_MATCHES',
  ADD_MATCH: 'ADD_MATCH',
  ADD_MATCHES: 'ADD_MATCHES',
  UPDATE_MATCH: 'UPDATE_MATCH',
  DELETE_MATCH: 'DELETE_MATCH',
  DELETE_ALL_MATCHES: 'DELETE_ALL_MATCHES',
  SET_AVAILABLE_PLAYERS: 'SET_AVAILABLE_PLAYERS',
  GENERATE_SCHEDULE: 'GENERATE_SCHEDULE',
  UPDATE_MATCH_SCORE: 'UPDATE_MATCH_SCORE'
};

// Initial state
const initialState = {
  loading: false,
  error: null,
  players: [],
  teams: [],
  matches: [],
  availablePlayers: [],
  schedule: [],
  statistics: {
    totalPlayers: 0,
    totalTeams: 0,
    totalMatches: 0,
    completedMatches: 0
  }
};

// Reducer function
function leagueReducer(state, action) {
  switch (action.type) {
    case ACTION_TYPES.SET_LOADING:
      return { ...state, loading: action.payload };

    case ACTION_TYPES.SET_ERROR:
      return { ...state, error: action.payload, loading: false };

    case ACTION_TYPES.SET_PLAYERS:
      return { 
        ...state, 
        players: action.payload,
        statistics: {
          ...state.statistics,
          totalPlayers: action.payload.length
        }
      };

    case ACTION_TYPES.ADD_PLAYER:
      const newPlayers = [...state.players, action.payload];
      return { 
        ...state, 
        players: newPlayers,
        statistics: {
          ...state.statistics,
          totalPlayers: newPlayers.length
        }
      };

    case ACTION_TYPES.UPDATE_PLAYER:
      return {
        ...state,
        players: state.players.map(player =>
          player.id === action.payload.id ? action.payload : player
        )
      };

    case ACTION_TYPES.DELETE_PLAYER:
      const filteredPlayers = state.players.filter(player => player.id !== action.payload);
      return {
        ...state,
        players: filteredPlayers,
        statistics: {
          ...state.statistics,
          totalPlayers: filteredPlayers.length
        }
      };

    case ACTION_TYPES.SET_TEAMS:
      return { 
        ...state, 
        teams: action.payload,
        statistics: {
          ...state.statistics,
          totalTeams: action.payload.length
        }
      };

    case ACTION_TYPES.ADD_TEAM:
      const newTeams = [...state.teams, action.payload];
      return { 
        ...state, 
        teams: newTeams,
        statistics: {
          ...state.statistics,
          totalTeams: newTeams.length
        }
      };

    case ACTION_TYPES.UPDATE_TEAM:
      return {
        ...state,
        teams: state.teams.map(team =>
          team.id === action.payload.id ? action.payload : team
        )
      };

    case ACTION_TYPES.DELETE_TEAM:
      const filteredTeams = state.teams.filter(team => team.id !== action.payload);
      return {
        ...state,
        teams: filteredTeams,
        statistics: {
          ...state.statistics,
          totalTeams: filteredTeams.length
        }
      };

    case ACTION_TYPES.DELETE_ALL_TEAMS:
      return {
        ...state,
        teams: [],
        statistics: {
          ...state.statistics,
          totalTeams: 0
        }
      };

    case ACTION_TYPES.SET_MATCHES:
      const completedMatches = action.payload.filter(match => match.status === 'completed').length;
      return { 
        ...state, 
        matches: action.payload,
        statistics: {
          ...state.statistics,
          totalMatches: action.payload.length,
          completedMatches
        }
      };

    case ACTION_TYPES.ADD_MATCH:
      const newMatches = [...state.matches, action.payload];
      return { 
        ...state, 
        matches: newMatches,
        statistics: {
          ...state.statistics,
          totalMatches: newMatches.length
        }
      };

    case ACTION_TYPES.ADD_MATCHES:
      const allMatches = [...state.matches, ...action.payload];
      return { 
        ...state, 
        matches: allMatches,
        statistics: {
          ...state.statistics,
          totalMatches: allMatches.length
        }
      };

    case ACTION_TYPES.UPDATE_MATCH:
      const updatedMatches = state.matches.map(match =>
        match.id === action.payload.id ? action.payload : match
      );
      const updatedCompletedMatches = updatedMatches.filter(match => match.status === 'completed').length;
      return {
        ...state,
        matches: updatedMatches,
        statistics: {
          ...state.statistics,
          completedMatches: updatedCompletedMatches
        }
      };

    case ACTION_TYPES.DELETE_MATCH:
      const filteredMatches = state.matches.filter(match => match.id !== action.payload);
      const newCompletedMatches = filteredMatches.filter(match => match.status === 'completed').length;
      return {
        ...state,
        matches: filteredMatches,
        statistics: {
          ...state.statistics,
          totalMatches: filteredMatches.length,
          completedMatches: newCompletedMatches
        }
      };

    case ACTION_TYPES.DELETE_ALL_MATCHES:
      return {
        ...state,
        matches: [],
        statistics: {
          ...state.statistics,
          totalMatches: 0,
          completedMatches: 0
        }
      };

    case ACTION_TYPES.SET_AVAILABLE_PLAYERS:
      return { ...state, availablePlayers: action.payload };

    case ACTION_TYPES.GENERATE_SCHEDULE:
      return { ...state, schedule: action.payload };

    default:
      return state;
  }
}

// Context Provider Component
export function LeagueProvider({ children }) {
  const [state, dispatch] = useReducer(leagueReducer, initialState);

  // Initialize data on mount
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      dispatch({ type: ACTION_TYPES.SET_LOADING, payload: true });
      const [playersData, teamsData, matchesData] = await Promise.all([
        supabaseService.getPlayers(),
        supabaseService.getTeams(),
        supabaseService.getMatchesWithPlayers()
      ]);

      dispatch({ type: ACTION_TYPES.SET_PLAYERS, payload: playersData });
      dispatch({ type: ACTION_TYPES.SET_TEAMS, payload: teamsData });
      dispatch({ type: ACTION_TYPES.SET_MATCHES, payload: matchesData });
    } catch (error) {
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
    } finally {
      dispatch({ type: ACTION_TYPES.SET_LOADING, payload: false });
    }
  };

  // Player actions
  const addPlayer = async (playerData) => {
    try {
      dispatch({ type: ACTION_TYPES.SET_LOADING, payload: true });
      const newPlayer = await supabaseService.addPlayer(playerData);
      dispatch({ type: ACTION_TYPES.ADD_PLAYER, payload: newPlayer });
    } catch (error) {
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
    } finally {
      dispatch({ type: ACTION_TYPES.SET_LOADING, payload: false });
    }
  };

  const updatePlayer = async (id, playerData) => {
    try {
      const updatedPlayer = await supabaseService.updatePlayer(id, playerData);
      dispatch({ type: ACTION_TYPES.UPDATE_PLAYER, payload: updatedPlayer });
    } catch (error) {
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
    }
  };

  const deletePlayer = async (id) => {
    try {
      await supabaseService.deletePlayer(id);
      dispatch({ type: ACTION_TYPES.DELETE_PLAYER, payload: id });
    } catch (error) {
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
    }
  };

  // Team actions
  const addTeam = async (teamData) => {
    try {
      dispatch({ type: ACTION_TYPES.SET_LOADING, payload: true });
      const newTeam = await supabaseService.addTeam(teamData);
      dispatch({ type: ACTION_TYPES.ADD_TEAM, payload: newTeam });
    } catch (error) {
      console.error('Error in addTeam:', error);
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
      throw error;
    } finally {
      dispatch({ type: ACTION_TYPES.SET_LOADING, payload: false });
    }
  };

  const updateTeam = async (id, teamData) => {
    try {
      const updatedTeam = await supabaseService.updateTeam(id, teamData);
      dispatch({ type: ACTION_TYPES.UPDATE_TEAM, payload: updatedTeam });
    } catch (error) {
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
    }
  };

  const deleteTeam = async (id) => {
    try {
      await supabaseService.deleteTeam(id);
      dispatch({ type: ACTION_TYPES.DELETE_TEAM, payload: id });
    } catch (error) {
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
    }
  };

  // Delete all teams
  const deleteAllTeams = async () => {
    try {
      dispatch({ type: ACTION_TYPES.SET_LOADING, payload: true });
      await supabaseService.deleteAllTeams();
      dispatch({ type: ACTION_TYPES.DELETE_ALL_TEAMS });
    } catch (error) {
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
      throw error;
    } finally {
      dispatch({ type: ACTION_TYPES.SET_LOADING, payload: false });
    }
  };

  // Match actions
  const addMatch = async (matchData) => {
    try {
      dispatch({ type: ACTION_TYPES.SET_LOADING, payload: true });

      const includesScores = matchData.team1Score !== undefined && matchData.team2Score !== undefined;

      if (!includesScores) {
        const newMatch = await supabaseService.addMatch(matchData);
        dispatch({ type: ACTION_TYPES.ADD_MATCH, payload: newMatch });
        return newMatch;
      } else {
        console.log('🎯 Creating match with scores using Unified ELO Service');

        const basicMatchData = {
          team1Id: matchData.team1Id,
          team2Id: matchData.team2Id,
          scheduledDate: matchData.scheduledDate,
          status: 'scheduled'
  };

        const newMatch = await supabaseService.addMatch(basicMatchData);

        const result = await unifiedEloService.processMatchEloUpdate(
          newMatch.id,
          {
            team1Score: matchData.team1Score,
            team2Score: matchData.team2Score
          },
          false
        );

        dispatch({ type: ACTION_TYPES.ADD_MATCH, payload: result.match });

          await loadInitialData();

        return result.match;
      }
    } catch (error) {
      console.error('Error creating match:', error);
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
      throw error;
    } finally {
      dispatch({ type: ACTION_TYPES.SET_LOADING, payload: false });
    }
  };

  const updateMatch = async (matchId, matchData) => {
    try {
      dispatch({ type: ACTION_TYPES.SET_LOADING, payload: true });
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: null });

      const currentMatch = state.matches.find(match => match.id === matchId);
      const wasAlreadyCompleted = currentMatch?.status === 'completed';

      if (matchData.team1Score !== undefined && matchData.team2Score !== undefined) {
        console.log('🎯 Using Unified ELO Service for match update');

        const result = await unifiedEloService.processMatchEloUpdate(
          matchId,
          matchData,
          wasAlreadyCompleted
  );

        dispatch({ type: ACTION_TYPES.UPDATE_MATCH, payload: result.match });

        await loadInitialData();

        return result;
      } else {
        const enhancedMatchData = {
          ...matchData,
          status: matchData.status || currentMatch?.status || 'scheduled'
        };

        const updatedMatch = await supabaseService.updateMatch(matchId, enhancedMatchData);
        dispatch({ type: ACTION_TYPES.UPDATE_MATCH, payload: updatedMatch });
        return { match: updatedMatch, playerEloUpdates: [], teamEloUpdates: [] };
}

    } catch (error) {
      console.error('Error updating match:', error);
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
      throw error;
    } finally {
      dispatch({ type: ACTION_TYPES.SET_LOADING, payload: false });
    }
  };

  const deleteMatch = async (matchId) => {
    try {
      dispatch({ type: ACTION_TYPES.SET_LOADING, payload: true });

      const match = state.matches.find(m => m.id === matchId);
      if (!match) {
        throw new Error('Match not found');
      }

      await deleteMatchWithStats(matchId, match.status === 'completed');

      dispatch({ type: ACTION_TYPES.DELETE_MATCH, payload: matchId });

      if (match.status === 'completed') {
          await loadInitialData();
      }

    } catch (error) {
      console.error('Error deleting match:', error);
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
      throw error;
    } finally {
      dispatch({ type: ACTION_TYPES.SET_LOADING, payload: false });
    }
  };

  // Delete all matches
  const deleteAllMatches = async () => {
    try {
      dispatch({ type: ACTION_TYPES.SET_LOADING, payload: true });
      await supabaseService.deleteAllMatches();
      dispatch({ type: ACTION_TYPES.DELETE_ALL_MATCHES });

      const [playersData, teamsData] = await Promise.all([
        supabaseService.getPlayers(),
        supabaseService.getTeams()
      ]);
      
      dispatch({ type: ACTION_TYPES.SET_PLAYERS, payload: playersData });
      dispatch({ type: ACTION_TYPES.SET_TEAMS, payload: teamsData });
    } catch (error) {
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
      throw error;
    } finally {
      dispatch({ type: ACTION_TYPES.SET_LOADING, payload: false });
    }
  };

  const generateRoundRobinSchedule = async () => {
    try {
      console.log('🚀 Starting match generation process...');

      if (state.teams.length < 2) {
        throw new Error('At least 2 teams are required for scheduling');
      }

      dispatch({ type: ACTION_TYPES.SET_LOADING, payload: true });

      console.log('🔍 Pre-validation check...');
      const validTeams = state.teams.filter(team =>
        team.players && Array.isArray(team.players) && team.players.length === 2
      );

      const invalidTeams = state.teams.filter(team =>
        !team.players || !Array.isArray(team.players) || team.players.length !== 2
      );

      if (invalidTeams.length > 0) {
        console.error('❌ Invalid teams detected:', invalidTeams.map(t => ({
          name: t.name,
          playersType: typeof t.players,
          playersLength: Array.isArray(t.players) ? t.players.length : 'N/A'
        })));

        throw new Error(`Found ${invalidTeams.length} invalid teams without proper player data. Please check: ${invalidTeams.map(t => t.name).join(', ')}`);
      }

      console.log(`✅ Pre-validation passed: ${validTeams.length} valid teams`);

      console.log('📊 Teams for scheduling:', validTeams.map(team => ({
        id: team.id,
        name: team.name,
        skillCombination: team.skill_combination,
        playerCount: team.players?.length || 0,
        players: team.players?.map(p => ({ id: p.id, name: p.name, skill: p.skill_level })) || []
      })));

      const schedule = roundRobinScheduler.generateSchedule(validTeams);

      if (!schedule || schedule.length === 0) {
        throw new Error('No valid matches could be generated. Please check team compositions and skill combinations');
      }

      console.log('✅ Generated schedule:', schedule);

      const matchesToAdd = roundRobinScheduler.convertScheduleToMatches(schedule);

      if (matchesToAdd.length > 0) {
        console.log('💾 Saving matches to database:', matchesToAdd.length);

        const savedMatches = await supabaseService.addMatches(matchesToAdd);

        console.log('🎉 Successfully saved matches:', savedMatches.length);

        dispatch({ type: ACTION_TYPES.ADD_MATCHES, payload: savedMatches });

        dispatch({ type: ACTION_TYPES.GENERATE_SCHEDULE, payload: schedule });

        return schedule;
      } else {
        throw new Error('No matches were generated from the schedule');
      }

    } catch (error) {
      console.error('💥 Schedule generation error:', error);
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
      throw error;
    } finally {
      dispatch({ type: ACTION_TYPES.SET_LOADING, payload: false });
    }
  };

  const generateAutomaticTeams = async (players) => {
    try {
      dispatch({ type: ACTION_TYPES.SET_LOADING, payload: true });

      console.log('🤖 Starting automatic team generation with players:', players);

      if (!players || players.length < 4) {
        throw new Error('At least 4 players are required to generate teams (2 teams minimum)');
      }

      const playersWithGender = players.filter(p => p.gender && p.skill_level);
      if (playersWithGender.length < players.length) {
        throw new Error('All players must have both gender and skill level assigned');
      }

      const generatedTeams = roundRobinScheduler.generateSkillBasedTeams(playersWithGender);

      if (generatedTeams.length === 0) {
        throw new Error('No teams could be generated. Check player skill distributions and gender balance.');
      }

      console.log(`🎯 Generated ${generatedTeams.length} teams:`, generatedTeams);

      let successCount = 0;
      let errorCount = 0;

      for (const team of generatedTeams) {
        try {
          await addTeam({
            name: team.name,
            skillCombination: team.skill_combination,
            teamType: team.team_type,
            playerIds: team.playerIds
          });
          successCount++;
        } catch (teamError) {
          console.error('❌ Error adding team:', team.name, teamError);
          errorCount++;
        }
      }

      const message = `Team generation completed! ✅ ${successCount} teams created successfully` +
                    (errorCount > 0 ? `, ❌ ${errorCount} teams failed` : '');

      console.log(`\n🏆 TEAM GENERATION SUMMARY:`);
      console.log(`   ✅ Successful: ${successCount}`);
      console.log(`   ❌ Failed: ${errorCount}`);
      console.log(`   📊 Success rate: ${((successCount / generatedTeams.length) * 100).toFixed(1)}%`);

      return { success: true, message, teamsCreated: successCount };

    } catch (error) {
      console.error('❌ Team generation error:', error);
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
      throw error;
    } finally {
      dispatch({ type: ACTION_TYPES.SET_LOADING, payload: false });
    }
  };

  const updateMatchWithEloProcessing = async (matchId, matchData) => {
    try {
      dispatch({ type: ACTION_TYPES.SET_LOADING, payload: true });

      const currentMatch = state.matches.find(m => m.id === matchId);
      if (!currentMatch) {
        throw new Error('Match not found');
      }

      if (matchData.team1Score !== undefined && matchData.team2Score !== undefined) {
        const team1Players = currentMatch.team1?.team_players?.map(tp => ({
          ...tp.players,
          elo_rating: tp.players.elo_rating || 1500,
          elo_games_played: tp.players.elo_games_played || 0
        })) || [];

        const team2Players = currentMatch.team2?.team_players?.map(tp => ({
          ...tp.players,
          elo_rating: tp.players.elo_rating || 1500,
          elo_games_played: tp.players.elo_games_played || 0
        })) || [];

        if (team1Players.length === 2 && team2Players.length === 2) {
          // Calculate ELO updates using the selected system
          const eloUpdates = eloSystemManager.processMatch(
            team1Players,
            team2Players,
            matchData.team1Score,
            matchData.team2Score,
            currentMatch.team1,
            currentMatch.team2
          );

          const enhancedEloUpdates = eloUpdates.map(update => ({
            ...update,
            oldPeakRating: team1Players.concat(team2Players)
              .find(p => p.id === update.playerId)?.peak_elo_rating || update.oldRating,
            oldGamesPlayed: team1Players.concat(team2Players)
              .find(p => p.id === update.playerId)?.elo_games_played || 0
          }));

          const updatedMatch = await supabaseService.updateMatchWithElo(
            matchId,
            matchData,
            enhancedEloUpdates
          );

          dispatch({ type: ACTION_TYPES.UPDATE_MATCH, payload: updatedMatch });

          await loadInitialData();

          return {
            match: updatedMatch,
            eloUpdates: enhancedEloUpdates
          };
        } else {
          console.warn('Incomplete player data for ELO calculation, using regular update');
          const updatedMatch = await supabaseService.updateMatch(matchId, matchData);
          dispatch({ type: ACTION_TYPES.UPDATE_MATCH, payload: updatedMatch });
          return { match: updatedMatch, eloUpdates: [] };
        }
      } else {
        const updatedMatch = await supabaseService.updateMatch(matchId, matchData);
        dispatch({ type: ACTION_TYPES.UPDATE_MATCH, payload: updatedMatch });
        return { match: updatedMatch, eloUpdates: [] };
      }

    } catch (error) {
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
      throw error;
    } finally {
      dispatch({ type: ACTION_TYPES.SET_LOADING, payload: false});
    }
};

  const value = {
    ...state,
    addPlayer,
    updatePlayer,
    deletePlayer,
    addTeam,
    updateTeam,
    deleteTeam,
    deleteAllTeams,
    addMatch,
    updateMatch,
    deleteMatch,
    deleteAllMatches,
    updateMatchWithEloProcessing,
    generateRoundRobinSchedule,
    loadInitialData
  };

  return (
    <LeagueContext.Provider value={value}>
      {children}
    </LeagueContext.Provider>
  );
}

// Custom hook to use the context
export function useLeague() {
  const context = useContext(LeagueContext);
  if (!context) {
    throw new Error('useLeague must be used within a LeagueProvider');
  }
  return context;
}
