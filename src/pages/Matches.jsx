import React, { useState } from 'react';
import { useLeague } from '../context/LeagueContext';
import MatchForm from '../components/MatchForm';
import MatchList from '../components/MatchList';
import MatchScheduler from '../components/MatchScheduler';
import Modal from '../components/Modal';
import { Plus, Calendar, Clock } from 'lucide-react';

const Matches = () => {
  const { 
    matches, 
    teams, 
    players,
    loading, 
    error, 
    addMatch, 
    updateMatch 
  } = useLeague();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  // Filter matches based on status
  const filteredMatches = matches.filter(match => {
    return statusFilter === 'all' || match.status === statusFilter;
  });

  const handleAddMatch = () => {
    setSelectedMatch(null);
    setIsModalOpen(true);
  };

  const handleEditMatch = (match) => {
    setSelectedMatch(match);
    setIsModalOpen(true);
  };

  const handleMatchSubmit = async (matchData) => {
    try {
      if (selectedMatch) {
        await updateMatch(selectedMatch.id, matchData);
      } else {
        await addMatch(matchData);
      }
      setIsModalOpen(false);
      setSelectedMatch(null);
    } catch (error) {
      console.error('Error saving match:', error);
    }
  };

  const handleScheduleMatch = async (matchId, scheduleData) => {
    try {
      await updateMatch(matchId, {
        scheduledDate: scheduleData.date,
        status: 'scheduled'
      });
    } catch (error) {
      console.error('Error scheduling match:', error);
    }
  };

  const handleUpdateScore = async (matchId, scoreData) => {
    try {
      const winnerTeamId = scoreData.team1Score > scoreData.team2Score 
        ? scoreData.team1Id 
        : scoreData.team2Id;

      await updateMatch(matchId, {
        team1Score: scoreData.team1Score,
        team2Score: scoreData.team2Score,
        winnerTeamId,
        status: 'completed',
        matchDate: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('Error updating score:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading matches...</div>;
  }

  return (
    <div className="matches-page">
      <div className="container">
        <div className="page-header">
          <h1>Matches Management</h1>
          <div className="header-actions">
            <button 
              onClick={() => setIsSchedulerOpen(true)} 
              className="btn btn-secondary"
              disabled={matches.filter(m => m.status === 'scheduled').length === 0}
            >
              <Clock size={18} />
              Schedule Matches
            </button>
            <button onClick={handleAddMatch} className="btn btn-primary">
              <Plus size={18} />
              Add Match
            </button>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="matches-filters">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="status-filter"
          >
            <option value="all">All Matches</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="matches-stats">
          <div className="stat-item">
            <span className="stat-label">Total Matches:</span>
            <span className="stat-value">{matches.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Completed:</span>
            <span className="stat-value">
              {matches.filter(m => m.status === 'completed').length}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Scheduled:</span>
            <span className="stat-value">
              {matches.filter(m => m.status === 'scheduled').length}
            </span>
          </div>
        </div>

        <MatchList
          matches={filteredMatches}
          teams={teams}
          onEdit={handleEditMatch}
          onSchedule={handleScheduleMatch}
          onUpdateScore={handleUpdateScore}
        />

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={selectedMatch ? 'Edit Match' : 'Add New Match'}
        >
          <MatchForm
            match={selectedMatch}
            teams={teams}
            onSubmit={handleMatchSubmit}
            onCancel={() => setIsModalOpen(false)}
          />
        </Modal>

        <Modal
          isOpen={isSchedulerOpen}
          onClose={() => setIsSchedulerOpen(false)}
          title="Schedule Matches"
        >
          <MatchScheduler
            matches={matches.filter(m => m.status === 'scheduled')}
            players={players}
            onSchedule={handleScheduleMatch}
            onClose={() => setIsSchedulerOpen(false)}
          />
        </Modal>
      </div>
    </div>
  );
};

export default Matches;
