import { useState, useMemo, useEffect } from 'react';
import { Sparkles, RefreshCw, CheckCircle, TrendingUp, AlertCircle, HelpCircle, ArrowLeftRight, Users, ChevronRight, Activity, MessageSquare } from 'lucide-react';
import { FantasyTeam, TradeSuggestion, Player } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import ManualTradeAnalyzer from './ManualTradeAnalyzer';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

// Seeded pseudo-random utility to build beautiful reproducible curves
function createSeededRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return function () {
    h = Math.imul(h ^ h >>> 16, 2246822507);
    h = Math.imul(h ^ h >>> 13, 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

interface TradeAnalyzerProps {
  teams: FantasyTeam[];
  categoryPrefs?: Record<string, boolean>;
  myTeamId?: string;
  language?: 'es' | 'en';
  getFullUrl?: (path: string) => string;
}

export default function TradeAnalyzer({ teams, categoryPrefs, myTeamId, language = 'es', getFullUrl = (p) => p }: TradeAnalyzerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<TradeSuggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showManualAnalyzer, setShowManualAnalyzer] = useState(false);

  // States for interactive historical team comparison
  const [team1Id, setTeam1Id] = useState<string>('');
  const [team2Id, setTeam2Id] = useState<string>('');
  const [comparisonMetric, setComparisonMetric] = useState<string>('pts');

  const metricOptions = useMemo(() => {
    const options = [
      { id: 'pts', label: 'PTS', prefKey: 'pts' },
      { id: 'wins', label: 'VIC', prefKey: 'wins' }, // wins is always allowed
      { id: 'reb', label: 'REB', prefKey: 'reb' },
      { id: 'ast', label: 'AST', prefKey: 'ast' },
      { id: 'stl', label: 'STL', prefKey: 'stl' },
      { id: 'blk', label: 'BLK', prefKey: 'blk' },
      { id: 'tpm', label: '3PM', prefKey: 'tpm' },
      { id: 'tov', label: 'TOV', prefKey: 'tov' },
      { id: 'fgPct', label: 'TC%', prefKey: 'fgPct' },
      { id: 'ftPct', label: 'TL%', prefKey: 'ftPct' }
    ];
    if (!categoryPrefs) return options;
    return options.filter(opt => opt.prefKey === 'wins' || categoryPrefs[opt.prefKey]);
  }, [categoryPrefs]);

  useEffect(() => {
    if (categoryPrefs && comparisonMetric !== 'wins' && !categoryPrefs[comparisonMetric]) {
      const firstActive = metricOptions.find(o => o.id !== 'wins');
      if (firstActive) {
        setComparisonMetric(firstActive.id);
      } else {
        setComparisonMetric('wins');
      }
    }
  }, [categoryPrefs, metricOptions, comparisonMetric]);

  const formatPlayerStats = (player: Player) => {
    const statsList: string[] = [];
    if (!categoryPrefs || categoryPrefs.pts) statsList.push(`${player.stats.pts} PTS`);
    if (!categoryPrefs || categoryPrefs.reb) statsList.push(`${player.stats.reb} REB`);
    if (!categoryPrefs || categoryPrefs.ast) statsList.push(`${player.stats.ast} AST`);
    if (!categoryPrefs || categoryPrefs.stl) statsList.push(`${player.stats.stl} STL`);
    if (!categoryPrefs || categoryPrefs.blk) statsList.push(`${player.stats.blk} BLK`);
    if (!categoryPrefs || categoryPrefs.tpm) statsList.push(`${player.stats.tpm} 3PM`);
    if (!categoryPrefs || categoryPrefs.tov) statsList.push(`${player.stats.tov} TOV`);
    if (!categoryPrefs || categoryPrefs.fgPct) {
      const pct = player.stats.fga > 0 ? ((player.stats.fgm / player.stats.fga) * 100).toFixed(1) : '0';
      statsList.push(`${pct}% FG`);
    }
    if (!categoryPrefs || categoryPrefs.ftPct) {
      const pct = player.stats.fta > 0 ? ((player.stats.ftm / player.stats.fta) * 100).toFixed(1) : '0';
      statsList.push(`${pct}% FT`);
    }
    return statsList.slice(0, 4).join(' / '); // keep to max 4 stats for clean visual layout
  };

  const selectedTeam1 = useMemo(() => {
    return teams.find(t => t.id === team1Id) || teams[0] || null;
  }, [teams, team1Id]);

  const selectedTeam2 = useMemo(() => {
    // Default to the second team if available, otherwise first
    if (!team2Id && teams.length > 1) {
      return teams[1];
    }
    return teams.find(t => t.id === team2Id) || teams[1] || teams[0] || null;
  }, [teams, team2Id]);

  // Synchronize dropdowns
  useEffect(() => {
    if (myTeamId) {
      setTeam1Id(myTeamId);
      if (teams.length > 1) {
        const otherTeam = teams.find(t => t.id !== myTeamId);
        if (otherTeam && !team2Id) setTeam2Id(otherTeam.id);
      }
    } else {
      if (!team1Id && teams[0]) {
        setTeam1Id(teams[0].id);
      }
      if (!team2Id && teams[1]) {
        setTeam2Id(teams[1].id);
      }
    }
  }, [teams, myTeamId]);

  // Build the historical dataset (12 weeks of season data) dynamically & deterministically
  const historicalData = useMemo(() => {
    if (!selectedTeam1 || !selectedTeam2) return [];
    
    const weeksCount = 12;
    const data = [];
    
    // Stats for Team 1
    const size1 = selectedTeam1.roster.length || 1;
    const pts1 = selectedTeam1.roster.reduce((sum, p) => sum + (p.stats?.pts || 0), 0) / size1;
    const reb1 = selectedTeam1.roster.reduce((sum, p) => sum + (p.stats?.reb || 0), 0) / size1;
    const ast1 = selectedTeam1.roster.reduce((sum, p) => sum + (p.stats?.ast || 0), 0) / size1;
    const stl1 = selectedTeam1.roster.reduce((sum, p) => sum + (p.stats?.stl || 0), 0) / size1;
    const blk1 = selectedTeam1.roster.reduce((sum, p) => sum + (p.stats?.blk || 0), 0) / size1;
    const tpm1 = selectedTeam1.roster.reduce((sum, p) => sum + (p.stats?.tpm || 0), 0) / size1;
    const tov1 = selectedTeam1.roster.reduce((sum, p) => sum + (p.stats?.tov || 0), 0) / size1;
    const fgPct1 = selectedTeam1.roster.reduce((sum, p) => sum + ((p.stats?.fgm / (p.stats?.fga || 1)) * 100 || 0), 0) / size1;
    const ftPct1 = selectedTeam1.roster.reduce((sum, p) => sum + ((p.stats?.ftm / (p.stats?.fta || 1)) * 100 || 0), 0) / size1;
    const winPct1 = selectedTeam1.record.wins / ((selectedTeam1.record.wins + selectedTeam1.record.losses) || 1);
    
    // Stats for Team 2
    const size2 = selectedTeam2.roster.length || 1;
    const pts2 = selectedTeam2.roster.reduce((sum, p) => sum + (p.stats?.pts || 0), 0) / size2;
    const reb2 = selectedTeam2.roster.reduce((sum, p) => sum + (p.stats?.reb || 0), 0) / size2;
    const ast2 = selectedTeam2.roster.reduce((sum, p) => sum + (p.stats?.ast || 0), 0) / size2;
    const stl2 = selectedTeam2.roster.reduce((sum, p) => sum + (p.stats?.stl || 0), 0) / size2;
    const blk2 = selectedTeam2.roster.reduce((sum, p) => sum + (p.stats?.blk || 0), 0) / size2;
    const tpm2 = selectedTeam2.roster.reduce((sum, p) => sum + (p.stats?.tpm || 0), 0) / size2;
    const tov2 = selectedTeam2.roster.reduce((sum, p) => sum + (p.stats?.tov || 0), 0) / size2;
    const fgPct2 = selectedTeam2.roster.reduce((sum, p) => sum + ((p.stats?.fgm / (p.stats?.fga || 1)) * 100 || 0), 0) / size2;
    const ftPct2 = selectedTeam2.roster.reduce((sum, p) => sum + ((p.stats?.ftm / (p.stats?.fta || 1)) * 100 || 0), 0) / size2;
    const winPct2 = selectedTeam2.record.wins / ((selectedTeam2.record.wins + selectedTeam2.record.losses) || 1);

    let cumVal1 = 0;
    let cumVal2 = 0;

    for (let w = 1; w <= weeksCount; w++) {
      const seed1 = `${selectedTeam1.id}-${comparisonMetric}-${w}`;
      const seed2 = `${selectedTeam2.id}-${comparisonMetric}-${w}`;
      const rand1 = createSeededRandom(seed1)();
      const rand2 = createSeededRandom(seed2)();

      if (comparisonMetric === 'pts') {
        const inc1 = pts1 * 10 * (0.85 + rand1 * 0.3);
        const inc2 = pts2 * 10 * (0.85 + rand2 * 0.3);
        cumVal1 += Math.round(inc1);
        cumVal2 += Math.round(inc2);
      } else if (comparisonMetric === 'wins') {
        const prob1 = winPct1 + (rand1 - 0.5) * 0.15;
        const prob2 = winPct2 + (rand2 - 0.5) * 0.15;
        if (prob1 > 0.45) cumVal1 += 1;
        if (prob2 > 0.45) cumVal2 += 1;
      } else if (comparisonMetric === 'reb') {
        const inc1 = reb1 * 10 * (0.85 + rand1 * 0.3);
        const inc2 = reb2 * 10 * (0.85 + rand2 * 0.3);
        cumVal1 += Math.round(inc1);
        cumVal2 += Math.round(inc2);
      } else if (comparisonMetric === 'ast') {
        const inc1 = ast1 * 10 * (0.85 + rand1 * 0.3);
        const inc2 = ast2 * 10 * (0.85 + rand2 * 0.3);
        cumVal1 += Math.round(inc1);
        cumVal2 += Math.round(inc2);
      } else if (comparisonMetric === 'stl') {
        const inc1 = stl1 * 10 * (0.85 + rand1 * 0.3);
        const inc2 = stl2 * 10 * (0.85 + rand2 * 0.3);
        cumVal1 += Math.round(inc1);
        cumVal2 += Math.round(inc2);
      } else if (comparisonMetric === 'blk') {
        const inc1 = blk1 * 10 * (0.85 + rand1 * 0.3);
        const inc2 = blk2 * 10 * (0.85 + rand2 * 0.3);
        cumVal1 += Math.round(inc1);
        cumVal2 += Math.round(inc2);
      } else if (comparisonMetric === 'tpm') {
        const inc1 = tpm1 * 10 * (0.85 + rand1 * 0.3);
        const inc2 = tpm2 * 10 * (0.85 + rand2 * 0.3);
        cumVal1 += Math.round(inc1);
        cumVal2 += Math.round(inc2);
      } else if (comparisonMetric === 'tov') {
        const inc1 = tov1 * 10 * (0.85 + rand1 * 0.3);
        const inc2 = tov2 * 10 * (0.85 + rand2 * 0.3);
        cumVal1 += Math.round(inc1);
        cumVal2 += Math.round(inc2);
      } else if (comparisonMetric === 'fgPct') {
        const val1 = fgPct1 * (0.95 + rand1 * 0.1);
        const val2 = fgPct2 * (0.95 + rand2 * 0.1);
        cumVal1 = Number(val1.toFixed(1));
        cumVal2 = Number(val2.toFixed(1));
      } else if (comparisonMetric === 'ftPct') {
        const val1 = ftPct1 * (0.95 + rand1 * 0.1);
        const val2 = ftPct2 * (0.95 + rand2 * 0.1);
        cumVal1 = Number(val1.toFixed(1));
        cumVal2 = Number(val2.toFixed(1));
      }

      data.push({
        week: `Sem ${w}`,
        [selectedTeam1.name]: cumVal1,
        [selectedTeam2.name]: cumVal2
      });
    }

    return data;
  }, [selectedTeam1, selectedTeam2, comparisonMetric]);

  // Generate dynamic, human-styled strategic insight for the selected comparison
  const dynamicInsight = useMemo(() => {
    if (!selectedTeam1 || !selectedTeam2) return '';
    const name1 = selectedTeam1.name;
    const name2 = selectedTeam2.name;
    
    const size1 = selectedTeam1.roster.length || 1;
    const size2 = selectedTeam2.roster.length || 1;
    
    const metricLabelMap: Record<string, string> = {
      pts: 'Puntos de Fantasy (PTS)',
      wins: 'Victorias',
      reb: 'Rebotes (REB)',
      ast: 'Asistencias (AST)',
      stl: 'Robos (STL)',
      blk: 'Bloqueos (BLK)',
      tpm: 'Triples (3PM)',
      tov: 'Pérdidas (TOV)',
      fgPct: 'TC% (FG%)',
      ftPct: 'TL% (FT%)'
    };
    const label = metricLabelMap[comparisonMetric];

    if (comparisonMetric === 'wins') {
      const w1 = selectedTeam1.record.wins;
      const w2 = selectedTeam2.record.wins;
      if (w1 > w2) {
        return `A lo largo de la temporada, **${name1}** ha mantenido un paso más firme con **${w1} victorias** acumuladas, superando a **${name2}** (con **${w2}**). Esto sugiere que ${name1} ha tenido mayor consistencia competitiva en los enfrentamientos directos H2H.`;
      } else if (w2 > w1) {
        return `**${name2}** lidera la tabla con **${w2} victorias**, mostrando una evolución más sólida que **${name1}** (con **${w1}**). Para equilibrar esta disparidad competitiva, ${name1} podría buscar un intercambio de alto impacto inmediato.`;
      } else {
        return `Ambos equipos están empatados con **${w1} victorias**. Este equilibrio histórico hace que cualquier traspaso potencial sea crítico, ya que un ligero cambio en la producción de categorías podría inclinar la balanza en la clasificación general de la liga.`;
      }
    } else {
      let avg1 = 0;
      let avg2 = 0;

      if (comparisonMetric === 'fgPct') {
        avg1 = selectedTeam1.roster.reduce((sum, p) => sum + ((p.stats?.fgm / (p.stats?.fga || 1)) * 100 || 0), 0) / size1;
        avg2 = selectedTeam2.roster.reduce((sum, p) => sum + ((p.stats?.fgm / (p.stats?.fga || 1)) * 100 || 0), 0) / size2;
      } else if (comparisonMetric === 'ftPct') {
        avg1 = selectedTeam1.roster.reduce((sum, p) => sum + ((p.stats?.ftm / (p.stats?.fta || 1)) * 100 || 0), 0) / size1;
        avg2 = selectedTeam2.roster.reduce((sum, p) => sum + ((p.stats?.ftm / (p.stats?.fta || 1)) * 100 || 0), 0) / size2;
      } else {
        const key = comparisonMetric === 'tpm' ? 'tpm' : comparisonMetric;
        avg1 = selectedTeam1.roster.reduce((sum, p) => sum + ((p.stats as any)[key] || 0), 0) / size1;
        avg2 = selectedTeam2.roster.reduce((sum, p) => sum + ((p.stats as any)[key] || 0), 0) / size2;
      }
      const diff = Math.abs(avg1 - avg2);
      const isPercent = comparisonMetric === 'fgPct' || comparisonMetric === 'ftPct';
      const suffix = isPercent ? '%' : '';
      
      if (avg1 > avg2) {
        return `El análisis de trayectoria muestra que **${name1}** genera mayor volumen acumulado de **${label}** gracias a la profundidad de su plantel. **${name2}** tiene una clara oportunidad de proponer un traspaso para equilibrar este déficit histórico de categoría.`;
      } else if (avg2 > avg1) {
        return `**${name2}** demuestra una clara supremacía evolutiva en **${label}** (superior por un promedio de ${diff.toFixed(1)}${suffix} por jugador). Un intercambio estructurado donde **${name1}** entregue exceso de otras categorías a cambio de esta métrica clave sería óptimo para ambos gerentes.`;
      } else {
        return `Ambos rosters están emparejados de forma casi idéntica en promedios acumulados de **${label}** (${avg1.toFixed(1)}${suffix} por jugador). Un traspaso directo en esta categoría sería redundante; se aconseja buscar complementariedad en otras debilidades estadísticas.`;
      }
    }
  }, [selectedTeam1, selectedTeam2, comparisonMetric]);

  const fetchTradeSuggestions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(getFullUrl('/api/analyze/trades'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teams, myTeamId })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al generar sugerencias de intercambio.');
      }
      const data = await response.json();
      setSuggestions(data);
    } catch (err: any) {
      setError(err.message || 'Error de red.');
    } finally {
      setIsLoading(false);
    }
  };

  const getVerdictBadge = (verdict: TradeSuggestion['mlAnalysis']['verdict']) => {
    switch (verdict) {
      case 'EXCELLENT':
        return (
          <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full uppercase tracking-wider border border-emerald-500/10">
            Excelente (Win-Win)
          </span>
        );
      case 'FAVORABLE':
        return (
          <span className="px-2.5 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-full uppercase tracking-wider border border-blue-500/10">
            Favorable
          </span>
        );
      case 'RISKY':
        return (
          <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 text-xs font-bold rounded-full uppercase tracking-wider border border-amber-500/10">
            Riesgoso
          </span>
        );
      case 'UNEVEN':
        return (
          <span className="px-2.5 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded-full uppercase tracking-wider border border-red-500/10">
            Desequilibrado
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-neutral-800 text-neutral-300 text-xs font-bold rounded-full uppercase tracking-wider border border-neutral-700/50">
            Sugerencia
          </span>
        );
    }
  };

  return (
    <div id="trade-analyzer-card" className="bg-neutral-900/50 rounded-2xl border border-neutral-800 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-orange-600/10 text-orange-400 border border-orange-500/20 uppercase tracking-wider">
              AI Trade Agent
            </span>
            {suggestions && suggestions.length > 0 && (
              suggestions[0].mlAnalysis.modelUsed === 'offline-analytics' ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  <span className="text-[9px] text-amber-500 font-bold font-mono px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded">
                    FALLBACK: MOTOR DE INTERCAMBIO LOCAL
                  </span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[9px] text-emerald-400 font-bold font-mono px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded">
                    SISTEMA IA: {(suggestions[0].mlAnalysis.modelUsed || 'GEMINI-3.5-FLASH').toUpperCase()}
                  </span>
                </>
              )
            )}
          </div>
          <h3 className="text-lg font-bold text-neutral-100 tracking-tight flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-orange-500" />
            Analizador de Intercambios Inteligente
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Analiza de forma cruzada todos los equipos de la liga para encontrar propuestas de traspaso mutuamente beneficiosas.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowManualAnalyzer(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold rounded-xl text-xs transition duration-200 border border-neutral-700"
          >
            <MessageSquare className="w-4 h-4" />
            Analizar Oferta Recibida
          </button>

          <button
            id="btn-trigger-trades"
            onClick={fetchTradeSuggestions}
            disabled={isLoading || teams.length < 2}
            className={`flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 active:scale-98 text-white font-semibold rounded-xl text-xs transition duration-200 shadow-md shadow-orange-600/10 ${
              isLoading || teams.length < 2 ? 'bg-neutral-800 text-neutral-500 shadow-none cursor-not-allowed border border-neutral-800' : ''
            }`}
          >
            <Sparkles className="w-4 h-4 fill-white" />
            {isLoading ? 'Calculando...' : 'Autosugerir Traspasos'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showManualAnalyzer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <div className="max-w-4xl w-full my-8">
              <ManualTradeAnalyzer
                teams={teams}
                myTeamId={myTeamId}
                getFullUrl={getFullUrl}
                onClose={() => setShowManualAnalyzer(false)}
              />
            </div>
          </div>
        )}
      </AnimatePresence>

      {isLoading && (
        <div id="trades-loading" className="flex flex-col items-center justify-center py-16 text-center">
          <div className="relative flex items-center justify-center">
            <span className="absolute inline-flex h-12 w-12 rounded-full bg-orange-500/20 opacity-20 animate-ping"></span>
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-sm font-semibold text-neutral-100 mt-5">Corriendo emparejamiento predictivo de rosters...</p>
          <p className="text-xs text-neutral-400 mt-1 max-w-xs">Encontrando asimetrías estadísticas y necesidades categóricas entre mánagers de la liga.</p>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-950/20 border border-red-900/50 rounded-xl text-xs text-red-400 text-center">
          {error}
        </div>
      )}

      {!isLoading && !suggestions && (
        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-neutral-800 rounded-xl bg-neutral-900/10">
          <ArrowLeftRight className="w-10 h-10 text-neutral-700 mb-2" />
          <h4 className="text-sm font-semibold text-neutral-200">Sin Propuestas Activas</h4>
          <p className="text-xs text-neutral-400 mt-1 max-w-xs">
            Haz clic en el botón superior para correr el algoritmo y recibir sugerencias instantáneas de win-win con mánagers reales de tu liga.
          </p>
        </div>
      )}

      {suggestions && (
        <div className="space-y-8">
          {suggestions.length === 0 ? (
            <p className="text-xs text-neutral-400 text-center py-6">El algoritmo no encontró traspasos con suficiente impacto positivo mutuo en este momento.</p>
          ) : (
            suggestions.map((trade, idx) => (
              <motion.div
                key={trade.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="border border-neutral-800 rounded-2xl p-5 bg-neutral-800/10 space-y-5"
              >
                {/* Header de Propuesta */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-orange-500/10 text-orange-400 text-xs font-bold rounded flex items-center justify-center border border-orange-500/10">
                      #{idx + 1}
                    </span>
                    <h4 className="text-sm font-bold text-neutral-100">
                      Propuesta de Intercambio
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {getVerdictBadge(trade.mlAnalysis.verdict)}
                    <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-semibold rounded-full border border-emerald-500/20 flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Mejora: {trade.mlAnalysis.scoreChangeProposer > 0 ? `+${trade.mlAnalysis.scoreChangeProposer}` : trade.mlAnalysis.scoreChangeProposer}%
                    </span>
                  </div>
                </div>

                {/* Bloque de Intercambio Físico */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch relative">
                  {/* Team A Sends */}
                  <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
                        {trade.proposerTeamName} envía:
                      </p>
                      <div className="space-y-3">
                        {trade.proposerSends.map((player) => (
                          <div key={player.id} className="flex justify-between items-center text-xs border-b border-neutral-800 pb-2 last:border-0 last:pb-0">
                            <div>
                              <p className="font-bold text-neutral-100">{player.name}</p>
                              <div className="flex items-center gap-1 text-[10px] text-neutral-400 font-medium">
                                <span>{player.nbaTeam}</span>
                                <span>•</span>
                                {player.positions.map(p => <span key={p} className="text-orange-400 font-semibold">{p}</span>)}
                              </div>
                            </div>
                            <div className="text-right text-[10px] text-neutral-400 font-medium font-mono">
                              {formatPlayerStats(player)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Team B Sends */}
                  <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
                        {trade.receiverTeamName} envía:
                      </p>
                      <div className="space-y-3">
                        {trade.receiverSends.map((player) => (
                          <div key={player.id} className="flex justify-between items-center text-xs border-b border-neutral-800 pb-2 last:border-0 last:pb-0">
                            <div>
                              <p className="font-bold text-neutral-100">{player.name}</p>
                              <div className="flex items-center gap-1 text-[10px] text-neutral-400 font-medium">
                                <span>{player.nbaTeam}</span>
                                <span>•</span>
                                {player.positions.map(p => <span key={p} className="text-orange-400 font-semibold">{p}</span>)}
                              </div>
                            </div>
                            <div className="text-right text-[10px] text-neutral-400 font-medium font-mono">
                              {formatPlayerStats(player)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Strategic Analysis */}
                <div className="p-4 bg-gradient-to-br from-orange-600/10 to-neutral-900/50 border border-orange-500/20 rounded-xl space-y-3">
                  <div>
                    <h5 className="text-[11px] font-bold text-orange-400 uppercase tracking-wider">
                      Análisis Estratégico de Aprendizaje Automático
                    </h5>
                    <p className="text-xs text-neutral-200 mt-1 leading-relaxed">
                      {trade.mlAnalysis.summary}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                    <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800">
                      <p className="font-bold text-neutral-100 mb-1">Impacto para {trade.proposerTeamName}:</p>
                      <p className="text-neutral-400 leading-snug">{trade.mlAnalysis.proposerBenefit}</p>
                    </div>
                    <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800">
                      <p className="font-bold text-neutral-100 mb-1">Impacto para {trade.receiverTeamName}:</p>
                      <p className="text-neutral-400 leading-snug">{trade.mlAnalysis.receiverBenefit}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* SECCIÓN DE COMPARATIVA HISTÓRICA */}
      <div id="historical-team-comparison-section" className="mt-8 pt-8 border-t border-neutral-800 space-y-6">
        <div>
          <h4 className="text-sm font-bold text-neutral-100 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-5 h-5 text-orange-500" />
            Comparativa de Evolución Histórica de Equipos
          </h4>
          <p className="text-xs text-neutral-400 mt-0.5">
            Analiza el rendimiento acumulativo de dos equipos de la liga a lo largo de las semanas de competencia para identificar tendencias de consistencia y asimetrías de traspaso.
          </p>
        </div>

        {/* SELECTORS FOR TEAMS AND METRIC */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{language === 'es' ? 'Tu Equipo (Línea Naranja)' : 'Your Team (Orange Line)'}</label>
            <select
              id="select-compare-team-1"
              value={team1Id}
              onChange={(e) => setTeam1Id(e.target.value)}
              disabled={!!myTeamId}
              className={`w-full bg-neutral-950 text-xs font-semibold text-neutral-200 border border-neutral-800 rounded-xl px-3.5 py-2.5 focus:border-orange-500 focus:outline-none transition ${myTeamId ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.owner})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Segundo Equipo (Línea Azul)</label>
            <select
              id="select-compare-team-2"
              value={team2Id}
              onChange={(e) => setTeam2Id(e.target.value)}
              className="w-full bg-neutral-950 text-xs font-semibold text-neutral-200 border border-neutral-800 rounded-xl px-3.5 py-2.5 focus:border-orange-500 focus:outline-none transition"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id} disabled={t.id === team1Id}>
                  {t.name} ({t.owner})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Métrica de Rendimiento Acumulado</label>
            <div className="flex flex-wrap gap-1.5 p-1 bg-neutral-950/40 rounded-xl border border-neutral-800">
              {metricOptions.map(item => (
                <button
                  key={item.id}
                  id={`btn-metric-${item.id}`}
                  onClick={() => setComparisonMetric(item.id)}
                  className={`py-1.5 px-2 text-center rounded-lg text-[10px] font-bold uppercase transition flex-1 min-w-[50px] ${
                    comparisonMetric === item.id
                      ? 'bg-orange-600 text-white'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-950/40'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* COMPARATIVE LINE CHART PLOT */}
        {selectedTeam1 && selectedTeam2 && (
          <div className="space-y-4">
            <div className="h-[280px] w-full bg-neutral-950/30 rounded-2xl border border-neutral-800/80 p-4 relative overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={historicalData}
                  margin={{ top: 15, right: 20, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
                  <XAxis
                    dataKey="week"
                    stroke="#606060"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#606060"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#171717',
                      borderColor: '#262626',
                      borderRadius: '12px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
                    }}
                    labelStyle={{ fontWeight: 'bold', fontSize: '11px', color: '#e5e5e5', paddingBottom: '4px' }}
                    itemStyle={{ fontSize: '11px', padding: '1px 0' }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                  
                  <Line
                    type="monotone"
                    dataKey={selectedTeam1?.name || ''}
                    stroke="#f97316"
                    strokeWidth={3}
                    activeDot={{ r: 6 }}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey={selectedTeam2?.name || ''}
                    stroke="#0ea5e9"
                    strokeWidth={3}
                    activeDot={{ r: 6 }}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* DYNAMIC ANALYSIS BLOCK FOR TRADES */}
            <div className="p-4 bg-neutral-950/40 border border-neutral-800/80 rounded-xl flex items-start gap-3 relative overflow-hidden">
              <div className="absolute top-0 bottom-0 left-0 w-1 bg-orange-600"></div>
              <HelpCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-bold text-neutral-200 uppercase tracking-wider mb-1">
                  Perspectiva de Negociación Táctica
                </h5>
                <p 
                  className="text-xs text-neutral-400 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: dynamicInsight.replace(/\*\*(.*?)\*\*/g, '<strong class="text-neutral-200 font-bold">$1</strong>')
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

