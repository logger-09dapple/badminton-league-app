import React, { useState } from 'react';
import { useLeague } from '../context/LeagueContext';
import PlayerForm from '../components/PlayerForm';
import PlayerList from '../components/PlayerList';
import Modal from '../components/Modal';
import { Plus, Search } from 'lucide-react';

const Players = () => {
  const { players, loading, error, addPlayer, updatePlayer, deletePlayer } = useLeague();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [skillFilter, setSkillFilter] = useState('all');

  // Filter players based on search term and skill level
  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         player.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSkill = skillFilter === 'all' || player.skill_level === skillFilter;
    return matchesSearch && matchesSkill;
  });

  const handleAddPlayer = () => {
    setSelectedPlayer(null);
    setIsModalOpen(true);
  };

  const handleEditPlayer = (player) => {
    setSelectedPlayer(player);
    setIsModalOpen(true);
  };

  const handlePlayerSubmit = async (playerData) => {
    try {
      if (selectedPlayer) {
        await updatePlayer(selectedPlayer.id, playerData);
      } else {
        await addPlayer(playerData);
      }
      setIsModalOpen(false);
      setSelectedPlayer(null);
    } catch (error) {
      console.error('Error saving player:', error);
    }
  };

  const handleDeletePlayer = async (playerId) => {
    if (window.confirm('Are you sure you want to delete this player?')) {
      try {
        await deletePlayer(playerId);
      } catch (error) {
        console.error('Error deleting player:', error);
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading players...</div>;
  }

  return (
    <div className="players-page">
      <div className="container">
        <div className="page-header">
          <h1>Players Management</h1>
          <button onClick={handleAddPlayer} className="btn btn-primary">
            <Plus size={18} />
            Add Player
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="filters-section">
          <div className="search-input">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            className="skill-filter"
          >
            <option value="all">All Skill Levels</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>
        </div>

        <PlayerList
          players={filteredPlayers}
          onEdit={handleEditPlayer}
          onDelete={handleDeletePlayer}
        />

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={selectedPlayer ? 'Edit Player' : 'Add New Player'}
        >
          <PlayerForm
            player={selectedPlayer}
            onSubmit={handlePlayerSubmit}
            onCancel={() => setIsModalOpen(false)}
          />
        </Modal>
      </div>
    </div>
  );
};

export default Players;