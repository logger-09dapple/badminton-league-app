import React, { useState } from 'react';
import { useLeague } from '../context/LeagueContext';
import TeamForm from '../components/TeamForm';
import TeamList from '../components/TeamList';
import Modal from '../components/Modal';
import ProtectedAdminButton from '../components/ProtectedAdminButton';
import AdminAuth from '../utils/adminAuth';
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
    generateAutomaticTeams,
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

  // Regular delete all teams (no password required for now, but could be protected)
  const handleDeleteAllTeams = async () => {
    AdminAuth.logAdminAction('Deleting all teams?');
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

  // PROTECTED: Auto generate teams (requires admin password)
  const handleAutoGenerateTeams = async () => {
    AdminAuth.logAdminAction('Auto Generate Teams Initiated');
    setIsGeneratingTeams(true);

try {
    const result = await generateAutomaticTeams(players);
    
    setIsAutoGenerateModalOpen(false);
    alert(result.message);
    
  } catch (error) {
    console.error('Team generation failed:', error);
    alert('❌ Team generation failed: ' + error.message);
  } finally {
    setIsGeneratingTeams(false);
  }
};

  // PROTECTED: Generate schedule (requires admin password)
  const handleGenerateSchedule = async () => {
    AdminAuth.logAdminAction('Auto Generate Schedule Initiated');

    try {
      if (teams.length < 2) {
        alert('You need at least 2 teams to generate a schedule.');
        return;
      }
      
      console.log('Generating schedule for teams:', teams);
      const schedule = await generateRoundRobinSchedule();

    if (schedule && schedule.length > 0) {
      const skillCombinations = [...new Set(schedule.map(match => match.skill_combination))];
      const message = `🏆 Schedule generated successfully!\n\n` +
                     `📊 Total matches: ${schedule.length}\n` +
                     `🎯 Skill combinations: ${skillCombinations.join(', ')}\n\n` +
                     `All matches ensure:\n` +
                     `✅ Same skill level teams only\n` +
                     `✅ No player appears in both teams\n` +
                     `✅ Exactly 4 different players per match`;
      
      alert(message);
    } else {
      alert('❌ No schedule was generated. Please check if you have enough valid teams.');
    }
  } catch (error) {
    console.error('Schedule generation failed:', error);
    alert('❌ Schedule generation failed: ' + error.message);
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
            {/* Regular buttons (no protection needed) */}
 <button 
 onClick={() => setIsAutoGenerateModalOpen(true)} 
 className="btn btn-secondary"
 disabled={players.length < 2 || isGeneratingTeams}
 >
 <Shuffle size={18} />
 {isGeneratingTeams ? 'Generating...' : 'Auto Generate Teams'}
 </button>
 <button 
 onClick={handleGenerateSchedule} 
 className="btn btn-secondary"
 disabled={teams.length < 2}
 >
 <Calendar size={18} />
 Generate Schedule
 </button>
 {teams.length > 0 && (
 <ProtectedAdminButton 
 onClick={handleDeleteAllTeams} 
 className="btn btn-danger"
 title="Delete all teams"
 >
 <Trash2 size={18} />
 Delete All Teams
 </ProtectedAdminButton>
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
          {AdminAuth.isAdminPasswordConfigured() && (
            <div className="stat-item admin-security-level">
              <span className="stat-label">Admin Security:</span>
              <span className={`stat-value security-${AdminAuth.getSecurityLevel().toLowerCase()}`}>
                {AdminAuth.getSecurityLevel()}
              </span>
            </div>
          )}
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
 <p><strong>Available players by skill level:</strong></p>
 <ul>
 <li>Advanced: {players.filter(p => p.skill_level === 'Advanced').length}</li>
 <li>Intermediate: {players.filter(p => p.skill_level === 'Intermediate').length}</li>
 <li>Beginner: {players.filter(p => p.skill_level === 'Beginner').length}</li>
 </ul>
 <p>Are you sure you want to generate teams automatically?</p>
 <div className="modal-actions">
 <button 
 onClick={() => setIsAutoGenerateModalOpen(false)} 
 className="btn btn-secondary"
 disabled={isGeneratingTeams}
 >
 Cancel
 </button>
 <ProtectedAdminButton 
 onClick={handleAutoGenerateTeams} 
 className="btn btn-primary"
 disabled={isGeneratingTeams}
 >
 {isGeneratingTeams ? 'Generating...' : 'Generate Teams'}
 </ProtectedAdminButton>
 </div>
 </div>
 </Modal>
 </div>
 </div>
 );
};

export default Teams;

