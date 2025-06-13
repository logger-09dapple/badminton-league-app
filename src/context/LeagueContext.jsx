import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { supabaseService } from '../services/supabaseService';
import { roundRobinScheduler } from '../utils/schedulingUtils';

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
  DELETE_ALL_MATCHES: 'DELETE_ALL_MATCHES', // New action type
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

    // NEW: Delete all matches action
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
        supabaseService.getPlayers(), // Already sorted by points in the service
        supabaseService.getTeams(), // Already sorted by points in the service
        supabaseService.getMatchesWithPlayers() // Enhanced method to get full team player details
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
      throw error; // Re-throw so component can handle it
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
      throw error; // Re-throw so component can handle it
    } finally {
      dispatch({ type: ACTION_TYPES.SET_LOADING, payload: false });
    }
  };

  // Match actions
  const addMatch = async (matchData) => {
    try {
      const newMatch = await supabaseService.addMatch(matchData);
      dispatch({ type: ACTION_TYPES.ADD_MATCH, payload: newMatch });
    } catch (error) {
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
    }
  };

  // ENHANCED: Update match with auto-completion logic
  const updateMatch = async (id, matchData) => {
    try {
      const updatedMatch = await supabaseService.updateMatch(id, matchData);
      dispatch({ type: ACTION_TYPES.UPDATE_MATCH, payload: updatedMatch });
      
      // If this was a score update that completed a match, refresh all data
      // to ensure statistics are up to date
      if (
        matchData.team1Score !== undefined && 
        matchData.team2Score !== undefined && 
        updatedMatch.status === 'completed'
      ) {
        await loadInitialData(); // Reload all data to get updated stats
      }
    } catch (error) {
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
    }
  };

  // NEW: Delete all matches
  const deleteAllMatches = async () => {
    try {
      dispatch({ type: ACTION_TYPES.SET_LOADING, payload: true });
      await supabaseService.deleteAllMatches();
      dispatch({ type: ACTION_TYPES.DELETE_ALL_MATCHES });
      
      // Reload player and team data to reset statistics
      const [playersData, teamsData] = await Promise.all([
        supabaseService.getPlayers(),
        supabaseService.getTeams()
      ]);
      
      dispatch({ type: ACTION_TYPES.SET_PLAYERS, payload: playersData });
      dispatch({ type: ACTION_TYPES.SET_TEAMS, payload: teamsData });
    } catch (error) {
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
      throw error; // Re-throw so component can handle it
    } finally {
      dispatch({ type: ACTION_TYPES.SET_LOADING, payload: false });
    }
  };

// FIXED: Schedule generation that actually saves matches to database
const generateRoundRobinSchedule = async () => {
  try {
    if (state.teams.length < 2) {
      throw new Error('At least 2 teams are required for scheduling');
    }

    dispatch({ type: ACTION_TYPES.SET_LOADING, payload: true });
    
    console.log('Starting schedule generation with teams:', state.teams);
    
    // Generate the schedule using the fixed algorithm
    const schedule = roundRobinScheduler.generateSchedule(state.teams);
    
    if (!schedule || schedule.length === 0) {
      throw new Error('No schedule was generated from the teams');
    }
    
    console.log('Generated schedule:', schedule);
    
    // Convert schedule to database-compatible matches  
    const matchesToAdd = roundRobinScheduler.convertScheduleToMatches(schedule);
    
    console.log('Matches to add:', matchesToAdd);
    
    if (matchesToAdd.length > 0) {
      // Save all matches to database
      const savedMatches = await supabaseService.addMatches(matchesToAdd);
      
      console.log('Saved matches:', savedMatches);
      
      // Update state with new matches
      dispatch({ type: ACTION_TYPES.ADD_MATCHES, payload: savedMatches });
      
      // Also store the schedule for reference
      dispatch({ type: ACTION_TYPES.GENERATE_SCHEDULE, payload: schedule });
      
      return schedule;
    } else {
      throw new Error('No matches were generated from the schedule');
    }
    
  } catch (error) {
    console.error('Schedule generation error:', error);
    dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
    throw error; // Re-throw so component can handle it
  } finally {
    dispatch({ type: ACTION_TYPES.SET_LOADING, payload: false });
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
    deleteAllMatches, // Export the new function
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

