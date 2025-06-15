import React, { useState } from 'react';
import { useLeague } from '../context/LeagueContext';
import TeamForm from '../components/TeamForm';
import TeamList from '../components/TeamList';
import Modal from '../components/Modal';
// Import roundRobinScheduler directly to avoid circular dependency
import { roundRobinScheduler } from '../utils/schedulingUtils';
import { Plus, Shuffle, Calendar, Trash2 } from 'lucide-react';

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
    console.log('handleAddTeam called'); // Debug log
    setSelectedTeam(null);
    setIsModalOpen(true);
  };

  // FIXED: Direct call to roundRobinScheduler instead of through context
  const handleAutoGenerateTeams = async () => {
    console.log('Starting auto team generation with players:', players);
    setIsGeneratingTeams(true);
    
    try {
      if (!players || players.length < 2) {
        alert('Not enough players to generate teams. You need at least 2 players.');
        setIsAutoGenerateModalOpen(false);
        setIsGeneratingTeams(false);
        return;
      }

      const generatedTeams = roundRobinScheduler.generateSkillBasedTeams(players);
      
      if (generatedTeams.length === 0) {
        alert('No teams could be generated with the current players.');
        setIsAutoGenerateModalOpen(false);
        setIsGeneratingTeams(false);
        return;
      }

      let successCount = 0;
      for (const team of generatedTeams) {
        try {
          await addTeam({
            name: team.name,
            skillCombination: team.skill_combination,
            playerIds: team.playerIds
          });
          successCount++;
        } catch (teamError) {
          console.error('Error adding team:', team.name, teamError);
        }
      }

      setIsAutoGenerateModalOpen(false);
      alert(`Successfully generated ${successCount} teams!`);
      
    } catch (error) {
      console.error('Error generating teams:', error);
      alert('Error generating teams: ' + error.message);
    } finally {
      setIsGeneratingTeams(false);
    }
  };

  // Rest of your existing component code remains the same...
  // Just ensure the button calls handleAddTeam correctly:
  
  return (
    <div className="teams-page">
      <div className="container">
        <div className="page-header">
          <h1>Teams Management</h1>
          <div className="header-actions">
            <button 
              onClick={() => setIsAutoGenerateModalOpen(true)} 
              className="btn btn-secondary"
              disabled={players.length < 2 || isGeneratingTeams}
            >
              <Shuffle size={18} />
              {isGeneratingTeams ? 'Generating...' : 'Auto Generate Teams'}
            </button>
            <button onClick={handleAddTeam} className="btn btn-primary">
              <Plus size={18} />
              Add Team
            </button>
          </div>
        </div>

        <TeamList teams={teams} onEdit={handleEditTeam} onDelete={handleDeleteTeam} />

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

        {/* Auto-generate modal */}
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

