/**
 * ELO Integer Fix Utility
 * Ensures all ELO-related values are integers before database operations
 */

export const ensureInteger = (value, fallback = 1500) => {
  if (typeof value === 'number' && !isNaN(value)) {
    return Math.round(value);
  }
  return fallback;
};

export const fixEloUpdate = (update) => {
  console.log('Fixing ELO update:', update);
  
  const fixed = {
    ...update,
    oldRating: ensureInteger(update.oldRating, 1500),
    newRating: ensureInteger(update.newRating, 1500),
    ratingChange: ensureInteger(update.ratingChange, 0),
    opponentAvgRating: ensureInteger(update.opponentAvgRating, 1500),
    kFactor: ensureInteger(update.kFactor, 32)
  };
  
  console.log('Fixed ELO update:', fixed);
  return fixed;
};

export const fixEloUpdates = (updates) => {
  if (!Array.isArray(updates)) {
    console.warn('fixEloUpdates: updates is not an array:', updates);
    return [];
  }
  
  return updates.map(fixEloUpdate);
};

// Validate that all ELO values are integers
export const validateEloUpdate = (update) => {
  const errors = [];
  
  if (!Number.isInteger(update.newRating)) {
    errors.push(`newRating is not integer: ${update.newRating}`);
  }
  
  if (!Number.isInteger(update.oldRating)) {
    errors.push(`oldRating is not integer: ${update.oldRating}`);
  }
  
  if (!Number.isInteger(update.ratingChange)) {
    errors.push(`ratingChange is not integer: ${update.ratingChange}`);
  }
  
  if (!Number.isInteger(update.opponentAvgRating)) {
    errors.push(`opponentAvgRating is not integer: ${update.opponentAvgRating}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};