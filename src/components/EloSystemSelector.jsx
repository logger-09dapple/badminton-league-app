import React, { useState, useEffect } from 'react';
import { Settings, Info, BarChart3 } from 'lucide-react';
import { eloSystemManager } from '../services/eloSystemManager';

const EloSystemSelector = () => {
  const [currentSystem, setCurrentSystem] = useState('standard');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setCurrentSystem(eloSystemManager.getCurrentSystemName());
  }, []);

  const handleSystemChange = (systemName) => {
    if (eloSystemManager.setSystem(systemName)) {
      setCurrentSystem(systemName);
      console.log(`✅ ELO system changed to: ${systemName}`);
      
      // Show confirmation
      const systemDesc = eloSystemManager.getSystemDescriptions()[systemName];
      alert(`ELO system changed to: ${systemDesc.name}\n\nThis will affect all future ELO calculations including setup processing.`);
    }
  };

  const systemDescriptions = eloSystemManager.getSystemDescriptions();
  const availableSystems = eloSystemManager.getAvailableSystems();

  return (
    <div className="elo-system-selector bg-white rounded-lg shadow-md border border-gray-200 mb-6">
      <div 
        className="p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 size={20} className="text-purple-600" />
            <div>
              <h3 className="font-medium text-gray-900">ELO Calculation System</h3>
              <p className="text-sm text-gray-600">
                Current: {systemDescriptions[currentSystem]?.name} 
                {systemDescriptions[currentSystem]?.marginSupport && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">
                    Margin Scaling
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {isExpanded ? 'Click to collapse' : 'Click to configure'}
            </span>
            <Settings size={16} className="text-gray-400" />
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4">
          <div className="mb-4">
            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Info size={16} className="text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Important:</p>
                <p>The selected ELO system will be used for all ELO calculations, including setup processing (Complete Setup, Player ELO, Team ELO buttons).</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {availableSystems.map(systemName => {
              const desc = systemDescriptions[systemName];
              const isActive = currentSystem === systemName;
              
              return (
                <div
                  key={systemName}
                  className={`border rounded-lg p-3 cursor-pointer transition-all ${
                    isActive 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => handleSystemChange(systemName)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <div className={`w-3 h-3 rounded-full border-2 ${
                          isActive ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                        }`}>
                          {isActive && <div className="w-1 h-1 bg-white rounded-full m-0.5" />}
                        </div>
                        <h4 className="font-medium text-gray-900">{desc.name}</h4>
                        {desc.marginSupport && (
                          <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">
                            Margin Scaling
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 ml-6">{desc.description}</p>
                      <p className="text-xs text-gray-500 ml-6 mt-1">Best for: {desc.bestFor}</p>
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

          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Info size={14} className="text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">ELO System Effects:</p>
                <ul className="mt-1 space-y-1 list-disc list-inside">
                  <li><strong>Setup Processing:</strong> All ELO calculations during setup use this system</li>
                  <li><strong>Future Matches:</strong> New match scores will use this system</li>
                  <li><strong>Existing Data:</strong> Previous matches are not recalculated</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EloSystemSelector;