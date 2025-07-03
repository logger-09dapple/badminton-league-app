import React, { useState, useEffect, useContext } from 'react';
import { useLeague } from '../context/LeagueContext';
import TournamentBracket from '../components/TournamentBracket';
import Modal from '../components/Modal';
import { 
  Trophy, 
  Plus, 
  Calendar, 
  Users, 
  Play, 
  Settings,
  Award,
  Target,
  Zap
} from 'lucide-react';
import { supabase } from '../services/supabaseService';

const Tournaments = () => {
  const { teams, players, refreshData } = useLeague();
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [tournamentMatches, setTournamentMatches] = useState([]);
  const [allTournamentMatches, setAllTournamentMatches] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBracket, setShowBracket] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConfigureModal, setShowConfigureModal] = useState(false);
  const [configuringTournament, setConfiguringTournament] = useState(null);

  // Tournament form state
  const [tournamentForm, setTournamentForm] = useState({
    name: '',
    description: '',
    type: 'single_elimination',
    participantType: 'teams',
    maxParticipants: 8,
    entryFee: 0,
    prizeStructure: '',
    startDate: '',
    selectedParticipants: []
  });

  // Get available teams (filter out teams with players already in selected teams)
  const getAvailableTeams = () => {
    if (!teams || tournamentForm.participantType !== 'teams') return [];

    const selectedTeamIds = tournamentForm.selectedParticipants;
    const selectedTeamsPlayerIds = new Set();

    // Get all player IDs from selected teams
    selectedTeamIds.forEach(teamId => {
      const team = teams.find(t => t.id === teamId);
      if (team && team.team_players) {
        team.team_players.forEach(tp => {
          selectedTeamsPlayerIds.add(tp.player_id);
        });
      }
    });

    // Filter teams to exclude those with players already in selected teams
    return teams.filter(team => {
      if (selectedTeamIds.includes(team.id)) return true; // Already selected teams should show
      
      if (!team.team_players) return true; // Teams without players can be selected
      
      // Check if this team has any players that are already in selected teams
      const hasConflictingPlayers = team.team_players.some(tp => 
        selectedTeamsPlayerIds.has(tp.player_id)
      );
      
      return !hasConflictingPlayers;
    });
  };

  // Fetch tournaments - Fixed query
  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tournaments')
        .select(`
          *,
          tournament_participants (
            id,
            participant_id,
            participant_type
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Manually fetch participant details to avoid the relationship issue
      const tournamentsWithDetails = [];

      for (const tournament of (data || [])) {
        const participantsWithDetails = [];
        for (const tp of tournament.tournament_participants) {
          try {
            if (tp.participant_type === 'teams') {
              const { data: teamData, error: teamError } = await supabase
                .from('teams')
                .select('*, team_players(player_id, players(name))')
                .eq('id', tp.participant_id)
        .single();

              if (!teamError && teamData) {
                participantsWithDetails.push({ ...tp, teams: teamData });
              }
            } else if (tp.participant_type === 'players') {
              const { data: playerData, error: playerError } = await supabase
                .from('players')
                .select('*')
                .eq('id', tp.participant_id)
                .single();

              if (!playerError && playerData) {
                participantsWithDetails.push({ ...tp, players: playerData });
              }
            }
          } catch (participantError) {
            console.warn('Error fetching participant details:', participantError);
            // Skip this participant but continue with others
          }
        }

        tournamentsWithDetails.push({
          ...tournament,
          tournament_participants: participantsWithDetails
        });
      }

      setTournaments(tournamentsWithDetails);

      // Also fetch all tournament matches for progress calculation
      await fetchAllTournamentMatches();
    } catch (err) {
      console.error('Error fetching tournaments:', err);
      setError('Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  // Fetch all tournament matches for progress calculation
  const fetchAllTournamentMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          team1:teams!matches_team1_id_fkey(*),
          team2:teams!matches_team2_id_fkey(*)
        `)
        .not('tournament_id', 'is', null);

      if (error) throw error;
      setAllTournamentMatches(data || []);
    } catch (err) {
      console.error('Error fetching all tournament matches:', err);
    }
  };

  // Fetch tournament matches
  const fetchTournamentMatches = async (tournamentId) => {
    try {
      console.log('🔍 Fetching matches for tournament:', tournamentId);

      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          team1:teams!matches_team1_id_fkey(*),
          team2:teams!matches_team2_id_fkey(*)
        `)
        .eq('tournament_id', tournamentId)
        .order('round', { ascending: true });

      if (error) throw error;

      console.log('📊 Fetched tournament matches:', data);
      setTournamentMatches(data || []);
    } catch (err) {
      console.error('Error fetching tournament matches:', err);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      fetchTournamentMatches(selectedTournament.id);
    }
  }, [selectedTournament]);

  // Handle tournament creation
  const handleCreateTournament = async (e) => {
    e.preventDefault();
    try {
      // Create tournament
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .insert([{
          name: tournamentForm.name,
          description: tournamentForm.description,
          type: tournamentForm.type,
          participant_type: tournamentForm.participantType,
          max_participants: tournamentForm.maxParticipants,
          entry_fee: tournamentForm.entryFee,
          prize_structure: tournamentForm.prizeStructure,
          start_date: tournamentForm.startDate,
          status: 'setup'
        }])
        .select()
        .single();

      if (tournamentError) throw tournamentError;

      // Add participants
      if (tournamentForm.selectedParticipants.length > 0) {
        const participants = tournamentForm.selectedParticipants.map(participantId => ({
          tournament_id: tournament.id,
          participant_id: participantId,
          participant_type: tournamentForm.participantType
        }));

        const { error: participantError } = await supabase
          .from('tournament_participants')
          .insert(participants);

        if (participantError) throw participantError;
      }

      // Generate next round matches if enough participants
      if (tournamentForm.selectedParticipants.length >= 4) {
        await generateBracketMatches(tournament.id, tournamentForm.selectedParticipants, tournamentForm.participantType);

        // Update tournament status to active since it has matches
        await supabase
          .from('tournaments')
          .update({ status: 'active' })
          .eq('id', tournament.id);
      }

      setShowCreateModal(false);
      setTournamentForm({
        name: '',
        description: '',
        type: 'single_elimination',
        participantType: 'teams',
        maxParticipants: 8,
        entryFee: 0,
        prizeStructure: '',
        startDate: '',
        selectedParticipants: []
      });
      fetchTournaments();
    } catch (err) {
      console.error('Error creating tournament:', err);
      setError(`Failed to create tournament: ${err.message}`);
    }
  };

  // Generate bracket matches - Fixed to use proper status values and remove problematic UUID field
  const generateBracketMatches = async (tournamentId, participantIds, participantType) => {
    try {
      const matches = [];
      
      if (participantType === 'teams') {
        // Generate team matches
        for (let i = 0; i < participantIds.length; i += 2) {
          if (participantIds[i + 1]) {
            matches.push({
              tournament_id: tournamentId,
              team1_id: participantIds[i],
              team2_id: participantIds[i + 1],
              round: 1,
              status: 'scheduled',
              team1_score: null,
              team2_score: null,
              winner_team_id: null
            });
          }
        }
      } else {
        // For individual players, we'd need to create temporary teams or handle differently
        // This is a simplified version - you might want to implement player-vs-player matches
        console.log('Player tournaments not fully implemented yet');
      }

      if (matches.length > 0) {
        const { error } = await supabase
          .from('matches')
          .insert(matches);
        if (error) throw error;
      }
    } catch (err) {
      console.error('Error generating bracket matches:', err);
      throw err; // Re-throw to be caught by the calling function
    }
  };

  // Handle match update in tournament
  const handleTournamentMatchUpdate = async (matchId, updateData) => {
    try {
      console.log('🎯 Updating tournament match:', matchId, updateData);

      const { error } = await supabase
        .from('matches')
        .update(updateData)
        .eq('id', matchId);

      if (error) throw error;

      console.log('✅ Match updated successfully');

      // Refresh tournament matches
      if (selectedTournament) {
        await fetchTournamentMatches(selectedTournament.id);

        // Generate next round matches if this round is complete
        console.log('🚀 Attempting to generate next round matches...');
        await generateNextRoundMatches(selectedTournament.id);

        // Refresh all tournament matches for progress calculation
        await fetchAllTournamentMatches();
      }
    } catch (err) {
      console.error('❌ Error updating tournament match:', err);
    }
  };

  // Generate next round matches when current round is complete
  const generateNextRoundMatches = async (tournamentId) => {
    try {
      console.log('🔍 Checking for next round generation for tournament:', tournamentId);

      // Get all matches for this tournament
      const { data: allMatches, error } = await supabase
        .from('matches')
        .select(`
          *,
          team1:teams!matches_team1_id_fkey(*),
          team2:teams!matches_team2_id_fkey(*)
        `)
        .eq('tournament_id', tournamentId)
        .order('round', { ascending: true });

      if (error) throw error;

      console.log('📊 All tournament matches:', allMatches);

      // Group matches by round
      const matchesByRound = {};
      allMatches.forEach(match => {
        if (!matchesByRound[match.round]) {
          matchesByRound[match.round] = [];
        }
        matchesByRound[match.round].push(match);
      });

      console.log('📈 Matches by round:', matchesByRound);

      // Find the highest round with matches
      const rounds = Object.keys(matchesByRound).map(Number).sort((a, b) => b - a);
      const currentRound = rounds[0] || 1;

      console.log('🎯 Current round:', currentRound);

      // Check if current round is complete
      const currentRoundMatches = matchesByRound[currentRound] || [];
      const completedCurrentRound = currentRoundMatches.every(match => match.status === 'completed');

      console.log('✅ Current round matches:', currentRoundMatches.length);
      console.log('✅ Completed current round:', completedCurrentRound);
      console.log('✅ Match statuses:', currentRoundMatches.map(m => ({ id: m.id, status: m.status, winner: m.winner_team_id })));

      if (!completedCurrentRound || currentRoundMatches.length === 0) {
        console.log('⏸️ Current round not complete, skipping next round generation');
        return; // Current round not complete, don't generate next round
      }

      // Check if next round already exists
      const nextRound = currentRound + 1;
      if (matchesByRound[nextRound] && matchesByRound[nextRound].length > 0) {
        console.log('⏸️ Next round already exists, skipping generation');
        return; // Next round already exists
      }

      // Generate next round matches
      const nextRoundMatches = [];
      console.log('🔄 Generating next round matches...');

      for (let i = 0; i < currentRoundMatches.length; i += 2) {
        const match1 = currentRoundMatches[i];
        const match2 = currentRoundMatches[i + 1];

        console.log(`🏆 Pairing match ${i/2 + 1}:`);
        console.log(`   Match 1: ${match1?.team1?.name} vs ${match1?.team2?.name} (Winner: ${match1?.winner_team_id})`);
        console.log(`   Match 2: ${match2?.team1?.name} vs ${match2?.team2?.name} (Winner: ${match2?.winner_team_id})`);

        if (match1 && match2) {
          // Get winners from both matches
          const winner1Id = match1.winner_team_id;
          const winner2Id = match2.winner_team_id;

          if (winner1Id && winner2Id) {
            console.log(`✅ Adding next round match: Team ${winner1Id} vs Team ${winner2Id}`);
            nextRoundMatches.push({
              tournament_id: tournamentId,
              team1_id: winner1Id,
              team2_id: winner2Id,
              round: nextRound,
              status: 'scheduled',
              team1_score: null,
              team2_score: null,
              winner_team_id: null
            });
          } else {
            console.log(`❌ Missing winners: Match1 winner: ${winner1Id}, Match2 winner: ${winner2Id}`);
          }
        }
      }

      // Insert next round matches if any
      if (nextRoundMatches.length > 0) {
        console.log(`🚀 Inserting ${nextRoundMatches.length} matches for round ${nextRound}`);
        const { error: insertError } = await supabase
          .from('matches')
          .insert(nextRoundMatches);

        if (insertError) {
          console.error('❌ Error inserting next round matches:', insertError);
        } else {
          console.log(`✅ Successfully generated ${nextRoundMatches.length} matches for round ${nextRound}`);

          // Refresh the matches after generating new ones
          await fetchTournamentMatches(tournamentId);
        }
      } else {
        console.log('⚠️ No matches to generate for next round');
      }
    } catch (err) {
      console.error('❌ Error generating next round matches:', err);
    }
  };

  // Handle tournament configuration
  const handleConfigureTournament = (tournament) => {
    setConfiguringTournament(tournament);
    setShowConfigureModal(true);
  };

  // Handle tournament start
  const handleStartTournament = async (tournamentId) => {
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({ status: 'active' })
        .eq('id', tournamentId);

      if (error) throw error;
          setShowConfigureModal(false);
          setConfiguringTournament(null);
      fetchTournaments();
    } catch (err) {
      console.error('Error starting tournament:', err);
      setError('Failed to start tournament');
    }
  };

  // Handle adding participants to existing tournament
  const handleAddParticipants = async (tournamentId, newParticipantIds) => {
    try {
      const participants = newParticipantIds.map(participantId => ({
        tournament_id: tournamentId,
        participant_id: participantId,
        participant_type: configuringTournament.participant_type
      }));

      const { error } = await supabase
        .from('tournament_participants')
        .insert(participants);

      if (error) throw error;

      // Regenerate bracket if needed
      const totalParticipants = configuringTournament.tournament_participants.length + newParticipantIds.length;
      if (totalParticipants >= 4) {
        // Get all participant IDs
        const allParticipantIds = [
          ...configuringTournament.tournament_participants.map(p => p.participant_id),
          ...newParticipantIds
        ];

        // Clear existing matches first
        await supabase
          .from('matches')
          .delete()
          .eq('tournament_id', tournamentId);

        // Generate new bracket
        await generateBracketMatches(tournamentId, allParticipantIds, configuringTournament.participant_type);
      }

      fetchTournaments();
      setShowConfigureModal(false);
      setConfiguringTournament(null);
    } catch (err) {
      console.error('Error adding participants:', err);
      setError('Failed to add participants');
    }
  };

  // Handle tournament completion
  const handleTournamentComplete = async (tournamentId, champion) => {
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({
          status: 'completed',
          champion_id: champion.id,
          completed_at: new Date().toISOString()
        })
        .eq('id', tournamentId);

      if (error) throw error;

      fetchTournaments();
    } catch (err) {
      console.error('Error completing tournament:', err);
    }
  };

  // Get tournament participants
  const getTournamentParticipants = (tournament) => {
    if (!tournament.tournament_participants) return [];
    
    return tournament.tournament_participants.map(tp => {
      if (tp.participant_type === 'teams' && tp.teams) {
        return {
          ...tp.teams,
          type: 'team',
          elo_rating: tp.teams.team_elo || 1500
        };
      } else if (tp.participant_type === 'players' && tp.players) {
        return {
          ...tp.players,
          type: 'player',
          elo_rating: tp.players.elo_rating || 1500
        };
      }
      return null;
    }).filter(Boolean);
  };

  // Handle participant selection with conflict checking
  const handleParticipantSelection = (participantId, isChecked) => {
    if (isChecked) {
      setTournamentForm(prev => ({
        ...prev,
        selectedParticipants: [...prev.selectedParticipants, participantId]
      }));
    } else {
      setTournamentForm(prev => ({
        ...prev,
        selectedParticipants: prev.selectedParticipants.filter(id => id !== participantId)
      }));
    }
  };

  // Check if a team can be selected (no player conflicts)
  const canSelectTeam = (team) => {
    if (tournamentForm.selectedParticipants.includes(team.id)) return true;
    if (tournamentForm.selectedParticipants.length >= tournamentForm.maxParticipants) return false;
    
    const selectedTeamsPlayerIds = new Set();
    tournamentForm.selectedParticipants.forEach(teamId => {
      const selectedTeam = teams.find(t => t.id === teamId);
      if (selectedTeam && selectedTeam.team_players) {
        selectedTeam.team_players.forEach(tp => {
          selectedTeamsPlayerIds.add(tp.player_id);
        });
      }
    });

    if (!team.team_players) return true;
    
    return !team.team_players.some(tp => selectedTeamsPlayerIds.has(tp.player_id));
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner"></div>
        <p>Loading tournaments...</p>
      </div>
    );
  }

  if (showBracket && selectedTournament) {
    return (
      <div className="tournaments-page">
        <div className="page-header">
          <button 
            className="btn btn-secondary"
            onClick={() => setShowBracket(false)}
          >
            ← Back to Tournaments
          </button>
        </div>
        
        <TournamentBracket
          tournament={selectedTournament}
          participants={getTournamentParticipants(selectedTournament)}
          matches={tournamentMatches}
          onMatchUpdate={handleTournamentMatchUpdate}
          onTournamentComplete={handleTournamentComplete}
          onAdvanceRound={generateNextRoundMatches}
          onRefresh={() => {
            console.log('🔄 Manual refresh triggered');
            fetchTournamentMatches(selectedTournament.id);
            fetchAllTournamentMatches();
          }}
        />
      </div>
    );
  }
  return (
    <div className="tournaments-page">
      <div className="page-header">
        <div className="header-content">
          <div className="header-text">
            <h1>
              <Trophy size={28} />
              Tournaments
            </h1>
            <p>Create and manage knockout tournaments with automatic bracket generation</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={18} />
              Create Tournament
            </button>
          </div>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button 
            className="btn btn-secondary"
            onClick={() => setError(null)}
          >
            Dismiss
                </button>
                </div>
              )}

      <div className="tournaments-container">
        {tournaments.length === 0 ? (
          <div className="empty-state">
            <Trophy size={64} />
            <h2>No Tournaments Yet</h2>
            <p>Create your first tournament to get started with competitive play.</p>
            <button 
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={18} />
              Create Tournament
            </button>
          </div>
        ) : (
          <div className="tournaments-grid">
            {tournaments.map(tournament => {
              const participants = getTournamentParticipants(tournament);
              const participantCount = participants.length;

              // Fix: Get matches for this specific tournament from allTournamentMatches
              const tournamentSpecificMatches = allTournamentMatches.filter(m =>
                m.tournament_id === tournament.id
              );
              const completedMatches = tournamentSpecificMatches.filter(m =>
                m.status === 'completed'
              ).length;
              const totalMatches = tournamentSpecificMatches.length;
              const progress = totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0;

              return (
                <div key={tournament.id} className="tournament-card">
                  <div className="tournament-header">
                    <h3>{tournament.name}</h3>
                    <div className={`tournament-status ${tournament.status}`}>
                      {tournament.status === 'setup' && <Settings size={14} />}
                      {tournament.status === 'active' && <Play size={14} />}
                      {tournament.status === 'completed' && <Award size={14} />}
                      <span>{tournament.status}</span>
                    </div>
                  </div>

                  <div className="tournament-info">
                    <div className="info-item">
                      <Users size={16} />
                      <span>{participantCount}/{tournament.max_participants} participants</span>
                    </div>
                    
                    {tournament.start_date && (
                      <div className="info-item">
                        <Calendar size={16} />
                        <span>{new Date(tournament.start_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    
                    <div className="info-item">
                      <Target size={16} />
                      <span>{tournament.type.replace('_', ' ')}</span>
                    </div>
                  </div>

                  {tournament.description && (
                    <p className="tournament-description">{tournament.description}</p>
                  )}

                  {totalMatches > 0 && (
                    <div className="tournament-progress">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <span className="progress-text">
                        {Math.round(progress)}% Complete ({completedMatches}/{totalMatches} matches)
                      </span>
                    </div>
                  )}

                  <div className="tournament-actions">
                    <button 
                      className="btn btn-primary"
                      onClick={() => {
                        setSelectedTournament(tournament);
                        setShowBracket(true);
                      }}
                    >
                      <Trophy size={16} />
                      View Bracket
                    </button>
                    
                    {tournament.status === 'setup' && (
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleConfigureTournament(tournament)}
                      >
                        <Settings size={16} />
                        Configure
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Tournament Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Tournament"
      >
        <form onSubmit={handleCreateTournament} className="tournament-form">
          <div className="form-group">
            <label htmlFor="name">Tournament Name</label>
            <input
              type="text"
              id="name"
              value={tournamentForm.name}
              onChange={(e) => setTournamentForm(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={tournamentForm.description}
              onChange={(e) => setTournamentForm(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="type">Tournament Type</label>
              <select
                id="type"
                value={tournamentForm.type}
                onChange={(e) => setTournamentForm(prev => ({ ...prev, type: e.target.value }))}
              >
                <option value="single_elimination">Single Elimination</option>
                <option value="double_elimination">Double Elimination</option>
                <option value="round_robin">Round Robin</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="participantType">Participants</label>
              <select
                id="participantType"
                value={tournamentForm.participantType}
                onChange={(e) => setTournamentForm(prev => ({
                  ...prev,
                  participantType: e.target.value,
                  selectedParticipants: [] // Reset selection when changing type
                }))}
              >
                <option value="teams">Teams</option>
                <option value="players">Individual Players</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="maxParticipants">Max Participants</label>
              <select
                id="maxParticipants"
                value={tournamentForm.maxParticipants}
                onChange={(e) => setTournamentForm(prev => ({ ...prev, maxParticipants: parseInt(e.target.value) }))}
              >
                <option value={4}>4</option>
                <option value={8}>8</option>
                <option value={16}>16</option>
                <option value={32}>32</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="startDate">Start Date</label>
              <input
                type="date"
                id="startDate"
                value={tournamentForm.startDate}
                onChange={(e) => setTournamentForm(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Select Participants</label>
            <div className="participant-selection">
              {(tournamentForm.participantType === 'teams' ? teams : players)?.map(participant => {
                const canSelect = tournamentForm.participantType === 'teams' 
                  ? canSelectTeam(participant)
                  : tournamentForm.selectedParticipants.length < tournamentForm.maxParticipants || tournamentForm.selectedParticipants.includes(participant.id);
                
                return (
                  <label key={participant.id} className={`checkbox-item ${!canSelect ? 'disabled' : ''}`}>
                    <input
                      type="checkbox"
                      checked={tournamentForm.selectedParticipants.includes(participant.id)}
                      onChange={(e) => handleParticipantSelection(participant.id, e.target.checked)}
                      disabled={!canSelect}
                    />
                    <span>{participant.name}</span>
                    {tournamentForm.participantType === 'teams' && participant.team_players && (
                      <small>({participant.team_players.map(tp => tp.players?.name).join(' & ')})</small>
                    )}
                    {!canSelect && tournamentForm.participantType === 'teams' && !tournamentForm.selectedParticipants.includes(participant.id) && (
                      <small className="conflict-warning"> - Player conflict</small>
                    )}
                  </label>
                );
              })}
            </div>
            <small>Selected: {tournamentForm.selectedParticipants.length}/{tournamentForm.maxParticipants}</small>
            {tournamentForm.participantType === 'teams' && (
              <small className="help-text">
                Teams with overlapping players cannot both participate in the same tournament.
              </small>
            )}
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!tournamentForm.name || tournamentForm.selectedParticipants.length < 4}
            >
              Create Tournament
            </button>
          </div>
        </form>
      </Modal>

      {/* Configure Tournament Modal */}
      <Modal
        isOpen={showConfigureModal}
        onClose={() => {
          setShowConfigureModal(false);
          setConfiguringTournament(null);
        }}
        title={`Configure ${configuringTournament?.name || 'Tournament'}`}
      >
        {configuringTournament && (
          <div className="tournament-config">
            <div className="config-section">
              <h4>Tournament Details</h4>
              <div className="config-info">
                <div className="info-row">
                  <span className="label">Name:</span>
                  <span className="value">{configuringTournament.name}</span>
                </div>
                <div className="info-row">
                  <span className="label">Type:</span>
                  <span className="value">{configuringTournament.type.replace('_', ' ')}</span>
                </div>
                <div className="info-row">
                  <span className="label">Participants:</span>
                  <span className="value">
                    {getTournamentParticipants(configuringTournament).length}/{configuringTournament.max_participants}
                  </span>
                </div>
                <div className="info-row">
                  <span className="label">Status:</span>
                  <span className={`value status-${configuringTournament.status}`}>
                    {configuringTournament.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="config-section">
              <h4>Current Participants</h4>
              <div className="participants-list">
                {getTournamentParticipants(configuringTournament).map(participant => (
                  <div key={participant.id} className="participant-item">
                    <span className="participant-name">{participant.name}</span>
                    {participant.type === 'team' && participant.team_players && (
                      <small className="participant-details">
                        ({participant.team_players.map(tp => tp.players?.name).join(' & ')})
                      </small>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="config-actions">
              {getTournamentParticipants(configuringTournament).length >= 4 ? (
                <button
                  className="btn btn-primary"
                  onClick={() => handleStartTournament(configuringTournament.id)}
                >
                  <Play size={16} />
                  Start Tournament
                </button>
              ) : (
                <div className="config-warning">
                  <p>⚠️ Need at least 4 participants to start tournament</p>
                  <p>Current: {getTournamentParticipants(configuringTournament).length}/4</p>
                </div>
              )}

              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowConfigureModal(false);
                  setConfiguringTournament(null);
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Tournaments;