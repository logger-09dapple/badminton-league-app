# Professional Sports Ranking System

## Problem Solved

Previously, players with very few matches could dominate rankings if they won their first few games, while experienced players with many matches (wins and losses) would rank lower. This doesn't reflect true skill or provide fair rankings.

## How Professional Sports Handle This

### Tennis (ATP/WTA Rankings)
- **Minimum tournaments**: Players must play a minimum number of tournaments to be fully ranked
- **Ranking points**: Based on tournament performance over a rolling 52-week period
- **Experience factor**: More tournaments played = more opportunities for points
- **Recent form**: Recent results weighted more heavily

### Golf World Rankings
- **Minimum events**: Players need a minimum number of events to be eligible for rankings
- **Quality of competition**: Stronger fields give more ranking points
- **Rolling average**: Points averaged over a specific number of events
- **Decay factor**: Older results lose value over time

### Chess (ELO System Origins)
- **Rating floors**: Minimum ratings based on experience level
- **K-factor adjustment**: Changes based on player experience and rating level
- **Provisional ratings**: New players have different calculation rules

## Our Implementation

### Two-Tier System
1. **Qualified Players** (5+ matches):
   - Get full ranking calculation with bonuses
   - Always ranked above unqualified players
   
2. **Unqualified Players** (< 5 matches):
   - Ranked by raw ELO only
   - Shown separately below qualified players
   - Marked with indicator showing they need more matches

### Ranking Score Calculation (Qualified Players Only)

```
Ranking Score = Base ELO + Experience Bonus + Win Rate Adjustment + Recent Form Bonus

Where:
- Base ELO: Player's current ELO rating (1200-2500)
- Experience Bonus: min(50, matches_played * 2) - up to +50 points
- Win Rate Adjustment: (win_rate - 50%) * 1 - rewards consistent performance
- Recent Form Bonus: up to +25 for excellent recent performance (80%+ in last 5 games)
```

### Example Scenarios

**Scenario 1: New Lucky Player**
- ELO: 1650 (won 2/2 matches against weaker opponents)
- Status: Unqualified (< 5 matches)
- Ranking: Below all qualified players, regardless of ELO

**Scenario 2: Experienced Consistent Player**
- ELO: 1580 (25 matches, 16 wins, 9 losses = 64% win rate)
- Experience Bonus: +50 (capped)
- Win Rate Adjustment: +14 (64% - 50% = 14%)
- Recent Form: (3/5 wins = 60%, no bonus)
- **Ranking Score: 1644** - Ranks above the lucky new player

**Scenario 3: Experienced Struggling Player**
- ELO: 1520 (30 matches, 12 wins, 18 losses = 40% win rate)
- Experience Bonus: +50 (capped)
- Win Rate Adjustment: -10 (40% - 50% = -10%)
- Recent Form: (1/5 wins = 20%, no bonus)
- **Ranking Score: 1560** - Still qualified, ranks appropriately

## Benefits

1. **Prevents ranking manipulation**: Can't achieve high ranking with just 1-2 lucky wins
2. **Rewards experience**: Players who play more matches get recognition
3. **Maintains competitive balance**: Consistent performance over time matters most
4. **Clear progression path**: New players know they need more matches to qualify
5. **Fair comparison**: Only compares players with sufficient match history

## UI Indicators

- **Qualified players**: Show both ELO and Ranking Score
- **Unqualified players**: Show ELO with ❓ indicator and "Needs 5+ matches" tooltip
- **Section headers**: Clear explanation of the ranking system
- **Ranking info box**: Explains how the system works

This system is similar to how professional tennis, golf, and chess handle rankings where not everyone plays the same number of events/matches.