import { GoogleGenerativeAI } from '@google/generative-ai';
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
    // Attempt standard parse first
    return JSON.parse(text);
  } catch (e) {
    // Look for JSON blocks in markdown (```json ... ```) or anywhere in text
    const jsonRegex = /(\{|\[)[\s\S]*(\}|\])/;
    const match = text.match(jsonRegex);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (innerE) {
        // Fallback to more aggressive cleanup if needed
        let cleaned = match[0].replace(/\\n/g, '').replace(/\\"/g, '"');
        try { return JSON.parse(cleaned); } catch (f) {}
      }
    }
    console.error("Failed to extract JSON from AI response:", text);
    throw new Error("La respuesta de la IA no contiene un formato JSON válido.");
  }
}

function compactData(input: any) {
  if (!input) return null;

  const processPlayer = (p: any) => {
    const s = p.stats || {};
    // Calculate percentages for AI context if raw data provided
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

  // If input is an array of teams
  if (Array.isArray(input) && input[0]?.roster) {
    return input.slice(0, 10).map(t => ({
      name: t.name,
      roster: (t.roster || []).slice(0, 13).map(processPlayer)
    }));
  }

  // If input is a single roster (array of players)
  if (Array.isArray(input)) {
    return input.slice(0, 15).map(processPlayer);
  }

  // Handle object with nested rosters (e.g. for opponent comparison)
  if (typeof input === 'object' && input !== null) {
    const output: any = {};
    for (const key in input) {
      if (Array.isArray(input[key])) {
        output[key] = input[key].slice(0, 15).map(processPlayer);
      } else {
        output[key] = input[key];
      }
    }
    return output;
  }

  return input;
}

// Helper ultra-robusto para Gemini usando el SDK oficial
async function askAI(prompt: string, rawData?: any) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is missing in environment variables.");
    throw new Error('Servicio de IA no configurado. Verifica la API Key.');
  }

  let fullPrompt = prompt;
  if (rawData) {
    const data = compactData(rawData);
    fullPrompt += `\n\nCONTEXTO DE DATOS (JSON): ${JSON.stringify(data)}`;
  }

  fullPrompt += "\n\nIMPORTANTE: Responde ÚNICAMENTE con el objeto JSON solicitado, sin explicaciones ni markdown. Asegúrate de que sea un JSON válido.";

  const genAI = new GoogleGenerativeAI(apiKey);

  // Lista de modelos recomendada por el error de Google y la lista disponible del usuario
  const modelNames = [
    "gemini-3.6-flash",
    "gemini-3.7-flash",
    "gemini-flash-latest",
    "gemini-2.5-flash",
    "gemini-pro"
  ];

  let allErrors = [];

  for (const modelName of modelNames) {
    try {
      console.log(`[AI] Intentando con ${modelName}...`);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.1,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 2048,
        }
      });

      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();

      if (text) {
        console.log(`[AI] Éxito con ${modelName}`);
        return extractJSON(text);
      }
    } catch (error: any) {
      const msg = error.message || "Error desconocido";
      console.error(`[AI] Falló ${modelName}:`, msg);
      allErrors.push(`${modelName}: ${msg}`);

      if (msg.includes("API key not valid")) {
        throw new Error("La API Key de Gemini no es válida.");
      }
    }
  }

  throw new Error(`La IA falló tras varios intentos. Errores: ${allErrors.join(" | ")}`);
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
          stats: {
            pts: stats['0'] || 0,
            ast: stats['3'] || 0,
            reb: stats['6'] || 0,
            stl: stats['2'] || 0,
            blk: stats['1'] || 0,
            tpm: stats['17'] || 0,
            tov: stats['11'] || 0,
            fgm: stats['19'] || 0,
            fga: stats['20'] || 0,
            ftm: stats['21'] || 0,
            fta: stats['22'] || 0
          }
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

app.post('/api/analyze/trade/manual', async (req, res) => {
  try {
    const { proposerSends, receiverSends, proposerTeamName, receiverTeamName } = req.body;
    const prompt = `Analiza este intercambio entre ${proposerTeamName} y ${receiverTeamName}.
    Responde un objeto JSON con el análisis: {
      "mlAnalysis": {
        "summary": "...",
        "proposerBenefit": "...",
        "receiverBenefit": "...",
        "verdict": "EXCELLENT/FAVORABLE/RISKY/UNEVEN",
        "scoreChangeProposer": 0.0,
        "scoreChangeReceiver": 0.0
      }
    }`;
    const result = await askAI(prompt, { proposerSends, receiverSends });
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
