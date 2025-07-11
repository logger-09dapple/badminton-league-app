import React, { useState } from 'react';
import { useLeague } from '../context/LeagueContext';
import TeamForm from '../components/TeamForm';
import TeamList from '../components/TeamList';
import Modal from '../components/Modal';
import { roundRobinScheduler } from '../utils/schedulingUtils';
import { Plus, Shuffle, Calendar, Trash2 } from 'lucide-react';
import ProtectedAdminButton from '../components/ProtectedAdminButton';

const Teams = () => {
  const { 
    teams, 
    players, 
    loading, 
    error, 
    addTeam, 
    updateTeam, 
    deleteTeam,
    deleteAllTeams,
    generateRoundRobinSchedule 
  } = useLeague();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [isAutoGenerateModalOpen, setIsAutoGenerateModalOpen] = useState(false);
  const [isGeneratingTeams, setIsGeneratingTeams] = useState(false);

  const handleAddTeam = () => {
    setSelectedTeam(null);
    setIsModalOpen(true);
  };

  // MISSING FUNCTION - Add this to fix the error
  const handleEditTeam = (team) => {
    console.log('Editing team:', team);
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
      alert('Error saving team: ' + error.message);
    }
  };

  const handleDeleteTeam = async (teamId) => {
    if (window.confirm('Are you sure you want to delete this team?')) {
      try {
        await deleteTeam(teamId);
      } catch (error) {
        console.error('Error deleting team:', error);
        alert('Error deleting team: ' + error.message);
      }
    }
  };

  const handleDeleteAllTeams = async () => {
    const confirmMessage = `Are you sure you want to delete ALL ${teams.length} teams? This action cannot be undone.`;
    
    if (window.confirm(confirmMessage)) {
      try {
        await deleteAllTeams();
        alert('All teams have been deleted successfully.');
      } catch (error) {
        console.error('Error deleting all teams:', error);
        alert('Error deleting all teams: ' + error.message);
      }
    }
  };

  const handleAutoGenerateTeams = async () => {
    setIsGeneratingTeams(true);
    try {
      console.log('Starting auto team generation with players:', players);
      
      if (!players || players.length < 2) {
        alert('Not enough players to generate teams. You need at least 2 players.');
        setIsAutoGenerateModalOpen(false);
        setIsGeneratingTeams(false);
        return;
      }

      const generatedTeams = roundRobinScheduler.generateSkillBasedTeams(players);
      
      if (generatedTeams.length === 0) {
        alert('No teams could be generated with the current players. Please check player skill levels and gender assignments.');
        setIsAutoGenerateModalOpen(false);
        setIsGeneratingTeams(false);
        return;
      }

      console.log('Generated teams:', generatedTeams);

      let successCount = 0;
      for (const team of generatedTeams) {
        try {
          await addTeam({
            name: team.name,
            skillCombination: team.skill_combination,
            teamType: team.team_type || 'same-gender',
            playerIds: team.playerIds
          });
          successCount++;
        } catch (teamError) {
          console.error('Error adding team:', team.name, teamError);
        }
      }

      setIsAutoGenerateModalOpen(false);
      alert(`Successfully generated ${successCount} teams out of ${generatedTeams.length} possible teams!`);
      
    } catch (error) {
      console.error('Error generating teams:', error);
      alert('Error generating teams: ' + error.message);
    } finally {
      setIsGeneratingTeams(false);
    }
  };

  const handleGenerateSchedule = () => {
    try {
      if (teams.length < 2) {
        alert('You need at least 2 teams to generate a schedule.');
        return;
      }
      
      const schedule = generateRoundRobinSchedule();
      if (schedule && schedule.length > 0) {
        alert(`Schedule generated! ${schedule.length} rounds with multiple matches each.`);
      } else {
        alert('No schedule was generated. Please check if you have enough teams.');
      }
    } catch (error) {
      console.error('Error generating schedule:', error);
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
            <ProtectedAdminButton 
              onClick={() => setIsAutoGenerateModalOpen(true)} 
              className="btn btn-secondary"
              disabled={players.length < 2 || isGeneratingTeams}
              protectedAction="Auto Generate Teams"
            >
              <Shuffle size={18} />
              {isGeneratingTeams ? 'Generating...' : 'Auto Generate Teams'}
            </ProtectedAdminButton>
            
            <ProtectedAdminButton 
              onClick={handleGenerateSchedule} 
              className="btn btn-secondary"
              disabled={teams.length < 2}
              protectedAction="Generate Schedule"
            >
              <Calendar size={18} />
              Generate Schedule
            </ProtectedAdminButton>
            
            {teams.length > 0 && (
              <button 
                onClick={handleDeleteAllTeams} 
                className="btn btn-danger"
                title="Delete all teams"
              >
                <Trash2 size={18} />
                Delete All Teams
              </button>
            )}
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
            <p>Generate teams automatically based on skill levels?</p>
            <div className="modal-actions">
              <button 
                onClick={() => setIsAutoGenerateModalOpen(false)} 
                className="btn btn-secondary"
                disabled={isGeneratingTeams}
              >
                Cancel
              </button>
              <button 
                onClick={handleAutoGenerateTeams} 
                className="btn btn-primary"
                disabled={isGeneratingTeams}
              >
                {isGeneratingTeams ? 'Generating...' : 'Generate Teams'}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default Teams;

