import React, { useState } from 'react';
import { Info, Play, BarChart3 } from 'lucide-react';
import { eloSystemManager } from '../services/eloSystemManager';

const EloSystemSummary = () => {
  const [demoResults, setDemoResults] = useState(null);
  
  const runQuickDemo = () => {
    // Mock players for demonstration
    const team1 = [
      { id: '1', name: 'Player A', elo_rating: 1600, elo_games_played: 50, skill_level: 'Advanced' },
      { id: '2', name: 'Player B', elo_rating: 1580, elo_games_played: 45, skill_level: 'Advanced' }
    ];
    const team2 = [
      { id: '3', name: 'Player C', elo_rating: 1450, elo_games_played: 40, skill_level: 'Intermediate' },
      { id: '4', name: 'Player D', elo_rating: 1470, elo_games_played: 35, skill_level: 'Intermediate' }
    ];
    
    const currentSystem = eloSystemManager.getCurrentSystemName();
    const scenarios = [
      { name: 'Close Win', scores: [21, 19] },
      { name: 'Comfortable Win', scores: [21, 15] },
      { name: 'Dominant Win', scores: [21, 8] }
    ];
    
    const results = {};
    
    scenarios.forEach(scenario => {
      try {
        const result = eloSystemManager.processMatch(team1, team2, scenario.scores[0], scenario.scores[1]);
        const player1Change = result.playerEloUpdates?.find(u => u.playerId === '1');
        
        if (player1Change) {
          results[scenario.name] = {
            change: player1Change.ratingChange,
            marginMultiplier: player1Change.marginMultiplier || 1.0,
            newRating: player1Change.newRating
          };
        }
      } catch (error) {
        console.error(`Error in demo: ${error.message}`);
      }
    });
    
    setDemoResults({ system: currentSystem, results });
  };

  const currentSystemName = eloSystemManager.getCurrentSystemName();
  const systemDesc = eloSystemManager.getSystemDescriptions()[currentSystemName];

  return (
    <div className="elo-system-summary bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <Info size={20} className="text-blue-600 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-blue-900 mb-2">
            ELO System: {systemDesc?.name}
          </h4>
          
          <div className="text-sm text-blue-800 space-y-2">
            <p>
              <strong>Current System:</strong> {systemDesc?.description}
            </p>
            
            <p>
              <strong>Setup Impact:</strong> All ELO calculations during setup (Complete Setup, Player ELO, Team ELO) 
              will use the {systemDesc?.name} system.
            </p>
            
            {systemDesc?.marginSupport ? (
              <div className="bg-green-50 border border-green-200 rounded p-2 mt-2">
                <p className="text-green-800">
                  <strong>✅ Margin Scaling Active:</strong> Larger victory margins will receive ELO bonuses during setup processing.
                  Example: A 21-8 win gets more ELO than a 21-19 win.
                </p>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded p-2 mt-2">
                <p className="text-gray-700">
                  <strong>📊 Standard ELO:</strong> All victories are treated equally regardless of score margin.
                </p>
              </div>
            )}

            <div className="flex gap-2 mt-3">
              <button
                onClick={runQuickDemo}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
              >
                <Play size={12} />
                Quick Demo
              </button>
              
              <button
                onClick={() => {
                  console.log('🎯 Running ELO system demonstration...');
                  if (window.demonstrateEloSystemImpact) {
                    window.demonstrateEloSystemImpact(21, 8);
                  }
                }}
                className="flex items-center gap-1 px-3 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700 transition-colors"
              >
                <BarChart3 size={12} />
                Console Demo
              </button>
            </div>

            {demoResults && (
              <div className="mt-3 p-3 bg-white border border-blue-200 rounded">
                <h5 className="font-medium text-blue-900 mb-2">
                  Demo Results ({systemDesc?.name})
                </h5>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {Object.entries(demoResults.results).map(([scenario, result]) => (
                    <div key={scenario} className="text-center">
                      <div className="text-blue-700 font-medium">{scenario}</div>
                      <div className="text-green-600 font-semibold">
                        {result.change > 0 ? '+' : ''}{result.change} ELO
                      </div>
                      {result.marginMultiplier > 1 && (
                        <div className="text-purple-600">
                          {result.marginMultiplier.toFixed(2)}x
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EloSystemSummary;