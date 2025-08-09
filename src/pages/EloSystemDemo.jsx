import React, { useState } from 'react';
import { ArrowLeft, Play, BarChart3, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import EloSystemSettings from '../components/EloSystemSettings';
import { eloSystemManager } from '../services/eloSystemManager';

const EloSystemDemo = () => {
  const [demoResults, setDemoResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const runComprehensiveDemo = async () => {
    setIsRunning(true);
    
    try {
      console.log('🚀 Running comprehensive ELO system demonstration...');
      
      // Mock players with different skill levels
      const scenarios = [
        {
          name: 'Evenly Matched Teams',
          team1: [
            { id: '1', name: 'Alice', elo_rating: 1500, elo_games_played: 50, skill_level: 'Intermediate' },
            { id: '2', name: 'Bob', elo_rating: 1500, elo_games_played: 50, skill_level: 'Intermediate' }
          ],
          team2: [
            { id: '3', name: 'Charlie', elo_rating: 1500, elo_games_played: 50, skill_level: 'Intermediate' },
            { id: '4', name: 'Diana', elo_rating: 1500, elo_games_played: 50, skill_level: 'Intermediate' }
          ]
        },
        {
          name: 'Strong vs Weak Teams',
          team1: [
            { id: '5', name: 'Expert 1', elo_rating: 1750, elo_games_played: 100, skill_level: 'Advanced' },
            { id: '6', name: 'Expert 2', elo_rating: 1720, elo_games_played: 95, skill_level: 'Advanced' }
          ],
          team2: [
            { id: '7', name: 'Novice 1', elo_rating: 1300, elo_games_played: 20, skill_level: 'Beginner' },
            { id: '8', name: 'Novice 2', elo_rating: 1280, elo_games_played: 25, skill_level: 'Beginner' }
          ]
        }
      ];

      const matchResults = [
        { name: 'Extremely Close', scores: [22, 20] },
        { name: 'Close Win', scores: [21, 19] },
        { name: 'Comfortable Win', scores: [21, 15] },
        { name: 'Clear Victory', scores: [21, 11] },
        { name: 'Dominant Win', scores: [21, 7] },
        { name: 'Crushing Victory', scores: [21, 3] }
      ];

      const systems = ['standard', 'fifa', 'conservative', 'aggressive'];
      const results = {};

      // Test each scenario
      for (const scenario of scenarios) {
        results[scenario.name] = {};
        
        for (const match of matchResults) {
          results[scenario.name][match.name] = {
            scores: match.scores,
            systems: {}
          };
          
          // Test each ELO system
          for (const systemName of systems) {
            try {
              eloSystemManager.setSystem(systemName);
              const result = eloSystemManager.processMatch(
                scenario.team1,
                scenario.team2,
                match.scores[0],
                match.scores[1]
              );
              
              const team1Player1 = result.playerEloUpdates?.find(u => u.playerId === scenario.team1[0].id);
              const team1Player2 = result.playerEloUpdates?.find(u => u.playerId === scenario.team1[1].id);
              const team2Player1 = result.playerEloUpdates?.find(u => u.playerId === scenario.team2[0].id);
              
              if (team1Player1 && team2Player1) {
                results[scenario.name][match.name].systems[systemName] = {
                  winnerChange: (team1Player1.ratingChange + team1Player2.ratingChange) / 2,
                  loserChange: team2Player1.ratingChange,
                  marginMultiplier: team1Player1.marginMultiplier || 1.0,
                  winnerNewRating: (team1Player1.newRating + team1Player2.newRating) / 2,
                  originalRatingDiff: (scenario.team1[0].elo_rating + scenario.team1[1].elo_rating) / 2 - 
                                   (scenario.team2[0].elo_rating + scenario.team2[1].elo_rating) / 2
                };
              }
            } catch (error) {
              console.error(`Error with ${systemName}:`, error);
            }
          }
        }
      }
      
      setDemoResults(results);
      console.log('✅ Demo completed', results);
      
    } catch (error) {
      console.error('❌ Demo failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              to="/setup"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft size={20} />
              Back to Setup
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">ELO Rating Systems</h1>
              <p className="text-gray-600 text-sm">
                Compare different approaches to calculating player ratings
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* ELO System Settings */}
        <EloSystemSettings />

        {/* Comprehensive Demo Section */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Comprehensive System Comparison
                </h3>
                <p className="text-gray-600 text-sm mt-1">
                  See how different ELO systems handle various match scenarios
                </p>
              </div>
              <button
                onClick={runComprehensiveDemo}
                disabled={isRunning}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isRunning ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Play size={18} />
                )}
                {isRunning ? 'Running...' : 'Run Demo'}
              </button>
            </div>
          </div>

          {demoResults && (
            <div className="p-6">
              {Object.entries(demoResults).map(([scenarioName, scenarioData]) => (
                <div key={scenarioName} className="mb-8">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">
                    {scenarioName}
                  </h4>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-3 font-medium text-gray-700">
                            Match Result
                          </th>
                          <th className="text-center py-2 px-3 font-medium text-gray-700">
                            Standard ELO
                          </th>
                          <th className="text-center py-2 px-3 font-medium text-gray-700">
                            FIFA Style
                          </th>
                          <th className="text-center py-2 px-3 font-medium text-gray-700">
                            Conservative
                          </th>
                          <th className="text-center py-2 px-3 font-medium text-gray-700">
                            Aggressive
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(scenarioData).map(([matchName, matchData]) => (
                          <tr key={matchName} className="border-b border-gray-100">
                            <td className="py-3 px-3">
                              <div className="font-medium text-gray-900">{matchName}</div>
                              <div className="text-xs text-gray-500">
                                {matchData.scores[0]}-{matchData.scores[1]}
                              </div>
                            </td>
                            {['standard', 'fifa', 'conservative', 'aggressive'].map(systemName => {
                              const system = matchData.systems[systemName];
                              return (
                                <td key={systemName} className="py-3 px-3 text-center">
                                  {system ? (
                                    <>
                                      <div className={`font-medium ${
                                        system.winnerChange > 0 ? 'text-green-600' : 'text-red-600'
                                      }`}>
                                        {system.winnerChange > 0 ? '+' : ''}{Math.round(system.winnerChange)}
                                      </div>
                                      {system.marginMultiplier > 1 && (
                                        <div className="text-xs text-purple-600">
                                          {system.marginMultiplier.toFixed(2)}x
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h5 className="font-medium text-blue-900 mb-2">Key Insights:</h5>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>Standard ELO:</strong> Same rating change regardless of score margin</li>
                  <li>• <strong>FIFA Style:</strong> Logarithmic scaling prevents extreme bonuses</li>
                  <li>• <strong>Conservative:</strong> Gentle bonuses for decisive victories</li>
                  <li>• <strong>Aggressive:</strong> Large rewards for dominant performances</li>
                  <li>• <strong>All systems:</strong> Consider opponent strength in calculations</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Mathematical Explanation */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              How Margin Scaling Works
            </h3>
          </div>
          <div className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">FIFA World Football Formula</h4>
                <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm">
                  <div>Multiplier = 1 + (0.15 × ln(1 + effective_margin))</div>
                  <div className="text-xs text-gray-600 mt-2">
                    Where effective_margin = max(0, actual_margin - 2)
                  </div>
                </div>
                <div className="mt-3 text-sm text-gray-600">
                  <p>Used in official FIFA World Rankings. The logarithmic function ensures:</p>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>Small margins (2-3 points) have minimal impact</li>
                    <li>Medium margins (4-8 points) provide reasonable bonuses</li>
                    <li>Large margins (9+ points) don't create extreme rewards</li>
                  </ul>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Example Calculations</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>21-19 (2pt margin):</span>
                    <span className="font-mono">1.00x</span>
                  </div>
                  <div className="flex justify-between">
                    <span>21-16 (5pt margin):</span>
                    <span className="font-mono">1.16x</span>
                  </div>
                  <div className="flex justify-between">
                    <span>21-12 (9pt margin):</span>
                    <span className="font-mono">1.35x</span>
                  </div>
                  <div className="flex justify-between">
                    <span>21-5 (16pt margin):</span>
                    <span className="font-mono">1.62x</span>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-600">
                  Notice how the multiplier increases more slowly for larger margins - 
                  this prevents runaway rating inflation from blowout victories.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EloSystemDemo;