import React, { useState } from 'react';
import { useLeague } from '../context/LeagueContext';
import TeamForm from '../components/TeamForm';
import TeamList from '../components/TeamList';
import Modal from '../components/Modal';
import { roundRobinScheduler } from '../utils/schedulingUtils';
import { Plus, Shuffle, Calendar } from 'lucide-react';

const Teams = () => {
  const { 
    teams, 
    players, 
    loading, 
    error, 
    addTeam, 
    updateTeam, 
    deleteTeam,
    generateRoundRobinSchedule 
  } = useLeague();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [isAutoGenerateModalOpen, setIsAutoGenerateModalOpen] = useState(false);

  const handleAddTeam = () => {
    setSelectedTeam(null);
    setIsModalOpen(true);
  };

  const handleEditTeam = (team) => {
    setSelectedTeam(team);
    setIsModalOpen(true);
  };

  const handleTeamSubmit = async (teamData) => {
    try {
      if (selectedTeam) {
        await updateTeam(selectedTeam.id, teamData);
      } else {
        await addTeam(teamData);
      }
      setIsModalOpen(false);
      setSelectedTeam(null);
    } catch (error) {
      console.error('Error saving team:', error);
    }
  };

  const handleDeleteTeam = async (teamId) => {
    if (window.confirm('Are you sure you want to delete this team?')) {
      try {
        await deleteTeam(teamId);
      } catch (error) {
        console.error('Error deleting team:', error);
      }
    }
  };

  const handleAutoGenerateTeams = async () => {
    try {
      const generatedTeams = roundRobinScheduler.generateSkillBasedTeams(players);

      // Add all generated teams
      for (const team of generatedTeams) {
        await addTeam({
          name: team.name,
          skillCombination: team.skill_combination,
          playerIds: team.playerIds
        });
      }

      setIsAutoGenerateModalOpen(false);
    } catch (error) {
      console.error('Error generating teams:', error);
    }
  };

  const handleGenerateSchedule = () => {
    try {
      const schedule = generateRoundRobinSchedule();
      alert(\`Schedule generated! \${schedule.length} rounds with multiple matches each.\`);
    } catch (error) {
      alert('Error generating schedule: ' + error.message);
    }
  };

  if (loading) {
    return <div className="loading">Loading teams...</div>;
  }

  return (
    <div className="teams-page">
      <div className="container">
        <div className="page-header">
          <h1>Teams Management</h1>
          <div className="header-actions">
            <button 
              onClick={() => setIsAutoGenerateModalOpen(true)} 
              className="btn btn-secondary"
              disabled={players.length < 2}
            >
              <Shuffle size={18} />
              Auto Generate Teams
            </button>
            <button 
              onClick={handleGenerateSchedule} 
              className="btn btn-secondary"
              disabled={teams.length < 2}
            >
              <Calendar size={18} />
              Generate Schedule
            </button>
            <button onClick={handleAddTeam} className="btn btn-primary">
              <Plus size={18} />
              Add Team
            </button>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="teams-stats">
          <div className="stat-item">
            <span className="stat-label">Total Teams:</span>
            <span className="stat-value">{teams.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Available Players:</span>
            <span className="stat-value">{players.length}</span>
          </div>
        </div>

        <TeamList
          teams={teams}
          onEdit={handleEditTeam}
          onDelete={handleDeleteTeam}
        />

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={selectedTeam ? 'Edit Team' : 'Add New Team'}
        >
          <TeamForm
            team={selectedTeam}
            players={players}
            onSubmit={handleTeamSubmit}
            onCancel={() => setIsModalOpen(false)}
          />
        </Modal>

        <Modal
          isOpen={isAutoGenerateModalOpen}
          onClose={() => setIsAutoGenerateModalOpen(false)}
          title="Auto Generate Teams"
        >
          <div className="auto-generate-modal">
            <p>This will automatically generate teams based on skill level combinations:</p>
            <ul>
              <li>Advanced-Advanced</li>
              <li>Advanced-Intermediate</li>
              <li>Advanced-Beginner</li>
              <li>Intermediate-Intermediate</li>
              <li>Intermediate-Beginner</li>
              <li>Beginner-Beginner</li>
            </ul>
            <p>Are you sure you want to generate teams automatically?</p>
            <div className="modal-actions">
              <button onClick={() => setIsAutoGenerateModalOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={handleAutoGenerateTeams} className="btn btn-primary">
                Generate Teams
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default Teams;
