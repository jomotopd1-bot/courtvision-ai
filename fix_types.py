import re
with open('src/types.ts', 'r') as f:
    text = f.read()

replacement = """export interface DraftRecommendation {
  summary: string;
  recommendedPicks?: Array<{ name: string; team: string; reason: string; expectedRound: string }>;
  sleepers: Array<{ name: string; team: string; reason: string; expectedRound: string }>;
"""

text = text.replace("""export interface DraftRecommendation {
  summary: string;
  sleepers: Array<{ name: string; team: string; reason: string; expectedRound: string }>;""", replacement)

with open('src/types.ts', 'w') as f:
    f.write(text)
