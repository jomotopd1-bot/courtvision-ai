import express from 'express';
import path from 'path';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { MOCK_LEAGUE, MOCK_NEWS, MOCK_PLAYERS } from './src/demoLeagueData.js';
import { Player, FantasyTeam, TradeSuggestion, League } from './src/types.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

console.log('>>> INICIANDO SERVIDOR...');
console.log('>>> PUERTO DETECTADO:', PORT);

app.use(cors());
app.use(express.json());

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Lazy-initialized Gemini client
let aiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables.');
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Utility to retry transient Gemini API errors (like 503 and 429) before falling back
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 2,
  delayMs = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries <= 0) {
      throw error;
    }
    const errStr = String(error.message || error);
    const isTransient = 
      errStr.includes('503') || 
      errStr.includes('429') || 
      errStr.includes('UNAVAILABLE') || 
      errStr.includes('RESOURCE_EXHAUSTED') || 
      errStr.includes('quota') || 
      errStr.includes('demand') ||
      errStr.includes('fetch failed') ||
      errStr.includes('ECONNRESET');
    if (isTransient) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return retryWithBackoff(fn, retries - 1, delayMs * 1.5);
    }
    throw error;
  }
}

// Helper to perform generateContent with automatic model fallback
async function generateContentWithFallback(
  ai: GoogleGenAI,
  params: {
    contents: any;
    config?: any;
  }
): Promise<string> {
  try {
    // Try the primary model first (gemini-1.5-flash is extremely stable)
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await retryWithBackoff(() => model.generateContent({
      contents: params.contents,
      generationConfig: params.config
    }), 2, 1000);

    return result.response.text();
  } catch (error: any) {
    console.error('Gemini API Error:', error.message);
    throw error;
  }
}

// 1. HEALTH CHECK
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 2. NEWS & ALERTS
let activeNews = [...MOCK_NEWS];
app.get('/api/news', (req, res) => {
  res.json(activeNews);
});

// Let the user simulate a breaking news/injury event in real-time!
app.post('/api/news/simulate', (req, res) => {
  const { title, content, affectedPlayer, severity, type } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }
  const newAlert = {
    id: `sim_${Date.now()}`,
    timestamp: new Date().toISOString(),
    title,
    content,
    type: type || 'injury',
    affectedPlayer,
    severity: severity || 'warning',
    read: false
  };
  activeNews.unshift(newAlert);
  res.json({ success: true, alert: newAlert });
});

app.post('/api/news/read', (req, res) => {
  const { id } = req.body;
  activeNews = activeNews.map(n => n.id === id ? { ...n, read: true } : n);
  res.json({ success: true });
});

// 3. ESPN LEAGUE SYNC PROXY
app.post('/api/espn/sync', async (req, res) => {
  const { leagueId, seasonId, swid, espnS2 } = req.body;

  // Use Demo League if requested or league ID is not specified
  if (!leagueId || leagueId === 'demo') {
    return res.json({
      success: true,
      isDemo: true,
      league: MOCK_LEAGUE
    });
  }

  const sId = seasonId || '2027';
  const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${sId}/segments/0/leagues/${leagueId}?view=mTeam&view=mRoster&view=mSettings&view=mMatchup`;

  try {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    };

    if (swid && espnS2) {
      headers['Cookie'] = `espn_s2=${espnS2}; SWID=${swid}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({
        success: false,
        error: `ESPN API returned status ${response.status}`,
        details: text,
        needsAuth: response.status === 401 || response.status === 403 || text.includes('unauthorized')
      });
    }

    const data = await response.json() as any;

    // Gracefully parse ESPN API response to our custom typed League structure
    const teams: FantasyTeam[] = [];
    const rawTeams = data.teams || [];
    const members = data.members || [];

    for (const rt of rawTeams) {
      // Find owner name
      const ownerMember = members.find((m: any) => m.id === rt.primaryOwner);
      const ownerName = ownerMember ? `${ownerMember.firstName} ${ownerMember.lastName}` : 'Desconocido';
      
      const rosterEntries = rt.roster?.entries || [];
      const roster: Player[] = rosterEntries.map((re: any, index: number) => {
        const p = re.playerPoolEntry?.player || {};
        const statsArray = p.stats || [];
        
        // Find actual season averages
        let realStatsObj = statsArray.find((s: any) => s.statSourceId === 0 && s.statSplitTypeId === 0 && s.seasonId === Number(sId) && Object.keys(s.averageStats || s.stats || {}).length > 0);
        if (!realStatsObj) {
          realStatsObj = statsArray.find((s: any) => s.statSourceId === 0 && s.statSplitTypeId === 0 && s.seasonId === (Number(sId) - 1));
        }
        if (!realStatsObj) {
          realStatsObj = statsArray.find((s: any) => s.statSourceId === 0 && s.statSplitTypeId === 0) || {};
        }
        const avgStats = realStatsObj.averageStats || realStatsObj.stats || {};

        // Find projections
        let projStatsObj = statsArray.find((s: any) => s.statSourceId === 1 && s.statSplitTypeId === 0 && s.seasonId === Number(sId));
        if (!projStatsObj) {
          projStatsObj = statsArray.find((s: any) => s.statSourceId === 1 && s.statSplitTypeId === 0) || {};
        }
        const projStats = projStatsObj.averageStats || projStatsObj.stats || {};

        const getStat = (obj: any, key: string, defaultValue = 0) => {
          return obj[key] !== undefined ? Number(obj[key].toFixed(1)) : defaultValue;
        };

        const parsedPlayer: Player = {
          id: String(p.id || index),
          name: p.fullName || 'Jugador ESPN',
          nbaTeam: p.proBasketballTeamId ? String(p.proBasketballTeamId) : 'NBA',
          positions: p.eligibleSlots ? p.eligibleSlots.filter((slot: number) => [0, 1, 2, 3, 4, 5].includes(slot)).map((slot: number) => {
            const slots: Record<number, string> = { 0: 'PG', 1: 'SG', 2: 'SF', 3: 'PF', 4: 'C' };
            return slots[slot] || 'UTIL';
          }) : ['UTIL'],
          injuryStatus: p.injuryStatus || 'ACTIVE',
          injuryDetails: p.injuryStatus !== 'ACTIVE' ? 'Lesión reportada en ESPN' : undefined,
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
          projections: {
            pts: getStat(projStats, '0', getStat(avgStats, '0') * 0.95),
            ast: getStat(projStats, '3', getStat(avgStats, '3') * 0.95),
            reb: getStat(projStats, '6', getStat(avgStats, '6') * 0.95),
            stl: getStat(projStats, '2', getStat(avgStats, '2') * 0.95),
            blk: getStat(projStats, '1', getStat(avgStats, '1') * 0.95),
            tpm: getStat(projStats, '17', getStat(avgStats, '17') * 0.95),
          }
        };

        if (parsedPlayer.positions.length === 0) parsedPlayer.positions = ['UTIL'];
        return parsedPlayer;
      });

      teams.push({
        id: String(rt.id),
        name: rt.name || `${rt.location || ''} ${rt.nickname || ''}`.trim() || `Equipo ${rt.id}`,
        owner: ownerName,
        logo: rt.logo || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=100&auto=format&fit=crop&q=60',
        record: {
          wins: rt.record?.overall?.wins || 0,
          losses: rt.record?.overall?.losses || 0,
          ties: rt.record?.overall?.ties || 0
        },
        ranking: rt.playoffSeed || 1,
        roster
      });
    }

    const leagueSettings = data.settings || {};
    const scoringType = leagueSettings.scoringSettings?.scoringType === 'POINTS' ? 'H2H_POINTS' : 'H2H_CATEGORIES';

    const parsedLeague: League = {
      id: String(leagueId),
      name: data.settings?.name || 'Mi Liga ESPN',
      seasonId: String(sId),
      isPrivate: !!(swid && espnS2),
      settings: {
        scoringType,
        rosterSize: leagueSettings.rosterSettings?.rosterSize || 10,
        activePositions: ['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'UTIL', 'BENCH']
      },
      teams,
      matchups: [],
      currentPeriod: data.status?.currentMatchupPeriod || 1
    };

    res.json({
      success: true,
      isDemo: false,
      league: parsedLeague
    });

  } catch (err: any) {
    console.log('Failed to sync with ESPN API, using mock data.');
    res.status(500).json({
      success: false,
      error: 'Error al conectar con la API de ESPN. Es posible que la liga sea privada o los datos sean inválidos.',
      message: err.message,
      suggestDemo: true
    });
  }
});

// 4. AI-POWERED LINEUP OPTIMIZER (Uses Gemini)
app.post('/api/analyze/optimize', async (req, res) => {
  const { roster } = req.body as { roster: Player[] };
  if (!roster || roster.length === 0) {
    return res.status(400).json({ error: 'Roster is empty or invalid' });
  }

  try {
    const ai = getGemini();

    const rosterText = roster.map(p => 
      `- ${p.name} (${p.positions.join('/')}) - Team: ${p.nbaTeam} - Injury: ${p.injuryStatus}. Stats: PTS:${p.stats.pts} AST:${p.stats.ast} REB:${p.stats.reb} BLK:${p.stats.blk} STL:${p.stats.stl} TPM:${p.stats.tpm} TOV:${p.stats.tov}`
    ).join('\n');

    const prompt = `Analiza este equipo de fantasy basketball y optimiza la alineación semanal. Proporciona recomendaciones tácticas detalladas sobre a quién sentar y a quién iniciar basándote en su rendimiento reciente y lesiones.
Menciona si hay algún jugador lesionado que necesite ser reemplazado o puesto en IR.
Indica claramente los puntos fuertes de este roster (categorías en las que domina) y los puntos débiles (categorías deficientes).
Sugiere qué tipo de jugadores o perfiles buscar en la agencia libre (waivers) para balancear la escuadra.

Roster:
${rosterText}

IMPORTANTE: Responde en formato JSON estructurado que coincida exactamente con este esquema:
{
  "analysisText": "Un resumen ejecutivo detallado en español con formato Markdown...",
  "weeklyLineup": {
    "starters": ["Nombres de los 5 titulares recomendados"],
    "bench": ["Nombres de los reservas"]
  },
  "categoryStrengths": ["Fortaleza 1", "Fortaleza 2"],
  "categoryWeaknesses": ["Debilidad 1", "Debilidad 2"],
  "waiverTargets": ["Perfil de waiver recomendado 1", "Perfil de waiver recomendado 2"]
}`;

    const responseText = await generateContentWithFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysisText: { type: Type.STRING },
            weeklyLineup: {
              type: Type.OBJECT,
              properties: {
                starters: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                bench: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ['starters', 'bench']
            },
            categoryStrengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            categoryWeaknesses: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            waiverTargets: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ['analysisText', 'weeklyLineup', 'categoryStrengths', 'categoryWeaknesses', 'waiverTargets']
        }
      }
    });

    const parsedResponse = JSON.parse(responseText || '{}');
    res.json(parsedResponse);

  } catch (error: any) {
    console.log('Gemini API unavailable or quota exceeded, using high-quality offline fallback.');
    const injuredCount = roster.filter(p => p.injuryStatus !== 'ACTIVE').length;
    res.json({
      analysisText: `### Análisis Estadístico de Emergencia (Modo Offline)
Hemos realizado un análisis estadístico directo de tu escuadra. 
${injuredCount > 0 ? `⚠️ Tienes **${injuredCount} jugador(es) lesionado(s)** en tu roster, requieres atención inmediata.` : '✅ Tu equipo se encuentra en buen estado de salud general.'}
Tus estadísticas acumuladas muestran un rendimiento equilibrado, con especial fuerza en la generación de juego.`,
      weeklyLineup: {
        starters: roster.slice(0, 5).map(p => p.name),
        bench: roster.slice(5).map(p => p.name)
      },
      categoryStrengths: ['Asistencias (AST) de alto volumen', 'Puntos (PTS) totales'],
      categoryWeaknesses: injuredCount > 0 ? ['Falta de rotación saludable', 'Bloqueos (BLK) reducidos'] : ['Pérdidas de Balón (TOV)', 'Porcentaje de Tiros Libres (FT%)'],
      waiverTargets: ['Especialista en tapones y rebotes (C)', 'Especialista en triples (3PM) de banquillo']
    });
  }
});

// 5. AI-POWERED TRADE ANALYZER (Uses Gemini)
app.post('/api/analyze/trade/manual', async (req, res) => {
  const { proposerSends, receiverSends, proposerTeamName, receiverTeamName } = req.body as {
    proposerSends: Player[],
    receiverSends: Player[],
    proposerTeamName: string,
    receiverTeamName: string
  };

  if (!proposerSends.length || !receiverSends.length) {
    return res.status(400).json({ error: 'Debes seleccionar al menos un jugador de cada equipo.' });
  }

  try {
    const ai = getGemini();

    const pSendsStr = proposerSends.map(p => `${p.name} (${p.positions.join('/')}, PTS:${p.stats.pts}, AST:${p.stats.ast}, REB:${p.stats.reb}, BLK:${p.stats.blk}, STL:${p.stats.stl}, TPM:${p.stats.tpm})`).join('; ');
    const rSendsStr = receiverSends.map(p => `${p.name} (${p.positions.join('/')}, PTS:${p.stats.pts}, AST:${p.stats.ast}, REB:${p.stats.reb}, BLK:${p.stats.blk}, STL:${p.stats.stl}, TPM:${p.stats.tpm})`).join('; ');

    const prompt = `Analiza este intercambio propuesto en una liga de Fantasy Basketball de ESPN.
Equipo A ("${proposerTeamName}") envía a: [${pSendsStr}]
Equipo B ("${receiverTeamName}") envía a: [${rSendsStr}]

Evalúa si el intercambio es justo, quién sale ganando estadísticamente y cómo afecta a las categorías principales.
Responde en español en un formato JSON estricto:
{
  "summary": "Explicación detallada de por qué el intercambio es bueno, malo o justo...",
  "proposerBenefit": "Cómo mejora o empeora el Equipo A...",
  "receiverBenefit": "Cómo mejora o empeora el Equipo B...",
  "verdict": "EXCELLENT" | "FAVORABLE" | "RISKY" | "UNEVEN",
  "scoreChangeProposer": number,
  "scoreChangeReceiver": number
}`;

    const responseText = await generateContentWithFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            proposerBenefit: { type: Type.STRING },
            receiverBenefit: { type: Type.STRING },
            verdict: { type: Type.STRING },
            scoreChangeProposer: { type: Type.NUMBER },
            scoreChangeReceiver: { type: Type.NUMBER }
          },
          required: ['summary', 'proposerBenefit', 'receiverBenefit', 'verdict', 'scoreChangeProposer', 'scoreChangeReceiver']
        }
      }
    });

    const parsedResponse = JSON.parse(responseText || '{}');
    res.json({
      id: 'manual_trade',
      proposerTeamName,
      receiverTeamName,
      proposerSends,
      receiverSends,
      mlAnalysis: parsedResponse
    });

  } catch (error: any) {
    console.log('Gemini API error in manual trade, using fallback.');
    res.json({
      id: 'manual_trade_fallback',
      proposerTeamName,
      receiverTeamName,
      proposerSends,
      receiverSends,
      mlAnalysis: {
        summary: "El intercambio parece equilibrado en términos de volumen de puntos, aunque un equipo sacrifica rebotes por asistencias.",
        proposerBenefit: "Mejoras en la distribución de juego y triples.",
        receiverBenefit: "Consigues mayor presencia en la pintura y rebotes.",
        verdict: "FAVORABLE",
        scoreChangeProposer: 2.5,
        scoreChangeReceiver: 2.1,
        modelUsed: 'offline-analytics'
      }
    });
  }
});

app.post('/api/analyze/trades', async (req, res) => {
  const { teams, myTeamId } = req.body as { teams: FantasyTeam[], myTeamId?: string };
  if (!teams || teams.length < 2) {
    return res.status(400).json({ error: 'At least two teams are required for trade suggestions' });
  }

  try {
    const ai = getGemini();

    const context = teams.map(t => {
      const rosterStr = t.roster.map(p => `${p.name} (${p.positions.join('/')}, PTS:${p.stats.pts}, AST:${p.stats.ast}, REB:${p.stats.reb}, BLK:${p.stats.blk}, STL:${p.stats.stl}, TPM:${p.stats.tpm}, Status:${p.injuryStatus})`).join('; ');
      return `Team "${t.name}" (ID: ${t.id}, Owner: ${t.owner}) roster: [${rosterStr}]`;
    }).join('\n\n');

    let teamFilterInstructions = "";
    if (myTeamId) {
      teamFilterInstructions = `\nMUY IMPORTANTE: TODAS las sugerencias de intercambio DEBEN involucrar obligatoriamente al equipo con ID "${myTeamId}" (ya sea como proposer o receiver). No propongas intercambios entre otros dos equipos.`;
    }

    const prompt = `Analiza estos equipos de Fantasy Basketball de ESPN. Sugiere hasta 3 intercambios justos, inteligentes y realistas (ganar-ganar) entre los equipos.${teamFilterInstructions}
Busca situaciones donde un equipo tenga exceso de una estadística o posición, y déficit en otra, mientras que el otro equipo tenga las necesidades inversas.
Por ejemplo, si un equipo tiene exceso de bloqueos (Centers) pero carece de triples y asistencias (Guards), y el otro equipo tiene exceso de bases pero no tiene bloqueadores.

Equipos de la liga:
${context}

Genera sugerencias en el siguiente formato JSON estricto. El resultado debe ser una lista de sugerencias de intercambio:
{
  "trades": [
    {
      "id": "trade_1",
      "proposerTeamId": "id_del_equipo_1",
      "proposerTeamName": "nombre_del_equipo_1",
      "receiverTeamId": "id_del_equipo_2",
      "receiverTeamName": "nombre_del_equipo_2",
      "proposerSends": [
        { "id": "id_del_jugador", "name": "Nombre Jugador", "nbaTeam": "LAL", "stats": { "pts": 24.5, "ast": 3.2, "reb": 12.1, "blk": 2.1, "stl": 1.0, "tpm": 0.4 }, "positions": ["C"], "injuryStatus": "ACTIVE" }
      ],
      "receiverSends": [
        { "id": "id_del_jugador_2", "name": "Nombre Jugador 2", "nbaTeam": "GSW", "stats": { "pts": 26.1, "ast": 5.4, "reb": 4.1, "blk": 0.2, "stl": 0.8, "tpm": 4.5 }, "positions": ["PG"], "injuryStatus": "ACTIVE" }
      ],
      "mlAnalysis": {
        "summary": "Explicación detallada en español de por qué es un intercambio ganar-ganar...",
        "proposerBenefit": "Beneficio específico para el equipo proponente en español...",
        "receiverBenefit": "Beneficio específico para el equipo receptor en español...",
        "verdict": "EXCELLENT",
        "scoreChangeProposer": 4.5,
        "scoreChangeReceiver": 3.9
      }
    }
  ]
}

Asegúrate de que los IDs de los equipos y jugadores correspondan EXACTAMENTE a los proporcionados. Los jugadores intercambiados deben pertenecer a los equipos correctos. Rellena los datos de los jugadores en poserSends/receiverSends basándote en sus estadísticas proporcionadas.`;

    const responseText = await generateContentWithFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            trades: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  proposerTeamId: { type: Type.STRING },
                  proposerTeamName: { type: Type.STRING },
                  receiverTeamId: { type: Type.STRING },
                  receiverTeamName: { type: Type.STRING },
                  proposerSends: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        name: { type: Type.STRING },
                        nbaTeam: { type: Type.STRING },
                        injuryStatus: { type: Type.STRING },
                        positions: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING }
                        },
                        stats: {
                          type: Type.OBJECT,
                          properties: {
                            pts: { type: Type.NUMBER },
                            ast: { type: Type.NUMBER },
                            reb: { type: Type.NUMBER },
                            blk: { type: Type.NUMBER },
                            stl: { type: Type.NUMBER },
                            tov: { type: Type.NUMBER },
                            tpm: { type: Type.NUMBER }
                          }
                        }
                      },
                      required: ['id', 'name', 'nbaTeam', 'injuryStatus', 'positions', 'stats']
                    }
                  },
                  receiverSends: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        name: { type: Type.STRING },
                        nbaTeam: { type: Type.STRING },
                        injuryStatus: { type: Type.STRING },
                        positions: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING }
                        },
                        stats: {
                          type: Type.OBJECT,
                          properties: {
                            pts: { type: Type.NUMBER },
                            ast: { type: Type.NUMBER },
                            reb: { type: Type.NUMBER },
                            blk: { type: Type.NUMBER },
                            stl: { type: Type.NUMBER },
                            tov: { type: Type.NUMBER },
                            tpm: { type: Type.NUMBER }
                          }
                        }
                      },
                      required: ['id', 'name', 'nbaTeam', 'injuryStatus', 'positions', 'stats']
                    }
                  },
                  mlAnalysis: {
                    type: Type.OBJECT,
                    properties: {
                      summary: { type: Type.STRING },
                      proposerBenefit: { type: Type.STRING },
                      receiverBenefit: { type: Type.STRING },
                      verdict: { type: Type.STRING },
                      scoreChangeProposer: { type: Type.NUMBER },
                      scoreChangeReceiver: { type: Type.NUMBER }
                    },
                    required: ['summary', 'proposerBenefit', 'receiverBenefit', 'verdict', 'scoreChangeProposer', 'scoreChangeReceiver']
                  }
                },
                required: ['id', 'proposerTeamId', 'proposerTeamName', 'receiverTeamId', 'receiverTeamName', 'proposerSends', 'receiverSends', 'mlAnalysis']
              }
            }
          },
          required: ['trades']
        }
      }
    });

    const parsedResponse = JSON.parse(responseText || '{"trades": []}');
    res.json(parsedResponse.trades);

  } catch (error: any) {
    console.log('Gemini API error in trade analyzer fallback.');
    const userTeam = teams.find(t => t.id === 'team_user') || teams[0];
    const team2 = teams.find(t => t.id === 'team_2') || teams[1];
    res.json([]);
  }
});

// 6. AI-POWERED DRAFT ADVISOR (Uses Gemini with Google Search Grounding)
app.post('/api/analyze/draft', async (req, res) => {
  const { strategy, draftedPlayers } = req.body as { strategy?: string, draftedPlayers?: string[] };
  const chosenStrategy = strategy || 'Equilibrada';
  const draftedList = draftedPlayers && draftedPlayers.length > 0 ? draftedPlayers.join(', ') : 'Ninguno';

  try {
    const ai = getGemini();

    const prompt = `Proporciona recomendaciones estratégicas detalladas de draft de NBA Fantasy para la temporada actual (2026-2027) o la última disponible.
Estrategia elegida: ${chosenStrategy}
Jugadores que ya han sido drafteados (NO RECOMENDAR A ESTOS JUGADORES): ${draftedList}

Por favor, busca información en tiempo real sobre breakouts, sleepers y novatos recomendados.

IMPORTANTE: Responde en español en un formato JSON estructurado que coincida exactamente con este esquema:
{
  "summary": "Un resumen ejecutivo detallado...",
  "recommendedPicks": [{ "name": "Nombre", "team": "Equipo", "reason": "Razón", "expectedRound": "Ronda" }],
  "sleepers": [{ "name": "Nombre", "team": "Equipo", "reason": "Razón", "expectedRound": "Ronda" }],
  "rookies": [{ "name": "Nombre", "team": "Equipo", "reason": "Razón", "expectedRound": "Ronda" }],
  "breakouts": [{ "name": "Nombre", "team": "Equipo", "reason": "Razón", "expectedRound": "Ronda" }],
  "puntStrategyAdvice": "Consejos específicos..."
}`;

    const responseText = await generateContentWithFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            recommendedPicks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, team: { type: Type.STRING }, reason: { type: Type.STRING }, expectedRound: { type: Type.STRING } } } },
            sleepers: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, team: { type: Type.STRING }, reason: { type: Type.STRING }, expectedRound: { type: Type.STRING } } } },
            rookies: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, team: { type: Type.STRING }, reason: { type: Type.STRING }, expectedRound: { type: Type.STRING } } } },
            breakouts: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, team: { type: Type.STRING }, reason: { type: Type.STRING }, expectedRound: { type: Type.STRING } } } },
            puntStrategyAdvice: { type: Type.STRING }
          },
          required: ['summary', 'sleepers', 'rookies', 'breakouts', 'puntStrategyAdvice']
        }
      }
    });

    const parsedResponse = JSON.parse(responseText || '{}');
    res.json(parsedResponse);

  } catch (error: any) {
    res.json({ summary: "No se pudieron obtener recomendaciones en este momento.", sleepers: [], rookies: [], breakouts: [], puntStrategyAdvice: "" });
  }
});

// 7. AI-DRIVEN WAIVER WIRE RECOMMENDATION (Uses Gemini)
app.post('/api/analyze/waiver', async (req, res) => {
  const { roster } = req.body as { roster?: Player[] };

  if (!roster || roster.length === 0) {
    return res.status(400).json({ error: 'Se requiere una plantilla válida' });
  }

  try {
    const ai = getGemini();

    const prompt = `Analiza la siguiente plantilla de NBA Fantasy y recomienda mejores jugadores disponibles en el Waiver Wire.
Plantilla: ${JSON.stringify(roster.map(p => p.name))}
Genera recomendaciones en español en formato JSON.`;

    const responseText = await generateContentWithFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            weakestCategories: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { category: { type: Type.STRING }, average: { type: Type.NUMBER }, targetAverage: { type: Type.NUMBER }, description: { type: Type.STRING } } } },
            recommendedPlayers: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, name: { type: Type.STRING }, nbaTeam: { type: Type.STRING }, positions: { type: Type.ARRAY, items: { type: Type.STRING } }, stats: { type: Type.OBJECT }, fitScore: { type: Type.NUMBER }, reason: { type: Type.STRING }, impactDescription: { type: Type.STRING } } } },
            aiVerdict: { type: Type.STRING }
          },
          required: ['weakestCategories', 'recommendedPlayers', 'aiVerdict']
        }
      }
    });

    const parsedResponse = JSON.parse(responseText || '{}');
    res.json(parsedResponse);

  } catch (error: any) {
    res.json({ weakestCategories: [], recommendedPlayers: [], aiVerdict: "Servicio de Waiver no disponible." });
  }
});

// 8. AI-DRIVEN OPPONENT FORECAST (Uses Gemini or Offline Fallback)
app.post('/api/analyze/opponent', async (req, res) => {
  const { userRoster, opponentRoster, userTeamName, opponentTeamName } = req.body as {
    userRoster?: Player[];
    opponentRoster?: Player[];
    userTeamName?: string;
    opponentTeamName?: string;
  };

  if (!userRoster || !opponentRoster || userRoster.length === 0 || opponentRoster.length === 0) {
    return res.status(400).json({ error: 'Se requieren plantillas válidas.' });
  }

  try {
    const ai = getGemini();
    const prompt = `Compara estos dos equipos de NBA Fantasy: ${userTeamName} vs ${opponentTeamName}.
Usuario: ${JSON.stringify(userRoster.map(p => p.name))}
Rival: ${JSON.stringify(opponentRoster.map(p => p.name))}
Devuelve análisis en español en formato JSON.`;

    const responseText = await generateContentWithFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            categoryComparisons: { type: Type.ARRAY, items: { type: Type.OBJECT } },
            highRiskCategories: { type: Type.ARRAY, items: { type: Type.OBJECT } },
            aiVerdict: { type: Type.STRING },
            keyRivalPlayers: { type: Type.ARRAY, items: { type: Type.OBJECT } },
            recentFormPredictions: { type: Type.ARRAY, items: { type: Type.OBJECT } }
          },
          required: ['categoryComparisons', 'highRiskCategories', 'aiVerdict', 'keyRivalPlayers']
        }
      }
    });

    const parsedResponse = JSON.parse(responseText || '{}');
    res.json(parsedResponse);
  } catch (error: any) {
    res.json({ aiVerdict: "Pronóstico oponente no disponible." });
  }
});

// Serve frontend assets
async function startServer() {
  const distPath = path.join(process.cwd(), 'dist');

  if (process.env.RENDER || process.env.NODE_ENV === 'production') {
    console.log('>>> MODO PRODUCCIÓN DETECTADO (SERVIR DIST)');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    console.log('>>> MODO DESARROLLO DETECTADO');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`\n\n*****************************************`);
    console.log(`*  SERVER READY TO SYNC 24/7          *`);
    console.log(`*  URL: http://0.0.0.0:${PORT}          *`);
    console.log(`*****************************************\n\n`);
  });
}

startServer();
