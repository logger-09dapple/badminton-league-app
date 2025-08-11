---
globs: "**/Statistics.jsx"
description: Implements a professional sports-style ranking system that handles
  unequal match counts fairly, similar to tennis ATP/WTA rankings, golf world
  rankings, and other professional sports
---

Use a multi-factor ranking system for player rankings: 1) Separate qualified (5+ matches) from unqualified players 2) For qualified players: Base ELO + Experience Bonus (up to +50 for match count) + Win Rate Adjustment + Recent Form Bonus 3) For unqualified players: Rank by raw ELO but always below qualified players 4) This prevents players with 1-2 lucky wins from dominating rankings while still rewarding skill