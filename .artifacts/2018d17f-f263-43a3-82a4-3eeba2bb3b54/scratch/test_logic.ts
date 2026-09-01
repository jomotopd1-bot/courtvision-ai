// Mocking the functions from server.ts to test logic
function extractJSON(text: string) {
  try {
    return JSON.parse(text);
  } catch (e) {
    const jsonRegex = /(\{|\[)[\s\S]*(\}|\])/;
    const match = text.match(jsonRegex);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (innerE) {}
    }
    return null;
  }
}

function compactData(input: any) {
  if (!input) return null;
  const processPlayer = (p: any) => {
    const s = p.stats || {};
    const fgPct = s.fga > 0 ? (s.fgm / s.fga).toFixed(3) : "0.000";
    const ftPct = s.fta > 0 ? (s.ftm / s.fta).toFixed(3) : "0.000";
    return {
      n: p.name,
      pos: p.positions,
      s: {
        pts: s.pts, reb: s.reb, ast: s.ast,
        stl: s.stl, blk: s.blk, tpm: s.tpm,
        tov: s.tov, fgp: fgPct, ftp: ftPct
      }
    };
  };
  if (Array.isArray(input) && input[0]?.roster) {
    return input.slice(0, 10).map(t => ({
      name: t.name,
      roster: (t.roster || []).slice(0, 13).map(processPlayer)
    }));
  }
  if (Array.isArray(input)) {
    return input.slice(0, 15).map(processPlayer);
  }
  return input;
}

// TEST 1: extractJSON with markdown
const mdInput = "Aquí tienes el JSON:\n```json\n{\"test\": true}\n```\nEspero que te sirva.";
console.log("Test 1 (JSON in MD):", extractJSON(mdInput));

// TEST 2: compactData with teams
const mockTeams = [
  {
    name: "Team A",
    roster: [
      { name: "Player 1", positions: ["PG"], stats: { pts: 20, reb: 5, ast: 10, fgm: 8, fga: 16 } }
    ]
  }
];
console.log("Test 2 (Teams):", JSON.stringify(compactData(mockTeams), null, 2));

// TEST 3: compactData with roster
const mockRoster = [
  { name: "Player 2", positions: ["C"], stats: { pts: 15, reb: 12, ast: 2, fgm: 6, fga: 10 } }
];
console.log("Test 3 (Roster):", JSON.stringify(compactData(mockRoster), null, 2));
