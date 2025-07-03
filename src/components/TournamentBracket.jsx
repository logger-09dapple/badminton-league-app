import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, Award, Medal, Users, Calendar, Play, ChevronRight, Target, Zap } from 'lucide-react';
import '../styles/TournamentBracket.css';

const TournamentBracket = ({
  tournament,
  participants,
  matches,
  onMatchUpdate,
  onAdvanceRound,
  onTournamentComplete,
  onRefresh
}) => {
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [bracketsData, setBracketsData] = useState([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [scoreInputs, setScoreInputs] = useState({ team1: '', team2: '' });

  useEffect(() => {
    console.log('selectedMatch changed:', selectedMatch);
  }, [selectedMatch]);

  useEffect(() => {
    console.log('scoreInputs changed:', scoreInputs);
  }, [scoreInputs]);

  // Calculate bracket structure with ELO-based seeding
  const bracketStructure = useMemo(() => {
    if (!participants || participants.length === 0) return { participants: [], totalRounds: 0, totalSlots: 0 };
    
    // Sort participants by ELO rating for seeding
    const sortedParticipants = [...participants].sort((a, b) => {
      const aElo = a.elo_rating || a.avg_elo || 1500;
      const bElo = b.elo_rating || b.avg_elo || 1500;
      return bElo - aElo; // Higher ELO first
    });
    const participantCount = sortedParticipants.length;
    const rounds = Math.ceil(Math.log2(participantCount));
    const totalSlots = Math.pow(2, rounds);
    
    // Create seeded bracket structure
    const seededBracket = [];

    // Add participants with proper seeding
    for (let i = 0; i < totalSlots; i++) {
      if (i < participantCount) {
        seededBracket.push({
          ...sortedParticipants[i],
          seed: i + 1,
          isActive: true
        });
      } else {
        seededBracket.push({
          id: `bye-${i}`,
          name: 'BYE',
          isBye: true,
          seed: null,
          isActive: false
        });
      }
    }
    
    return {
      participants: seededBracket,
      totalRounds: rounds,
      totalSlots
    };
  }, [participants]);
        
  // Generate bracket rounds with proper match pairing (fallback for when no matches exist)
  const generateBracketRounds = useMemo(() => {
    if (bracketStructure.participants.length === 0) return [];

    const rounds = [];
    const { participants, totalRounds } = bracketStructure;

    // Round 1: Initial matchups
    const round1Matches = [];
    for (let i = 0; i < participants.length; i += 2) {
      const team1 = participants[i];
      const team2 = participants[i + 1];

      // Skip if both are byes
      if (team1?.isBye && team2?.isBye) continue;

      // Auto-advance if one is bye
      let winner = null;
      let status = 'pending';
      if (team1?.isBye) {
        winner = team2;
        status = 'completed';
      } else if (team2?.isBye) {
        winner = team1;
        status = 'completed';
      }
      round1Matches.push({
        id: `r1-m${Math.floor(i / 2) + 1}`,
        round: 1,
        matchNumber: Math.floor(i / 2) + 1,
        team1,
        team2,
        winner,
        status,
        team1Score: winner === team1 ? 21 : null,
        team2Score: winner === team2 ? 21 : null
      });
    }
        
      rounds.push({
      round: 1,
      matches: round1Matches,
      title: totalRounds > 3 ? `Round of ${participants.length}` : 'Quarterfinals'
      });
      
    // Generate subsequent rounds
    for (let r = 2; r <= totalRounds; r++) {
      const prevRound = rounds[r - 2];
      const roundMatches = [];

      for (let i = 0; i < prevRound.matches.length; i += 2) {
        const match1 = prevRound.matches[i];
        const match2 = prevRound.matches[i + 1];

        const team1 = match1?.winner || null;
        const team2 = match2?.winner || null;

        if (team1 || team2) {
          roundMatches.push({
            id: `r${r}-m${Math.floor(i / 2) + 1}`,
            round: r,
            matchNumber: Math.floor(i / 2) + 1,
            team1,
            team2,
            winner: null,
            status: (team1 && team2) ? 'pending' : 'waiting',
            team1Score: null,
            team2Score: null,
            dependencies: [match1?.id, match2?.id].filter(Boolean)
          });
    }
      }
    
      let roundTitle = `Round ${r}`;
      if (r === totalRounds) roundTitle = 'Final';
      else if (r === totalRounds - 1) roundTitle = 'Semifinals';
      else if (r === totalRounds - 2) roundTitle = 'Quarterfinals';

      rounds.push({
        round: r,
        matches: roundMatches,
        title: roundTitle
      });
    }

    return rounds;
  }, [bracketStructure]);

  // Update matches with existing match data and generate proper bracket structure
  const mergedBracketData = useMemo(() => {
    if (!matches || matches.length === 0) return generateBracketRounds;

    console.log('🔄 Merging bracket data with database matches:', matches.length, 'matches');

    // Create a map of team IDs to their original seed information
    const teamSeedMap = {};
    participants.forEach(participant => {
      if (participant.id) {
        teamSeedMap[participant.id] = participant.seed || '?';
      }
    });

    // Group existing matches by round
    const matchesByRound = {};
    matches.forEach(match => {
      if (!matchesByRound[match.round]) {
        matchesByRound[match.round] = [];
      }
      matchesByRound[match.round].push(match);
    });

    console.log('📊 Database matches by round:', matchesByRound);

    // Create bracket structure based on actual database matches
    const rounds = [];
    const roundNumbers = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);

    roundNumbers.forEach(roundNum => {
      const roundMatches = matchesByRound[roundNum];

      // Convert database matches to bracket format
      const bracketMatches = roundMatches.map((dbMatch, index) => {
        // Find team data from participants or use database team data
        let team1 = participants.find(p => p.id === dbMatch.team1_id) || dbMatch.team1;
        let team2 = participants.find(p => p.id === dbMatch.team2_id) || dbMatch.team2;

        // For later rounds, if we don't find the team in participants, use database team data
        // and try to preserve seed information from original participants
        if (!team1 && dbMatch.team1) {
          team1 = {
            ...dbMatch.team1,
            seed: teamSeedMap[dbMatch.team1.id] || 'W' // Use 'W' for winners from previous rounds
          };
        }
        if (!team2 && dbMatch.team2) {
          team2 = {
            ...dbMatch.team2,
            seed: teamSeedMap[dbMatch.team2.id] || 'W'
          };
        }

        // Determine winner correctly based on scores
        let winner = null;
        if (dbMatch.team1_score !== null && dbMatch.team2_score !== null) {
          winner = dbMatch.team1_score > dbMatch.team2_score ? team1 : team2;
        }
        return {
          id: dbMatch.id,
          dbId: dbMatch.id,
          round: roundNum,
          matchNumber: index + 1,
          team1,
          team2,
          winner,
          status: dbMatch.status,
          team1Score: dbMatch.team1_score,
          team2Score: dbMatch.team2_score
};
      });

      // Determine round title
      let roundTitle = `Round ${roundNum}`;
      const totalRounds = Math.max(...roundNumbers);
      if (roundNum === totalRounds) roundTitle = 'Final';
      else if (roundNum === totalRounds - 1) roundTitle = 'Semifinals';
      else if (roundNum === totalRounds - 2) roundTitle = 'Quarterfinals';
      else if (roundNum === 1 && totalRounds > 3) roundTitle = `Round of ${Math.pow(2, totalRounds)}`;

      rounds.push({
        round: roundNum,
        matches: bracketMatches,
        title: roundTitle
      });
    });

    console.log('🏗️ Generated bracket rounds:', rounds);

    // Debug: Log each round for verification
    rounds.forEach(round => {
      console.log(`📋 ${round.title} (Round ${round.round}):`);
      round.matches.forEach(match => {
        console.log(`   Match ${match.matchNumber}: ${match.team1?.name || 'TBD'} vs ${match.team2?.name || 'TBD'} [${match.status}]`);
      });
    });

    return rounds;
  }, [matches, participants, generateBracketRounds]);

  const handleScoreUpdate = async (match, team1Score, team2Score) => {
    if (!onMatchUpdate) return;

    console.log('🎯 Handling score update:', {
      match: match,
      team1Score,
      team2Score,
      matchId: match.dbId
    });

    const score1 = parseInt(team1Score);
    const score2 = parseInt(team2Score);

    if (isNaN(score1) || isNaN(score2) || score1 < 0 || score2 < 0) {
      alert('Please enter valid scores');
      return;
    }

    if (score1 === score2) {
      alert('Match cannot end in a tie. Please enter different scores.');
                    return;
                  }

    let matchId = match.dbId;

    if (!matchId && matches) {
      const existingMatch = matches.find(m =>
        (m.team1_id === match.team1?.id && m.team2_id === match.team2?.id) ||
        (m.team1_id === match.team2?.id && m.team2_id === match.team1?.id)
      );
      matchId = existingMatch?.id;
    }

    if (!matchId) {
      console.error('No database ID available for match update');
      alert('This match cannot be updated yet. Please refresh the page and try again.');
      return;
    }

    const winnerId = score1 > score2 ? match.team1?.id : match.team2?.id;

    console.log('🏆 Winner determined:', {
      score1,
      score2,
      winnerId,
      team1Id: match.team1?.id,
      team2Id: match.team2?.id
    });

    try {
      await onMatchUpdate(matchId, {
        team1_score: score1,
        team2_score: score2,
        winner_team_id: winnerId,
        status: 'completed'
      });

      console.log('✅ Match score updated successfully');

      // Check if tournament is complete - only after final match
      const finalRound = mergedBracketData[mergedBracketData.length - 1];
      const finalMatch = finalRound?.matches[0];

      if (finalMatch && finalMatch.dbId === matchId && onTournamentComplete) {
        const champion = score1 > score2 ? match.team1 : match.team2;
        console.log('🏆 Tournament complete! Champion:', champion.name);
        onTournamentComplete(tournament.id, champion);
      }
    } catch (error) {
      console.error('Error updating tournament match:', error);
      alert('Failed to update match score. Please try again.');
    }
  };

  const tournamentStats = useMemo(() => {
    const allMatches = mergedBracketData.flatMap(round => round.matches);
    const playableMatches = allMatches.filter(match =>
      match.team1 && match.team2 && !match.team1.isBye && !match.team2.isBye
    );
    const completedMatches = playableMatches.filter(match => match.status === 'completed');
    const progress = playableMatches.length > 0 ? (completedMatches.length / playableMatches.length) * 100 : 0;

    return {
      totalMatches: playableMatches.length,
      completedMatches: completedMatches.length,
      progress: Math.round(progress),
      currentRound: mergedBracketData.findIndex(round =>
        round.matches.some(match => match.status === 'pending' || match.status === 'scheduled')
      ) + 1 || mergedBracketData.length
    };
  }, [mergedBracketData]);

  if (!tournament || !participants || participants.length === 0) {
    return (
      <div className="tournament-empty">
        <Trophy size={48} />
        <h2>No Tournament Data</h2>
        <p>Please set up tournament participants to view the bracket.</p>
      </div>
    );
  }

  return (
    <div className="tournament-bracket">
      {selectedMatch && (
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          background: 'red',
          color: 'white',
          padding: '10px',
          zIndex: 10001,
          borderRadius: '5px'
        }}>
          Modal should be open: {selectedMatch.team1?.name} vs {selectedMatch.team2?.name}
        </div>
      )}

      <div className="tournament-header">
        <div className="tournament-info">
          <h2>
            <Trophy size={24} />
            {tournament.name}
          </h2>
          <div className="tournament-meta">
            <div className="participant-count">
              <Users size={16} />
              <span>{participants.length} participants</span>
            </div>
            <div className="tournament-status">
              <Target size={16} />
              <span>Round {tournamentStats.currentRound}</span>
            </div>
            <div className="tournament-progress">
              <Zap size={16} />
              <span>{tournamentStats.progress}% Complete</span>
            </div>
          </div>
        </div>

        <div className="tournament-stats">
          <div className="stat-card">
            <span className="stat-value">{tournamentStats.completedMatches}</span>
            <span className="stat-label">Completed</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{tournamentStats.totalMatches - tournamentStats.completedMatches}</span>
            <span className="stat-label">Remaining</span>
          </div>
          {onRefresh && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={onRefresh}
              style={{ marginLeft: '1rem' }}
            >
              🔄 Refresh
            </button>
          )}
          {process.env.NODE_ENV === 'development' && (
            <button
              className="btn btn-warning btn-sm"
                onClick={() => {
                console.log('🐛 Debug: Manual next round generation');
                if (onAdvanceRound) {
                  onAdvanceRound(tournament.id);
                }
                }}
              style={{ marginLeft: '0.5rem' }}
              >
              🐛 Generate Next Round
            </button>
      )}
    </div>
      </div>

      <div className="bracket-container">
        {/* Add scroll hint for mobile */}
        <div className="bracket-scroll-hint">
          <span>← Scroll to see all rounds →</span>
        </div>

        <div className="bracket-rounds">
          {mergedBracketData.map((round, roundIndex) => (
            <div key={round.round} className="bracket-round">
              <div className="round-header">
                <h3>{round.title}</h3>
                <span className="round-subtitle">
                  {round.matches.filter(m => m.status === 'completed').length} / {round.matches.length} completed
                </span>
              </div>
              <div className="round-matches">
                {round.matches.map((match, matchIndex) => (
                  <div
                    key={match.id}
                    className={`bracket-match ${match.status}`}
                    onClick={() => {
                      console.log('Match clicked:', match);
                      console.log('Match conditions:', {
                        status: match.status,
                        hasTeam1: !!match.team1,
                        hasTeam2: !!match.team2,
                        hasDbId: !!match.dbId
                      });

                      if ((match.status === 'pending' || match.status === 'scheduled') && match.team1 && match.team2) {
                        console.log('Setting selected match:', match);
                        setSelectedMatch(match);
                        setScoreInputs({
                          team1: match.team1Score || '',
                          team2: match.team2Score || ''
                        });
                        console.log('Selected match state should be updated');
                      } else {
                        console.log('Match conditions not met for click');
                      }
                }}
            style={{
                      cursor: ((match.status === 'pending' || match.status === 'scheduled') && match.team1 && match.team2) ? 'pointer' : 'default'
            }}
          >
                    <div className="match-header">
                      <span className="match-number">M{match.matchNumber}</span>
                      {(match.status === 'pending' || match.status === 'scheduled') && <Play size={14} />}
                      {match.status === 'completed' && <Award size={14} />}
                    </div>
                    <div className="match-teams">
                      <div className={`match-team ${match.winner?.id === match.team1?.id ? 'winner' : ''}`}>
                        <span className="team-seed">#{match.team1?.seed || '?'}</span>
                        <span className="team-name">{match.team1?.name || 'TBD'}</span>
                        <span className="team-score">{match.team1Score !== null ? match.team1Score : '-'}</span>
                      </div>

                      <div className={`match-team ${match.winner?.id === match.team2?.id ? 'winner' : ''}`}>
                        <span className="team-seed">#{match.team2?.seed || '?'}</span>
                        <span className="team-name">{match.team2?.name || 'TBD'}</span>
                        <span className="team-score">{match.team2Score !== null ? match.team2Score : '-'}</span>
                    </div>
            </div>

                    {match.status === 'waiting' && (
                      <div className="match-waiting">
                        <span>Waiting for previous matches</span>
          </div>
      )}

                    {(match.status === 'pending' || match.status === 'scheduled') && match.team1 && match.team2 && !match.dbId && (
                      <div className="match-waiting">
                        <span>Match not yet created in database</span>
                      </div>
                    )}

                    {(match.status === 'pending' || match.status === 'scheduled') && match.team1 && match.team2 && match.dbId && (
                      <div className="match-clickable">
                        <span>Click to enter score</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {roundIndex < mergedBracketData.length - 1 && (
                <div className="round-connector">
                  <ChevronRight size={20} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {tournamentStats.progress === 100 && (
        <div className="tournament-champion">
          <div className="champion-display">
            <Trophy size={48} className="champion-trophy" />
            <h2>Tournament Champion</h2>
            <div className="champion-team">
              {mergedBracketData[mergedBracketData.length - 1]?.matches[0]?.winner?.name}
            </div>
            <div className="champion-details">
              <Medal size={20} />
              <span>Congratulations!</span>
            </div>
          </div>
        </div>
      )}

      {selectedMatch && (
        <div
          className="score-modal-overlay"
                onClick={() => {
            console.log('Modal overlay clicked, closing modal');
                  setSelectedMatch(null);
                }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
                }}
              >
          <div
            className="score-modal"
            onClick={e => {
              console.log('Modal content clicked, preventing close');
              e.stopPropagation();
            }}
            style={{
              backgroundColor: 'white',
              borderRadius: '1rem',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              zIndex: 10000,
              position: 'relative'
            }}
          >
            <h3>Enter Match Score</h3>
            <div className="match-teams-display">
              <div className="team-display">
                <div className="team-name">{selectedMatch.team1?.name || 'Team 1'}</div>
                <div className="team-seed">Seed #{selectedMatch.team1?.seed || '?'}</div>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={scoreInputs.team1}
                  onChange={(e) => {
                    console.log('Team 1 score changed:', e.target.value);
                    setScoreInputs(prev => ({ ...prev, team1: e.target.value }));
                  }}
                  placeholder="0"
                  autoFocus
                />
              </div>

              <div className="vs-divider">VS</div>

              <div className="team-display">
                <div className="team-name">{selectedMatch.team2?.name || 'Team 2'}</div>
                <div className="team-seed">Seed #{selectedMatch.team2?.seed || '?'}</div>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={scoreInputs.team2}
                  onChange={(e) => {
                    console.log('Team 2 score changed:', e.target.value);
                    setScoreInputs(prev => ({ ...prev, team2: e.target.value }));
                  }}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  console.log('Cancel button clicked');
                  setSelectedMatch(null);
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  console.log('Save button clicked with scores:', scoreInputs);

                  if (!scoreInputs.team1 || !scoreInputs.team2) {
                    alert('Please enter scores for both teams');
                    return;
                  }

                  const score1 = parseInt(scoreInputs.team1);
                  const score2 = parseInt(scoreInputs.team2);

                  if (isNaN(score1) || isNaN(score2)) {
                    alert('Please enter valid numeric scores');
                    return;
                  }

                  if (score1 === score2) {
                    alert('Badminton matches cannot end in a tie');
                    return;
                  }

                  if (score1 < 0 || score2 < 0 || score1 > 30 || score2 > 30) {
                    alert('Scores must be between 0 and 30');
                    return;
                  }
                  handleScoreUpdate(selectedMatch, scoreInputs.team1, scoreInputs.team2);
                  setSelectedMatch(null);
                  setScoreInputs({ team1: '', team2: '' });
                }}
                disabled={!scoreInputs.team1 || !scoreInputs.team2}
              >
                Save Score
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentBracket;