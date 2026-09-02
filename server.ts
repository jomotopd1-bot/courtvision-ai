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
  // Limpieza previa: eliminar posibles caracteres de control o basura al inicio/final
  const cleanedText = text.trim();

  try {
    return JSON.parse(cleanedText);
  } catch (e) {
    // Buscar bloques de código markdown ```json ... ```
    const mdMatch = cleanedText.match(/```json\s*([\s\S]*?)\s*```/);
    if (mdMatch && mdMatch[1]) {
      try { return JSON.parse(mdMatch[1].trim()); } catch (inner) {}
    }

    // Búsqueda agresiva por llaves o corchetes
    const firstBrace = cleanedText.indexOf('{');
    const lastBrace = cleanedText.lastIndexOf('}');
    const firstBracket = cleanedText.indexOf('[');
    const lastBracket = cleanedText.lastIndexOf(']');

    let start = -1;
    let end = -1;

    // Determinar si parece más un objeto o un array
    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      start = firstBrace;
      end = lastBrace;
    } else if (firstBracket !== -1) {
      start = firstBracket;
      end = lastBracket;
    }

    if (start !== -1 && end !== -1 && end > start) {
      const potentialJson = cleanedText.substring(start, end + 1);
      try {
        return JSON.parse(potentialJson);
      } catch (innerE) {
        // Fallback: eliminar saltos de línea literales que a veces rompen el parseo
        try {
          return JSON.parse(potentialJson.replace(/\n/g, ' ').replace(/\r/g, ''));
        } catch (f) {}
      }
    }

    console.error("No se pudo extraer JSON de:", text);
    throw new Error("Respuesta malformada");
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
      id: p.id, // Mantener ID para reconexión de datos
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

// Helper ultra-robusto para Gemini usando el SDK oficial con estrategia de reintentos
async function askAI(prompt: string, rawData?: any) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Servicio de IA no configurado. Verifica la API Key.');

  let fullPrompt = prompt;
  if (rawData) {
    const data = compactData(rawData);
    fullPrompt += `\n\nCONTEXTO DE DATOS (JSON): ${JSON.stringify(data)}`;
  }

  fullPrompt += "\n\nIMPORTANTE: Responde ÚNICAMENTE con el objeto JSON solicitado, sin markdown y sin texto adicional.";

  const genAI = new GoogleGenerativeAI(apiKey);

  // Lista priorizando Gemini 3.1 Pro según solicitud del usuario
  const modelNames = [
    "gemini-3.1-pro-preview",
    "gemini-1.5-pro",
    "gemini-3.1-flash-lite",
    "gemini-1.5-flash",
    "gemini-3.6-flash"
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
          maxOutputTokens: 2048,
          responseMimeType: "application/json"
        }
      });

      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();

      if (text) {
        try {
          return extractJSON(text);
        } catch (jsonErr) {
          console.error(`[AI] Error parseando JSON de ${modelName}:`, text);
          throw jsonErr;
        }
      }
    } catch (error: any) {
      const msg = error.message || "Error";
      console.error(`[AI] Falló ${modelName}:`, msg);
      allErrors.push(`${modelName}: ${msg.substring(0, 100)}`);

      if (msg.includes("503") || msg.includes("demand") || msg.includes("overloaded")) {
        console.log("[AI] Modelo saturado, esperando 2s...");
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  throw new Error(`Servidores de Google saturados. Reintenta en unos segundos. Detalle: ${allErrors.join(" | ")}`);
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
  const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${sId}/segments/0/leagues/${leagueId}?view=mTeam&view=mRoster&view=mSettings&view=mMatchup&view=mStatus&view=mPlayers`;

  try {
    const headers: any = { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' };
    if (swid && espnS2) headers['Cookie'] = `espn_s2=${espnS2}; SWID=${swid}`;
    const response = await fetch(url, { headers });
    if (!response.ok) return res.status(response.status).json({ success: false, error: 'Error ESPN' });
    const data = await response.json() as any;

    // Procesar Agentes Libres (jugadores que no tienen equipoId o su status es 'FREEAGENT')
    const freeAgents = (data.players || [])
      .filter((pe: any) => pe.status === 'FREEAGENT' || !pe.onTeamId)
      .slice(0, 50) // Limitamos a los 50 mejores para no saturar el prompt
      .map((pe: any) => {
        const p = pe.player || {};
        const statsArray = p.stats || [];
        const seasonStats = statsArray.find((s: any) => s.statSourceId === 0 && s.statSplitTypeId === 0)?.averageStats || {};
        const getS = (id: string) => seasonStats[id] || 0;

        return {
          id: String(p.id),
          name: p.fullName,
          nbaTeam: NBA_TEAMS[p.proTeamId] || "NBA",
          positions: (p.eligibleSlots || []).filter((s: number) => POSITIONS[s]).map((s: number) => POSITIONS[s]),
          stats: {
            pts: getS('0'), ast: getS('3'), reb: getS('6'), stl: getS('2'), blk: getS('1'), tpm: getS('17')
          }
        };
      });

    const teams = (data.teams || []).map((rt: any) => ({
      id: String(rt.id),
      name: rt.name || `Equipo ${rt.id}`,
      owner: 'Manager',
      logo: rt.logo,
      record: { wins: rt.record?.overall?.wins || 0, losses: rt.record?.overall?.losses || 0, ties: rt.record?.overall?.ties || 0 },
      roster: (rt.roster?.entries || []).map((re: any) => {
        const p = re.playerPoolEntry?.player || {};
        const statsArray = p.stats || [];
        const seasonStats = statsArray.find((s: any) => s.statSourceId === 0 && s.statSplitTypeId === 0)?.averageStats || {};
        const last7Stats = statsArray.find((s: any) => s.statSourceId === 0 && s.statSplitTypeId === 1)?.averageStats || {};
        const projectedStats = statsArray.find((s: any) => s.statSourceId === 1 && s.statSplitTypeId === 0)?.averageStats || {};
        const getS = (id: string) => seasonStats[id] || last7Stats[id] || projectedStats[id] || 0;

        return {
          id: String(p.id),
          name: p.fullName || "Jugador",
          nbaTeam: NBA_TEAMS[p.proTeamId] || "NBA",
          positions: (p.eligibleSlots || []).filter((s: number) => POSITIONS[s]).map((s: number) => POSITIONS[s]),
          stats: {
            pts: getS('0'), ast: getS('3'), reb: getS('6'), stl: getS('2'), blk: getS('1'), tpm: getS('17'),
            tov: getS('11'), fgm: getS('19'), fga: getS('20'), ftm: getS('21'), fta: getS('22')
          }
        };
      })
    }));

    res.json({
      success: true,
      league: { id: String(leagueId), name: data.settings?.name || 'Liga', teams, currentPeriod: data.status?.currentMatchupPeriod || 1 },
      freeAgents
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Sync failed' });
  }
});

// --- AI ANALYSIS ROUTES ---

// Helper de búsqueda ultra-flexible para encontrar jugadores por ID o Nombre (difuso)
function findFullPlayer(identifier: string, pool: any[]) {
  if (!identifier) return { name: "N/A", stats: {}, positions: ["N/A"] };

  const idStr = String(identifier).trim().toLowerCase();

  // 1. Intentar por ID exacto
  let found = pool.find(p => String(p.id).toLowerCase() === idStr);
  if (found) return found;

  // 2. Intentar por Nombre exacto (limpiando espacios)
  found = pool.find(p => p.name?.toLowerCase().trim() === idStr);
  if (found) return found;

  // 3. Intentar por Nombre contenido (p.ej. "LeBron" encuentra "LeBron James")
  found = pool.find(p => {
    const pName = (p.name || "").toLowerCase();
    return pName.includes(idStr) || idStr.includes(pName);
  });
  if (found) return found;

  // 4. Búsqueda por apellidos o iniciales (p.ej. "L. James" o "James")
  const parts = idStr.split(' ');
  if (parts.length > 0) {
    const lastPart = parts[parts.length - 1];
    found = pool.find(p => (p.name || "").toLowerCase().includes(lastPart));
    if (found) return found;
  }

  return { name: identifier, stats: {}, positions: ["N/A"], nbaTeam: "NBA" };
}

app.post('/api/analyze/trades', async (req, res) => {
  try {
    const { teams, myTeamId } = req.body;

    // Identificar el equipo principal
    const myTeam = (teams || []).find((t: any) => t.id === String(myTeamId));
    const myTeamName = myTeam ? myTeam.name : "mi equipo";

    const prompt = `Analiza los equipos de esta liga de NBA Fantasy y sugiere 3 traspasos win-win donde SIEMPRE participe el equipo "${myTeamName}" (ID: ${myTeamId}).

    Responde SOLO un array JSON de objetos:
    [{
      "proposerTeamName": "${myTeamName}",
      "receiverTeamName": "Nombre del otro equipo",
      "proposerSends": ["ID_O_NOMBRE_JUGADOR_DE_MI_EQUIPO"],
      "receiverSends": ["ID_O_NOMBRE_JUGADOR_DEL_OTRO_EQUIPO"],
      "mlAnalysis": {
        "summary": "Explicación de por qué beneficia a ambos",
        "proposerBenefit": "Qué gana ${myTeamName}",
        "receiverBenefit": "Qué gana el receptor",
        "verdict": "EXCELLENT",
        "scoreChangeProposer": 5.0,
        "scoreChangeReceiver": 4.5
      }
    }]

    IMPORTANTE: El equipo "${myTeamName}" DEBE ser el proponente en todas las sugerencias.`;

    let result = await askAI(prompt, teams);

    if (!Array.isArray(result)) {
      const possibleArray = Object.values(result).find(v => Array.isArray(v));
      result = Array.isArray(possibleArray) ? possibleArray : [];
    }

    const allPlayers = (teams || []).flatMap((t: any) => t.roster || []);

    // Re-hidratación robusta
    const hydratedResult = result.map((trade: any) => ({
      id: Math.random().toString(36).substr(2, 9),
      proposerTeamName: trade.proposerTeamName || "Equipo A",
      receiverTeamName: trade.receiverTeamName || "Equipo B",
      proposerSends: (trade.proposerSends || []).map((id: string) => findFullPlayer(id, allPlayers)),
      receiverSends: (trade.receiverSends || []).map((id: string) => findFullPlayer(id, allPlayers)),
      mlAnalysis: {
        summary: trade.mlAnalysis?.summary || "Análisis no disponible",
        proposerBenefit: trade.mlAnalysis?.proposerBenefit || "Mejora general",
        receiverBenefit: trade.mlAnalysis?.receiverBenefit || "Mejora general",
        verdict: trade.mlAnalysis?.verdict || "FAVORABLE",
        scoreChangeProposer: trade.mlAnalysis?.scoreChangeProposer || 0,
        scoreChangeReceiver: trade.mlAnalysis?.scoreChangeReceiver || 0
      }
    }));

    res.json(hydratedResult);
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
    const { roster, freeAgents } = req.body;
    const prompt = `Analiza este roster (mi equipo) y estas opciones de Agentes Libres (Waiver Wire).
    Recomienda 3 fichajes de la lista de agentes libres que cubran las debilidades del roster.

    Responde JSON: {
      "weakestCategories":[{"category":"PTS","average":10,"targetAverage":15,"description":"..."}],
      "recommendedPlayers":[{"id":"1","name":"...","nbaTeam":"...","positions":["..."],"stats":{"pts":10,"ast":0,"reb":0,"stl":0,"blk":0,"tpm":0},"fitScore":90,"reason":"...","impactDescription":"..."}],
      "aiVerdict":"..."
    }

    IMPORTANTE: Sugiere SOLO jugadores que estén en la lista de AGENTES LIBRES proporcionada.`;

    let result = await askAI(prompt, { mi_equipo: roster, agentes_libres: freeAgents || [] });

    // Asegurar estructura
    const finalResult = {
      weakestCategories: result.weakestCategories || [],
      recommendedPlayers: (result.recommendedPlayers || []).map((p: any) => ({
        ...p,
        stats: p.stats || { pts: 0, ast: 0, reb: 0, stl: 0, blk: 0, tpm: 0 }
      })),
      aiVerdict: result.aiVerdict || "Análisis no disponible",
      modelUsed: result.modelUsed
    };

    res.json(finalResult);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/analyze/optimize', async (req, res) => {
  try {
    const { roster } = req.body;
    const prompt = `Optimiza esta alineación. Responde JSON: {"analysisText":"...","weeklyLineup":{"starters":["ID_DEL_JUGADOR"],"bench":["ID_DEL_JUGADOR"]},"categoryStrengths":[],"categoryWeaknesses":[],"waiverTargets":[]}`;
    let result = await askAI(prompt, roster);

    // Asegurar estructura mínima para evitar fallos en el frontend
    const finalResult = {
      analysisText: result.analysisText || "Análisis completado.",
      weeklyLineup: {
        starters: (result.weeklyLineup?.starters || []).map((id: string) => roster.find((p: any) => p.id === String(id) || p.name === id)?.name || id),
        bench: (result.weeklyLineup?.bench || []).map((id: string) => roster.find((p: any) => p.id === String(id) || p.name === id)?.name || id)
      },
      categoryStrengths: result.categoryStrengths || [],
      categoryWeaknesses: result.categoryWeaknesses || [],
      waiverTargets: result.waiverTargets || []
    };

    res.json(finalResult);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/analyze/draft', async (req, res) => {
  try {
    const { strategy, draftedPlayers } = req.body;
    const prompt = `Estrategia: ${strategy}. Ya elegidos: ${JSON.stringify(draftedPlayers)}. Sugiere picks. Responde JSON: {"summary":"...","recommendedPicks":[{"name":"...","team":"...","reason":"...","expectedRound":1}],"sleepers":[],"rookies":[],"breakouts":[],"puntStrategyAdvice":"..."}`;
    let result = await askAI(prompt);

    const finalResult = {
      summary: result.summary || "No hay resumen.",
      recommendedPicks: result.recommendedPicks || [],
      sleepers: result.sleepers || [],
      rookies: result.rookies || [],
      breakouts: result.breakouts || [],
      puntStrategyAdvice: result.puntStrategyAdvice || "Sigue tu estrategia.",
      modelUsed: result.modelUsed
    };

    res.json(finalResult);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/analyze/opponent', async (req, res) => {
  try {
    const { userRoster, opponentRoster, userTeamName, opponentTeamName } = req.body;
    const prompt = `Compara ${userTeamName} contra ${opponentTeamName}. Responde JSON: {"categoryComparisons":[],"highRiskCategories":[],"aiVerdict":"...","keyRivalPlayers":[]}`;
    let result = await askAI(prompt, { user: userRoster, opp: opponentRoster });

    const finalResult = {
      categoryComparisons: result.categoryComparisons || [],
      highRiskCategories: result.highRiskCategories || [],
      aiVerdict: result.aiVerdict || "Análisis no disponible.",
      keyRivalPlayers: result.keyRivalPlayers || [],
      recentFormPredictions: result.recentFormPredictions || [],
      modelUsed: result.modelUsed
    };

    res.json(finalResult);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Front-end SPA
const distPath = path.join(process.cwd(), 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));

app.listen(Number(PORT), '0.0.0.0', () => console.log(`>>> SERVER LIVE ON ${PORT}`));
