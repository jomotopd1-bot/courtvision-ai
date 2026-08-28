import express from 'express';
import path from 'path';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { MOCK_LEAGUE, MOCK_NEWS } from './src/demoLeagueData.js';
import { Player, FantasyTeam, League } from './src/types.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
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
    if (!key) throw new Error('Falta GEMINI_API_KEY');
    genAI = new GoogleGenAI({ apiKey: key });
  }
  return genAI;
}

// Helper robusto para Gemini
async function askAI(prompt: string) {
  const client = getAI();
  const result = await client.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.7
    }
  });

  let text = result.response.text();
  // Limpiar posibles bloques de código markdown
  text = text.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(text);
}

// --- RUTAS ---

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.post('/api/espn/sync', async (req, res) => {
  const { leagueId, seasonId, swid, espnS2 } = req.body;
  if (!leagueId || leagueId === 'demo') return res.json({ success: true, isDemo: true, league: MOCK_LEAGUE });

  const sId = seasonId || '2027';
  const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${sId}/segments/0/leagues/${leagueId}?view=mTeam&view=mRoster&view=mSettings&view=mMatchup`;

  try {
    const headers: any = { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' };
    if (swid && espnS2) headers['Cookie'] = `espn_s2=${espnS2}; SWID=${swid}`;

    const response = await fetch(url, { headers });
    const data = await response.json() as any;

    const teams = (data.teams || []).map((rt: any) => {
      const owner = (data.members || []).find((m: any) => m.id === rt.primaryOwner);
      return {
        id: String(rt.id),
        name: rt.name || `Equipo ${rt.id}`,
        owner: owner ? `${owner.firstName} ${owner.lastName}` : 'Manager ESPN',
        record: { wins: rt.record?.overall?.wins || 0, losses: rt.record?.overall?.losses || 0, ties: rt.record?.overall?.ties || 0 },
        ranking: rt.playoffSeed || 1,
        roster: (rt.roster?.entries || []).map((re: any) => {
          const p = re.playerPoolEntry?.player || {};
          const stats = (p.stats || []).find((s: any) => s.statSourceId === 0 && s.statSplitTypeId === 0)?.averageStats || {};
          return {
            id: String(p.id),
            name: p.fullName || 'Jugador',
            nbaTeam: 'NBA',
            positions: ['UTIL'],
            injuryStatus: p.injuryStatus || 'ACTIVE',
            stats: { pts: stats['0'] || 0, ast: stats['3'] || 0, reb: stats['6'] || 0, stl: stats['2'] || 0, blk: stats['1'] || 0, tpm: stats['17'] || 0 },
            projections: { pts: 0, ast: 0, reb: 0, stl: 0, blk: 0, tpm: 0 }
          };
        })
      };
    });

    res.json({ success: true, isDemo: false, league: { id: String(leagueId), name: data.settings?.name || 'Liga ESPN', teams, matchups: [], currentPeriod: 1 } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Error de conexión con ESPN' });
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

// Front-end
const distPath = path.join(process.cwd(), 'dist');
if (process.env.RENDER || process.env.NODE_ENV === 'production') {
  app.use(express.static(distPath));
  app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`>>> SERVER LIVE ON PORT ${PORT}`);
});
