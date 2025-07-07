import React, { useState } from 'react';
import { Zap, CheckCircle, AlertCircle, TrendingUp, Users, Trophy, Clock } from 'lucide-react';
import { unifiedEloService } from '../services/unifiedEloServiceComplete'; // For complete and player processing
import { teamEloProcessor } from '../services/teamEloProcessor'; // FIXED: For team-only processing

const SequentialEloSetup = () => {
  const [status, setStatus] = useState('idle');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  // FIXED: Complete setup using unified service for both players and teams
  const handleCompleteSetup = async () => {
    try {
    setStatus('running');
      setError(null);
      setResults(null);

      console.log('🚀 Starting Complete Setup with Unified ELO Processing...');

      // Use the unified service for complete setup to handle both players and teams
      const result = await unifiedEloService.processSequentialElo();
      
      if (result.success) {
        setResults({
          type: 'complete_setup',
          success: true,
          processedMatches: result.processedMatches,
          updatedPlayers: result.updatedPlayers,
          updatedTeams: result.updatedTeams,
          message: result.message || `Complete setup successful! Updated ${result.updatedPlayers} players and ${result.updatedTeams} teams with ELO progression.`
        });
        setStatus('success');
      } else {
        throw new Error(result.error || 'Complete setup failed');
      }

    } catch (error) {
      console.error('💥 Complete setup failed:', error);
      setError(error.message);
        setStatus('error');
      }
  };

  const handleSequentialPlayerElo = async () => {
    try {
    setStatus('running');
      setError(null);
      setResults(null);

      console.log('🎯 Starting Player-only Sequential ELO...');

      // Use unified service for player processing
      const result = await unifiedEloService.processSequentialElo();

      if (result.success) {
        setResults({
          type: 'player_only',
          success: true,
          processedMatches: result.processedMatches,
          updatedPlayers: result.updatedPlayers,
          message: `Player ELO processing complete! Processed ${result.processedMatches} matches and updated ${result.updatedPlayers} players.`
        });
        setStatus('success');
      } else {
        throw new Error(result.error || 'Player ELO processing failed');
      }

    } catch (error) {
      console.error('💥 Player ELO processing failed:', error);
      setError(error.message);
      setStatus('error');
    }
  };

  // FIXED: Team-only processing using dedicated team processor
  const handleSequentialTeamElo = async () => {
    try {
      setStatus('running');
      setError(null);
      setResults(null);

      console.log('🏆 Starting Team-only Sequential ELO...');

      // Use dedicated team processor to avoid player history conflicts
      const result = await teamEloProcessor.processTeamEloSequentially();

      if (result.success) {
        setResults({
          type: 'team_only',
          success: true,
          processedMatches: result.processedMatches,
          updatedTeams: result.updatedTeams,
          message: `Team ELO processing complete! Processed ${result.processedMatches} matches and updated ${result.updatedTeams} teams.`
        });
        setStatus('success');
      } else {
        throw new Error(result.error || 'Team ELO processing failed');
      }

    } catch (error) {
      console.error('💥 Team ELO processing failed:', error);
      setError(error.message);
      setStatus('error');
    }
  };

  return (
    <div style={{
      backgroundColor: 'white',
      border: '2px solid #e5e7eb',
      borderRadius: '1rem',
      padding: '2rem',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{
            width: '3rem',
            height: '3rem',
            backgroundColor: '#f3e8ff',
            borderRadius: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Zap size={24} style={{ color: '#8b5cf6' }} />
          </div>
                <div>
            <h2 style={{ margin: '0', color: '#1e293b', fontSize: '1.5rem' }}>
              Unified Sequential ELO Processing
            </h2>
            <p style={{ margin: '0', color: '#64748b', fontSize: '0.875rem' }}>
              Uses the same ELO calculation system as live match updates - ensures perfect consistency
            </p>
                </div>
              </div>

        <div style={{
          backgroundColor: '#ecfdf5',
          border: '1px solid #10b981',
          borderRadius: '0.5rem',
          padding: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <CheckCircle size={18} style={{ color: '#059669' }} />
            <strong style={{ color: '#065f46' }}>✅ Unified Processing Benefits</strong>
            </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', fontSize: '0.875rem', color: '#047857' }}>
                <div>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#065f46' }}>🎯 Perfect Consistency:</h4>
              <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                <li>Same ELO system as live match updates</li>
                <li>Identical calculation methods throughout</li>
                <li>Chart and table values always match</li>
                <li>No discrepancies between setup and live data</li>
                  </ul>
                </div>
                <div>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#065f46' }}>📊 Complete Data:</h4>
              <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                <li>Player & team ELO progression</li>
                <li>Complete match history recording</li>
                <li>Final ELO scores shown on charts</li>
                <li>Skill-based initial ELO ratings</li>
                  </ul>
                </div>
              </div>
            </div>

        {status === 'running' && (
          <div style={{
            backgroundColor: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <Clock size={18} style={{ color: '#d97706', animation: 'spin 1s linear infinite' }} />
            <div>
              <strong style={{ color: '#92400e' }}>Processing ELO Data...</strong>
              <p style={{ margin: 0, color: '#a16207', fontSize: '0.875rem' }}>
                This may take a few moments for large datasets. Please don't refresh the page.
              </p>
            </div>
            </div>
                    )}

        {status === 'success' && results && (
          <div style={{
            backgroundColor: '#ecfdf5',
            border: '1px solid #10b981',
            borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <CheckCircle size={18} style={{ color: '#059669' }} />
              <strong style={{ color: '#065f46' }}>✅ Setup Complete!</strong>
                      </div>
            <p style={{ margin: '0 0 0.75rem 0', color: '#047857', fontSize: '0.875rem' }}>
              {results.message}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', fontSize: '0.875rem' }}>
              <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: '#d1fae5', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#047857' }}>
                  {results.processedMatches || 0}
                      </div>
                <div style={{ color: '#065f46' }}>Matches Processed</div>
              </div>
              <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: '#ddd6fe', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#7c3aed' }}>
                  {results.updatedPlayers || 0}
                      </div>
                <div style={{ color: '#5b21b6' }}>Players Updated</div>
              </div>
              {results.updatedTeams && (
                <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: '#fef3c7', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#d97706' }}>
                    {results.updatedTeams}
                      </div>
                  <div style={{ color: '#92400e' }}>Teams Updated</div>
                </div>
                    )}
                      </div>
                      </div>
                    )}

        {status === 'error' && error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #ef4444',
            borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <AlertCircle size={18} style={{ color: '#dc2626' }} />
              <strong style={{ color: '#991b1b' }}>❌ Setup Failed</strong>
                      </div>
            <p style={{ margin: 0, color: '#b91c1c', fontSize: '0.875rem' }}>
              {error}
            </p>
                      </div>
                    )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <button
            onClick={handleCompleteSetup}
            disabled={status === 'running'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '1rem 1.5rem',
              backgroundColor: status === 'running' ? '#9ca3af' : '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: status === 'running' ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              minHeight: '3rem'
            }}
          >
            <CheckCircle size={18} />
            {status === 'running' ? 'Processing...' : 'Complete Setup (Recommended)'}
          </button>

          <button
            onClick={handleSequentialPlayerElo}
            disabled={status === 'running'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '1rem 1.5rem',
              backgroundColor: status === 'running' ? '#9ca3af' : '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '1rem',
              cursor: status === 'running' ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              minHeight: '3rem'
            }}
          >
            <Users size={18} />
            Player ELO Only
          </button>

          <button
            onClick={handleSequentialTeamElo}
            disabled={status === 'running'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '1rem 1.5rem',
              backgroundColor: status === 'running' ? '#9ca3af' : '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '1rem',
              cursor: status === 'running' ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              minHeight: '3rem'
            }}
          >
            <Trophy size={18} />
            Team ELO Only
          </button>
                      </div>

        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          backgroundColor: '#f8fafc',
          borderRadius: '0.5rem',
          border: '1px solid #e2e8f0'
        }}>
          <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600', color: '#374151' }}>
            💡 What This Does:
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
            <li>Processes all completed matches in chronological order</li>
            <li>Calculates accurate ELO progression for players and teams</li>
            <li>Creates complete rating history for charts and statistics</li>
            <li>Uses the exact same calculation system as live match updates</li>
            <li>Ensures charts show final ELO scores after each match</li>
            <li>Makes table rankings match chart final values perfectly</li>
                </ul>
              </div>
              </div>
              </div>
  );
};

export default SequentialEloSetup;