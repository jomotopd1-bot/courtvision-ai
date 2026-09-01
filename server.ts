import express from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import { MOCK_LEAGUE, MOCK_NEWS } from './src/demoLeagueData.js';
import { Player } from './src/types.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// --- AI ENGINE (DIRECT REST) ---

function extractJSON(text: string) {
  try {
    return JSON.parse(text);
  } catch (e) {
    const start = Math.max(text.indexOf('{'), text.indexOf('['));
    const end = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(text.substring(start, end + 1));
    }
    throw new Error("No se pudo extraer JSON de la respuesta de IA.");
  }
}

function compactTeams(teams: any[]) {
  return (teams || []).slice(0, 12).map(t => ({
    name: t.name,
    roster: (t.roster || []).slice(0, 10).map((p: any) => ({
      n: p.name,
      s: { pts: p.stats.pts, reb: p.stats.reb, ast: p.stats.ast }
    }))
  }));
}

// Helper ultra-robusto para Gemini usando REST directo
async function askAI(prompt: string, rawData?: any) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('API Key no configurada en Render.');

  let fullPrompt = prompt;
  if (rawData) {
    const data = Array.isArray(rawData) ? compactTeams(rawData) : rawData;
    fullPrompt += `\nDATOS: ${JSON.stringify(data)}`;
  }

  // Intentos: 1. gemini-pro (v1), 2. gemini-1.5-flash (v1beta)
  const attempts = [
    { url: `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`, name: 'gemini-pro' },
    { url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, name: 'gemini-1.5-flash' }
  ];

  let lastError = '';
  for (const attempt of attempts) {
    try {
      const response = await fetch(attempt.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { temperature: 0.1 }
        })
      });
      const data: any = await response.json();
      if (response.ok) {
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return extractJSON(text);
      } else {
        lastError = data.error?.message || `Status ${response.status}`;
      }
    } catch (e: any) {
      lastError = e.message;
    }
  }
  throw new Error(`La IA no pudo procesar tu solicitud: ${lastError}`);
}

// --- NBA MAPPINGS ---
const NBA_TEAMS: Record<number, string> = {
  1: 'ATL', 2: 'BOS', 3: 'BKN', 4: 'CHA', 5: 'CHI', 6: 'CLE', 7: 'DAL', 8: 'DEN', 9: 'DET', 10: 'GSW',
  11: 'HOU', 12: 'IND', 13: 'LAC', 14: 'LAL', 15: 'MEM', 16: 'MIA', 17: 'MIL', 18: 'MIN', 19: 'NO', 20: 'NYK',
  21: 'OKC', 22: 'ORL', 23: 'PHI', 24: 'PHX', 25: 'POR', 26: 'SAC', 27: 'SAS', 28: 'TOR', 29: 'UTA', 30: 'WAS'
};
const POSITIONS: Record<number, string> = {
  0: 'PG', 1: 'SG', 2: 'SF', 3: 'PF', 4: 'C', 5: 'G', 6: 'F', 11: 'UTIL', 12: 'BENCH', 13: 'IR'
};

// --- ROUTES ---

app.get('/api/health', (req, res) => res.json({ status: 'ok', hasApiKey: !!process.env.GEMINI_API_KEY }));

let newsState = [...MOCK_NEWS];
app.get('/api/news', (req, res) => res.json(newsState));
app.post('/api/news/read', (req, res) => {
  const { id } = req.body;
  newsState = newsState.map(n => n.id === id ? { ...n, read: true } : n);
  res.json({ success: true });
});

app.post('/api/espn/sync', async (req, res) => {
  const { leagueId, seasonId, swid, espnS2 } = req.body;
  if (!leagueId || leagueId === 'demo') return res.json({ success: true, isDemo: true, league: MOCK_LEAGUE });

  const sId = seasonId || '2027';
  const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${sId}/segments/0/leagues/${leagueId}?view=mTeam&view=mRoster&view=mSettings&view=mMatchup&view=mStatus`;

  try {
    const headers: any = { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' };
    if (swid && espnS2) headers['Cookie'] = `espn_s2=${espnS2}; SWID=${swid}`;
    const response = await fetch(url, { headers });
    if (!response.ok) return res.status(response.status).json({ success: false, error: 'Error ESPN' });
    const data = await response.json() as any;

    const teams = (data.teams || []).map((rt: any) => ({
      id: String(rt.id),
      name: rt.name || `Equipo ${rt.id}`,
      owner: 'Manager',
      logo: rt.logo,
      record: { wins: rt.record?.overall?.wins || 0, losses: rt.record?.overall?.losses || 0, ties: rt.record?.overall?.ties || 0 },
      roster: (rt.roster?.entries || []).map((re: any) => {
        const p = re.playerPoolEntry?.player || {};
        const stats = (p.stats || []).find((s: any) => s.statSourceId === 0 && s.statSplitTypeId === 0)?.averageStats || {};
        return {
          id: String(p.id),
          name: p.fullName || 'Jugador',
          nbaTeam: NBA_TEAMS[p.proTeamId] || 'NBA',
          positions: (p.eligibleSlots || []).filter((s: number) => POSITIONS[s]).map((s: number) => POSITIONS[s]),
          stats: { pts: stats['0'] || 0, ast: stats['3'] || 0, reb: stats['6'] || 0, stl: stats['2'] || 0, blk: stats['1'] || 0, tpm: stats['17'] || 0, tov: stats['11'] || 0 }
        };
      })
    }));

    res.json({ success: true, league: { id: String(leagueId), name: data.settings?.name || 'Liga', teams, currentPeriod: data.status?.currentMatchupPeriod || 1 } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Sync failed' });
  }
});

// --- AI ANALYSIS ROUTES ---

app.post('/api/analyze/trades', async (req, res) => {
  try {
    const { teams } = req.body;
    const prompt = `Analiza estos equipos de NBA Fantasy y sugiere 3 traspasos win-win. Responde SOLO un array JSON de objetos: [{"proposerTeamName":"...","receiverTeamName":"...","proposerSends":["..."],"receiverSends":["..."],"mlAnalysis":{"summary":"...","verdict":"EXCELLENT","scoreChangeProposer":1.1,"scoreChangeReceiver":1.1}}]`;
    const result = await askAI(prompt, teams);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/analyze/waiver', async (req, res) => {
  try {
    const { roster } = req.body;
    const prompt = `Analiza este roster y recomienda 3 agentes libres. Responde JSON: {"weakestCategories":[{"category":"PTS","average":10,"targetAverage":15,"description":"..."}],"recommendedPlayers":[{"id":"1","name":"...","nbaTeam":"...","positions":["..."],"stats":{"pts":10},"fitScore":90,"reason":"...","impactDescription":"..."}],"aiVerdict":"..."}`;
    const result = await askAI(prompt, roster);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/analyze/optimize', async (req, res) => {
  try {
    const { roster } = req.body;
    const prompt = `Optimiza esta alineación. Responde JSON: {"analysisText":"...","weeklyLineup":{"starters":[],"bench":[]}}`;
    const result = await askAI(prompt, roster);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/analyze/draft', async (req, res) => {
  try {
    const { strategy, draftedPlayers } = req.body;
    const prompt = `Estrategia: ${strategy}. Ya elegidos: ${JSON.stringify(draftedPlayers)}. Sugiere picks. Responde JSON: {"summary":"...","recommendedPicks":[{"name":"...","team":"...","reason":"...","expectedRound":1}]}`;
    const result = await askAI(prompt);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/analyze/opponent', async (req, res) => {
  try {
    const { userRoster, opponentRoster, userTeamName, opponentTeamName } = req.body;
    const prompt = `Compara ${userTeamName} contra ${opponentTeamName}. Responde JSON: {"categoryComparisons":[],"aiVerdict":"..."}`;
    const result = await askAI(prompt, { user: userRoster, opp: opponentRoster });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Front-end SPA
const distPath = path.join(process.cwd(), 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));

app.listen(Number(PORT), '0.0.0.0', () => console.log(`>>> SERVER LIVE ON ${PORT}`));
