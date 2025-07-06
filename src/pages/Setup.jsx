import React from 'react';
import TeamEloHistoryPopulator from '../components/TeamEloHistoryPopulator';
import PlayerStatsPopulator from '../components/PlayerStatsPopulator';
import SequentialEloSetup from '../components/SequentialEloSetup';
import { Settings, ArrowLeft } from 'lucide-react';

const Setup = () => {
  return (
    <div className="setup-page" style={{ padding: '2rem 1rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div className="setup-header" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <Settings size={32} style={{ color: '#667eea' }} />
          <div>
            <h1 style={{ margin: 0, color: '#1e293b' }}>League Setup</h1>
            <p style={{ margin: 0, color: '#64748b' }}>One-time setup for enhanced league features</p>
          </div>
        </div>
        
        <div style={{ 
          backgroundColor: '#fef3c7', 
          border: '1px solid #f59e0b', 
          borderRadius: '0.5rem', 
          padding: '1rem',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <strong style={{ color: '#92400e' }}>⚠️ One-Time Setup Required</strong>
          </div>
          <p style={{ margin: 0, color: '#92400e', fontSize: '0.875rem' }}>
            Run these setup tools once to populate historical data and enable advanced statistics.
            This will analyze your existing matches and create comprehensive player and team statistics.
          </p>
        </div>
      </div>
      
      <div className="setup-sections" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        {/* Sequential ELO Processing - NEW RECOMMENDED METHOD */}
        <div className="setup-section">
          <SequentialEloSetup />
        </div>

        {/* Legacy Player Statistics Setup */}
        <div className="setup-section">
          <div style={{
            backgroundColor: '#fefdf0',
            border: '1px solid #fde68a',
          borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '1rem'
        }}>
            <h3 style={{ color: '#92400e', fontWeight: '500', margin: '0 0 0.5rem 0' }}>⚠️ Legacy Setup Methods</h3>
            <p style={{ color: '#a16207', fontSize: '0.875rem', margin: 0 }}>
              The methods below are the original setup tools. For best results, use the <strong>Sequential ELO Processing</strong> above instead.
              These are kept for compatibility and specific use cases.
            </p>
            </div>

          <PlayerStatsPopulator />
        </div>

        {/* Legacy Team ELO Setup */}
        <div className="setup-section">
          <TeamEloHistoryPopulator />
            </div>

        {/* Additional Setup Information */}
        <div className="setup-info" style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '0.5rem',
          padding: '1.5rem'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>Setup Recommendations</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#7c2d12' }}>🚀 New Users (Recommended)</h4>
              <ul style={{ margin: 0, paddingLeft: '1rem', color: '#64748b', fontSize: '0.875rem' }}>
                <li>Use <strong>Sequential ELO Processing</strong> → "Complete Setup"</li>
                <li>This creates proper chronological ELO progression</li>
                <li>Fixes all common ELO chart issues automatically</li>
                <li>One-click setup for both players and teams</li>
              </ul>
            </div>
            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#475569' }}>🔧 Advanced Users</h4>
              <ul style={{ margin: 0, paddingLeft: '1rem', color: '#64748b', fontSize: '0.875rem' }}>
                <li>Use individual Sequential processing buttons</li>
                <li>Legacy tools for specific data management</li>
                <li>Manual ELO history manipulation</li>
                <li>Debugging and troubleshooting</li>
              </ul>
            </div>
            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#475569' }}>📊 After Setup</h4>
              <ul style={{ margin: 0, paddingLeft: '1rem', color: '#64748b', fontSize: '0.875rem' }}>
                <li>Visit Statistics page to see accurate charts</li>
                <li>Player/Team ELO progression will be correct</li>
                <li>Charts will match player list ELO ratings</li>
                <li>Future matches update automatically</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <button
          onClick={() => window.history.back()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#5a67d8'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#667eea'}
        >
          <ArrowLeft size={18} />
          Back to App
        </button>
      </div>
    </div>
  );
};

export default Setup;