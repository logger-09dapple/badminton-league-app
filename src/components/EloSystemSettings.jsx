import React, { useState, useEffect } from 'react';
import { Settings, Info, TrendingUp, BarChart3 } from 'lucide-react';
import { eloSystemManager } from '../services/eloSystemManager';

const EloSystemSettings = () => {
  const [currentSystem, setCurrentSystem] = useState('standard');
  const [showDemo, setShowDemo] = useState(false);
  const [demoResults, setDemoResults] = useState(null);
  
  useEffect(() => {
    setCurrentSystem(eloSystemManager.getCurrentSystemName());
  }, []);

  const handleSystemChange = (systemName) => {
    if (eloSystemManager.setSystem(systemName)) {
      setCurrentSystem(systemName);
      console.log(`✅ ELO system changed to: ${systemName}`);
    }
  };

  const runDemonstration = () => {
    console.log('🎯 Running ELO system demonstration...');
    
    // Mock players for demonstration
    const team1 = [
      { id: '1', name: 'Player A', elo_rating: 1600, elo_games_played: 50, skill_level: 'Advanced' },
      { id: '2', name: 'Player B', elo_rating: 1580, elo_games_played: 45, skill_level: 'Advanced' }
    ];
    const team2 = [
      { id: '3', name: 'Player C', elo_rating: 1450, elo_games_played: 40, skill_level: 'Intermediate' },
      { id: '4', name: 'Player D', elo_rating: 1470, elo_games_played: 35, skill_level: 'Intermediate' }
    ];
    
    // Test different margins
    const scenarios = [
      { name: 'Close Win', scores: [21, 19], description: 'Tight game, minimal margin' },
      { name: 'Comfortable Win', scores: [21, 16], description: 'Clear victory' },
      { name: 'Dominant Win', scores: [21, 10], description: 'One-sided match' },
      { name: 'Crushing Victory', scores: [21, 5], description: 'Complete domination' }
    ];
    
    const results = {};
    
    scenarios.forEach(scenario => {
      results[scenario.name] = {
        ...scenario,
        systems: {}
      };
      
      // Test each system
      ['standard', 'fifa', 'conservative', 'aggressive'].forEach(systemName => {
        try {
          eloSystemManager.setSystem(systemName);
          const result = eloSystemManager.processMatch(team1, team2, scenario.scores[0], scenario.scores[1]);
          
          const player1Change = result.playerEloUpdates?.find(u => u.playerId === '1');
          if (player1Change) {
            results[scenario.name].systems[systemName] = {
              change: player1Change.ratingChange,
              marginMultiplier: player1Change.marginMultiplier || 1.0,
              newRating: player1Change.newRating
            };
          }
        } catch (error) {
          console.error(`Error testing ${systemName}:`, error);
        }
      });
    });
    
    // Restore original system
    eloSystemManager.setSystem(currentSystem);
    setDemoResults(results);
    setShowDemo(true);
  };

  const systemDescriptions = eloSystemManager.getSystemDescriptions();
  const availableSystems = eloSystemManager.getAvailableSystems();

  return (
    <div className="elo-system-settings max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Settings size={24} className="text-purple-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                ELO Rating System Configuration
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                Choose how match results affect player ratings
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Available ELO Systems</h3>
            <div className="grid gap-4">
              {availableSystems.map(systemName => {
                const desc = systemDescriptions[systemName];
                const isActive = currentSystem === systemName;
                
                return (
                  <div
                    key={systemName}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      isActive 
                        ? 'border-purple-500 bg-purple-50' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => handleSystemChange(systemName)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`w-4 h-4 rounded-full border-2 ${
                            isActive ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                          }`}>
                            {isActive && <div className="w-2 h-2 bg-white rounded-full m-0.5" />}
                          </div>
                          <h4 className="font-medium text-gray-900">{desc.name}</h4>
                          {desc.marginSupport && (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                              Margin Scaling
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-1">{desc.description}</p>
                        <p className="text-xs text-gray-500">Best for: {desc.bestFor}</p>
                      </div>
                      {isActive && (
                        <div className="text-purple-600 font-medium text-sm">
                          ✓ Active
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info size={20} className="text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">About Margin Scaling</h4>
                  <p className="text-sm text-blue-800 mb-2">
                    Margin scaling adjusts ELO changes based on how decisively a match was won:
                  </p>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• <strong>21-19 win:</strong> Standard ELO change</li>
                    <li>• <strong>21-15 win:</strong> Slight bonus for clear victory</li>
                    <li>• <strong>21-8 win:</strong> Larger bonus for dominant performance</li>
                    <li>• <strong>Logarithmic scaling:</strong> Prevents extreme bonuses for huge margins</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={runDemonstration}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <BarChart3 size={18} />
              Compare Systems
            </button>
            
            <button
              onClick={() => {
                console.log('🎯 Running margin effects demonstration...');
                eloSystemManager.demonstrateMarginEffects();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <TrendingUp size={18} />
              Console Demo
            </button>
          </div>
        </div>

        {showDemo && demoResults && (
          <div className="border-t border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">System Comparison Results</h3>
              <button
                onClick={() => setShowDemo(false)}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Hide
              </button>
            </div>
            
            <div className="space-y-4">
              {Object.entries(demoResults).map(([scenarioName, scenario]) => (
                <div key={scenarioName} className="bg-gray-50 rounded-lg p-4">
                  <div className="mb-3">
                    <h4 className="font-medium text-gray-900">{scenarioName}</h4>
                    <p className="text-sm text-gray-600">
                      {scenario.scores[0]}-{scenario.scores[1]} • {scenario.description}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(scenario.systems).map(([systemName, result]) => (
                      <div key={systemName} className="text-center">
                        <div className="text-xs text-gray-500 uppercase mb-1">
                          {systemName}
                        </div>
                        <div className={`text-lg font-semibold ${
                          result.change > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {result.change > 0 ? '+' : ''}{result.change}
                        </div>
                        {result.marginMultiplier > 1 && (
                          <div className="text-xs text-purple-600">
                            {result.marginMultiplier.toFixed(2)}x margin
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              <strong>Notice:</strong> Higher-margin victories receive larger ELO bonuses with margin scaling systems. 
              The FIFA system provides the most balanced approach used in professional sports.
            </div>
          </div>
        )}

        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="text-sm text-gray-600">
            <p className="mb-2">
              <strong>Current System:</strong> {systemDescriptions[currentSystem]?.name}
            </p>
            <p>
              Changes take effect immediately for all new matches. Existing match history is not affected.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EloSystemSettings;