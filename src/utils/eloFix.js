// ELO Rating Fix - Round decimal values to integers
// This utility ensures all ELO ratings are stored as integers in the database

export const roundEloRating = (rating) => {
  if (typeof rating === 'number' && !isNaN(rating)) {
    return Math.round(rating);
  }
  return 1500; // Default ELO rating
};

export const roundEloUpdate = (update) => {
  return {
    ...update,
    oldRating: roundEloRating(update.oldRating),
    newRating: roundEloRating(update.newRating),
    ratingChange: Math.round(update.ratingChange),
    opponentAvgRating: roundEloRating(update.opponentAvgRating)
  };
};

export const roundEloUpdates = (updates) => {
  if (!Array.isArray(updates)) return [];
  return updates.map(roundEloUpdate);
};