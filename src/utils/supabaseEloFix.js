// Fix for ELO rating integer conversion in Supabase operations

export const fixSkillLevelChanges = (skillLevelChanges) => {
  return skillLevelChanges.map(change => ({
    ...change,
    elo_rating: Math.round(change.elo_rating) // Ensure integer
  }));
};

// Apply the fix to the processPlayerUpdate method
export const applyEloFix = (update) => {
  return {
    ...update,
    oldRating: Math.round(update.oldRating),
    newRating: Math.round(update.newRating),
    ratingChange: Math.round(update.ratingChange),
    opponentAvgRating: Math.round(update.opponentAvgRating)
  };
};