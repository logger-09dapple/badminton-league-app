// Application State
let appState = {
    teams: [],
    matches: [],
    currentSection: 'dashboard'
};

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupNavigation();
    setupFormHandlers();
    setupModalHandlers();
    updateDashboard();
    showSection('dashboard');
}

// Navigation Management
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav__item');
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            showSection(section);
        });
    });
}

function showSection(sectionName) {
    // Hide all sections
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.classList.remove('section--active');
    });
    
    // Show target section
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('section--active');
    }
    
    // Update navigation
    const navItems = document.querySelectorAll('.nav__item');
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-section') === sectionName) {
            item.classList.add('active');
        }
    });
    
    appState.currentSection = sectionName;
    
    // Update content based on section
    updateSectionContent(sectionName);
}

function updateSectionContent(sectionName) {
    switch(sectionName) {
        case 'dashboard':
            updateDashboard();
            break;
        case 'teams':
            renderTeamsList();
            break;
        case 'matches':
            renderMatchesList();
            break;
        case 'scores':
            renderScoreEntry();
            break;
        case 'standings':
            renderStandings();
            break;
    }
}

// Form Handlers
function setupFormHandlers() {
    const teamForm = document.getElementById('team-form');
    if (teamForm) {
        teamForm.addEventListener('submit', handleTeamSubmission);
    }
}

// Team Management
function showAddTeamForm() {
    const form = document.getElementById('add-team-form');
    if (form) {
        form.style.display = 'block';
        const teamNameInput = document.getElementById('team-name');
        if (teamNameInput) {
            teamNameInput.focus();
        }
    }
}

function hideAddTeamForm() {
    const form = document.getElementById('add-team-form');
    if (form) {
        form.style.display = 'none';
        const teamForm = document.getElementById('team-form');
        if (teamForm) {
            teamForm.reset();
        }
        
        // Reset players list to single input
        const playersList = document.getElementById('players-list');
        if (playersList) {
            playersList.innerHTML = `
                <div class="player-input">
                    <input type="text" class="form-control" placeholder="Player name" required>
                    <button type="button" class="btn btn--sm btn--secondary" onclick="removePlayer(this)">Remove</button>
                </div>
            `;
        }
    }
}

function addPlayerInput() {
    const playersList = document.getElementById('players-list');
    if (playersList) {
        const newPlayerDiv = document.createElement('div');
        newPlayerDiv.className = 'player-input';
        newPlayerDiv.innerHTML = `
            <input type="text" class="form-control" placeholder="Player name" required>
            <button type="button" class="btn btn--sm btn--secondary" onclick="removePlayer(this)">Remove</button>
        `;
        playersList.appendChild(newPlayerDiv);
    }
}

function removePlayer(button) {
    const playersList = document.getElementById('players-list');
    if (playersList && playersList.children.length > 1) {
        button.parentElement.remove();
    }
}

function handleTeamSubmission(event) {
    event.preventDefault();
    
    const teamNameInput = document.getElementById('team-name');
    if (!teamNameInput) return;
    
    const teamName = teamNameInput.value.trim();
    const playerInputs = document.querySelectorAll('#players-list input');
    const players = [];
    
    playerInputs.forEach(input => {
        const playerName = input.value.trim();
        if (playerName) {
            players.push(playerName);
        }
    });
    
    if (!teamName) {
        alert('Please enter a team name.');
        return;
    }
    
    if (players.length === 0) {
        alert('Please add at least one player.');
        return;
    }
    
    // Check for duplicate team name
    if (appState.teams.some(team => team.name.toLowerCase() === teamName.toLowerCase())) {
        alert('A team with this name already exists.');
        return;
    }
    
    const newTeam = {
        id: generateId(),
        name: teamName,
        players: players
    };
    
    appState.teams.push(newTeam);
    hideAddTeamForm();
    renderTeamsList();
    updateDashboard();
    
    // Show success message
    showNotification('Team added successfully!', 'success');
}

function deleteTeam(teamId) {
    showConfirmation(
        'Delete Team',
        'Are you sure you want to delete this team? This will also remove all associated matches.',
        () => {
            appState.teams = appState.teams.filter(team => team.id !== teamId);
            appState.matches = appState.matches.filter(match => 
                match.teamA !== teamId && match.teamB !== teamId
            );
            renderTeamsList();
            updateDashboard();
            showNotification('Team deleted successfully!', 'success');
        }
    );
}

function renderTeamsList() {
    const teamsList = document.getElementById('teams-list');
    if (!teamsList) return;
    
    if (appState.teams.length === 0) {
        teamsList.innerHTML = '<p class="text-secondary">No teams added yet. Click "Add New Team" to get started.</p>';
        return;
    }
    
    const teamsHTML = appState.teams.map(team => `
        <div class="card team-card">
            <div class="card__body">
                <div class="flex justify-between items-center">
                    <h3>${escapeHtml(team.name)}</h3>
                    <button class="btn btn--sm btn--outline" onclick="deleteTeam('${team.id}')">Delete</button>
                </div>
                <div class="team-players">
                    ${team.players.map(player => `<span class="player-tag">${escapeHtml(player)}</span>`).join('')}
                </div>
            </div>
        </div>
    `).join('');
    
    teamsList.innerHTML = teamsHTML;
}

// Match Management
function generateSchedule() {
    if (appState.teams.length < 2) {
        alert('You need at least 2 teams to generate a schedule.');
        return;
    }
    
    showConfirmation(
        'Generate Schedule',
        'This will create a new round-robin schedule. Any existing matches will be replaced.',
        () => {
            appState.matches = [];
            
            // Generate round-robin matches
            for (let i = 0; i < appState.teams.length; i++) {
                for (let j = i + 1; j < appState.teams.length; j++) {
                    const match = {
                        id: generateId(),
                        teamA: appState.teams[i].id,
                        teamB: appState.teams[j].id,
                        scoreA: null,
                        scoreB: null,
                        status: 'pending'
                    };
                    appState.matches.push(match);
                }
            }
            
            renderMatchesList();
            updateDashboard();
            showNotification(`Generated ${appState.matches.length} matches!`, 'success');
        }
    );
}

function renderMatchesList() {
    const matchesList = document.getElementById('matches-list');
    if (!matchesList) return;
    
    if (appState.matches.length === 0) {
        matchesList.innerHTML = '<p class="text-secondary">No matches scheduled yet. Add teams and generate schedule to begin.</p>';
        return;
    }
    
    const matchesHTML = appState.matches.map((match, index) => {
        const teamA = getTeamById(match.teamA);
        const teamB = getTeamById(match.teamB);
        const statusClass = match.status === 'completed' ? 'status--success' : 'status--warning';
        const statusText = match.status === 'completed' ? 'Completed' : 'Pending';
        
        return `
            <div class="match-card">
                <div class="match-info">
                    <div class="match-teams">
                        ${escapeHtml(teamA?.name || 'Unknown')} 
                        <span class="match-vs">vs</span> 
                        ${escapeHtml(teamB?.name || 'Unknown')}
                    </div>
                    <div class="status ${statusClass}">${statusText}</div>
                </div>
                ${match.status === 'completed' ? `
                    <div class="match-score">
                        Score: ${match.scoreA} - ${match.scoreB}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
    
    matchesList.innerHTML = matchesHTML;
}

// Score Management
function renderScoreEntry() {
    const scoreEntryList = document.getElementById('score-entry-list');
    if (!scoreEntryList) return;
    
    const pendingMatches = appState.matches.filter(match => match.status === 'pending');
    
    if (pendingMatches.length === 0) {
        scoreEntryList.innerHTML = '<p class="text-secondary">No pending matches to score.</p>';
        return;
    }
    
    const scoresHTML = pendingMatches.map(match => {
        const teamA = getTeamById(match.teamA);
        const teamB = getTeamById(match.teamB);
        
        return `
            <div class="card">
                <div class="card__body">
                    <div class="match-card">
                        <div class="match-teams">
                            ${escapeHtml(teamA?.name || 'Unknown')} 
                            <span class="match-vs">vs</span> 
                            ${escapeHtml(teamB?.name || 'Unknown')}
                        </div>
                        <div class="score-input-group">
                            <input type="number" class="form-control score-input" 
                                   id="score-${match.id}-A" min="0" max="3" placeholder="0">
                            <span>-</span>
                            <input type="number" class="form-control score-input" 
                                   id="score-${match.id}-B" min="0" max="3" placeholder="0">
                            <button class="btn btn--primary" onclick="submitScore('${match.id}')">
                                Submit Score
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    scoreEntryList.innerHTML = scoresHTML;
}

function submitScore(matchId) {
    const scoreAInput = document.getElementById(`score-${matchId}-A`);
    const scoreBInput = document.getElementById(`score-${matchId}-B`);
    
    if (!scoreAInput || !scoreBInput) return;
    
    const scoreA = parseInt(scoreAInput.value) || 0;
    const scoreB = parseInt(scoreBInput.value) || 0;
    
    if (scoreA < 0 || scoreB < 0 || scoreA > 3 || scoreB > 3) {
        alert('Scores must be between 0 and 3.');
        return;
    }
    
    if (scoreA === scoreB) {
        alert('Matches cannot end in a tie. Please enter different scores.');
        return;
    }
    
    const match = appState.matches.find(m => m.id === matchId);
    if (match) {
        match.scoreA = scoreA;
        match.scoreB = scoreB;
        match.status = 'completed';
        
        renderScoreEntry();
        updateDashboard();
        showNotification('Score submitted successfully!', 'success');
    }
}

// Standings Calculation
function calculateStandings() {
    const standings = appState.teams.map(team => {
        let gamesPlayed = 0;
        let gamesWon = 0;
        let gamesLost = 0;
        let points = 0;
        
        appState.matches.forEach(match => {
            if (match.status === 'completed' && (match.teamA === team.id || match.teamB === team.id)) {
                gamesPlayed++;
                
                if (match.teamA === team.id) {
                    // Team A
                    points += match.scoreA; // Points for games won
                    if (match.scoreA > match.scoreB) {
                        gamesWon++;
                        points += 1; // Bonus point for match win
                    } else {
                        gamesLost++;
                    }
                } else {
                    // Team B
                    points += match.scoreB; // Points for games won
                    if (match.scoreB > match.scoreA) {
                        gamesWon++;
                        points += 1; // Bonus point for match win
                    } else {
                        gamesLost++;
                    }
                }
            }
        });
        
        const winPercentage = gamesPlayed > 0 ? ((gamesWon / gamesPlayed) * 100).toFixed(1) : 0;
        
        return {
            team: team,
            gamesPlayed,
            gamesWon,
            gamesLost,
            points,
            winPercentage: parseFloat(winPercentage)
        };
    });
    
    // Sort by points (descending), then by win percentage (descending)
    standings.sort((a, b) => {
        if (b.points !== a.points) {
            return b.points - a.points;
        }
        return b.winPercentage - a.winPercentage;
    });
    
    return standings;
}

function renderStandings() {
    const standingsBody = document.getElementById('standings-body');
    if (!standingsBody) return;
    
    const standings = calculateStandings();
    
    if (standings.length === 0) {
        standingsBody.innerHTML = '<tr><td colspan="7" class="text-center text-secondary">No teams or matches yet</td></tr>';
        return;
    }
    
    const standingsHTML = standings.map((standing, index) => {
        const rank = index + 1;
        const rowClass = rank === 1 ? 'rank-1' : '';
        
        return `
            <tr class="${rowClass}">
                <td>${rank}</td>
                <td>${escapeHtml(standing.team.name)}</td>
                <td>${standing.gamesPlayed}</td>
                <td>${standing.gamesWon}</td>
                <td>${standing.gamesLost}</td>
                <td><strong>${standing.points}</strong></td>
                <td>${standing.winPercentage}%</td>
            </tr>
        `;
    }).join('');
    
    standingsBody.innerHTML = standingsHTML;
}

// Dashboard Updates
function updateDashboard() {
    const totalTeams = appState.teams.length;
    const completedMatches = appState.matches.filter(m => m.status === 'completed').length;
    const remainingMatches = appState.matches.filter(m => m.status === 'pending').length;
    
    const totalTeamsEl = document.getElementById('total-teams');
    const matchesPlayedEl = document.getElementById('matches-played');
    const matchesRemainingEl = document.getElementById('matches-remaining');
    const leaderElement = document.getElementById('league-leader');
    
    if (totalTeamsEl) totalTeamsEl.textContent = totalTeams;
    if (matchesPlayedEl) matchesPlayedEl.textContent = completedMatches;
    if (matchesRemainingEl) matchesRemainingEl.textContent = remainingMatches;
    
    // Update league leader
    if (leaderElement) {
        const standings = calculateStandings();
        if (standings.length > 0 && standings[0].gamesPlayed > 0) {
            leaderElement.textContent = standings[0].team.name;
        } else {
            leaderElement.textContent = 'No games played';
        }
    }
}

// Modal Management
function setupModalHandlers() {
    const modal = document.getElementById('confirmation-modal');
    const cancelBtn = document.getElementById('modal-cancel');
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', hideModal);
    }
    
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                hideModal();
            }
        });
    }
}

function showConfirmation(title, message, onConfirm) {
    const modal = document.getElementById('confirmation-modal');
    const titleElement = document.getElementById('modal-title');
    const messageElement = document.getElementById('modal-message');
    const confirmBtn = document.getElementById('modal-confirm');
    
    if (!modal || !titleElement || !messageElement || !confirmBtn) return;
    
    titleElement.textContent = title;
    messageElement.textContent = message;
    
    confirmBtn.onclick = function() {
        onConfirm();
        hideModal();
    };
    
    modal.style.display = 'flex';
}

function hideModal() {
    const modal = document.getElementById('confirmation-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Utility Functions
function generateId() {
    return 'id_' + Math.random().toString(36).substr(2, 9);
}

function getTeamById(teamId) {
    return appState.teams.find(team => team.id === teamId);
}

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `status status--${type}`;
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '1001';
    notification.style.minWidth = '200px';
    notification.style.boxShadow = 'var(--shadow-lg)';
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Global functions for HTML onclick handlers
window.showAddTeamForm = showAddTeamForm;
window.hideAddTeamForm = hideAddTeamForm;
window.addPlayerInput = addPlayerInput;
window.removePlayer = removePlayer;
window.deleteTeam = deleteTeam;
window.generateSchedule = generateSchedule;
window.submitScore = submitScore;
window.showSection = showSection;