import React, { useState, useEffect } from 'react';
import { Settings, Info, BarChart3, Zap, RefreshCw } from 'lucide-react';
import { eloSystemManager } from '../services/eloSystemManager';

const EloSystemSelector = () => {
  const [currentSystem, setCurrentSystem] = useState('standard');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [persistenceStatus, setPersistenceStatus] = useState('checking');

  useEffect(() => {
    const initializeSystem = async () => {
      setIsLoading(true);
      try {
        // Wait for async initialization if needed
        const systemName = await eloSystemManager.getCurrentSystemAsync();
      setCurrentSystem(systemName);
        setPersistenceStatus('ready');
        console.log(`🎯 ELO System Selector initialized with: ${systemName}`);
      } catch (error) {
        console.warn('Error initializing ELO system:', error);
        setCurrentSystem(eloSystemManager.getCurrentSystemName());
        setPersistenceStatus('localStorage-only');
      } finally {
        setIsLoading(false);
    }
  };

    initializeSystem();
  }, []);

  const handleSystemChange = async (systemName) => {
    setIsLoading(true);
    try {
      if (eloSystemManager.setSystem(systemName)) {
        setCurrentSystem(systemName);
        console.log(`✅ ELO system changed to: ${systemName}`);

        // Show prominent confirmation
        setShowConfirmation(true);
        setTimeout(() => setShowConfirmation(false), 5000);

        // Update persistence status
        setPersistenceStatus('ready');
      } else {
        console.error(`Failed to set ELO system: ${systemName}`);
      }
    } catch (error) {
      console.error('Error changing ELO system:', error);
      setPersistenceStatus('error');
    } finally {
      setIsLoading(false);
    }
};

  const systemDescriptions = eloSystemManager.getSystemDescriptions();
  const availableSystems = eloSystemManager.getAvailableSystems();
  const currentDesc = systemDescriptions[currentSystem];

  if (isLoading && !currentDesc) {
    return (
      <div className="elo-system-selector mb-6">
        <div style={{
          background: 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)',
          color: 'white',
          padding: '1.5rem',
          borderRadius: '1rem',
          marginBottom: '1rem',
          boxShadow: '0 8px 25px -8px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem'
        }}>
          <RefreshCw size={24} className="animate-spin" />
          <span>Loading ELO system configuration...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="elo-system-selector mb-6">
      {/* Prominent Status Banner */}
      <div style={{
        background: currentDesc?.marginSupport 
          ? 'linear-gradient(135deg, #065f46 0%, #059669 100%)'
          : 'linear-gradient(135deg, #374151 0%, #6b7280 100%)',
        color: 'white',
        padding: '1.5rem',
        borderRadius: '1rem',
        marginBottom: '1rem',
        boxShadow: '0 8px 25px -8px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
          <div style={{
            width: '3rem',
            height: '3rem',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {currentDesc?.marginSupport ?
              <BarChart3 size={24} /> :
              <Settings size={24} />
            }
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: '1.25rem',
              fontWeight: 'bold',
              marginBottom: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              Active ELO System: {currentDesc?.name}
              {currentDesc?.marginSupport && (
                <span style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '1rem',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}>
                  MARGIN SCALING
                </span>
              )}
              {/* Persistence Status Indicator */}
              <span style={{
                backgroundColor: persistenceStatus === 'ready' ? 'rgba(34, 197, 94, 0.3)' :
                                 persistenceStatus === 'localStorage-only' ? 'rgba(251, 191, 36, 0.3)' :
                                 persistenceStatus === 'error' ? 'rgba(239, 68, 68, 0.3)' :
                                 'rgba(156, 163, 175, 0.3)',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.375rem',
                fontSize: '0.7rem',
                fontWeight: '500'
              }}>
                {persistenceStatus === 'ready' ? '💾 SAVED' :
                 persistenceStatus === 'localStorage-only' ? '💻 LOCAL' :
                 persistenceStatus === 'error' ? '⚠️ ERROR' :
                 '⏳ CHECKING'}
              </span>
            </div>
            <p style={{ margin: '0', opacity: 0.9, fontSize: '0.9rem' }}>
              {currentDesc?.description}
            </p>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            disabled={isLoading}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              opacity: isLoading ? 0.7 : 1
            }}
            onMouseOver={(e) => !isLoading && (e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)')}
            onMouseOut={(e) => !isLoading && (e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)')}
          >
            {isLoading ? 'Loading...' : isExpanded ? 'Hide Options' : 'Change System'}
          </button>
        </div>

        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          padding: '1rem',
          borderRadius: '0.75rem',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Zap size={16} />
            <strong style={{ fontSize: '0.9rem' }}>Setup & Match Impact:</strong>
          </div>
          <div style={{ fontSize: '0.875rem', opacity: 0.95, lineHeight: 1.4 }}>
            {currentDesc?.marginSupport ? (
              <>
                ✅ <strong>Complete Setup, Player ELO, Team ELO buttons</strong> will use <strong>{currentDesc.name}</strong><br/>
                ✅ <strong>All new matches and score updates</strong> will receive ELO bonuses for larger victory margins<br/>
                📊 <strong>Example:</strong> 21-8 victory gets ~35% more ELO than 21-19 victory
              </>
            ) : (
              <>
                📊 <strong>Complete Setup, Player ELO, Team ELO buttons</strong> will use <strong>Standard ELO</strong><br/>
                📊 <strong>All new matches and score updates</strong> treat victories equally regardless of margin<br/>
                ⚖️ <strong>Example:</strong> 21-8 victory gets same ELO as 21-19 victory
              </>
            )}
          </div>
        </div>

        {/* Persistence Status Details */}
        {persistenceStatus === 'localStorage-only' && (
          <div style={{
            backgroundColor: 'rgba(251, 191, 36, 0.2)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            borderRadius: '0.5rem',
            padding: '0.75rem',
            marginTop: '1rem',
            fontSize: '0.875rem'
          }}>
            💻 <strong>Using local storage only.</strong> Settings will persist on this device but won't sync across devices.
          </div>
        )}

        {persistenceStatus === 'error' && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '0.5rem',
            padding: '0.75rem',
            marginTop: '1rem',
            fontSize: '0.875rem'
          }}>
            ⚠️ <strong>Persistence error.</strong> Settings saved locally but database sync failed.
          </div>
        )}
      </div>

      {/* Confirmation Message */}
      {showConfirmation && (
        <div style={{
          backgroundColor: '#ecfdf5',
          border: '2px solid #10b981',
          borderRadius: '0.75rem',
          padding: '1rem',
          marginBottom: '1rem',
          animation: 'fadeIn 0.3s ease-in-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#065f46' }}>
            <div style={{
              width: '2rem',
              height: '2rem',
              backgroundColor: '#d1fae5',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              ✅
            </div>
            <div>
              <p style={{ margin: '0', fontWeight: '600', fontSize: '0.95rem' }}>
                ELO System Changed to {currentDesc?.name}!
              </p>
              <p style={{ margin: '0', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                All setup processing and future matches will now use this system.
                {persistenceStatus === 'ready' && ' Settings saved to database and will persist across devices.'}
                {persistenceStatus === 'localStorage-only' && ' Settings saved locally to this device only.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Database Setup Help */}
      {persistenceStatus === 'localStorage-only' && !showConfirmation && (
        <div style={{
          backgroundColor: '#fef9c3',
          border: '1px solid #facc15',
          borderRadius: '0.75rem',
          padding: '1rem',
              marginBottom: '1rem'
            }}>
          <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem' }}>
            <Info size={20} style={{ color: '#ca8a04', marginTop: '0.125rem', flexShrink: 0 }} />
                <div style={{ fontSize: '0.875rem', color: '#92400e' }}>
              <strong>Want settings to persist across devices?</strong>
              <p style={{ margin: '0.5rem 0 0 0' }}>
                Create a <code style={{ backgroundColor: 'rgba(0,0,0,0.1)', padding: '0.125rem 0.25rem', borderRadius: '0.25rem' }}>league_settings</code> table
                in your Supabase database. See the console for SQL setup instructions, or check the documentation.
              </p>
              </div>
            </div>
          </div>
                    )}

      {/* System Options (Expandable) */}
      {isExpanded && (
        <div style={{
          backgroundColor: 'white',
          border: '2px solid #e5e7eb',
          borderRadius: '1rem',
          padding: '1.5rem',
          animation: 'slideDown 0.3s ease-out'
        }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Settings size={20} className="text-gray-600" />
              <h3 style={{ margin: '0', fontSize: '1.1rem', fontWeight: '600', color: '#1f2937' }}>
                Choose ELO Calculation System
              </h3>
            </div>
            <div style={{
              backgroundColor: '#fef3c7',
              border: '1px solid #fbbf24',
              borderRadius: '0.5rem',
              padding: '0.75rem',
              marginBottom: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'start', gap: '0.5rem' }}>
                <Info size={16} style={{ color: '#d97706', marginTop: '0.125rem' }} />
                <div style={{ fontSize: '0.875rem', color: '#92400e' }}>
                  <strong>Important:</strong> Your selection will immediately affect all ELO calculations including setup processing buttons below.
                </div>
          </div>
          </div>
        </div>

          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {availableSystems.map(systemName => {
              const desc = systemDescriptions[systemName];
              const isActive = currentSystem === systemName;
              
              return (
                <div
                  key={systemName}
                  onClick={() => handleSystemChange(systemName)}
                  style={{
                    border: isActive ? '2px solid #059669' : '2px solid #e5e7eb',
                    backgroundColor: isActive ? '#f0fdf4' : 'white',
                    borderRadius: '0.75rem',
                    padding: '1rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                  onMouseOver={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = '#d1d5db';
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.backgroundColor = 'white';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <div style={{
                      width: '1.25rem',
                      height: '1.25rem',
                      borderRadius: '50%',
                      border: `2px solid ${isActive ? '#059669' : '#d1d5db'}`,
                      backgroundColor: isActive ? '#059669' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {isActive && <div style={{ width: '0.5rem', height: '0.5rem', backgroundColor: 'white', borderRadius: '50%' }} />}
                    </div>

                    <h4 style={{
                      margin: '0',
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: isActive ? '#065f46' : '#374151'
                    }}>
                      {desc.name}
                    </h4>
                    
                    {desc.marginSupport && (
                      <span style={{
                        backgroundColor: isActive ? '#d1fae5' : '#f3f4f6',
                        color: isActive ? '#065f46' : '#6b7280',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        MARGIN SCALING
                      </span>
                    )}
                  </div>

                  <p style={{
                    margin: '0',
                    fontSize: '0.875rem',
                    color: isActive ? '#047857' : '#6b7280',
                    lineHeight: 1.4
                  }}>
                    {desc.description}
                  </p>

                  <p style={{
                    margin: '0',
                    fontSize: '0.75rem',
                    color: isActive ? '#065f46' : '#9ca3af',
                    marginTop: '0.25rem'
                  }}>
                    <strong>Best for:</strong> {desc.bestFor}
                  </p>

                  {isActive && (
                    <div style={{
                      position: 'absolute',
                      top: '1rem',
                      right: '1rem',
                      backgroundColor: '#059669',
                      color: 'white',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      ACTIVE
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            backgroundColor: '#f8fafc',
            borderRadius: '0.75rem',
            border: '1px solid #e2e8f0'
          }}>
            <p style={{ margin: '0', fontSize: '0.875rem', color: '#475569', textAlign: 'center' }}>
              💡 <strong>Tip:</strong> FIFA system is recommended for professional leagues. 
              Standard system provides traditional ELO behavior.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EloSystemSelector;