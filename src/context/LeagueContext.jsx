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
 DELETE_ALL_TEAMS: 'DELETE_ALL_TEAMS',  // New action type
 SET_MATCHES: 'SET_MATCHES',
 ADD_MATCH: 'ADD_MATCH',
 ADD_MATCHES: 'ADD_MATCHES',  // New action type for bulk matches
 UPDATE_MATCH: 'UPDATE_MATCH',
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

 // NEW: Delete all teams action
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

 // NEW: Add multiple matches action
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
 supabaseService.getMatches()
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

 // NEW: Delete all teams
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

 const updateMatch = async (id, matchData) => {
 try {
 const updatedMatch = await supabaseService.updateMatch(id, matchData);
 dispatch({ type: ACTION_TYPES.UPDATE_MATCH, payload: updatedMatch });
 } catch (error) {
 dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
 }
 };

 // FIXED: Schedule generation that actually saves matches to database
 const generateRoundRobinSchedule = async () => {
 try {
 if (state.teams.length < 2) {
 throw new Error('At least 2 teams are required for scheduling');
 }

 dispatch({ type: ACTION_TYPES.SET_LOADING, payload: true });
 
 // Generate the schedule
 const schedule = roundRobinScheduler.generateSchedule(state.teams);
 
 // Convert schedule to database-compatible matches
 const matchesToAdd = roundRobinScheduler.convertScheduleToMatches(schedule);
 
 if (matchesToAdd.length > 0) {
 // Save all matches to database
 const savedMatches = await supabaseService.addMatches(matchesToAdd);
 
 // Update state with new matches
 dispatch({ type: ACTION_TYPES.ADD_MATCHES, payload: savedMatches });
 
 // Also store the schedule for reference
 dispatch({ type: ACTION_TYPES.GENERATE_SCHEDULE, payload: schedule });
 
 return schedule;
 } else {
 throw new Error('No matches were generated from the schedule');
 }
 
 } catch (error) {
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
 deleteAllTeams,  // Export the new function
 addMatch,
 updateMatch,
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

