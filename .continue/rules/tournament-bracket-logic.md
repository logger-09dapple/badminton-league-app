---
description: Ensures tournament brackets work correctly with proper winner
  determination, match progression, and UI behavior
alwaysApply: true
---

# Tournament Bracket Logic

When implementing tournament bracket functionality: 1) Always determine winners based on actual scores, not team IDs 2) Only show championship display when ALL matches are complete 3) Generate next round matches automatically when current round completes 4) Ensure winner advancement logic correctly identifies the team with higher score 5) Use proper modal z-index values to ensure score input modals appear above all other content
