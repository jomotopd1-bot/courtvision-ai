import express from 'express';
import path from 'path';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MOCK_LEAGUE, MOCK_NEWS } from './src/demoLeagueData.js';
import { Player, FantasyTeam, League } from './src/types.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true
}));
app.use(express.json());

// Logger simple
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// Inicialización de IA
let genAI: any = null;
function getAI() {
  if (!genAI) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('Falta GEMINI_API_KEY en las variables de entorno.');
    // Forzamos v1 en el constructor global
    genAI = new GoogleGenerativeAI(key);
  }
  return genAI;
}

// Helper ultra-robusto para Gemini usando REST directo
async function askAI(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('API Key no configurada en Render.');

  // Intentamos con v1beta que es la que soporta Gemini 1.5 Flash actualmente vía REST
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7
        }
      })
    });

    const data: any = await response.json();

    if (!response.ok) {
      console.error('[GEMINI REST ERROR]', JSON.stringify(data));
      // Si falla por el modelo, intentamos con gemini-pro que es más estable en v1
      if (data.error?.message?.includes('not supported')) {
         return await askAIFallback(prompt, apiKey);
      }
      throw new Error(data.error?.message || `Error de Google (${response.status})`);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Respuesta de IA vacía.');

    const jsonStr = text.replace(/```json\n?|```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (err: any) {
    console.error('[AI FINAL ERROR]', err.message);
    throw new Error(`Error de IA: ${err.message}`);
  }
}

async function askAIFallback(prompt: string, apiKey: string) {
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });
  const data: any = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  const jsonStr = (text || "").replace(/```json\n?|```/g, '').trim();
  return JSON.parse(jsonStr);
}

// --- HELPERS Y MAPEOS ---

const NBA_TEAMS: Record<number, string> = {
  1: 'ATL', 2: 'BOS', 3: 'BKN', 4: 'CHA', 5: 'CHI', 6: 'CLE', 7: 'DAL', 8: 'DEN', 9: 'DET', 10: 'GSW',
  11: 'HOU', 12: 'IND', 13: 'LAC', 14: 'LAL', 15: 'MEM', 16: 'MIA', 17: 'MIL', 18: 'MIN', 19: 'NO', 20: 'NYK',
  21: 'OKC', 22: 'ORL', 23: 'PHI', 24: 'PHX', 25: 'POR', 26: 'SAC', 27: 'SAS', 28: 'TOR', 29: 'UTA', 30: 'WAS'
};

const POSITIONS: Record<number, string> = {
  0: 'PG', 1: 'SG', 2: 'SF', 3: 'PF', 4: 'C', 5: 'G', 6: 'F', 11: 'UTIL', 12: 'BENCH', 13: 'IR'
};

const STAT_MAP: Record<string, keyof Player['stats']> = {
  "0": "pts", "1": "blk", "2": "stl", "3": "ast", "6": "reb",
  "17": "tpm", "11": "tov", "19": "fgm", "13": "fga", "14": "ftm", "15": "fta"
};

// --- RUTAS ---

app.get('/api/health', (req, res) => res.json({ status: 'ok', hasApiKey: !!process.env.GEMINI_API_KEY }));

// News State (In-memory for now, could be Firestore)
let newsState = [...MOCK_NEWS];

app.get('/api/news', (req, res) => {
  res.json(newsState);
});

app.post('/api/news/read', (req, res) => {
  const { id } = req.body;
  newsState = newsState.map(n => n.id === id ? { ...n, read: true } : n);
  res.json({ success: true });
});

app.post('/api/news/simulate', (req, res) => {
  const alert = {
    id: 'sim_' + Date.now(),
    timestamp: new Date().toISOString(),
    read: false,
    ...req.body
  };
  newsState = [alert, ...newsState];
  res.json({ success: true, alert });
});

app.post('/api/espn/sync', async (req, res) => {
  const { leagueId, seasonId, swid, espnS2 } = req.body;
  console.log(`[SYNC] League: ${leagueId}, Season: ${seasonId}`);

  if (!leagueId || leagueId === 'demo') {
    return res.json({ success: true, isDemo: true, league: MOCK_LEAGUE });
  }

  const sId = seasonId || '2027';
  // Vistas completas para traer settings, equipos, rosters y calendario
  const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${sId}/segments/0/leagues/${leagueId}?view=mTeam&view=mRoster&view=mSettings&view=mMatchup&view=mStatus`;

  try {
    const headers: any = { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' };
    if (swid && espnS2) headers['Cookie'] = `espn_s2=${espnS2}; SWID=${swid}`;

    const response = await fetch(url, { headers });

    if (response.status === 401 || response.status === 403) {
      return res.status(401).json({ success: false, error: 'LIGA PRIVADA. Se requieren SWID y espn_s2.' });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        success: false,
        error: errorData.messages?.[0] || `Error de ESPN: ${response.statusText}`
      });
    }

    const data = await response.json() as any;

    if (!Array.isArray(data.teams) || data.teams.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'ESPN no encontró la liga. Verifica el ID, la temporada y las cookies de una liga privada.'
      });
    }

    // 1. Mapear Equipos y Roster
    const teams = (data.teams || []).map((rt: any) => {
      const owner = (data.members || []).find((m: any) => m.id === rt.primaryOwner);
      return {
        id: String(rt.id),
        name: rt.name || `Equipo ${rt.id}`,
        owner: owner ? `${owner.firstName} ${owner.lastName}` : 'Manager ESPN',
        logo: rt.logo,
        record: {
          wins: rt.record?.overall?.wins || 0,
          losses: rt.record?.overall?.losses || 0,
          ties: rt.record?.overall?.ties || 0
        },
        ranking: rt.playoffSeed || 0,
        roster: (rt.roster?.entries || []).map((re: any) => {
          const p = re.playerPoolEntry?.player || {};
          // Buscar estadísticas de la temporada actual (statSourceId=0, statSplitTypeId=0)
          const stats = (p.stats || []).find((s: any) => s.statSourceId === 0 && s.statSplitTypeId === 0)?.averageStats || {};

          return {
            id: String(p.id),
            name: p.fullName || 'Jugador',
            nbaTeam: NBA_TEAMS[p.proTeamId] || 'NBA',
            positions: (p.eligibleSlots || []).filter((s: number) => POSITIONS[s]).map((s: number) => POSITIONS[s]),
            injuryStatus: p.injuryStatus || 'ACTIVE',
            stats: {
              pts: stats['0'] || 0,
              blk: stats['1'] || 0,
              stl: stats['2'] || 0,
              ast: stats['3'] || 0,
              reb: stats['6'] || 0,
              tov: stats['11'] || 0,
              fga: stats['13'] || 0,
              fgm: stats['19'] || 0, // En ESPN a veces 19 es FGM o FG%
              fta: stats['15'] || 0,
              ftm: stats['14'] || 0, // A veces 14 es FTM
              tpm: stats['17'] || 0
            },
            projections: { pts: 0, ast: 0, reb: 0, stl: 0, blk: 0, tpm: 0 }
          };
        })
      };
    });

    // 2. Mapear Matchups
    const matchups = (data.schedule || []).map((s: any) => ({
      matchupPeriod: s.matchupPeriodId,
      homeTeamId: String(s.home?.teamId),
      awayTeamId: String(s.away?.teamId),
      homeScore: s.home?.totalPoints,
      awayScore: s.away?.totalPoints
    }));

    res.json({
      success: true,
      isDemo: false,
      league: {
        id: String(leagueId),
        name: data.settings?.name || 'Liga ESPN',
        seasonId: String(sId),
        isPrivate: data.status?.isPublic === false,
        settings: {
          scoringType: data.settings?.scoringSettings?.scoringItemId === 0 ? 'H2H_POINTS' : 'H2H_CATEGORIES',
          rosterSize: data.settings?.rosterSettings?.lineupSlotCounts?.['20'] || 13,
          activePositions: Object.keys(data.settings?.rosterSettings?.lineupSlotCounts || {}).map(id => POSITIONS[Number(id)]).filter(Boolean)
        },
        teams,
        matchups,
        currentPeriod: data.status?.currentMatchupPeriod || 1
      }
    });
  } catch (err: any) {
    console.error('[SYNC ERROR]', err);
    res.status(500).json({ success: false, error: 'Fallo de conexión crítico con ESPN' });
  }
});

app.post('/api/analyze/trade/manual', async (req, res) => {
  const { proposerSends, receiverSends, proposerTeamName, receiverTeamName } = req.body;
  try {
    const pStr = proposerSends.map((p: any) => `${p.name} (${p.stats.pts} PTS)`).join(', ');
    const rStr = receiverSends.map((p: any) => `${p.name} (${p.stats.pts} PTS)`).join(', ');

    const prompt = `Analiza este intercambio de NBA Fantasy (ID: ${Date.now()}):
    Equipo ${proposerTeamName} envía a [${pStr}].
    Equipo ${receiverTeamName} envía a [${rStr}].
    Evalúa quién gana y por qué. Responde en ESPAÑOL con este formato JSON:
    {"summary": "...", "proposerBenefit": "...", "receiverBenefit": "...", "verdict": "EXCELLENT|FAVORABLE|RISKY|UNEVEN", "scoreChangeProposer": 1.2, "scoreChangeReceiver": 1.5}`;

    const analysis = await askAI(prompt);
    res.json({ id: 'm_' + Date.now(), proposerTeamName, receiverTeamName, proposerSends, receiverSends, mlAnalysis: { ...analysis, modelUsed: 'gemini-1.5-flash' } });
  } catch (e: any) {
    console.error('Error IA:', e.message);
    res.json({ id: 'err', mlAnalysis: { summary: "La IA no pudo procesar este cambio específico. Intenta con menos jugadores.", verdict: "RISKY", scoreChangeProposer: 0, scoreChangeReceiver: 0 } });
  }
});

app.post('/api/analyze/optimize', async (req, res) => {
  const { roster } = req.body;
  try {
    const prompt = `Optimiza alineación para: ${JSON.stringify(roster.map((p: any) => p.name))}. Responde JSON: {"analysisText": "...", "weeklyLineup": {"starters": [], "bench": []}, "categoryStrengths": [], "categoryWeaknesses": [], "waiverTargets": []}`;
    const result = await askAI(prompt);
    res.json(result);
  } catch (e) {
    res.json({ analysisText: "Error en optimización IA." });
  }
});

app.post('/api/analyze/draft', async (req, res) => {
  try {
    const { strategy, draftedPlayers = [] } = req.body;
    const result = await askAI(`Recomienda picks para un draft de NBA Fantasy. Estrategia: ${strategy || 'Equilibrada'}. Ya seleccionados: ${JSON.stringify(draftedPlayers)}. Responde SOLO JSON con summary, recommendedPicks, sleepers, rookies, breakouts y puntStrategyAdvice. Cada lista debe contener objetos con name, team, reason y expectedRound.`);
    res.json({ ...result, modelUsed: 'gemini-1.5-flash' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'AI draft analysis failed' });
  }
});

app.post('/api/analyze/waiver', async (req, res) => {
  try {
    const { roster } = req.body;
    if (!Array.isArray(roster)) throw new Error('Falta el campo roster');
    const result = await askAI(`Analiza el waiver wire de NBA Fantasy para este roster: ${JSON.stringify(roster)}. Responde SOLO JSON con weakestCategories (category, average, targetAverage, description), recommendedPlayers (id, name, nbaTeam, positions, stats, fitScore, reason, impactDescription) y aiVerdict.`);
    res.json({ ...result, modelUsed: 'gemini-1.5-flash' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'AI waiver analysis failed' });
  }
});

app.post('/api/analyze/opponent', async (req, res) => {
  try {
    const { userRoster, opponentRoster, userTeamName, opponentTeamName } = req.body;
    if (!Array.isArray(userRoster) || !Array.isArray(opponentRoster)) throw new Error('Faltan los rosters');
    const result = await askAI(`Compara estos equipos de NBA Fantasy: ${userTeamName} ${JSON.stringify(userRoster)} contra ${opponentTeamName} ${JSON.stringify(opponentRoster)}. Responde SOLO JSON con categoryComparisons, highRiskCategories, aiVerdict y keyRivalPlayers.`);
    res.json({ ...result, modelUsed: 'gemini-1.5-flash' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'AI opponent analysis failed' });
  }
});

app.post('/api/analyze/trades', async (req, res) => {
  try {
    const { teams } = req.body;
    if (!Array.isArray(teams)) throw new Error('Falta el campo teams');
    const suggestions = await askAI(`Genera sugerencias de intercambios para estos equipos de NBA Fantasy: ${JSON.stringify(teams)}. Responde SOLO un array JSON de objetos con id, proposerTeamId, proposerTeamName, receiverTeamId, receiverTeamName, proposerSends, receiverSends y mlAnalysis (summary, proposerBenefit, receiverBenefit, verdict, scoreChangeProposer, scoreChangeReceiver).`);
    res.json((Array.isArray(suggestions) ? suggestions : [suggestions]).map((item: any) => ({ ...item, mlAnalysis: { ...item.mlAnalysis, modelUsed: 'gemini-1.5-flash' } })));
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'AI trade analysis failed' });
  }
});

// Front-end
const distPath = path.join(process.cwd(), 'dist');
if (process.env.RENDER || process.env.NODE_ENV === 'production') {
  app.use(express.static(distPath));
  app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`>>> SERVER LIVE ON PORT ${PORT}`);
});
