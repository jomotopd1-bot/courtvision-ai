import { onRequest } from "firebase-functions/v2/https";
import express from 'express';
import cors from 'cors';
import { GoogleGenAI, Type } from '@google/genai';
import { MOCK_LEAGUE, MOCK_NEWS, MOCK_PLAYERS } from './demoLeagueData.js';
import { Player, FantasyTeam, TradeSuggestion, League } from './types.js';

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Gemini client initialization helper
function getGemini(): GoogleGenAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY is not defined in environment variables.');
  }
  return new GoogleGenAI({ apiKey: key });
}

// Utility to retry transient Gemini API errors
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 2,
  delayMs = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries <= 0) throw error;
    const errStr = String(error.message || error);
    const isTransient = errStr.includes('503') || errStr.includes('429');
    if (isTransient) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return retryWithBackoff(fn, retries - 1, delayMs * 1.5);
    }
    throw error;
  }
}

// Helper to perform generateContent
async function generateContentWithFallback(
  ai: GoogleGenAI,
  params: { contents: any; config?: any }
): Promise<any> {
  return await retryWithBackoff(() => ai.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: params.contents,
    config: params.config
  }), 2, 1000);
}

async function askJson(prompt: string): Promise<any> {
  const ai = getGemini();
  const result = await generateContentWithFallback(ai, {
    contents: prompt,
    config: { responseMimeType: 'application/json', temperature: 0.7 }
  });
  const text = typeof result.text === 'function' ? result.text() : result.text;
  if (!text) throw new Error('Gemini devolvió una respuesta vacía');
  return JSON.parse(String(text).replace(/```json/g, '').replace(/```/g, '').trim());
}

function requireArray(value: unknown, name: string): any[] {
  if (!Array.isArray(value)) throw new Error(`Falta el campo ${name}`);
  return value;
}

// --- API ROUTES ---

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/api/news', (req, res) => {
  res.json(MOCK_NEWS);
});

app.post('/api/espn/sync', async (req, res) => {
  const { leagueId, seasonId, swid, espnS2 } = req.body;
  if (!leagueId || leagueId === 'demo') {
    return res.json({ success: true, isDemo: true, league: MOCK_LEAGUE });
  }
  const sId = seasonId || '2027';
  const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${sId}/segments/0/leagues/${leagueId}?view=mTeam&view=mRoster&view=mSettings&view=mMatchup`;

  try {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0'
    };
    if (swid && espnS2) headers['Cookie'] = `espn_s2=${espnS2}; SWID=${swid}`;

    const response = await fetch(url, { headers });
    if (!response.ok) {
      return res.status(response.status).json({ success: false, error: `ESPN API status ${response.status}` });
    }
    const data = await response.json() as any;

    if (!Array.isArray(data.teams) || data.teams.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'ESPN no encontró la liga. Verifica el ID, la temporada y las cookies de una liga privada.'
      });
    }

    const teams: FantasyTeam[] = [];
    const rawTeams = data.teams || [];
    const members = data.members || [];

    for (const rt of rawTeams) {
      const ownerMember = members.find((m: any) => m.id === rt.primaryOwner);
      const ownerName = ownerMember ? `${ownerMember.firstName} ${ownerMember.lastName}` : 'Desconocido';
      const rosterEntries = rt.roster?.entries || [];
      const roster: Player[] = rosterEntries.map((re: any, index: number) => {
        const p = re.playerPoolEntry?.player || {};
        const statsArray = p.stats || [];
        const realStatsObj = statsArray.find((s: any) => s.statSourceId === 0 && s.statSplitTypeId === 0) || {};
        const avgStats = realStatsObj.averageStats || realStatsObj.stats || {};
        const getStat = (obj: any, key: string) => obj[key] !== undefined ? Number(obj[key].toFixed(1)) : 0;

        return {
          id: String(p.id || index),
          name: p.fullName || 'Jugador ESPN',
          nbaTeam: p.proBasketballTeamId ? String(p.proBasketballTeamId) : 'NBA',
          positions: ['UTIL'],
          injuryStatus: p.injuryStatus || 'ACTIVE',
          stats: {
            pts: getStat(avgStats, '0'),
            ast: getStat(avgStats, '3'),
            reb: getStat(avgStats, '6'),
            stl: getStat(avgStats, '2'),
            blk: getStat(avgStats, '1'),
            tov: getStat(avgStats, '11'),
            fgm: getStat(avgStats, '13'),
            fga: getStat(avgStats, '14'),
            ftm: getStat(avgStats, '15'),
            fta: getStat(avgStats, '16'),
            tpm: getStat(avgStats, '17'),
          },
          projections: { pts: 0, ast: 0, reb: 0, stl: 0, blk: 0, tpm: 0 }
        };
      });

      teams.push({
        id: String(rt.id),
        name: rt.name || `Equipo ${rt.id}`,
        owner: ownerName,
        record: { wins: rt.record?.overall?.wins || 0, losses: rt.record?.overall?.losses || 0, ties: rt.record?.overall?.ties || 0 },
        ranking: rt.playoffSeed || 1,
        roster
      });
    }

    res.json({
      success: true,
      isDemo: false,
      league: {
        id: String(leagueId),
        name: data.settings?.name || 'Mi Liga ESPN',
        seasonId: String(sId),
        teams,
        matchups: [],
        currentPeriod: data.status?.currentMatchupPeriod || 1
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/analyze/optimize', async (req, res) => {
  const { roster } = req.body;
  try {
    const ai = getGemini();
    const rosterText = roster.map((p: any) => `- ${p.name} (${p.positions.join('/')})`).join('\n');
    const prompt = `Analiza este equipo de fantasy basketball y optimiza la alineación semanal. Roster:\n${rosterText}`;
    const result = await generateContentWithFallback(ai, { contents: prompt });
    res.json({ analysisText: result.text, weeklyLineup: { starters: [], bench: [] }, categoryStrengths: [], categoryWeaknesses: [], waiverTargets: [], modelUsed: 'gemini-1.5-flash' });
  } catch (error) {
    res.status(500).json({ error: 'AI analysis failed' });
  }
});

app.post('/api/analyze/draft', async (req, res) => {
  try {
    const { strategy, draftedPlayers = [] } = req.body;
    const result = await askJson(`Recomienda picks para un draft de NBA Fantasy. Estrategia: ${strategy || 'Equilibrada'}. Ya seleccionados: ${JSON.stringify(draftedPlayers)}. Responde SOLO JSON con summary, recommendedPicks, sleepers, rookies, breakouts y puntStrategyAdvice. Cada lista debe contener objetos con name, team, reason y expectedRound.`);
    res.json({ ...result, modelUsed: 'gemini-1.5-flash' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'AI draft analysis failed' });
  }
});

app.post('/api/analyze/waiver', async (req, res) => {
  try {
    const roster = requireArray(req.body.roster, 'roster');
    const result = await askJson(`Analiza el waiver wire de NBA Fantasy para este roster: ${JSON.stringify(roster)}. Responde SOLO JSON con weakestCategories (category, average, targetAverage, description), recommendedPlayers (id, name, nbaTeam, positions, stats, fitScore, reason, impactDescription) y aiVerdict.`);
    res.json({ ...result, modelUsed: 'gemini-1.5-flash' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'AI waiver analysis failed' });
  }
});

app.post('/api/analyze/opponent', async (req, res) => {
  try {
    const { userRoster, opponentRoster, userTeamName, opponentTeamName } = req.body;
    requireArray(userRoster, 'userRoster');
    requireArray(opponentRoster, 'opponentRoster');
    const result = await askJson(`Compara estos equipos de NBA Fantasy: ${userTeamName} ${JSON.stringify(userRoster)} contra ${opponentTeamName} ${JSON.stringify(opponentRoster)}. Responde SOLO JSON con categoryComparisons, highRiskCategories, aiVerdict y keyRivalPlayers.`);
    res.json({ ...result, modelUsed: 'gemini-1.5-flash' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'AI opponent analysis failed' });
  }
});

app.post('/api/analyze/trades', async (req, res) => {
  try {
    const teams = requireArray(req.body.teams, 'teams');
    const suggestions = await askJson(`Genera sugerencias de intercambios para estos equipos de NBA Fantasy: ${JSON.stringify(teams)}. Responde SOLO un array JSON de objetos con id, proposerTeamId, proposerTeamName, receiverTeamId, receiverTeamName, proposerSends, receiverSends y mlAnalysis (summary, proposerBenefit, receiverBenefit, verdict, scoreChangeProposer, scoreChangeReceiver).`);
    res.json((Array.isArray(suggestions) ? suggestions : [suggestions]).map((item: any) => ({ ...item, mlAnalysis: { ...item.mlAnalysis, modelUsed: 'gemini-1.5-flash' } })));
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'AI trade analysis failed' });
  }
});

// Export the app as a Firebase Function
export const api = onRequest({
  memory: "256MiB",
  region: "us-central1"
}, app);
