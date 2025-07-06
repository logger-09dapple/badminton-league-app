import React, { useState } from 'react';
import { runTeamEloMigration, quickTeamEloSetup } from '../scripts/runTeamEloMigration';
import { Settings, Play, CheckCircle, XCircle, Clock } from 'lucide-react';

const TeamEloInitializer = () => {
  const [status, setStatus] = useState('idle'); // idle, running, success, error
  const [message, setMessage] = useState('');
  const [details, setDetails] = useState([]);

  const handleQuickSetup = async () => {
    setStatus('running');
    setMessage('Setting up Team ELO system...');
    setDetails([]);

    try {
      const success = await quickTeamEloSetup();
      
      if (success) {
        setStatus('success');
        setMessage('Team ELO system initialized successfully!');
        setDetails([
          'Database tables created',
          'Team ELO columns added',
          'Initial ratings calculated',
          'Historical data processed'
        ]);
      } else {
        setStatus('error');
        setMessage('Team ELO setup failed. Check console for details.');
      }
    } catch (error) {
      setStatus('error');
      setMessage(`Error: ${error.message}`);
      console.error('Team ELO setup error:', error);
    }
  };

  const handleFullMigration = async () => {
    setStatus('running');
    setMessage('Running full Team ELO migration...');
    setDetails([]);

    try {
      const success = await runTeamEloMigration();
      
      if (success) {
        setStatus('success');
        setMessage('Team ELO migration completed successfully!');
        setDetails([
          'SQL functions created',
          'Database schema updated',
          'Team ELO ratings initialized',
          'Complete history populated',
          'All systems ready'
        ]);
      } else {
        setStatus('error');
        setMessage('Team ELO migration failed. Check console for details.');
      }
    } catch (error) {
      setStatus('error');
      setMessage(`Error: ${error.message}`);
      console.error('Team ELO migration error:', error);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <Clock className="animate-spin" size={20} />;
      case 'success':
        return <CheckCircle size={20} className="text-green-500" />;
      case 'error':
        return <XCircle size={20} className="text-red-500" />;
      default:
        return <Settings size={20} />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'running':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className="team-elo-initializer max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Settings size={24} className="text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Team ELO System Setup
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                Initialize the dedicated team ELO rating system
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">What this does:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Creates team ELO rating system separate from player ELO</li>
                <li>• Adds team ELO history tracking</li>
                <li>• Processes existing matches to build team ELO history</li>
                <li>• Updates statistics to show actual team ELO ratings</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleQuickSetup}
                disabled={status === 'running'}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Play size={18} />
                Quick Setup
              </button>
              
              <button
                onClick={handleFullMigration}
                disabled={status === 'running'}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Settings size={18} />
                Full Migration
              </button>
            </div>

            {status !== 'idle' && (
              <div className={`rounded-lg border p-4 ${getStatusColor()}`}>
                <div className="flex items-center gap-3 mb-2">
                  {getStatusIcon()}
                  <span className="font-medium">{message}</span>
                </div>
                
                {details.length > 0 && (
                  <ul className="text-sm space-y-1 ml-7">
                    {details.map((detail, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle size={14} className="text-green-500" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="text-xs text-gray-500 bg-gray-50 rounded p-3">
              <strong>Note:</strong> This is a one-time setup. Once completed, team ELO will be 
              automatically calculated for all future matches. The process is safe and won't 
              affect existing player data.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamEloInitializer;