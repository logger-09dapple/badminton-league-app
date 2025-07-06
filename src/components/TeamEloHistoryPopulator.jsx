import React, { useState } from 'react';
import { populateTeamEloHistory, clearTeamEloHistory, repopulateTeamEloHistory } from '../scripts/populateTeamEloHistory';
import { robustTeamEloPopulation } from '../scripts/robustTeamEloPopulation';
import { Database, Trash2, RefreshCw, CheckCircle, XCircle, Clock, BarChart3, Settings } from 'lucide-react';

const TeamEloHistoryPopulator = () => {
  const [status, setStatus] = useState('idle'); // idle, running, success, error
  const [message, setMessage] = useState('');
  const [details, setDetails] = useState(null);
  const [operation, setOperation] = useState('');

  const handlePopulate = async () => {
    setStatus('running');
    setOperation('populate');
    setMessage('Populating team ELO history from existing matches...');
    setDetails(null);

    try {
      // Use the robust population function
      const result = await robustTeamEloPopulation();
      
      if (result.success) {
        setStatus('success');
        setMessage('Team ELO history populated successfully!');
        setDetails({
          processedMatches: result.processedMatches,
          historyRecords: result.historyRecords,
          updatedTeams: result.updatedTeams,
          failedTeams: result.failedTeams || 0,
          strategies: result.strategies
        });
      } else {
        setStatus('error');
        setMessage(`Population failed: ${result.error || 'Unknown error'}`);
        if (result.failedTeams > 0) {
        setDetails({
            processedMatches: result.processedMatches || 0,
            historyRecords: result.historyRecords || 0,
            updatedTeams: result.updatedTeams || 0,
            failedTeams: result.failedTeams,
            strategies: result.strategies
        });
      }
    }
    } catch (error) {
      setStatus('error');
      setMessage(`Error: ${error.message}`);
      console.error('Team ELO history population error:', error);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Are you sure you want to clear all team ELO history? This cannot be undone.')) {
      return;
    }

    setStatus('running');
    setOperation('clear');
    setMessage('Clearing existing team ELO history...');
    setDetails(null);

    try {
      const success = await clearTeamEloHistory();
      
      if (success) {
        setStatus('success');
        setMessage('Team ELO history cleared successfully!');
        setDetails(null);
      } else {
        setStatus('error');
        setMessage('Failed to clear team ELO history');
      }
    } catch (error) {
      setStatus('error');
      setMessage(`Error: ${error.message}`);
      console.error('Team ELO history clear error:', error);
    }
  };

  const handleRepopulate = async () => {
    if (!window.confirm('This will clear all existing team ELO history and rebuild it from scratch. Continue?')) {
      return;
    }

    setStatus('running');
    setOperation('repopulate');
    setMessage('Re-populating team ELO history (clear + rebuild)...');
    setDetails(null);

    try {
      const result = await repopulateTeamEloHistory();
      
      if (result.success) {
        setStatus('success');
        setMessage('Team ELO history re-populated successfully!');
        setDetails({
          processedMatches: result.processedMatches,
          historyRecords: result.historyRecords,
          updatedTeams: result.updatedTeams
        });
      } else {
        setStatus('error');
        setMessage(`Re-population failed: ${result.error}`);
      }
    } catch (error) {
      setStatus('error');
      setMessage(`Error: ${error.message}`);
      console.error('Team ELO history re-population error:', error);
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
        return <BarChart3 size={20} />;
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
    <div className="team-elo-history-populator max-w-3xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <BarChart3 size={24} className="text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Team ELO History Management
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                Populate team ELO history from existing matches for accurate charts
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">What this does:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Processes all completed matches chronologically</li>
                <li>• Calculates team ELO changes for each match</li>
                <li>• Creates complete ELO progression history</li>
                <li>• Enables accurate team ELO charts and analysis</li>
                <li>• Updates team final ELO ratings and peak ratings</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <button
                onClick={handlePopulate}
                disabled={status === 'running'}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Database size={18} />
                Populate History
              </button>
              
              <button
                onClick={async () => {
                  setStatus('running');
                  setOperation('robust');
                  setMessage('Running robust team ELO population...');
                  setDetails(null);
                  try {
                    const result = await robustTeamEloPopulation();
                    if (result.success) {
                      setStatus('success');
                      setMessage('Robust team ELO population completed!');
                      setDetails(result);
                    } else {
                      setStatus('error');
                      setMessage(`Robust population failed: ${result.error}`);
                    }
                  } catch (error) {
                    setStatus('error');
                    setMessage(`Error: ${error.message}`);
                  }
                }}
                disabled={status === 'running'}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Settings size={18} />
                Robust Setup
              </button>
              <button
                onClick={handleClear}
                disabled={status === 'running'}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 size={18} />
                Clear History
              </button>

              <button
                onClick={handleRepopulate}
                disabled={status === 'running'}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw size={18} />
                Re-populate
              </button>
            </div>

            {status !== 'idle' && (
              <div className={`rounded-lg border p-4 ${getStatusColor()}`}>
                <div className="flex items-center gap-3 mb-2">
                  {getStatusIcon()}
                  <span className="font-medium">{message}</span>
                </div>
                
                {details && (
                  <div className="text-sm space-y-1 ml-7">
                    {details.processedMatches !== undefined && (
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-green-500" />
                      Processed {details.processedMatches} matches
                    </div>
                    )}
                    {details.historyRecords !== undefined && (
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-green-500" />
                      Created {details.historyRecords} ELO history records
                    </div>
                    )}
                    {details.updatedTeams !== undefined && (
                      <div className="flex items-center gap-2">
                        <CheckCircle size={14} className={details.failedTeams > 0 ? "text-yellow-500" : "text-green-500"} />
                        Updated {details.updatedTeams} teams
                        {details.failedTeams > 0 && ` (${details.failedTeams} failed)`}
                      </div>
                    )}
                    {details.strategies && (
                      <div className="mt-2 text-xs text-gray-600">
                        <div>Update strategies used:</div>
                        <div>• Direct: {details.strategies.direct || 0}</div>
                        <div>• Individual: {details.strategies.individual || 0}</div>
                        <div>• RPC: {details.strategies.rpc || 0}</div>
                        {details.strategies.failed > 0 && (
                          <div className="text-red-600">• Failed: {details.strategies.failed}</div>
                        )}
                  </div>
                )}
              </div>
            )}

                {status === 'success' && (
                  <div className="mt-3 p-3 bg-green-100 border border-green-300 rounded text-green-800 text-sm">
                    <strong>Next steps:</strong> Go to Statistics → Team Rankings to view accurate team ELO charts with historical progression!
              </div>
                )}
            </div>
            )}

            <div className="space-y-3">
              <div className="text-xs text-gray-500 bg-gray-50 rounded p-3">
                <strong>Important:</strong>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>Run "Populate History" first if you haven't set up team ELO history yet</li>
                  <li>Use "Re-populate" if you want to rebuild the entire history from scratch</li>
                  <li>This process considers team ELO starting points based on player skill levels</li>
                  <li>Advanced players contribute 1800 ELO, Intermediate 1500, Beginner 1200</li>
                </ul>
              </div>

              <div className="text-xs text-gray-400 bg-gray-50 rounded p-3">
                <strong>Browser Console Alternative:</strong><br/>
                You can also run these commands in the browser console:
                <code className="block mt-1 font-mono">
                  await populateTeamEloHistory();<br/>
                  await clearTeamEloHistory();<br/>
                  await repopulateTeamEloHistory();
                </code>
            </div>
    </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamEloHistoryPopulator;