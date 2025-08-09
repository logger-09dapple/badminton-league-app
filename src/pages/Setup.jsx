import React from 'react';
import TeamEloHistoryPopulator from '../components/TeamEloHistoryPopulator';
import PlayerStatsPopulator from '../components/PlayerStatsPopulator';
import SequentialEloSetup from '../components/SequentialEloSetup';
import { Settings, ArrowLeft, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';

const Setup = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft size={20} />
                Back to Dashboard
              </Link>
              <div className="flex items-center gap-3">
                <Settings size={24} className="text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Setup & Configuration</h1>
                  <p className="text-gray-600 text-sm">Initialize and configure your badminton league system</p>
                </div>
              </div>
            </div>

            <Link
              to="/elo-demo"
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <BarChart3 size={18} />
              ELO Systems Demo
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="setup-sections" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          {/* Sequential ELO Processing - NEW RECOMMENDED METHOD */}
          <div className="setup-section">
            <SequentialEloSetup />
          </div>

          {/* Legacy Methods Section */}
          <div style={{
            padding: '1.5rem',
            backgroundColor: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '0.5rem',
            marginBottom: '2rem'
          }}>
            <h3 style={{ color: '#92400e', fontWeight: '500', margin: '0 0 0.5rem 0' }}>⚠️ Legacy Setup Methods</h3>
            <p style={{ color: '#a16207', fontSize: '0.875rem', margin: 0 }}>
              The methods below are the original setup tools. For best results, use the <strong>Sequential ELO Processing</strong> above instead.
              These are kept for compatibility and specific use cases.
            </p>
          </div>

          {/* Legacy Team ELO Setup */}
          <div className="setup-section">
            <TeamEloHistoryPopulator />
          </div>

          {/* Legacy Player Stats Setup */}
          <div className="setup-section">
            <PlayerStatsPopulator />
          </div>
        </div>

        {/* Usage Guidelines */}
        <div style={{
          marginTop: '3rem',
          padding: '2rem',
          backgroundColor: '#f0fdf4',
          border: '1px solid #22c55e',
          borderRadius: '0.5rem'
        }}>
          <h3 style={{ color: '#15803d', fontWeight: '600', margin: '0 0 1rem 0' }}>📋 Setup Guidelines</h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
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
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#7c2d12' }}>🔧 Advanced Users</h4>
              <ul style={{ margin: 0, paddingLeft: '1rem', color: '#64748b', fontSize: '0.875rem' }}>
                <li>Use individual Sequential processing buttons</li>
                <li>Legacy tools for specific data management</li>
                <li>Manual ELO history manipulation</li>
                <li>Debugging and troubleshooting</li>
              </ul>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #22c55e' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#7c2d12' }}>✅ After Setup</h4>
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
  );
};

export default Setup;