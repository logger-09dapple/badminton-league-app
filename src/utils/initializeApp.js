import { teamEloService } from '../services/teamEloService';

/**
 * Initialize the application with all necessary systems
 */
export const initializeApp = async () => {
  try {
    console.log('Initializing application systems...');
    
    // Initialize team ELO system
    const teamEloSuccess = await teamEloService.initializeCompleteTeamEloSystem();
    
    if (teamEloSuccess) {
      console.log('Team ELO system initialized successfully');
    } else {
      console.warn('Team ELO system initialization failed, but app will continue');
    }
    
    console.log('Application initialization completed');
    return true;
  } catch (error) {
    console.error('Error during application initialization:', error);
    // Don't prevent app from starting
    return false;
  }
};

/**
 * Check if team ELO system needs initialization
 */
export const checkTeamEloSystem = async () => {
  try {
    // This is a simple check - in a real app you might want to check if tables exist
    // For now, we'll just try to run the initialization
    return await teamEloService.initializeCompleteTeamEloSystem();
  } catch (error) {
    console.error('Error checking team ELO system:', error);
    return false;
  }
};